// routes/members.ts
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'members route' });
});

export default router;
