import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { AnalyticsController } from '../controllers/analytics.controller';
import { analyticsQuerySchema } from '../validators/analytics.validator';

const router = Router();

// All analytics routes require authentication
router.use(requireAuth);

router.get('/summary', validate(analyticsQuerySchema, 'query'), AnalyticsController.getSummary);
router.get('/category-breakdown', validate(analyticsQuerySchema, 'query'), AnalyticsController.getCategoryBreakdown);
router.get('/monthly-trends', AnalyticsController.getMonthlyTrends);
router.get('/account-balances', AnalyticsController.getAccountBalances);
router.get('/budget-summary', AnalyticsController.getBudgetSummary);
router.get('/goals-summary', AnalyticsController.getGoalsSummary);

export default router;
