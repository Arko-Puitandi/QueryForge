import { useState, useCallback } from 'react';
import { codeService } from '../services';
import { useAppStore, useNotificationStore } from '../stores';
import { Schema, TargetLanguage, GeneratedCode, GeneratedFile } from '../types';

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

export const useCode = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);

  const {
    currentSchema,
    selectedLanguage,
    setIsGeneratingCode,
  } = useAppStore();

  const { addNotification } = useNotificationStore();

  const generateCode = useCallback(async (
    schema?: Schema,
    language?: TargetLanguage,
    options?: {
      includeRepository?: boolean;
      includeService?: boolean;
      includeController?: boolean;
      includeMigration?: boolean;
      includeDTO?: boolean;
      includeValidation?: boolean;
      includeComments?: boolean;
      packageName?: string;
      framework?: string;
    }
  ) => {
    const schemaToUse = schema || currentSchema;
    const lang = language || selectedLanguage;

    if (!schemaToUse) {
      addNotification({
        type: 'warning',
        title: 'No Schema',
        message: 'Please generate or provide a schema first.',
      });
      return;
    }

    setIsLoading(true);
    setIsGeneratingCode(true);
    setError(null);

    try {
      const result = await codeService.generate({
        schema: schemaToUse,
        language: lang,
        framework: options?.framework || 'default',
        options: {
          includeRepository: options?.includeRepository ?? true,
          includeService: options?.includeService ?? true,
          includeController: options?.includeController ?? false,
          includeMigration: options?.includeMigration ?? false,
          includeDTO: options?.includeDTO ?? false,
          includeValidation: options?.includeValidation ?? true,
          includeComments: options?.includeComments ?? true,
          packageName: options?.packageName,
        },
      });

      setGeneratedCode(result);

      addNotification({
        type: 'success',
        title: 'Code Generated',
        message: `${lang} code has been successfully generated.`,
      });

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
      setIsGeneratingCode(false);
    }
  }, [currentSchema, selectedLanguage, setIsGeneratingCode, addNotification]);

  const generatePrisma = useCallback(async (
    schema?: Schema
  ) => {
    const schemaToUse = schema || currentSchema;

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
      const result = await codeService.generatePrisma(schemaToUse);

      // Set generated code so UI updates
      setGeneratedCode({
        files: result.files as GeneratedFile[],
        language: 'nodejs',
        framework: 'prisma',
        projectStructure: 'prisma/',
      });

      addNotification({
        type: 'success',
        title: 'Prisma Schema Generated',
        message: `${result.files.length} Prisma files have been generated.`,
      });

      return result.files;
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
  }, [currentSchema, addNotification]);

  const generateTypeORM = useCallback(async (
    schema?: Schema
  ) => {
    const schemaToUse = schema || currentSchema;

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
      const result = await codeService.generateTypeORM(schemaToUse);

      // Set generated code so UI updates
      setGeneratedCode({
        files: result.files as GeneratedFile[],
        language: 'nodejs',
        framework: 'typeorm',
        projectStructure: 'entities/',
      });

      addNotification({
        type: 'success',
        title: 'TypeORM Entities Generated',
        message: `${result.files.length} TypeORM entity files have been generated.`,
      });

      return result.files;
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
  }, [currentSchema, addNotification]);

  const clearCode = useCallback(() => {
    setGeneratedCode(null);
    setError(null);
  }, []);

  const loadGeneratedCode = useCallback((code: GeneratedCode) => {
    setGeneratedCode(code);
    setError(null);
  }, []);

  return {
    generatedCode,
    isLoading,
    error,
    generateCode,
    generatePrisma,
    generateTypeORM,
    clearCode,
    loadGeneratedCode,
  };
};
