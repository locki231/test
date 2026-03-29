// routes/reports.ts
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'reports route' });
});

export default router;
