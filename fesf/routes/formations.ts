// routes/formations.ts
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'formations route' });
});

export default router;
