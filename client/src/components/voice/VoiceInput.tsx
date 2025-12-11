import React, { useState, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, Settings, X } from 'lucide-react';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoSubmit?: boolean;
  showSettings?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  placeholder = 'Click the microphone and speak...',
  className = '',
  disabled = false,
  // autoSubmit = false,
  showSettings = true,
}) => {
  const [useGoogleCloud, setUseGoogleCloud] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const lastSentTranscript = useRef<string>('');

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition({
    useGoogleCloud,
    language,
    continuous: true,  // Keep listening until user stops
    interimResults: true,
  });

  const handleToggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      lastSentTranscript.current = '';
      resetTranscript();
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);

  const handleUseTranscript = () => {
    if (transcript || interimTranscript) {
      onTranscript(transcript + interimTranscript);
      resetTranscript();
    }
  };

  const handleClear = () => {
    resetTranscript();
  };

  const languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'ar-SA', name: 'Arabic' },
  ];

  const displayText = transcript + (interimTranscript ? ` ${interimTranscript}` : '');

  return (
    <div className={`relative ${className}`}>
      {/* Main Voice Input Area */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Voice Input
            </span>
            {isListening && (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Listening...
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {showSettings && (
              <button
                type="button"
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
                title="Voice settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettingsPanel && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">Engine:</label>
                <select
                  value={useGoogleCloud ? 'google' : 'browser'}
                  onChange={(e) => setUseGoogleCloud(e.target.value === 'google')}
                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  disabled={isListening}
                >
                  <option value="browser">Browser (Free)</option>
                  <option value="google">Google Cloud (Accurate)</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">Language:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  disabled={isListening}
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Transcript Display */}
        <div className="p-4 min-h-[100px]">
          {displayText ? (
            <div className="space-y-2">
              <p className="text-gray-800 dark:text-gray-200">
                {transcript}
                {interimTranscript && (
                  <span className="text-gray-400 dark:text-gray-500 italic">
                    {' '}{interimTranscript}
                  </span>
                )}
              </p>
            </div>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm italic">
              {isListening ? 'Speak now...' : placeholder}
            </p>
          )}
          
          {error && (
            <p className="mt-2 text-red-500 text-sm">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {/* Main Mic Button */}
            <button
              type="button"
              onClick={handleToggleListening}
              disabled={disabled || !isSupported}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500'
                  : 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500'
                }
              `}
            >
              {isListening ? (
                <>
                  <span className="absolute inset-0 rounded-lg bg-red-400 animate-pulse opacity-50" />
                  <MicOff className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  <span>Start Recording</span>
                </>
              )}
            </button>

            {displayText && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Clear transcript"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {displayText && (
            <button
              type="button"
              onClick={handleUseTranscript}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              Use This Text
            </button>
          )}
        </div>
      </div>

      {/* Browser Support Warning */}
      {!isSupported && !useGoogleCloud && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Your browser doesn't support Web Speech API. Using Google Cloud Speech-to-Text instead.
        </p>
      )}
    </div>
  );
};

export default VoiceInput;
