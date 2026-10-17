import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createTransactionSchema,
  transferTransactionSchema,
  updateTransactionSchema,
} from '../validators/transaction.validator';

const router = Router();

// All transaction routes require authentication
router.use(requireAuth);

router.get('/', TransactionController.getTransactions);
router.post('/', validate(createTransactionSchema), TransactionController.createTransaction);
router.post('/transfer', validate(transferTransactionSchema), TransactionController.createTransfer);
router.get('/:id', TransactionController.getTransactionById);
router.put('/:id', validate(updateTransactionSchema), TransactionController.updateTransaction);
router.delete('/:id', TransactionController.deleteTransaction);

export default router;
