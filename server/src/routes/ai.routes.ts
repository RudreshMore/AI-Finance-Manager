import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { chatInputSchema, monthlySummaryQuerySchema } from '../validators/ai.validator';

const router = Router();

// All AI endpoints require authentication
router.use(requireAuth);

// AI Engine Status Check
router.get('/status', AiController.getStatus);

// Conversational Financial Assistant
router.post(
  '/chat',
  aiLimiter,
  validate(chatInputSchema, 'body'),
  AiController.chat
);

// Grounded Monthly Financial Summary with AI Recommendations
router.get(
  '/monthly-summary',
  aiLimiter,
  validate(monthlySummaryQuerySchema, 'query'),
  AiController.getMonthlySummary
);

export default router;
