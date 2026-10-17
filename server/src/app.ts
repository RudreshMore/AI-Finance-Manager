import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { prisma } from './config/db';
import authRoutes from './routes/auth.routes';
import accountRoutes from './routes/account.routes';
import categoryRoutes from './routes/category.routes';
import transactionRoutes from './routes/transaction.routes';
import { ApiError } from './utils/ApiError';

const app = express();

// Security Headers
app.use(helmet());

// CORS configuration supporting credentials (cookies)
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Body and Cookie Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check Endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  try {
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1 as result`;
    dbLatencyMs = Date.now() - dbStartTime;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
    dbError = error instanceof Error ? error.message : 'Unknown database error';
  }

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'ai-finance-manager-api',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      ...(dbError ? { error: dbError } : {}),
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Centralized Error Handling Middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // Handle SyntaxError for bad JSON payloads
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    return res.status(400).json({
      status: 'error',
      message: 'Malformed JSON payload',
    });
  }

  console.error('Unhandled Server Error:', err);

  return res.status(500).json({
    status: 'error',
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
});

export default app;
