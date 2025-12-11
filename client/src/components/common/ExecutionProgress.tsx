import React from 'react';
import { cn } from '../../lib/utils';

interface Step {
  id: number;
  name: string;
  description: string;
  type: 'analysis' | 'generation' | 'validation' | 'optimization';
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface ExecutionProgressProps {
  steps: Step[];
  currentStep: number;
  progress: number;
  isExecuting: boolean;
  className?: string;
}

const stepTypeIcons: Record<string, string> = {
  analysis: '🔍',
  generation: '⚡',
  validation: '✓',
  optimization: '🚀',
};

const stepStatusColors: Record<string, string> = {
  pending: 'bg-gray-200 text-gray-500',
  running: 'bg-blue-500 text-white animate-pulse',
  completed: 'bg-green-500 text-white',
  failed: 'bg-red-500 text-white',
};

export const ExecutionProgress: React.FC<ExecutionProgressProps> = ({
  steps,
  progress,
  isExecuting,
  className,
}) => {
  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Overall Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">
            {isExecuting ? 'Executing...' : progress === 100 ? 'Complete' : 'Ready'}
          </span>
          <span className="text-gray-500">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out',
              progress === 100 ? 'bg-green-500' : 'bg-blue-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-all duration-300',
              step.status === 'running' && 'border-blue-400 bg-blue-50',
              step.status === 'completed' && 'border-green-400 bg-green-50',
              step.status === 'failed' && 'border-red-400 bg-red-50',
              step.status === 'pending' && 'border-gray-200 bg-gray-50'
            )}
          >
            {/* Step Number/Status */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                stepStatusColors[step.status]
              )}
            >
              {step.status === 'completed' ? (
                '✓'
              ) : step.status === 'failed' ? (
                '✗'
              ) : step.status === 'running' ? (
                <span className="animate-spin">⟳</span>
              ) : (
                index + 1
              )}
            </div>

            {/* Step Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{stepTypeIcons[step.type]}</span>
                <span className="font-medium text-gray-900 truncate">
                  {step.name}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">{step.description}</p>
            </div>

            {/* Step Type Badge */}
            <span
              className={cn(
                'px-2 py-1 text-xs rounded-full',
                step.type === 'analysis' && 'bg-purple-100 text-purple-700',
                step.type === 'generation' && 'bg-blue-100 text-blue-700',
                step.type === 'validation' && 'bg-green-100 text-green-700',
                step.type === 'optimization' && 'bg-orange-100 text-orange-700'
              )}
            >
              {step.type}
            </span>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {steps.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No execution steps yet</p>
          <p className="text-sm">Start a task to see progress</p>
        </div>
      )}
    </div>
  );
};

interface StreamingOutputProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

export const StreamingOutput: React.FC<StreamingOutputProps> = ({
  content,
  isStreaming,
  className,
}) => {
  return (
    <div
      className={cn(
        'font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto',
        className
      )}
    >
      <pre className="whitespace-pre-wrap">
        {content}
        {isStreaming && <span className="animate-pulse">▊</span>}
      </pre>
    </div>
  );
};

export default ExecutionProgress;
