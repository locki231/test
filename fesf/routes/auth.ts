// routes/auth.ts
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'auth route' });
});

export default router;
