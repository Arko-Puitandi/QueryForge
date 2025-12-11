import { Router, Request, Response } from 'express';
import multer from 'multer';
import { SpeechClient } from '@google-cloud/speech';
import config from '../config/index.js';

const router = Router();

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// Initialize Google Cloud Speech client if credentials are available
let speechClient: SpeechClient | null = null;

try {
  if (config.googleCloud?.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    speechClient = new SpeechClient(
      config.googleCloud?.credentials 
        ? { credentials: JSON.parse(config.googleCloud.credentials) }
        : undefined
    );
    console.log('[VoiceRoutes] Google Cloud Speech-to-Text initialized');
  } else {
    console.log('[VoiceRoutes] Google Cloud credentials not found - voice transcription will be limited');
  }
} catch (error) {
  console.error('[VoiceRoutes] Failed to initialize Google Cloud Speech:', error);
}

/**
 * POST /api/voice/transcribe
 * Transcribe audio file to text using Google Cloud Speech-to-Text
 */
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    if (!speechClient) {
      return res.status(503).json({ 
        error: 'Google Cloud Speech-to-Text not configured',
        message: 'Please set GOOGLE_CLOUD_CREDENTIALS in your environment'
      });
    }

    const language = req.body.language || 'en-US';
    const audioBytes = req.file.buffer.toString('base64');

    // Determine audio encoding from mimetype
    let encoding: 'WEBM_OPUS' | 'LINEAR16' | 'FLAC' | 'MP3' | 'OGG_OPUS' = 'WEBM_OPUS';
    if (req.file.mimetype.includes('wav')) {
      encoding = 'LINEAR16';
    } else if (req.file.mimetype.includes('flac')) {
      encoding = 'FLAC';
    } else if (req.file.mimetype.includes('mp3')) {
      encoding = 'MP3';
    } else if (req.file.mimetype.includes('ogg')) {
      encoding = 'OGG_OPUS';
    }

    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: encoding as any,
        sampleRateHertz: 48000,
        languageCode: language,
        enableAutomaticPunctuation: true,
        model: 'latest_long',
        useEnhanced: true,
      },
    };

    console.log(`[VoiceRoutes] Transcribing audio (${req.file.size} bytes, ${encoding}, ${language})`);

    const [response] = await speechClient.recognize(request);
    
    const transcription = response.results
      ?.map(result => result.alternatives?.[0]?.transcript)
      .filter(Boolean)
      .join(' ') || '';

    console.log(`[VoiceRoutes] Transcription complete: "${transcription.substring(0, 100)}..."`);

    res.json({
      transcript: transcription,
      confidence: response.results?.[0]?.alternatives?.[0]?.confidence || 0,
      language,
    });
  } catch (error: any) {
    console.error('[VoiceRoutes] Transcription error:', error);
    res.status(500).json({ 
      error: 'Failed to transcribe audio',
      message: error.message 
    });
  }
});

/**
 * GET /api/voice/status
 * Check if voice transcription is available
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    available: !!speechClient,
    provider: speechClient ? 'google-cloud' : null,
    supportedLanguages: [
      'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 
      'it-IT', 'pt-BR', 'zh-CN', 'ja-JP', 'ko-KR', 
      'hi-IN', 'ar-SA'
    ],
  });
});

export default router;
