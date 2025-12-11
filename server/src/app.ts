import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import { wsManager } from './services/websocket/WebSocketServer.js';
import registerWebSocketHandlers from './services/websocket/handlers.js';

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Increase timeout for AI requests (2 minutes)
app.use((req, res, next) => {
  res.setTimeout(120000); // 2 minutes
  next();
});

// Logging
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});
app.use('/api/', limiter);

// API routes
app.use('/api', routes);

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'Text-to-SQL Platform API',
    version: '1.0.0',
    description: 'Enterprise-grade Text-to-SQL platform with AI-powered query generation and analysis',
    endpoints: {
      schema: '/api/schema/*',
      query: '/api/query/*',
      code: '/api/code/*',
      health: '/api/health',
    },
    documentation: '/api/docs',
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize WebSocket server
wsManager.initialize(server);
registerWebSocketHandlers();

// Start server
const PORT = config.port;

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Text-to-SQL Platform Server                          ║
║                                                           ║
║   Server running on: http://localhost:${PORT}               ║
║   WebSocket:         ws://localhost:${PORT}/ws              ║
║   Environment: ${config.nodeEnv.padEnd(40)}║
║                                                           ║
║   API Endpoints:                                          ║
║   • Schema Generation: POST /api/schema/generate          ║
║   • Query Generation:  POST /api/query/generate           ║
║   • Query Analysis:    POST /api/query/analyze            ║
║   • Code Generation:   POST /api/code/generate            ║
║   • Health Check:      GET  /api/health                   ║
║                                                           ║
║   WebSocket Events:                                       ║
║   • generateSchema - Schema generation with progress      ║
║   • generateQuery  - Query generation with steps          ║
║   • executeTask    - Multi-step task execution            ║
║   • chat           - Streaming AI chat                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
