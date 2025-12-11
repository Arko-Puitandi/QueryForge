import { wsManager, WSClient, WSMessage } from '../websocket/WebSocketServer.js';
import { GeminiService } from '../llm/geminiService.js';
import { PromptOrchestrator } from '../orchestrator/PromptOrchestrator.js';
import { responseCache, CacheKeys } from '../cache/ResponseCache.js';
import { schemaFormatter } from '../schema/schemaFormatter.js';
import { DatabaseType, SchemaRequest } from '../../types/index.js';

const geminiService = new GeminiService();
const orchestrator = new PromptOrchestrator(geminiService);

/**
 * Register all WebSocket message handlers
 */
export function registerWebSocketHandlers(): void {
  
  // Schema generation with progress updates
  wsManager.registerHandler('generateSchema', async (client: WSClient, message: WSMessage) => {
    const { description, databaseType, options } = message.payload;
    const requestId = message.requestId!;

    console.log(`[WS Handler] generateSchema request from ${client.id}`);
    console.log(`[WS Handler] Description length: ${description?.length} chars`);

    // Check cache first
    const cacheKey = CacheKeys.schema(databaseType, description);
    const cached = responseCache.get(cacheKey) as { schema: any; sql: string } | null;
    if (cached) {
      console.log(`[WS Handler] Cache hit for schema`);
      wsManager.sendResult(client.id, requestId, { 
        schema: cached.schema, 
        sql: cached.sql,
        fromCache: true 
      });
      return;
    }

    try {
      // Send progress: Starting
      wsManager.sendProgress(client.id, requestId, 1, 4, 'Analyzing requirements');

      // Build the request
      const request: SchemaRequest = {
        description,
        databaseType: databaseType as DatabaseType,
        options: options || {},
      };

      // Send progress: Generating
      wsManager.sendProgress(client.id, requestId, 2, 4, 'Generating schema with AI');

      // Generate schema using Gemini
      const schema = await geminiService.generateSchema(request);

      // Send progress: Formatting
      wsManager.sendProgress(client.id, requestId, 3, 4, 'Formatting SQL');

      // Format to SQL
      const sql = schemaFormatter.format(schema, databaseType as DatabaseType);

      // Send progress: Complete
      wsManager.sendProgress(client.id, requestId, 4, 4, 'Complete');

      const result = { schema, sql };

      // Cache the result
      responseCache.set(cacheKey, result, 15 * 60 * 1000); // 15 min cache

      console.log(`[WS Handler] Schema generated successfully: ${schema.tables?.length || 0} tables`);

      // Send final result
      wsManager.sendResult(client.id, requestId, {
        finalResult: result,
        summary: `Generated ${schema.tables?.length || 0} tables`,
      });

    } catch (error: any) {
      console.error(`[WS Handler] generateSchema error:`, error.message);
      wsManager.sendToClient(client.id, {
        type: 'error',
        payload: { error: error.message },
        requestId,
        timestamp: Date.now(),
      });
    }
  });

  // Query generation with multi-step processing
  wsManager.registerHandler('generateQuery', async (client: WSClient, message: WSMessage) => {
    const { naturalLanguage, schema, databaseType, options } = message.payload;
    const requestId = message.requestId!;

    console.log(`[WS Handler] generateQuery request from ${client.id}`);

    try {
      // Send initial progress
      wsManager.sendProgress(client.id, requestId, 1, 3, 'Analyzing query intent');

      const result = await orchestrator.executePlan(
        await orchestrator.analyzeAndPlanSteps({
          prompt: naturalLanguage,
          databaseType: databaseType as DatabaseType,
          schema,
        }),
        {
          prompt: naturalLanguage,
          databaseType: databaseType as DatabaseType,
          schema,
        },
        client.id,
        requestId
      );

      wsManager.sendResult(client.id, requestId, result.finalResult);
    } catch (error: any) {
      wsManager.sendToClient(client.id, {
        type: 'error',
        payload: { error: error.message },
        requestId,
        timestamp: Date.now(),
      });
    }
  });

  // Streaming chat
  wsManager.registerHandler('chat', async (client: WSClient, message: WSMessage) => {
    const { prompt, context } = message.payload;
    const requestId = message.requestId!;

    console.log(`[WS Handler] chat request from ${client.id}`);

    try {
      await geminiService.streamGenerate(
        prompt,
        (chunk) => wsManager.sendStreamChunk(client.id, requestId, chunk, false),
        (fullText) => wsManager.sendStreamChunk(client.id, requestId, '', true),
        (error) => wsManager.sendToClient(client.id, {
          type: 'error',
          payload: { error: error.message },
          requestId,
          timestamp: Date.now(),
        })
      );
    } catch (error: any) {
      wsManager.sendToClient(client.id, {
        type: 'error',
        payload: { error: error.message },
        requestId,
        timestamp: Date.now(),
      });
    }
  });

  // Multi-step task execution
  wsManager.registerHandler('executeTask', async (client: WSClient, message: WSMessage) => {
    const { prompt, databaseType, schema, options } = message.payload;
    const requestId = message.requestId!;

    console.log(`[WS Handler] executeTask request from ${client.id}: ${prompt.substring(0, 50)}...`);

    try {
      // Plan the steps
      wsManager.sendProgress(client.id, requestId, 0, 1, 'Planning execution steps');
      
      const plan = await orchestrator.analyzeAndPlanSteps({
        prompt,
        databaseType: databaseType as DatabaseType,
        schema,
        context: { preferences: options },
      });

      // Send the plan to client
      wsManager.sendToClient(client.id, {
        type: 'plan',
        payload: plan,
        requestId,
        timestamp: Date.now(),
      });

      // Execute the plan
      const result = await orchestrator.executePlan(
        plan,
        {
          prompt,
          databaseType: databaseType as DatabaseType,
          schema,
          context: { preferences: options },
        },
        client.id,
        requestId
      );

      wsManager.sendResult(client.id, requestId, result);
    } catch (error: any) {
      console.error('[WS Handler] executeTask error:', error);
      wsManager.sendToClient(client.id, {
        type: 'error',
        payload: { error: error.message },
        requestId,
        timestamp: Date.now(),
      });
    }
  });

  // Ping handler for connection testing
  wsManager.registerHandler('ping', async (client: WSClient, message: WSMessage) => {
    wsManager.sendToClient(client.id, {
      type: 'pong',
      payload: { timestamp: Date.now() },
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  });

  // Cache stats handler
  wsManager.registerHandler('getCacheStats', async (client: WSClient, message: WSMessage) => {
    wsManager.sendToClient(client.id, {
      type: 'cacheStats',
      payload: responseCache.getStats(),
      requestId: message.requestId,
      timestamp: Date.now(),
    });
  });

  console.log('[WebSocket Handlers] All handlers registered');
}

export default registerWebSocketHandlers;
