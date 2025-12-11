import { useState, useCallback } from 'react';
import { schemaService } from '../services';
import wsService, { ProgressUpdate } from '../services/websocket';
import { useAppStore, useNotificationStore } from '../stores';
import { Schema, DatabaseType } from '../types';

// Helper to extract error message safely
const getErrorMessage = (err: any): string => {
  // Check for LLM keys exhausted error first
  if (err?.isLLMExhausted || err?.userMessage?.includes('API keys')) {
    return err.userMessage || 'All AI API keys are currently rate limited. Please wait a few minutes and try again.';
  }
  // Check for rate limit error
  if (err?.isRateLimited) {
    return err.userMessage || 'Rate limit exceeded. Please wait a moment and try again.';
  }
  if (typeof err === 'string') return err;
  
  // Extract message from axios response first (server-side error message)
  const serverError = err?.response?.data?.error;
  const serverMessage = err?.response?.data?.message;
  
  if (serverError?.message) {
    // Check for LLM exhausted patterns in server error
    if (serverError.message.includes('LLM_KEYS_EXHAUSTED') || 
        serverError.message.toLowerCase().includes('all api keys have been rate limited')) {
      return 'All AI API keys are currently rate limited. Please wait a few minutes and try again.';
    }
    return serverError.message;
  }
  if (typeof serverError === 'string') return serverError;
  if (serverMessage) return serverMessage;
  
  // Check for axios error with response status but no message
  if (err?.response?.status) {
    const status = err.response.status;
    if (status === 500) return 'Server error occurred. Please check if the server is running and try again.';
    if (status === 503) return 'Service temporarily unavailable. Please try again later.';
    if (status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (status === 400) return 'Invalid request. Please check your input and try again.';
  }
  
  // Fallback to error message, but avoid generic axios messages
  if (err?.message && !err.message.includes('status code')) {
    return err.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

export const useSchema = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  const { 
    currentSchema, 
    setCurrentSchema,
    generatedSql,
    setGeneratedSql,
    selectedDatabase,
    setIsGeneratingSchema,
    syncSchemaToServer,
  } = useAppStore();
  
  const { addNotification } = useNotificationStore();

  // WebSocket-based schema generation with progress
  const generateSchemaWithProgress = useCallback(async (
    description: string,
    databaseType?: DatabaseType,
    options?: { includeConstraints?: boolean; includeIndexes?: boolean }
  ) => {
    setIsLoading(true);
    setIsGeneratingSchema(true);
    setError(null);
    setProgress(null);
    setStatusMessage('Connecting...');

    try {
      await wsService.connect();
      setStatusMessage('Analyzing your description...');

      const result = await wsService.sendRequestAsync<any>(
        'generateSchema',
        {
          description,
          databaseType: databaseType || selectedDatabase,
          options: {
            includeTimestamps: options?.includeConstraints ?? true,
            includeSoftDelete: options?.includeIndexes ?? false,
          },
        },
        (progressUpdate) => {
          setProgress(progressUpdate);
          setStatusMessage(`Step ${progressUpdate.step}/${progressUpdate.totalSteps}: ${progressUpdate.stepName}`);
        }
      );

      if (result.finalResult) {
        const schema = result.finalResult.schema || result.finalResult;
        const sql = result.finalResult.sql || '';
        
        // Sync with server first to get schemaId
        try {
          await syncSchemaToServer(schema, undefined, sql);
        } catch (syncError) {
          console.error('Failed to sync schema to server:', syncError);
          // Still set locally even if sync fails
          setCurrentSchema(schema);
          setGeneratedSql(sql);
        }
      }

      addNotification({
        type: 'success',
        title: 'Schema Generated',
        message: `Generated schema with ${result.finalResult?.schema?.tables?.length || 0} tables`,
      });

      return result.finalResult?.schema;
    } catch (err: any) {
      const message = getErrorMessage(err);
      setError(message);
      addNotification({
        type: 'error',
        title: 'Generation Failed',
        message,
      });
      throw err;
    } finally {
      setIsLoading(false);
      setIsGeneratingSchema(false);
      setProgress(null);
      setStatusMessage('');
    }
  }, [selectedDatabase, setCurrentSchema, setGeneratedSql, setIsGeneratingSchema, addNotification, syncSchemaToServer]);

  // Standard HTTP-based generation (fallback)
  const generateSchema = useCallback(async (
    description: string,
    databaseType?: DatabaseType,
    options?: { includeConstraints?: boolean; includeIndexes?: boolean }
  ) => {
    setIsLoading(true);
    setIsGeneratingSchema(true);
    setError(null);
    setStatusMessage('Generating schema...');

    try {
      const response = await schemaService.generate({
        description,
        databaseType: databaseType || selectedDatabase,
        options: {
          includeTimestamps: options?.includeConstraints ?? true,
          includeSoftDelete: options?.includeIndexes ?? false,
        },
      });

      // Sync schema with server
      try {
        await syncSchemaToServer(response.schema, undefined, response.sql);
      } catch (syncError) {
        console.error('Failed to sync schema to server:', syncError);
        // Still set locally even if sync fails
        setCurrentSchema(response.schema);
        setGeneratedSql(response.sql);
      }
      
      addNotification({
        type: 'success',
        title: 'Schema Generated',
        message: 'Your database schema has been successfully generated.',
      });

      return response.schema;
    } catch (err: any) {
      const message = getErrorMessage(err);
      setError(message);
      addNotification({
        type: 'error',
        title: 'Generation Failed',
        message,
      });
      throw err;
    } finally {
      setIsLoading(false);
      setIsGeneratingSchema(false);
      setStatusMessage('');
    }
  }, [selectedDatabase, setCurrentSchema, setGeneratedSql, setIsGeneratingSchema, addNotification, syncSchemaToServer]);

  const getTemplates = useCallback(async () => {
    try {
      const templates = await schemaService.getTemplates();
      return templates;
    } catch (err: any) {
      const message = getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Fetch Failed',
        message,
      });
      throw err;
    }
  }, [addNotification]);

  const validateSchema = useCallback(async (schema: Schema) => {
    try {
      const response = await schemaService.validate(schema);
      return response;
    } catch (err: any) {
      const message = getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Validation Failed',
        message,
      });
      throw err;
    }
  }, [addNotification]);

  const clearSchema = useCallback(() => {
    setCurrentSchema(null);
    setError(null);
  }, [setCurrentSchema]);

  return {
    currentSchema,
    generatedSql,
    isLoading,
    error,
    progress,
    statusMessage,
    generateSchema,
    generateSchemaWithProgress,
    getTemplates,
    validateSchema,
    clearSchema,
    setCurrentSchema,
  };
};
