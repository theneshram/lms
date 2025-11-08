import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import DiscussionForum from '../models/DiscussionForum.js';
import DiscussionThread from '../models/DiscussionThread.js';
import DiscussionPost from '../models/DiscussionPost.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.post(
  '/forums',
  requireAuth,
  asyncHandler(async (req, res) => {
    const forum = await DiscussionForum.create(req.body);
    res.json(forum);
  })
);

router.get(
  '/forums/:courseId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const forums = await DiscussionForum.find({ course: req.params.courseId });
    res.json(forums);
  })
);

router.post(
  '/threads',
  requireAuth,
  asyncHandler(async (req, res) => {
    const thread = await DiscussionThread.create({ ...req.body, createdBy: req.user._id });
    res.json(thread);
  })
);

router.get(
  '/threads/:forumId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const threads = await DiscussionThread.find({ forum: req.params.forumId });
    res.json(threads);
  })
);

router.post(
  '/posts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await DiscussionPost.create({ ...req.body, author: req.user._id });
    res.json(post);
  })
);

router.get(
  '/posts/:threadId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const posts = await DiscussionPost.find({ thread: req.params.threadId }).populate('author', 'name');
    res.json(posts);
  })
);

router.post(
  '/posts/:id/reactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await DiscussionPost.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { reactions: { user: req.user._id, type: req.body.type } } },
      { new: true }
    );
    res.json(post);
  })
);

export default router;
