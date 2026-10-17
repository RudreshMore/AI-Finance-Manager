import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { BudgetController } from '../controllers/budget.controller';
import {
  createBudgetSchema,
  updateBudgetSchema,
  budgetQuerySchema,
} from '../validators/budget.validator';

const router = Router();

// All budget routes require authentication
router.use(requireAuth);

router.get('/', validate(budgetQuerySchema, 'query'), BudgetController.getBudgets);
router.post('/', validate(createBudgetSchema), BudgetController.createBudget);
router.get('/:id', BudgetController.getBudgetById);
router.put('/:id', validate(updateBudgetSchema), BudgetController.updateBudget);
router.delete('/:id', BudgetController.deleteBudget);

export default router;
