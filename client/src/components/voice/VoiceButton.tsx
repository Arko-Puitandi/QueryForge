import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing?: boolean;
  disabled?: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  isProcessing = false,
  disabled = false,
  onClick,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const baseClasses = `
    relative rounded-full transition-all duration-200 
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const stateClasses = isListening
    ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500'
    : 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={`${baseClasses} ${stateClasses} ${sizeClasses[size]} ${className}`}
      title={isListening ? 'Stop recording' : 'Start voice input'}
    >
      {/* Pulsing animation when listening */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
          <span className="absolute inset-0 rounded-full bg-red-400 animate-pulse" />
        </>
      )}
      
      {/* Icon */}
      <span className="relative z-10 flex items-center justify-center">
        {isProcessing ? (
          <Loader2 size={iconSizes[size]} className="animate-spin" />
        ) : isListening ? (
          <MicOff size={iconSizes[size]} />
        ) : (
          <Mic size={iconSizes[size]} />
        )}
      </span>
    </button>
  );
};

export default VoiceButton;
