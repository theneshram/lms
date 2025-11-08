import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import Certificate from '../models/Certificate.js';
import Badge, { UserBadge } from '../models/Badge.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.post(
  '/templates',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const template = await CertificateTemplate.create(req.body);
    res.json(template);
  })
);

router.get(
  '/templates',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const templates = await CertificateTemplate.find();
    res.json(templates);
  })
);

router.post(
  '/issue',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const certificate = await Certificate.findOneAndUpdate(
      { user: req.body.user, course: req.body.course },
      { ...req.body, issuedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(certificate);
  })
);

router.get(
  '/user/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const certificates = await Certificate.find({ user: req.params.userId });
    res.json(certificates);
  })
);

router.post(
  '/badges',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const badge = await Badge.create(req.body);
    res.json(badge);
  })
);

router.post(
  '/badges/:id/award',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const awarded = await UserBadge.findOneAndUpdate(
      { badge: req.params.id, user: req.body.user },
      { badge: req.params.id, user: req.body.user, course: req.body.course },
      { upsert: true, new: true }
    );
    res.json(awarded);
  })
);

router.get(
  '/badges/user/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const badges = await UserBadge.find({ user: req.params.userId }).populate('badge');
    res.json(badges);
  })
);

export default router;
