import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createAccountSchema,
  updateAccountSchema,
} from '../validators/account.validator';

const router = Router();

// All account routes require authentication
router.use(requireAuth);

router.get('/', AccountController.getAccounts);
router.post('/', validate(createAccountSchema), AccountController.createAccount);
router.get('/:id', AccountController.getAccountById);
router.put('/:id', validate(updateAccountSchema), AccountController.updateAccount);
router.delete('/:id', AccountController.deleteAccount);
router.get('/:id/transactions', AccountController.getAccountTransactions);

export default router;
