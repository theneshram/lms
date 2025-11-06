import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Submission from '../models/Submission.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.get('/assignment/:assignmentId', requireAuth, asyncHandler(async (req,res)=>{
  const list = await Submission.find({ assignment: req.params.assignmentId }).populate('student','name email');
  res.json(list);
}));

export default router;