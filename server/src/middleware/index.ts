import { Request, Response, NextFunction } from 'express';

// Error handler middleware
export function errorHandler(
  err: Error & { status?: number; code?: string; isRateLimited?: boolean },
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err);

  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';

  // Handle LLM-specific errors
  if (err.code === 'LLM_KEYS_EXHAUSTED' || message.includes('LLM_KEYS_EXHAUSTED')) {
    status = 429;
    code = 'LLM_KEYS_EXHAUSTED';
    message = 'All AI API keys are currently rate limited. Please wait a few minutes and try again.';
  } else if (err.isRateLimited || message.toLowerCase().includes('rate limit') || message.includes('429')) {
    status = 429;
    code = 'RATE_LIMITED';
    message = 'Rate limit exceeded. Please wait a moment and try again.';
  } else if (message.toLowerCase().includes('resource exhausted') || message.toLowerCase().includes('quota exceeded')) {
    status = 429;
    code = 'QUOTA_EXCEEDED';
    message = 'API quota exceeded. Please try again later.';
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

// Not found handler
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  });
}

// Request logger middleware
export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  const start = Date.now();
  
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} - ${_res.statusCode} - ${duration}ms`
    );
  });
  
  next();
}

// Async handler wrapper
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
