import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/category.validator';

const router = Router();

// All category routes require authentication
router.use(requireAuth);

router.get('/', CategoryController.getCategories);
router.post('/', validate(createCategorySchema), CategoryController.createCategory);
router.get('/:id', CategoryController.getCategoryById);
router.put('/:id', validate(updateCategorySchema), CategoryController.updateCategory);
router.delete('/:id', CategoryController.deleteCategory);

export default router;
