import { useState, useCallback } from 'react';
import { queryService } from '../services';
import { useAppStore, useNotificationStore } from '../stores';
import { Schema, CRUDOperation, DatabaseType } from '../types';
import { stripSqlComments } from '../lib/utils';

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

export const useQuery = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    currentSchema,
    selectedDatabase,
    generatedQuery,
    setGeneratedQuery,
    queryAnalysis,
    setQueryAnalysis,
    optimizedQuery,
    setOptimizedQuery,
    setIsGeneratingQuery,
    setIsAnalyzingQuery,
    setIsOptimizingQuery,
    setIsExplainingQuery,
    addToHistory,
  } = useAppStore();

  const { addNotification } = useNotificationStore();

  const generateQuery = useCallback(async (
    naturalLanguage: string,
    schema?: Schema,
    databaseType?: DatabaseType
  ) => {
    const schemaToUse = schema || currentSchema;
    const dbType = databaseType || selectedDatabase;

    if (!schemaToUse) {
      addNotification({
        type: 'warning',
        title: 'No Schema',
        message: 'Please generate or provide a schema first.',
      });
      return;
    }

    setIsLoading(true);
    setIsGeneratingQuery(true);
    setError(null);

    try {
      const response = await queryService.generate({
        naturalLanguage,
        schema: schemaToUse,
        databaseType: dbType,
        options: {
          includeExplanation: true,
          optimize: true,
        },
      });

      const result = response;
      setGeneratedQuery(result);

      addToHistory({
        query: result.sql,
        naturalLanguage,
        databaseType: dbType,
      });

      addNotification({
        type: 'success',
        title: 'Query Generated',
        message: 'SQL query has been successfully generated.',
      });

      // Automatically analyze the query performance
      try {
        const cleanSql = stripSqlComments(result.sql);
        const analysis = await queryService.analyze(cleanSql, schemaToUse, dbType);
        setQueryAnalysis(analysis);
      } catch (analyzeErr) {
        console.warn('Auto-analysis failed:', analyzeErr);
        // Don't fail the whole operation if analysis fails
      }

      return result;
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
      setIsGeneratingQuery(false);
    }
  }, [currentSchema, selectedDatabase, setGeneratedQuery, setIsGeneratingQuery, addToHistory, addNotification]);

  const generateCRUD = useCallback(async (
    tableName: string,
    operation: CRUDOperation,
    schema?: Schema,
    databaseType?: DatabaseType
  ) => {
    const schemaToUse = schema || currentSchema;
    const dbType = databaseType || selectedDatabase;

    if (!schemaToUse) {
      addNotification({
        type: 'warning',
        title: 'No Schema',
        message: 'Please generate or provide a schema first.',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await queryService.generateCRUD(tableName, schemaToUse, dbType);

      // Get the correct SQL based on operation type
      let sql = '';
      let explanation = '';
      
      switch (operation) {
        case 'create':
          sql = response.create.single;
          explanation = `INSERT query to create a new record in ${tableName}`;
          break;
        case 'read':
          sql = response.read.all;
          explanation = `SELECT query to read all records from ${tableName}`;
          break;
        case 'update':
          sql = response.update.full;
          explanation = `UPDATE query to modify records in ${tableName}`;
          break;
        case 'delete':
          sql = response.delete.hard;
          explanation = `DELETE query to remove records from ${tableName}`;
          break;
        default:
          sql = response.read.all;
          explanation = `Query for ${tableName}`;
      }

      // Convert CRUD response to GeneratedQuery format for display
      const crudQuery = {
        sql,
        explanation,
        queryType: operation === 'create' ? 'insert' : operation === 'read' ? 'select' : operation === 'update' ? 'update' : 'delete',
        tables: [tableName],
        estimatedComplexity: 'simple' as const,
      };
      setGeneratedQuery(crudQuery as any);

      addNotification({
        type: 'success',
        title: 'CRUD Query Generated',
        message: `${operation.toUpperCase()} query for ${tableName} generated successfully.`,
      });

      return response;
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
    }
  }, [currentSchema, selectedDatabase, setGeneratedQuery, addNotification]);

  const analyzeQuery = useCallback(async (query: string, databaseType?: DatabaseType) => {
    const dbType = databaseType || selectedDatabase;

    if (!currentSchema) {
      addNotification({
        type: 'error',
        title: 'Analysis Failed',
        message: 'No schema available. Please generate or load a schema first.',
      });
      return;
    }

    setIsLoading(true);
    setIsAnalyzingQuery(true);
    setError(null);

    try {
      const cleanSql = stripSqlComments(query);
      const response = await queryService.analyze(cleanSql, currentSchema, dbType);

      setQueryAnalysis(response);

      const score = response.performanceScore;
      const type = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'error';

      addNotification({
        type,
        title: `Performance Score: ${score}/100`,
        message: response.summary || 'Analysis complete',
      });

      return response;
    } catch (err: any) {
      const message = getErrorMessage(err);
      setError(message);
      addNotification({
        type: 'error',
        title: 'Analysis Failed',
        message,
      });
      throw err;
    } finally {
      setIsLoading(false);
      setIsAnalyzingQuery(false);
    }
  }, [selectedDatabase, currentSchema, setQueryAnalysis, setIsAnalyzingQuery, addNotification]);

  const optimizeQuery = useCallback(async (query: string, databaseType?: DatabaseType) => {
    const dbType = databaseType || selectedDatabase;

    if (!currentSchema) {
      addNotification({
        type: 'warning',
        title: 'No Schema',
        message: 'Please load a schema first for better optimization.',
      });
      return;
    }

    setIsLoading(true);
    setIsOptimizingQuery(true);
    setError(null);
    setOptimizedQuery(null);

    try {
      const cleanSql = stripSqlComments(query);
      const response = await queryService.optimize(cleanSql, currentSchema, dbType);

      setOptimizedQuery(response);

      addNotification({
        type: 'success',
        title: 'Query Optimized',
        message: `Successfully optimized with ${response.optimizations.length} improvements.`,
      });

      return response;
    } catch (err: any) {
      const message = getErrorMessage(err);
      setError(message);
      addNotification({
        type: 'error',
        title: 'Optimization Failed',
        message,
      });
      throw err;
    } finally {
      setIsLoading(false);
      setIsOptimizingQuery(false);
    }
  }, [selectedDatabase, currentSchema, addNotification, setIsOptimizingQuery]);

  const explainQuery = useCallback(async (query: string, databaseType?: DatabaseType) => {
    const dbType = databaseType || selectedDatabase;

    setIsLoading(true);
    setIsExplainingQuery(true);
    setError(null);

    try {
      const cleanSql = stripSqlComments(query);
      const response = await queryService.explain(cleanSql, dbType);

      addNotification({
        type: 'info',
        title: 'Explanation Ready',
        message: 'Query explanation has been generated.',
      });

      return response;
    } catch (err: any) {
      const message = getErrorMessage(err);
      setError(message);
      addNotification({
        type: 'error',
        title: 'Explanation Failed',
        message,
      });
      throw err;
    } finally {
      setIsLoading(false);
      setIsExplainingQuery(false);
    }
  }, [selectedDatabase, addNotification, setIsExplainingQuery]);

  const clearQuery = useCallback(() => {
    setGeneratedQuery(null);
    setQueryAnalysis(null);
    setOptimizedQuery(null);
    setError(null);
  }, [setGeneratedQuery, setQueryAnalysis, setOptimizedQuery]);

  return {
    generatedQuery,
    queryAnalysis,
    optimizedQuery,
    isLoading,
    error,
    generateQuery,
    generateCRUD,
    analyzeQuery,
    optimizeQuery,
    explainQuery,
    clearQuery,
  };
};
