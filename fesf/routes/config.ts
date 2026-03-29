// routes/config.ts
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'config route' });
});

export default router;
