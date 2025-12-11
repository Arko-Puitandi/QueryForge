import { GeminiService } from '../llm/geminiService.js';
import { wsManager } from '../websocket/WebSocketServer.js';
import { Schema, DatabaseType } from '../../types/index.js';

export interface Step {
  id: number;
  name: string;
  description: string;
  type: 'analysis' | 'generation' | 'validation' | 'optimization';
  dependencies: number[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface ExecutionPlan {
  id: string;
  description: string;
  steps: Step[];
  totalSteps: number;
  currentStep: number;
  status: 'planning' | 'executing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
}

export interface OrchestratorRequest {
  prompt: string;
  databaseType: DatabaseType;
  schema?: Schema;
  context?: {
    existingQueries?: string[];
    preferences?: Record<string, any>;
  };
}

export interface OrchestratorResult {
  plan: ExecutionPlan;
  finalResult: any;
  summary: string;
  executionTime: number;
}

export class PromptOrchestrator {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  /**
   * Break down a complex prompt into executable steps using LLM
   */
  async analyzeAndPlanSteps(request: OrchestratorRequest): Promise<ExecutionPlan> {
    const planningPrompt = `
You are an expert task planner for a Text-to-SQL platform. Analyze the following user request and break it down into logical steps.

User Request: "${request.prompt}"
Database Type: ${request.databaseType}
${request.schema ? `Schema Context: ${JSON.stringify(request.schema.tables.map(t => ({ name: t.name, columns: t.columns.map(c => c.name) })))}` : 'No existing schema'}

Break this request into discrete, executable steps. Each step should be one of:
- analysis: Understanding requirements or analyzing existing structure
- generation: Creating SQL, schema, or code
- validation: Checking correctness or consistency  
- optimization: Improving performance or structure

Respond ONLY with valid JSON in this exact format:
{
  "description": "Brief description of the overall task",
  "steps": [
    {
      "id": 1,
      "name": "Step name",
      "description": "What this step does",
      "type": "analysis|generation|validation|optimization",
      "dependencies": [],
      "action": "specific action to take",
      "expectedOutput": "what this step produces"
    }
  ]
}

Rules:
1. Keep steps atomic and focused
2. Order steps logically with proper dependencies
3. Include validation steps where appropriate
4. Maximum 6 steps for any task
5. Each step should produce a concrete output
`;

    try {
      const result = await this.geminiService.chat(planningPrompt);
      const parsed = this.parseJSONResponse(result);
      
      const plan: ExecutionPlan = {
        id: `plan_${Date.now()}`,
        description: parsed.description || request.prompt,
        steps: parsed.steps.map((s: any, index: number) => ({
          id: s.id || index + 1,
          name: s.name,
          description: s.description,
          type: s.type as Step['type'],
          dependencies: s.dependencies || [],
          status: 'pending' as const,
          action: s.action,
          expectedOutput: s.expectedOutput,
        })),
        totalSteps: parsed.steps.length,
        currentStep: 0,
        status: 'planning',
        createdAt: Date.now(),
      };

      return plan;
    } catch (error: any) {
      // Fallback to simple single-step plan
      return {
        id: `plan_${Date.now()}`,
        description: request.prompt,
        steps: [{
          id: 1,
          name: 'Direct Execution',
          description: 'Execute the request directly',
          type: 'generation',
          dependencies: [],
          status: 'pending',
        }],
        totalSteps: 1,
        currentStep: 0,
        status: 'planning',
        createdAt: Date.now(),
      };
    }
  }

  /**
   * Execute a planned step
   */
  private async executeStep(
    step: Step, 
    request: OrchestratorRequest, 
    previousResults: Map<number, any>
  ): Promise<any> {
    const contextFromPrevious = Array.from(previousResults.entries())
      .map(([id, result]) => `Step ${id} result: ${JSON.stringify(result).substring(0, 500)}`)
      .join('\n');

    const executionPrompt = `
You are executing step ${step.id} of a multi-step task.

Step Name: ${step.name}
Step Description: ${step.description}
Step Type: ${step.type}

Original Request: "${request.prompt}"
Database Type: ${request.databaseType}
${request.schema ? `Schema: ${JSON.stringify(request.schema, null, 2)}` : ''}

Previous Results:
${contextFromPrevious || 'None'}

Execute this step and provide the result. 
${step.type === 'generation' ? 'Generate the required SQL or schema.' : ''}
${step.type === 'analysis' ? 'Provide analysis in structured format.' : ''}
${step.type === 'validation' ? 'List any issues found or confirm validity.' : ''}
${step.type === 'optimization' ? 'Suggest optimizations with explanations.' : ''}

Respond with JSON containing:
{
  "success": true/false,
  "output": <your result>,
  "summary": "brief summary of what was done"
}
`;

    const result = await this.geminiService.chat(executionPrompt);
    return this.parseJSONResponse(result);
  }

  /**
   * Execute the full plan with progress updates via WebSocket
   */
  async executePlan(
    plan: ExecutionPlan, 
    request: OrchestratorRequest,
    clientId?: string,
    requestId?: string
  ): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const results = new Map<number, any>();
    
    plan.status = 'executing';

    for (const step of plan.steps) {
      // Check dependencies
      const depsReady = step.dependencies.every(depId => 
        plan.steps.find(s => s.id === depId)?.status === 'completed'
      );

      if (!depsReady) {
        step.status = 'failed';
        step.error = 'Dependencies not met';
        continue;
      }

      // Update progress
      step.status = 'running';
      plan.currentStep = step.id;

      // Send progress via WebSocket if client connected
      if (clientId && requestId) {
        wsManager.sendProgress(
          clientId, 
          requestId, 
          step.id, 
          plan.totalSteps, 
          step.name,
          { description: step.description }
        );
      }

      try {
        console.log(`[Orchestrator] Executing step ${step.id}: ${step.name}`);
        const result = await this.executeStep(step, request, results);
        
        step.result = result;
        step.status = 'completed';
        results.set(step.id, result);

        // Stream intermediate results
        if (clientId && requestId) {
          wsManager.sendStreamChunk(
            clientId, 
            requestId, 
            JSON.stringify({ step: step.id, name: step.name, result: result.summary }),
            false
          );
        }
      } catch (error: any) {
        step.status = 'failed';
        step.error = error.message;
        console.error(`[Orchestrator] Step ${step.id} failed:`, error);
      }
    }

    // Determine final status
    const allCompleted = plan.steps.every(s => s.status === 'completed');
    plan.status = allCompleted ? 'completed' : 'failed';
    plan.completedAt = Date.now();

    // Compile final result
    const finalResult = await this.compileFinalResult(plan, request, results);

    const orchestratorResult: OrchestratorResult = {
      plan,
      finalResult,
      summary: this.generateSummary(plan),
      executionTime: Date.now() - startTime,
    };

    // Send final result via WebSocket
    if (clientId && requestId) {
      wsManager.sendResult(clientId, requestId, orchestratorResult);
    }

    return orchestratorResult;
  }

  /**
   * Compile all step results into a final coherent result
   */
  private async compileFinalResult(
    plan: ExecutionPlan, 
    request: OrchestratorRequest,
    results: Map<number, any>
  ): Promise<any> {
    const allResults = Array.from(results.values());
    
    const compilationPrompt = `
Compile the following step results into a final, coherent response for the user.

Original Request: "${request.prompt}"

Step Results:
${plan.steps.map(s => `
Step ${s.id} (${s.name}): ${s.status}
${s.result ? JSON.stringify(s.result.output || s.result, null, 2) : 'No output'}
`).join('\n')}

Provide a comprehensive final result that:
1. Combines all relevant outputs
2. Presents SQL queries or schemas clearly formatted
3. Includes any important notes or warnings
4. Is ready to be used by the developer

Respond with JSON:
{
  "sql": "final SQL if applicable",
  "schema": {},
  "explanation": "clear explanation",
  "recommendations": [],
  "warnings": []
}
`;

    try {
      const result = await this.geminiService.chat(compilationPrompt);
      return this.parseJSONResponse(result);
    } catch {
      // Return raw results if compilation fails
      return { steps: allResults };
    }
  }

  /**
   * Generate human-readable summary of execution
   */
  private generateSummary(plan: ExecutionPlan): string {
    const completed = plan.steps.filter(s => s.status === 'completed').length;
    const failed = plan.steps.filter(s => s.status === 'failed').length;
    
    let summary = `Executed ${completed}/${plan.totalSteps} steps successfully.`;
    if (failed > 0) {
      summary += ` ${failed} step(s) failed.`;
    }
    
    summary += `\n\nSteps completed:\n`;
    plan.steps.forEach(s => {
      const icon = s.status === 'completed' ? '✓' : s.status === 'failed' ? '✗' : '○';
      summary += `${icon} ${s.name}\n`;
    });
    
    return summary;
  }

  /**
   * Parse JSON from LLM response (handles markdown code blocks)
   */
  private parseJSONResponse(response: string): any {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    
    // Clean up and parse
    const cleaned = jsonStr.trim()
      .replace(/^[^{[]*/, '') // Remove leading non-JSON
      .replace(/[^}\]]*$/, ''); // Remove trailing non-JSON
    
    return JSON.parse(cleaned);
  }

  /**
   * Quick execution without multi-step planning (for simple requests)
   */
  async quickExecute(request: OrchestratorRequest): Promise<any> {
    // Determine if this needs multi-step or can be done directly
    const complexity = this.assessComplexity(request.prompt);
    
    if (complexity === 'simple') {
      // Direct execution for simple requests
      return this.geminiService.chat(request.prompt, { schema: request.schema });
    }
    
    // Multi-step for complex requests
    const plan = await this.analyzeAndPlanSteps(request);
    return this.executePlan(plan, request);
  }

  /**
   * Assess the complexity of a request
   */
  private assessComplexity(prompt: string): 'simple' | 'moderate' | 'complex' {
    const complexIndicators = [
      'multiple', 'several', 'all', 'each', 'every',
      'with relationships', 'foreign key', 'join',
      'optimize', 'performance', 'analyze',
      'complete', 'full', 'comprehensive',
      'step by step', 'stages', 'phases',
    ];
    
    const promptLower = prompt.toLowerCase();
    const indicatorCount = complexIndicators.filter(i => promptLower.includes(i)).length;
    const wordCount = prompt.split(/\s+/).length;
    
    if (indicatorCount >= 3 || wordCount > 50) return 'complex';
    if (indicatorCount >= 1 || wordCount > 25) return 'moderate';
    return 'simple';
  }
}

export default PromptOrchestrator;
