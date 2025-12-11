import { useState, useCallback, useRef, useEffect } from 'react';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface VoiceRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  useGoogleCloud?: boolean;
}

export interface VoiceRecognitionResult {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

function getErrorMessage(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'No speech detected. Please try again.';
    case 'audio-capture':
      return 'Microphone not found. Please check your microphone.';
    case 'not-allowed':
      return 'Microphone access denied. Please allow microphone access.';
    case 'network':
      return 'Network error occurred. Please check your connection.';
    case 'aborted':
      return 'Speech recognition was aborted.';
    case 'language-not-supported':
      return 'Language not supported.';
    case 'service-not-allowed':
      return 'Speech recognition service not allowed.';
    default:
      return `Speech recognition error: ${error}`;
  }
}

const API_BASE_URL = 'http://localhost:3001/api';

export function useVoiceRecognition(options: VoiceRecognitionOptions = {}): VoiceRecognitionResult {
  const {
    continuous = true,  // Keep listening
    interimResults = true,
    language = 'en-US',
    onTranscript,
    onError,
    useGoogleCloud = false,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const shouldRestartRef = useRef(false);

  // Check if Web Speech API is supported
  const isSupported = typeof window !== 'undefined' && 
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

  // Initialize Web Speech API
  useEffect(() => {
    if (!isSupported || useGoogleCloud) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognitionAPI();
    
    const recognition = recognitionRef.current;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        onTranscript?.(finalTranscript, true);
      }
      
      setInterimTranscript(interim);
      if (interim) {
        onTranscript?.(interim, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Ignore no-speech errors when in continuous mode - just restart
      if (event.error === 'no-speech' && shouldRestartRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Already started
        }
        return;
      }
      
      const errorMessage = getErrorMessage(event.error);
      setError(errorMessage);
      onError?.(errorMessage);
      setIsListening(false);
      shouldRestartRef.current = false;
    };

    recognition.onend = () => {
      // Auto-restart if we should still be listening
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Failed to restart
          setIsListening(false);
          shouldRestartRef.current = false;
        }
      } else {
        setIsListening(false);
        setInterimTranscript('');
      }
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    return () => {
      recognition.abort();
    };
  }, [continuous, interimResults, language, onTranscript, onError, isSupported, useGoogleCloud]);

  // Google Cloud Speech-to-Text using MediaRecorder
  const startGoogleCloudRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', language);

          const response = await fetch(`${API_BASE_URL}/voice/transcribe`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Transcription failed');
          }

          const data = await response.json();
          if (data.transcript) {
            setTranscript(prev => prev + data.transcript);
            onTranscript?.(data.transcript, true);
          }
        } catch (err) {
          const errorMsg = 'Failed to transcribe audio with Google Cloud';
          setError(errorMsg);
          onError?.(errorMsg);
        }
        
        setIsListening(false);
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsListening(true);
      setError(null);
    } catch (err) {
      const errorMsg = 'Microphone access denied';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [language, onTranscript, onError]);

  const stopGoogleCloudRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    shouldRestartRef.current = true;  // Enable auto-restart
    
    if (useGoogleCloud) {
      startGoogleCloudRecording();
    } else if (recognitionRef.current && isSupported) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Recognition might already be started
        console.warn('Speech recognition already started');
      }
    } else if (!isSupported) {
      // Fallback to Google Cloud if Web Speech API not supported
      startGoogleCloudRecording();
    }
  }, [useGoogleCloud, isSupported, startGoogleCloudRecording]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;  // Disable auto-restart
    
    if (useGoogleCloud || !isSupported) {
      stopGoogleCloudRecording();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [useGoogleCloud, isSupported, stopGoogleCloudRecording]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    isSupported: isSupported || true, // Google Cloud is always available as fallback
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

export default useVoiceRecognition;
