import { GoogleGenerativeAI, GenerativeModel, GenerationConfig, GenerateContentRequest } from '@google/generative-ai';
import config from '../../config/index.js';
import {
  Schema,
  SchemaRequest,
  QueryRequest,
  GeneratedQuery,
  QueryAnalysis,
  CodeRequest,
  GeneratedCode,
  DatabaseType,
  QueryOptimization,
  TargetLanguage,
} from '../../types/index.js';
import { schemaPrompts, queryPrompts, codePrompts, analysisPrompts } from './prompts/index.js';

export class GeminiService {
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private generationConfig: GenerationConfig;
  private maxRetries: number = 3;
  private requestTimeout: number = 90000; // 90 seconds

  constructor() {
    this.apiKeys = config.gemini.apiKeys;
    if (this.apiKeys.length === 0) {
      throw new Error('No Gemini API keys configured');
    }
    console.log(`[GeminiService] Initialized with ${this.apiKeys.length} API key(s)`);
    console.log(`[GeminiService] Using model: ${config.gemini.model}`);
    
    this.genAI = new GoogleGenerativeAI(this.apiKeys[0]);
    this.model = this.genAI.getGenerativeModel({ 
      model: config.gemini.model,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
    this.generationConfig = {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    };
  }

  /**
   * Switch to the next API key in rotation
   */
  private rotateKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    console.log(`[GeminiService] Rotating to API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
    this.genAI = new GoogleGenerativeAI(this.apiKeys[this.currentKeyIndex]);
    this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
  }

  /**
   * Get the current model instance (ensures we always use the latest after rotation)
   */
  private getCurrentModel(): GenerativeModel {
    return this.model;
  }

  /**
   * Stream response with callback for each chunk
   */
  async streamGenerate(
    prompt: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const model = this.getCurrentModel();
      const result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: this.generationConfig,
      });

      let fullText = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        onChunk(chunkText);
      }
      onComplete(fullText);
    } catch (error: any) {
      // Try rotating key and retrying
      if (error?.status === 429 || error?.message?.includes('rate limit')) {
        this.rotateKey();
        return this.streamGenerate(prompt, onChunk, onComplete, onError);
      }
      onError(error);
    }
  }

  /**
   * Execute a Gemini API call with automatic key rotation on rate limit
   * IMPORTANT: The operation function receives the current model to ensure
   * it uses the rotated model after key rotation, not a stale reference.
   */
  private async executeWithRetry<T>(
    operation: (model: GenerativeModel) => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      console.log(`[GeminiService] Attempt ${attempt + 1} using API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
      console.log(`[GeminiService] Key prefix: ${this.apiKeys[this.currentKeyIndex]?.substring(0, 10)}...`);
      // Pass the current model to the operation to ensure it uses the rotated key
      return await operation(this.getCurrentModel());
    } catch (error: any) {
      console.error(`[GeminiService] Error on attempt ${attempt + 1}:`, error?.message || error);
      console.error(`[GeminiService] Error status:`, error?.status);
      console.error(`[GeminiService] Error details:`, JSON.stringify(error?.errorDetails || error?.details || 'none'));
      
      const isRateLimited = error?.status === 429 || 
        error?.message?.includes('429') ||
        error?.message?.toLowerCase().includes('rate limit') ||
        error?.message?.toLowerCase().includes('quota exceeded') ||
        error?.message?.toLowerCase().includes('resource exhausted');
      
      const isRetryable = isRateLimited || 
        error?.status === 503 || 
        error?.status === 500 ||
        error?.message?.toLowerCase().includes('unavailable') ||
        error?.message?.toLowerCase().includes('timeout');
      
      if (isRetryable && attempt < this.apiKeys.length * this.maxRetries) {
        console.log(`[GeminiService] Retryable error on key ${this.currentKeyIndex + 1}, rotating...`);
        this.rotateKey();
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`[GeminiService] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.executeWithRetry(operation, attempt + 1);
      }
      
      // If we've exhausted all retries due to rate limiting, throw a specific error
      if (isRateLimited) {
        const exhaustedError = new Error('LLM_KEYS_EXHAUSTED: All API keys have been rate limited. Please try again later or add more API keys.');
        (exhaustedError as any).code = 'LLM_KEYS_EXHAUSTED';
        (exhaustedError as any).isRateLimited = true;
        throw exhaustedError;
      }
      
      throw error;
    }
  }

  /**
   * Generate simple text response (for chat assistant)
   */
  async generate(prompt: string): Promise<string> {
    try {
      const result = await this.executeWithRetry(async (model) => {
        const response = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: this.generationConfig,
        });
        return response.response.text();
      });
      return result;
    } catch (error: any) {
      console.error('[GeminiService] Error generating text:', error);
      throw new Error('Failed to generate response');
    }
  }

  /**
   * Generate a database schema from natural language description
   * Uses multi-step approach for complex schemas
   */
  async generateSchema(request: SchemaRequest): Promise<Schema> {
    // Estimate complexity based on description
    const minExpectedTables = this.estimateMinimumTables(request.description);
    console.log(`[GeminiService] Expected minimum tables: ${minExpectedTables}`);
    
    // For complex schemas (5+ tables), use multi-step generation
    if (minExpectedTables >= 5) {
      console.log(`[GeminiService] Using multi-step generation for complex schema`);
      return this.generateSchemaMultiStep(request, minExpectedTables);
    }
    
    // For simpler schemas, use single-step generation
    return this.generateSchemaSingleStep(request, minExpectedTables);
  }

  /**
   * Single-step schema generation for simpler schemas
   */
  private async generateSchemaSingleStep(request: SchemaRequest, minExpectedTables: number): Promise<Schema> {
    const prompt = schemaPrompts.buildSchemaPrompt(request);
    
    let attempts = 0;
    const maxSchemaAttempts = 3;
    
    while (attempts < maxSchemaAttempts) {
      attempts++;
      
      const schema = await this.executeWithRetry(async (model) => {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            ...this.generationConfig,
            maxOutputTokens: 16384,
            temperature: 0.3,
          },
        });

        const response = result.response.text();
        console.log(`[GeminiService] Schema response length: ${response.length} chars`);
        return this.parseSchemaResponse(response, request.databaseType);
      });
      
      const tableCount = schema.tables?.length || 0;
      if (tableCount >= minExpectedTables) {
        console.log(`[GeminiService] Schema complete: ${tableCount} tables`);
        return schema;
      }
      
      if (attempts < maxSchemaAttempts) {
        console.log(`[GeminiService] Incomplete schema (${tableCount}/${minExpectedTables} tables). Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        return schema;
      }
    }
    
    throw new Error('Failed to generate schema');
  }

  /**
   * Multi-step schema generation for complex schemas
   * Step 1: Get list of all tables needed
   * Step 2: Generate table details in batches
   * Step 3: Combine into final schema
   */
  private async generateSchemaMultiStep(request: SchemaRequest, minExpectedTables: number): Promise<Schema> {
    // Step 1: Get list of tables (with retry if too few tables)
    console.log(`[GeminiService] Step 1: Getting table list...`);
    
    let tableList: { schemaName: string; description: string; tables: Array<{ name: string; purpose: string }> };
    let tableListAttempts = 0;
    const maxTableListAttempts = 3;
    
    while (tableListAttempts < maxTableListAttempts) {
      tableListAttempts++;
      const tableListPrompt = schemaPrompts.buildTableListPrompt(request);
      
      const tableListResponse = await this.executeWithRetry(async (model) => {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: tableListPrompt }] }],
          generationConfig: {
            ...this.generationConfig,
            maxOutputTokens: 4096,
            temperature: 0.4 + (tableListAttempts * 0.1), // Slightly increase temperature on retries
          },
        });
        return result.response.text();
      });
      
      tableList = this.parseTableList(tableListResponse);
      console.log(`[GeminiService] Attempt ${tableListAttempts}: Identified ${tableList.tables.length} tables`);
      
      if (tableList.tables.length >= Math.min(minExpectedTables, 6)) {
        break;
      }
      
      console.log(`[GeminiService] Too few tables (${tableList.tables.length}), retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`[GeminiService] Final table list: ${tableList!.tables.map(t => t.name).join(', ')}`);
    
    // If still too few tables, fall back to single-step generation
    if (tableList!.tables.length < 3) {
      console.log(`[GeminiService] Falling back to single-step generation due to insufficient tables`);
      return this.generateSchemaSingleStep(request, minExpectedTables);
    }
    
    // Step 2: Generate table details in batches
    const allTableNames = tableList!.tables.map(t => t.name);
    const batchSize = 4; // Reduced batch size for better reliability
    const allTables: any[] = [];
    
    for (let i = 0; i < allTableNames.length; i += batchSize) {
      const batch = allTableNames.slice(i, i + batchSize);
      console.log(`[GeminiService] Step 2: Generating tables ${i + 1}-${Math.min(i + batchSize, allTableNames.length)}/${allTableNames.length}: ${batch.join(', ')}`);
      
      // Retry batch generation if we get 0 valid tables
      let batchTables: any[] = [];
      let batchAttempts = 0;
      const maxBatchAttempts = 3;
      
      while (batchAttempts < maxBatchAttempts && batchTables.length === 0) {
        batchAttempts++;
        
        const tableDetailsPrompt = schemaPrompts.buildTableDetailsPrompt(request, batch, allTableNames);
        
        const tableDetailsResponse = await this.executeWithRetry(async (model) => {
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: tableDetailsPrompt }] }],
            generationConfig: {
              ...this.generationConfig,
              maxOutputTokens: 8192,
              temperature: 0.2 + (batchAttempts * 0.1),
            },
          });
          return result.response.text();
        });
        
        batchTables = this.parseTableBatch(tableDetailsResponse);
        
        if (batchTables.length === 0 && batchAttempts < maxBatchAttempts) {
          console.log(`[GeminiService] Batch returned 0 valid tables, retrying (${batchAttempts}/${maxBatchAttempts})...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`[GeminiService] Got ${batchTables.length} valid table definitions`);
      allTables.push(...batchTables);
      
      // Delay between batches
      if (i + batchSize < allTableNames.length) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    // If multi-step failed to produce tables, fall back
    if (allTables.length === 0) {
      console.log(`[GeminiService] Multi-step produced no tables, falling back to single-step`);
      return this.generateSchemaSingleStep(request, minExpectedTables);
    }
    
    // Step 3: Combine into final schema
    console.log(`[GeminiService] Step 3: Combining ${allTables.length} tables into final schema`);
    
    const schema: Schema = {
      name: tableList!.schemaName || 'generated_schema',
      description: tableList!.description || request.description,
      tables: allTables,
      relationships: this.extractRelationships(allTables),
      databaseType: request.databaseType,
      createdAt: new Date(),
    };
    
    // Validate the combined schema
    schema.tables = schema.tables.map(table => this.normalizeTable(table));
    
    console.log(`[GeminiService] Multi-step generation complete: ${schema.tables.length} tables`);
    schema.tables.forEach(t => {
      console.log(`  - ${t.name}: ${t.columns?.length || 0} columns`);
    });
    
    return schema;
  }

  /**
   * Parse table list from AI response
   */
  private parseTableList(response: string): { schemaName: string; description: string; tables: Array<{ name: string; purpose: string }> } {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                        response.match(/```\s*([\s\S]*?)\s*```/) ||
                        response.match(/\{[\s\S]*"tables"[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(this.repairJSON(jsonStr));
        
        // Filter out invalid table entries (must have name and not look like a column)
        let tables = Array.isArray(parsed.tables) ? parsed.tables : [];
        tables = tables.filter((t: any) => {
          if (!t.name) return false;
          // Filter out column-like names
          const columnPatterns = /_id$|_at$|_by$|_date$|_time$|_name$|_type$|_status$/i;
          if (columnPatterns.test(t.name) && !t.purpose) return false;
          return true;
        });
        
        return {
          schemaName: parsed.schemaName || parsed.name || 'schema',
          description: parsed.description || '',
          tables,
        };
      }
    } catch (error) {
      console.error('[GeminiService] Error parsing table list:', error);
    }
    
    // Fallback: extract table names from text
    const tableMatches = response.match(/["`']?([a-z_]+)["`']?\s*[-:]\s*[A-Z]/g);
    const tables = tableMatches?.map(m => ({
      name: m.replace(/["`':\-\s].*/g, '').trim(),
      purpose: '',
    })) || [];
    
    return { schemaName: 'schema', description: '', tables };
  }

  /**
   * Parse table batch from AI response - with strict validation
   */
  private parseTableBatch(response: string): any[] {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                        response.match(/```\s*([\s\S]*?)\s*```/) ||
                        response.match(/\{[\s\S]*"tables"[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(this.repairJSON(jsonStr));
        
        let tables = Array.isArray(parsed.tables) ? parsed.tables : 
                     Array.isArray(parsed) ? parsed : [];
        
        // STRICT VALIDATION: Only accept tables with valid columns array
        const validTables = tables.filter((table: any) => {
          // Must have a name
          if (!table.name || typeof table.name !== 'string') {
            console.log(`[GeminiService] Rejecting table: no name`);
            return false;
          }
          
          // Reject if name looks like a column (ends with _id, _at, etc.)
          const columnPatterns = /^(id|.*_id|.*_at|.*_by|.*_date|.*_time|.*_name|.*_type|.*_status|.*_code|.*_no|.*_number|created_at|updated_at|deleted_at)$/i;
          if (columnPatterns.test(table.name)) {
            console.log(`[GeminiService] Rejecting "${table.name}": looks like a column name`);
            return false;
          }
          
          // Must have columns array with at least one column
          if (!Array.isArray(table.columns) || table.columns.length === 0) {
            console.log(`[GeminiService] Rejecting "${table.name}": no columns array`);
            return false;
          }
          
          // Validate that columns have proper structure
          const validColumns = table.columns.filter((col: any) => 
            col && col.name && typeof col.name === 'string' && col.type
          );
          
          if (validColumns.length === 0) {
            console.log(`[GeminiService] Rejecting "${table.name}": no valid columns`);
            return false;
          }
          
          // Update columns to only valid ones
          table.columns = validColumns;
          return true;
        });
        
        console.log(`[GeminiService] Validated ${validTables.length}/${tables.length} tables from batch`);
        return validTables;
      }
    } catch (error) {
      console.error('[GeminiService] Error parsing table batch:', error);
    }
    
    return [];
  }

  /**
   * Normalize a table definition
   */
  private normalizeTable(table: any): any {
    return {
      name: table.name || 'unknown',
      comment: table.comment || table.description || '',
      columns: (table.columns || []).map((col: any) => ({
        name: col.name,
        type: col.type || 'TEXT',
        nullable: col.nullable ?? true,
        primaryKey: col.primaryKey ?? false,
        unique: col.unique ?? false,
        autoIncrement: col.autoIncrement ?? false,
        defaultValue: col.defaultValue || null,
        references: col.references || null,
        comment: col.comment || col.description || '',
      })),
      indexes: table.indexes || [],
      primaryKey: table.primaryKey || table.columns?.filter((c: any) => c.primaryKey).map((c: any) => c.name) || [],
    };
  }

  /**
   * Extract relationships from tables based on foreign keys
   */
  private extractRelationships(tables: any[]): any[] {
    const relationships: any[] = [];
    
    for (const table of tables) {
      for (const column of (table.columns || [])) {
        if (column.references) {
          relationships.push({
            name: `fk_${table.name}_${column.name}`,
            fromTable: table.name,
            fromColumn: column.name,
            toTable: column.references.table,
            toColumn: column.references.column || 'id',
            type: 'many-to-one',
          });
        }
      }
    }
    
    return relationships;
  }

  /**
   * Estimate minimum expected tables from description
   */
  private estimateMinimumTables(description: string): number {
    const lowerDesc = description.toLowerCase();
    
    // Look for explicit table mentions
    const tablePatterns = [
      /\b(users?|accounts?)\b/gi,
      /\b(products?|items?|goods?)\b/gi,
      /\b(orders?|purchases?|transactions?)\b/gi,
      /\b(customers?|clients?)\b/gi,
      /\b(employees?|staff|workers?)\b/gi,
      /\b(departments?)\b/gi,
      /\b(patients?)\b/gi,
      /\b(doctors?|physicians?)\b/gi,
      /\b(appointments?|bookings?)\b/gi,
      /\b(medical\s*records?|health\s*records?)\b/gi,
      /\b(prescriptions?|medications?|medicines?)\b/gi,
      /\b(categories?)\b/gi,
      /\b(reviews?|ratings?|comments?)\b/gi,
      /\b(posts?|articles?|content)\b/gi,
      /\b(courses?|lessons?|classes?)\b/gi,
      /\b(students?|learners?|enrollments?)\b/gi,
      /\b(inventory|stock|warehouses?)\b/gi,
      /\b(suppliers?|vendors?)\b/gi,
      /\b(invoices?|bills?|payments?)\b/gi,
      /\b(rooms?|beds?|wards?)\b/gi,
      /\b(admissions?|discharges?)\b/gi,
      /\b(billing|charges?)\b/gi,
    ];
    
    let matchCount = 0;
    for (const pattern of tablePatterns) {
      if (pattern.test(lowerDesc)) {
        matchCount++;
      }
    }
    
    // Minimum 2 tables, maximum estimation based on matches
    return Math.max(2, Math.min(matchCount, 10));
  }

  /**
   * Generate SQL query from natural language
   */
  async generateQuery(request: QueryRequest): Promise<GeneratedQuery> {
    const prompt = queryPrompts.buildQueryPrompt(request);
    
    return this.executeWithRetry(async (model) => {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { 
          ...this.generationConfig, 
          temperature: 0.3,
          maxOutputTokens: 16384, // Increased for complex queries
        },
      });

      const response = result.response.text();
      return this.parseQueryResponse(response, request);
    });
  }

  /**
   * AI-Powered Query Analysis - Performance, Readability, Suggestions
   */
  async analyzeQuery(sql: string, schema: Schema, databaseType: DatabaseType): Promise<QueryAnalysis> {
    const prompt = analysisPrompts.buildAnalysisPrompt(sql, schema, databaseType);
    
    return this.executeWithRetry(async (model) => {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { ...this.generationConfig, temperature: 0.2 },
      });

      const response = result.response.text();
      return this.parseAnalysisResponse(response);
    });
  }

  /**
   * Optimize a SQL query
   */
  async optimizeQuery(sql: string, schema: Schema, databaseType: DatabaseType): Promise<{
    optimizedSql: string;
    optimizations: QueryOptimization[];
    explanation: string;
  }> {
    const prompt = queryPrompts.buildOptimizationPrompt(sql, schema, databaseType);
    console.log('[GeminiService] optimizeQuery - prompt generated, length:', prompt.length);
    
    return this.executeWithRetry(async (model) => {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { ...this.generationConfig, temperature: 0.2 },
      });

      const response = result.response.text();
      console.log('[GeminiService] optimizeQuery - received response, length:', response.length);
      console.log('[GeminiService] optimizeQuery - response preview:', response.substring(0, 1000));
      
      const parsed = this.parseOptimizationResponse(response);
      console.log('[GeminiService] optimizeQuery - parsed result:', {
        hasOptimizedSql: !!parsed.optimizedSql,
        optimizationsCount: parsed.optimizations?.length || 0,
        hasExplanation: !!parsed.explanation
      });
      
      return parsed;
    });
  }

  /**
   * Generate code (entities, repositories, etc.)
   */
  async generateCode(request: CodeRequest): Promise<GeneratedCode> {
    const prompt = codePrompts.buildCodePrompt(request);
    console.log('[GeminiService] generateCode - prompt length:', prompt.length);
    
    return this.executeWithRetry(async (model) => {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          ...this.generationConfig,
          maxOutputTokens: 32768, // Increase for code generation (code can be very large)
        },
      });

      const response = result.response.text();
      console.log('[GeminiService] generateCode - response length:', response.length);
      return this.parseCodeResponse(response, request);
    });
  }

  /**
   * Explain a SQL query in plain English
   */
  async explainQuery(sql: string, databaseType: DatabaseType): Promise<string> {
    const prompt = `
You are a SQL expert. Explain this ${databaseType} query in plain English, step by step.
Make it easy to understand for someone who doesn't know SQL well.

Query:
${sql}

Provide:
1. A simple one-sentence summary
2. Step-by-step breakdown of what each part does
3. The expected result description
`;
    
    return this.executeWithRetry(async (model) => {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { ...this.generationConfig, temperature: 0.5 },
      });

      return result.response.text();
    });
  }

  /**
   * Suggest indexes based on query patterns
   */
  async suggestIndexes(queries: string[], schema: Schema, databaseType: DatabaseType): Promise<{
    indexes: Array<{
      table: string;
      columns: string[];
      type: string;
      reason: string;
      createStatement: string;
    }>;
  }> {
    const prompt = analysisPrompts.buildIndexSuggestionPrompt(queries, schema, databaseType);
    
    return this.executeWithRetry(async (model) => {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { ...this.generationConfig, temperature: 0.2 },
      });

      const response = result.response.text();
      return this.parseIndexResponse(response);
    });
  }

  /**
   * Chat with AI about database/SQL questions
   */
  async chat(message: string, context?: { schema?: Schema; recentQueries?: string[] }): Promise<string> {
    let prompt = `You are an expert database architect and SQL developer assistant. 
Help the user with their database-related questions. Be concise but thorough.

`;
    
    if (context?.schema) {
      prompt += `Current Schema Context:
${JSON.stringify(context.schema, null, 2)}

`;
    }
    
    if (context?.recentQueries?.length) {
      prompt += `Recent Queries:
${context.recentQueries.join('\n')}

`;
    }
    
    prompt += `User Question: ${message}`;
    
    return this.executeWithRetry(async (model) => {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: this.generationConfig,
      });

      return result.response.text();
    });
  }

  // ============ PRIVATE PARSING METHODS ============

  private parseSchemaResponse(response: string, databaseType: DatabaseType): Schema {
    try {
      console.log('[GeminiService] Raw AI response (first 500 chars):', response.substring(0, 500));
      
      // Try multiple JSON extraction patterns
      let jsonStr = '';
      
      // Pattern 1: ```json ... ```
      const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1].trim();
      }
      
      // Pattern 2: ``` ... ``` (without json label)
      if (!jsonStr) {
        const codeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch && codeBlockMatch[1].trim().startsWith('{')) {
          jsonStr = codeBlockMatch[1].trim();
        }
      }
      
      // Pattern 3: Find JSON object directly
      if (!jsonStr) {
        const jsonObjectMatch = response.match(/\{[\s\S]*"tables"[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonStr = jsonObjectMatch[0];
        }
      }
      
      // Pattern 4: Any JSON object
      if (!jsonStr) {
        const anyJsonMatch = response.match(/\{[\s\S]*\}/);
        if (anyJsonMatch) {
          jsonStr = anyJsonMatch[0];
        }
      }
      
      if (jsonStr) {
        // Repair common JSON issues
        jsonStr = this.repairJSON(jsonStr);
        
        console.log('[GeminiService] Extracted JSON length:', jsonStr.length);
        console.log('[GeminiService] JSON start:', jsonStr.substring(0, 200));
        console.log('[GeminiService] JSON end:', jsonStr.substring(jsonStr.length - 200));
        
        try {
          let parsed = JSON.parse(jsonStr);
          
          // Validate and fix schema structure
          parsed = this.validateAndFixSchemaStructure(parsed);
          
          // Ensure required fields exist
          if (!parsed.tables) {
            parsed.tables = [];
          }
          
          console.log(`[GeminiService] Parsed schema: ${parsed.tables.length} tables`);
          parsed.tables.forEach((t: any) => {
            console.log(`  - ${t.name}: ${t.columns?.length || 0} columns`);
          });
          
          return {
            ...parsed,
            databaseType,
            createdAt: new Date(),
          };
        } catch (parseError: any) {
          console.error('[GeminiService] JSON parse error:', parseError.message);
          
          // Try to find position of error
          const posMatch = parseError.message.match(/position (\d+)/);
          if (posMatch) {
            const pos = parseInt(posMatch[1]);
            console.error('[GeminiService] Error context:', jsonStr.substring(Math.max(0, pos - 50), pos + 50));
          }
          throw parseError;
        }
      }
      
      console.error('[GeminiService] Could not find JSON in response');
      console.error('[GeminiService] Response preview:', response.substring(0, 1000));
      throw new Error('Could not parse schema from response');
    } catch (error: any) {
      console.error('[GeminiService] Error parsing schema response:', error.message);
      throw new Error(`Failed to parse schema from AI response: ${error.message}`);
    }
  }

  private parseQueryResponse(response: string, request: QueryRequest): GeneratedQuery {
    try {
      // Try to extract JSON
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to extract SQL
      const sqlMatch = response.match(/```sql\n?([\s\S]*?)\n?```/);
      const sql = sqlMatch ? sqlMatch[1].trim() : response.trim();

      // Extract explanation
      const explanationMatch = response.match(/explanation[:\s]*([\s\S]*?)(?=```|$)/i);
      const explanation = explanationMatch ? explanationMatch[1].trim() : '';

      return {
        sql,
        explanation,
        queryType: request.queryType || 'select',
        tables: this.extractTablesFromQuery(sql),
        estimatedComplexity: this.estimateComplexity(sql),
      };
    } catch (error) {
      console.error('Error parsing query response:', error);
      throw new Error('Failed to parse query from AI response');
    }
  }

  private parseAnalysisResponse(response: string): QueryAnalysis {
    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Default analysis structure if parsing fails
      return {
        performanceScore: 70,
        readabilityScore: 80,
        complexityLevel: 'moderate',
        estimatedExecutionTime: 'N/A',
        potentialIssues: [],
        suggestions: [],
        indexRecommendations: [],
        alternativeQueries: [],
      };
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      return {
        performanceScore: 0,
        readabilityScore: 0,
        complexityLevel: 'complex',
        estimatedExecutionTime: 'Unknown',
        potentialIssues: [{
          severity: 'warning',
          type: 'parse_error',
          message: 'Could not fully analyze query',
          recommendation: 'Please review manually',
        }],
        suggestions: [],
        indexRecommendations: [],
        alternativeQueries: [],
      };
    }
  }

  private parseOptimizationResponse(response: string): {
    optimizedSql: string;
    optimizations: QueryOptimization[];
    explanation: string;
  } {
    try {
      console.log('[GeminiService] parseOptimizationResponse - raw response length:', response.length);
      console.log('[GeminiService] parseOptimizationResponse - first 1000 chars:', response.substring(0, 1000));
      
      // SPECIAL CASE: Check if response itself is a nested JSON string
      // This happens when AI returns JSON wrapped in code blocks as a string value
      if (response.includes('"optimizedSql": "```json')) {
        console.log('[GeminiService] Detected nested JSON in response');
        const nestedJsonMatch = response.match(/"optimizedSql":\s*"```json\s*([\s\S]*?)\s*```"/);
        if (nestedJsonMatch) {
          const escapedJson = nestedJsonMatch[1];
          // Unescape the JSON string
          const unescaped = escapedJson.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          console.log('[GeminiService] Extracted nested JSON:', unescaped.substring(0, 500));
          
          try {
            const parsed = JSON.parse(unescaped);
            if (parsed.optimizedSql && parsed.explanation) {
              console.log('[GeminiService] Successfully parsed nested JSON');
              return {
                optimizedSql: parsed.optimizedSql,
                optimizations: Array.isArray(parsed.optimizations) ? parsed.optimizations : [],
                explanation: parsed.explanation,
              };
            }
          } catch (e) {
            console.error('[GeminiService] Failed to parse nested JSON:', e);
          }
        }
      }
      
      // Try to extract JSON from ```json block
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        console.log('[GeminiService] Found JSON block');
        const jsonStr = jsonMatch[1].trim();
        console.log('[GeminiService] JSON string:', jsonStr.substring(0, 500));
        
        try {
          const parsed = JSON.parse(jsonStr);
          console.log('[GeminiService] Successfully parsed JSON:', {
            hasOptimizedSql: !!parsed.optimizedSql,
            hasExplanation: !!parsed.explanation,
            optimizationsCount: parsed.optimizations?.length || 0
          });
          
          // Validate the parsed object has required fields
          if (parsed.optimizedSql && parsed.explanation) {
            return {
              optimizedSql: parsed.optimizedSql,
              optimizations: Array.isArray(parsed.optimizations) ? parsed.optimizations : [],
              explanation: parsed.explanation,
            };
          }
        } catch (parseErr) {
          console.error('[GeminiService] JSON parse error:', parseErr);
        }
      }

      // Try to find raw JSON object without code block markers
      const rawJsonMatch = response.match(/\{[\s\S]*?"optimizedSql"[\s\S]*?"explanation"[\s\S]*?\}/);
      if (rawJsonMatch) {
        console.log('[GeminiService] Found raw JSON object');
        try {
          const parsed = JSON.parse(rawJsonMatch[0]);
          if (parsed.optimizedSql && parsed.explanation) {
            return {
              optimizedSql: parsed.optimizedSql,
              optimizations: Array.isArray(parsed.optimizations) ? parsed.optimizations : [],
              explanation: parsed.explanation,
            };
          }
        } catch (parseErr) {
          console.error('[GeminiService] Raw JSON parse error:', parseErr);
        }
      }

      // Fallback: Try to parse entire response as JSON
      try {
        const parsed = JSON.parse(response);
        if (parsed.optimizedSql && parsed.explanation) {
          console.log('[GeminiService] Parsed entire response as JSON');
          return {
            optimizedSql: parsed.optimizedSql,
            optimizations: Array.isArray(parsed.optimizations) ? parsed.optimizations : [],
            explanation: parsed.explanation,
          };
        }
      } catch (e) {
        console.log('[GeminiService] Could not parse entire response as JSON');
      }

      // If no valid JSON found, extract SQL from sql code block
      const sqlMatch = response.match(/```sql\s*([\s\S]*?)\s*```/);
      console.warn('[GeminiService] No valid JSON found, using fallback');
      return {
        optimizedSql: sqlMatch ? sqlMatch[1].trim() : response.trim(),
        optimizations: [],
        explanation: 'Could not parse optimization details from response. The AI may not have returned valid JSON format.',
      };
    } catch (error) {
      console.error('[GeminiService] parseOptimizationResponse error:', error);
      return {
        optimizedSql: '',
        optimizations: [],
        explanation: 'Failed to parse optimization response: ' + (error as Error).message,
      };
    }
  }

  private parseCodeResponse(response: string, request: CodeRequest): GeneratedCode {
    try {
      console.log('[GeminiService] parseCodeResponse - raw response length:', response.length);
      console.log('[GeminiService] parseCodeResponse - first 2000 chars:', response.substring(0, 2000));
      
      // Pattern 1: Try to extract JSON from ```json block
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        console.log('[GeminiService] Found JSON block, attempting to parse...');
        try {
          const jsonStr = jsonMatch[1].trim();
          console.log('[GeminiService] JSON string length:', jsonStr.length);
          const parsed = JSON.parse(jsonStr);
          if (parsed.files && Array.isArray(parsed.files) && parsed.files.length > 0) {
            console.log('[GeminiService] Successfully parsed JSON with', parsed.files.length, 'files');
            // Ensure each file has the required type field
            const files = parsed.files.map((f: any) => ({
              path: f.path || '/',
              filename: f.filename || 'generated.txt',
              content: f.content || '',
              type: f.type || this.inferFileType(f.filename || ''),
            }));
            return {
              files,
              language: request.language,
              framework: request.framework,
              projectStructure: parsed.projectStructure || '',
            };
          } else {
            console.log('[GeminiService] JSON parsed but files array is empty or missing');
          }
        } catch (parseError: any) {
          console.log('[GeminiService] JSON parse error:', parseError.message);
        }
      }

      // Pattern 2: Try to find raw JSON object without code block markers
      const rawJsonMatch = response.match(/\{[\s\S]*"files"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
      if (rawJsonMatch) {
        console.log('[GeminiService] Found potential raw JSON object...');
        try {
          const parsed = JSON.parse(rawJsonMatch[0]);
          if (parsed.files && Array.isArray(parsed.files) && parsed.files.length > 0) {
            console.log('[GeminiService] Parsed raw JSON with', parsed.files.length, 'files');
            const files = parsed.files.map((f: any) => ({
              path: f.path || '/',
              filename: f.filename || 'generated.txt',
              content: f.content || '',
              type: f.type || this.inferFileType(f.filename || ''),
            }));
            return {
              files,
              language: request.language,
              framework: request.framework,
              projectStructure: parsed.projectStructure || '',
            };
          }
        } catch (e) {
          console.log('[GeminiService] Raw JSON parse failed');
        }
      }

      // Pattern 3: Extract individual code blocks with filenames
      console.log('[GeminiService] No valid JSON found, extracting code blocks...');
      const files: Array<{
        path: string;
        filename: string;
        content: string;
        type: 'entity' | 'repository' | 'service' | 'controller' | 'migration' | 'dto' | 'config' | 'other';
      }> = [];

      // Look for patterns like: // File: User.java or ### User.java or **User.java**
      const filePatterns = [
        /(?:\/\/\s*(?:File|filename):\s*|###\s*|\*\*)([\w.]+)\*?\*?\s*\n```(\w+)?\s*\n([\s\S]*?)```/gi,
        /```(\w+)\s*\n\/\/\s*([\w.]+)\s*\n([\s\S]*?)```/gi,
      ];

      for (const pattern of filePatterns) {
        const matches = response.matchAll(pattern);
        for (const match of matches) {
          const filename = match[1] || match[2] || `file.${match[2] || 'txt'}`;
          const content = match[3] || match[2];
          const type = this.inferFileType(filename);
          
          files.push({
            path: this.inferFilePath(filename, request.language),
            filename: filename,
            content: content.trim(),
            type,
          });
        }
      }

      // Pattern 4: Extract all code blocks and infer filenames
      if (files.length === 0) {
        // More flexible regex that handles various code block formats
        const codeBlocks = [...response.matchAll(/```(\w+)?[\s\n]*([\s\S]*?)[\s\n]*```/g)];
        console.log('[GeminiService] Found', codeBlocks.length, 'code blocks');
        
        for (const block of codeBlocks) {
          const lang = block[1] || 'txt';
          const content = block[2]?.trim();
          
          if (!content || content.length < 10) continue;
          if (lang === 'json' && content.startsWith('{')) continue; // Skip JSON config blocks
          
          console.log('[GeminiService] Processing code block, lang:', lang, 'length:', content.length);
          
          // Try to extract class/interface name from content
          const classMatch = content.match(/(?:public\s+)?(?:class|interface|enum|abstract\s+class)\s+(\w+)/);
          const className = classMatch ? classMatch[1] : null;
          
          console.log('[GeminiService] Extracted class name:', className);
          
          let filename: string;
          let type: 'entity' | 'repository' | 'service' | 'controller' | 'migration' | 'dto' | 'config' | 'other';
          
          if (className) {
            if (className.toLowerCase().includes('repository') || className.toLowerCase().includes('dao')) {
              type = 'repository';
              filename = `${className}.${this.getExtension(lang)}`;
            } else if (className.toLowerCase().includes('service')) {
              type = 'service';
              filename = `${className}.${this.getExtension(lang)}`;
            } else if (className.toLowerCase().includes('controller') || className.toLowerCase().includes('resource')) {
              type = 'controller';
              filename = `${className}.${this.getExtension(lang)}`;
            } else if (className.toLowerCase().includes('dto') || className.toLowerCase().includes('request') || className.toLowerCase().includes('response')) {
              type = 'dto';
              filename = `${className}.${this.getExtension(lang)}`;
            } else if (className.toLowerCase().includes('config') || className.toLowerCase().includes('configuration')) {
              type = 'config';
              filename = `${className}.${this.getExtension(lang)}`;
            } else {
              type = 'entity';
              filename = `${className}.${this.getExtension(lang)}`;
            }
          } else {
            type = 'other';
            filename = `generated_${files.length + 1}.${this.getExtension(lang)}`;
          }
          
          files.push({
            path: this.inferFilePath(filename, request.language),
            filename,
            content,
            type,
          });
        }
      }

      console.log('[GeminiService] Extracted', files.length, 'files total');

      return {
        files,
        language: request.language,
        framework: request.framework,
        projectStructure: '',
      };
    } catch (error) {
      console.error('[GeminiService] parseCodeResponse error:', error);
      throw new Error('Failed to parse code from AI response');
    }
  }

  private inferFileType(filename: string): 'entity' | 'repository' | 'service' | 'controller' | 'migration' | 'dto' | 'config' | 'other' {
    const lower = filename.toLowerCase();
    if (lower.includes('repository') || lower.includes('dao')) return 'repository';
    if (lower.includes('service')) return 'service';
    if (lower.includes('controller') || lower.includes('resource')) return 'controller';
    if (lower.includes('migration') || lower.includes('v1__')) return 'migration';
    if (lower.includes('dto') || lower.includes('request') || lower.includes('response')) return 'dto';
    if (lower.includes('config') || lower.includes('application.')) return 'config';
    return 'entity';
  }

  private inferFilePath(filename: string, language: TargetLanguage): string {
    const type = this.inferFileType(filename);
    const pathMap: Record<string, Record<TargetLanguage, string>> = {
      entity: { java: 'src/main/java/com/app/model/', python: 'app/models/', nodejs: 'src/entities/', csharp: 'Models/', go: 'models/' },
      repository: { java: 'src/main/java/com/app/repository/', python: 'app/repositories/', nodejs: 'src/repositories/', csharp: 'Repositories/', go: 'repositories/' },
      service: { java: 'src/main/java/com/app/service/', python: 'app/services/', nodejs: 'src/services/', csharp: 'Services/', go: 'services/' },
      controller: { java: 'src/main/java/com/app/controller/', python: 'app/controllers/', nodejs: 'src/controllers/', csharp: 'Controllers/', go: 'handlers/' },
      migration: { java: 'src/main/resources/db/migration/', python: 'migrations/', nodejs: 'prisma/migrations/', csharp: 'Migrations/', go: 'migrations/' },
      dto: { java: 'src/main/java/com/app/dto/', python: 'app/schemas/', nodejs: 'src/dto/', csharp: 'DTOs/', go: 'dto/' },
      config: { java: 'src/main/java/com/app/config/', python: 'app/config/', nodejs: 'src/config/', csharp: 'Config/', go: 'config/' },
      other: { java: 'src/main/java/com/app/', python: 'app/', nodejs: 'src/', csharp: '/', go: '/' },
    };
    return pathMap[type]?.[language] || '/';
  }

  private getExtension(lang: string): string {
    const extMap: Record<string, string> = {
      java: 'java',
      python: 'py',
      typescript: 'ts',
      javascript: 'js',
      csharp: 'cs',
      go: 'go',
      sql: 'sql',
      prisma: 'prisma',
    };
    return extMap[lang.toLowerCase()] || 'txt';
  }

  private parseIndexResponse(response: string): {
    indexes: Array<{
      table: string;
      columns: string[];
      type: string;
      reason: string;
      createStatement: string;
    }>;
  } {
    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      return { indexes: [] };
    } catch {
      return { indexes: [] };
    }
  }

  private extractTablesFromQuery(sql: string): string[] {
    const tables: string[] = [];
    const fromMatch = sql.match(/FROM\s+(\w+)/gi);
    const joinMatch = sql.match(/JOIN\s+(\w+)/gi);
    
    if (fromMatch) {
      fromMatch.forEach(m => {
        const table = m.replace(/FROM\s+/i, '');
        if (!tables.includes(table)) tables.push(table);
      });
    }
    
    if (joinMatch) {
      joinMatch.forEach(m => {
        const table = m.replace(/JOIN\s+/i, '');
        if (!tables.includes(table)) tables.push(table);
      });
    }
    
    return tables;
  }

  private estimateComplexity(sql: string): 'simple' | 'moderate' | 'complex' {
    const upper = sql.toUpperCase();
    let score = 0;
    
    if (upper.includes('JOIN')) score += 2;
    if (upper.includes('SUBQUERY') || upper.match(/\(\s*SELECT/)) score += 3;
    if (upper.includes('WITH')) score += 2;
    if (upper.includes('GROUP BY')) score += 1;
    if (upper.includes('HAVING')) score += 1;
    if (upper.includes('UNION')) score += 2;
    if (upper.includes('OVER(') || upper.includes('OVER (')) score += 3;
    
    if (score <= 2) return 'simple';
    if (score <= 5) return 'moderate';
    return 'complex';
  }

  /**
   * Validate and fix schema structure - ensure tables have proper columns array
   */
  private validateAndFixSchemaStructure(schema: any): any {
    if (!schema || !schema.tables || !Array.isArray(schema.tables)) {
      return schema;
    }

    const validTables: any[] = [];
    const seenTableNames = new Set<string>();

    for (const item of schema.tables) {
      // Skip if no name
      if (!item.name) continue;
      
      // Skip duplicates
      if (seenTableNames.has(item.name)) continue;

      // Check if this is actually a table (has columns array) or just a column/index masquerading as table
      const hasColumns = Array.isArray(item.columns) && item.columns.length > 0;
      const hasValidStructure = hasColumns || item.comment || item.indexes;
      
      // If it looks like a column name (common column patterns), skip it
      const columnPatterns = [
        /^(id|_id)$/i,
        /_(id|at|date|time|by|name|type|status|code|no|num|number)$/i,
        /^(created|updated|deleted|modified)_at$/i,
        /^idx_/i,  // Index names
        /^fk_/i,   // Foreign key names
        /^pk_/i,   // Primary key names
      ];
      
      const looksLikeColumn = columnPatterns.some(p => p.test(item.name)) && !hasColumns;
      
      if (looksLikeColumn) {
        console.log(`[GeminiService] Skipping invalid table entry: ${item.name} (looks like a column)`);
        continue;
      }

      // If table has no columns but has a name that looks like a real table, keep it
      if (!hasColumns) {
        // Check if name looks like a real table name (plurals, common table patterns)
        const tablePatterns = [
          /s$/,  // Plural names
          /ies$/,
          /(user|patient|doctor|employee|department|billing|order|product|item|category|role|permission|log|history|record|transaction|inventory|medicine|procedure|admission|visit|salary|payment)/i
        ];
        
        const looksLikeTable = tablePatterns.some(p => p.test(item.name));
        
        if (!looksLikeTable) {
          console.log(`[GeminiService] Skipping invalid table entry: ${item.name} (no columns, doesn't look like table)`);
          continue;
        }
      }

      // Ensure columns is an array
      if (!Array.isArray(item.columns)) {
        item.columns = [];
      }

      // Ensure indexes is an array
      if (!Array.isArray(item.indexes)) {
        item.indexes = [];
      }

      // Validate columns
      item.columns = item.columns.filter((col: any) => {
        return col && col.name && typeof col.name === 'string';
      }).map((col: any) => ({
        name: col.name,
        type: col.type || 'TEXT',
        nullable: col.nullable ?? true,
        primaryKey: col.primaryKey ?? false,
        unique: col.unique ?? false,
        autoIncrement: col.autoIncrement ?? false,
        defaultValue: col.defaultValue || null,
        references: col.references || null,
        comment: col.comment || col.description || '',
      }));

      // Extract primaryKey array
      if (!Array.isArray(item.primaryKey)) {
        item.primaryKey = item.columns
          .filter((c: any) => c.primaryKey)
          .map((c: any) => c.name);
      }

      seenTableNames.add(item.name);
      validTables.push(item);
    }

    console.log(`[GeminiService] Validated schema: ${validTables.length} valid tables from ${schema.tables.length} entries`);
    
    return {
      ...schema,
      tables: validTables,
    };
  }

  /**
   * Repair malformed JSON from AI responses
   */
  private repairJSON(jsonStr: string): string {
    let repaired = jsonStr;
    
    // Remove control characters except newlines and tabs within strings
    repaired = repaired.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Fix trailing commas
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing commas between array elements or object properties
    repaired = repaired.replace(/}(\s*){/g, '},{');
    repaired = repaired.replace(/](\s*)\[/g, '],[');
    repaired = repaired.replace(/"(\s*)"/g, '","');
    
    // Fix unquoted keys (simple cases)
    repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
    
    // Try to fix truncated JSON by closing open brackets
    const openBraces = (repaired.match(/{/g) || []).length;
    const closeBraces = (repaired.match(/}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/]/g) || []).length;
    
    // Add missing closing brackets/braces
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += ']';
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += '}';
    }
    
    // If JSON still fails, try to extract just the tables array
    try {
      JSON.parse(repaired);
      return repaired;
    } catch {
      // Try to salvage by finding complete table objects
      const tablesMatch = repaired.match(/"tables"\s*:\s*\[([\s\S]*)/);
      if (tablesMatch) {
        const tablesContent = tablesMatch[1];
        const tables: any[] = [];
        
        // Extract individual table objects
        const tableRegex = /\{[^{}]*"name"\s*:\s*"[^"]+"/g;
        let match;
        while ((match = tableRegex.exec(tablesContent)) !== null) {
          try {
            // Find the complete object
            let depth = 0;
            let start = match.index;
            let end = start;
            for (let i = start; i < tablesContent.length; i++) {
              if (tablesContent[i] === '{') depth++;
              if (tablesContent[i] === '}') {
                depth--;
                if (depth === 0) {
                  end = i + 1;
                  break;
                }
              }
            }
            const tableStr = tablesContent.substring(start, end);
            const table = JSON.parse(tableStr);
            tables.push(table);
          } catch {
            // Skip malformed table
          }
        }
        
        if (tables.length > 0) {
          console.log(`[GeminiService] Salvaged ${tables.length} tables from malformed JSON`);
          return JSON.stringify({ tables });
        }
      }
      
      return repaired;
    }
  }
}

export const geminiService = new GeminiService();
