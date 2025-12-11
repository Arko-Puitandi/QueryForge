import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  gemini: {
    apiKeys: [
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      'AIzaSyDb9LSfPL4TXV-irqAcZEFy6ZXswDrOrqA',
    ].filter(Boolean) as string[],
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
  
  googleCloud: {
    credentials: process.env.GOOGLE_CLOUD_CREDENTIALS || '',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  database: {
    demo: {
      host: process.env.DEMO_DB_HOST || 'localhost',
      port: parseInt(process.env.DEMO_DB_PORT || '5432', 10),
      name: process.env.DEMO_DB_NAME || 'text_to_sql_demo',
      user: process.env.DEMO_DB_USER || 'postgres',
      password: process.env.DEMO_DB_PASSWORD || 'password',
    },
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};

export default config;
