import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { GoalController } from '../controllers/goal.controller';
import { createGoalSchema, updateGoalSchema } from '../validators/goal.validator';

const router = Router();

// All goals routes require authentication
router.use(requireAuth);

router.get('/', GoalController.getGoals);
router.post('/', validate(createGoalSchema), GoalController.createGoal);
router.get('/:id', GoalController.getGoalById);
router.put('/:id', validate(updateGoalSchema), GoalController.updateGoal);
router.delete('/:id', GoalController.deleteGoal);

export default router;
