import { useState, useCallback, useEffect, useRef } from 'react';
import wsService, { ProgressUpdate, StreamChunk } from '../services/websocket';

export interface Step {
  id: number;
  name: string;
  description: string;
  type: 'analysis' | 'generation' | 'validation' | 'optimization';
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
}

export interface OrchestratorResult {
  plan: ExecutionPlan;
  finalResult: any;
  summary: string;
  executionTime: number;
}

export interface UseOrchestratorOptions {
  onStepStart?: (step: Step) => void;
  onStepComplete?: (step: Step, result: any) => void;
  onStreamChunk?: (chunk: string) => void;
  onPlanReady?: (plan: ExecutionPlan) => void;
}

export interface UseOrchestratorReturn {
  execute: (prompt: string, databaseType: string, schema?: any) => Promise<OrchestratorResult>;
  executeWithStreaming: (prompt: string, databaseType: string, schema?: any) => Promise<void>;
  cancel: () => void;
  plan: ExecutionPlan | null;
  currentStep: Step | null;
  progress: number;
  isExecuting: boolean;
  streamedContent: string;
  error: string | null;
  reset: () => void;
}

export function useOrchestrator(options: UseOrchestratorOptions = {}): UseOrchestratorReturn {
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [progress, setProgress] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setPlan(null);
    setCurrentStep(null);
    setProgress(0);
    setIsExecuting(false);
    setStreamedContent('');
    setError(null);
    requestIdRef.current = null;
  }, []);

  const execute = useCallback(async (
    prompt: string,
    databaseType: string,
    schema?: any
  ): Promise<OrchestratorResult> => {
    reset();
    setIsExecuting(true);

    return new Promise((resolve, reject) => {
      wsService.sendRequest('executeTask', {
        prompt,
        databaseType,
        schema,
      }, {
        onProgress: (progressUpdate: ProgressUpdate) => {
          setProgress(progressUpdate.progress);
          
          if (plan) {
            const step = plan.steps.find(s => s.id === progressUpdate.step);
            if (step) {
              setCurrentStep({ ...step, status: 'running' });
              options.onStepStart?.(step);
            }
          }
        },
        onStream: (chunk: StreamChunk) => {
          if (!chunk.isComplete) {
            setStreamedContent(prev => prev + chunk.chunk);
            options.onStreamChunk?.(chunk.chunk);
          }
        },
        onResult: (result: OrchestratorResult) => {
          setPlan(result.plan);
          setProgress(100);
          setIsExecuting(false);
          resolve(result);
        },
        onError: (err: any) => {
          setError(err.error || 'Execution failed');
          setIsExecuting(false);
          reject(new Error(err.error));
        },
      }).then(reqId => {
        requestIdRef.current = reqId;
      });

      // Also listen for plan updates
      const unsubscribePlan = wsService.subscribe('plan', (message) => {
        if (message.requestId === requestIdRef.current) {
          setPlan(message.payload);
          options.onPlanReady?.(message.payload);
        }
      });

      // Cleanup on completion
      setTimeout(() => unsubscribePlan(), 300000); // 5 minute timeout
    });
  }, [plan, options, reset]);

  const executeWithStreaming = useCallback(async (
    prompt: string,
    databaseType: string,
    schema?: any
  ): Promise<void> => {
    reset();
    setIsExecuting(true);

    return new Promise((resolve, reject) => {
      wsService.sendRequest('chat', {
        prompt,
        context: { schema, databaseType },
      }, {
        onStream: (chunk: StreamChunk) => {
          if (chunk.isComplete) {
            setIsExecuting(false);
            resolve();
          } else {
            setStreamedContent(prev => prev + chunk.chunk);
            options.onStreamChunk?.(chunk.chunk);
          }
        },
        onError: (err: any) => {
          setError(err.error || 'Streaming failed');
          setIsExecuting(false);
          reject(new Error(err.error));
        },
      });
    });
  }, [options, reset]);

  const cancel = useCallback(() => {
    // Currently WebSocket doesn't support cancellation directly
    // but we can reset state
    reset();
  }, [reset]);

  // Connect WebSocket on mount
  useEffect(() => {
    wsService.connect().catch(console.error);
  }, []);

  return {
    execute,
    executeWithStreaming,
    cancel,
    plan,
    currentStep,
    progress,
    isExecuting,
    streamedContent,
    error,
    reset,
  };
}

export default useOrchestrator;
