import { Router, Request, Response } from 'express';
import { geminiService } from '../services/llm/geminiService.js';

const router = Router();

router.post('/assistant', async (req: Request, res: Response) => {
  try {
    const { currentSchema, database, question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Question is required' },
      });
    }

    const context = `You are an AI database assistant for Wissen Project Generator. Help users with database design, SQL queries, and best practices.

Current Context:
- Database: ${database}
- Schema: ${currentSchema === 'No schema loaded' ? 'None' : currentSchema}

User Question: ${question}

Provide helpful, clear, and actionable advice. If showing code, format it properly. Keep responses concise but informative.`;

    const response = await geminiService.generate(context);

    res.json({
      success: true,
      data: {
        response: response,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[ChatController] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHAT_ERROR',
        message: error.message || 'Failed to process chat request',
      },
    });
  }
});

export default router;
