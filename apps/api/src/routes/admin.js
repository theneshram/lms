import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import SystemSetting from '../models/SystemSetting.js';
import IntegrationConfig from '../models/IntegrationConfig.js';
import AutomationRule from '../models/AutomationRule.js';
import Recommendation from '../models/Recommendation.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.get(
  '/settings',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const settings = await SystemSetting.findOne();
    res.json(settings ?? {});
  })
);

router.post(
  '/settings',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const settings = await SystemSetting.findOneAndUpdate({}, req.body, { upsert: true, new: true });
    res.json(settings);
  })
);

router.get(
  '/integrations',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const integrations = await IntegrationConfig.find();
    res.json(integrations);
  })
);

router.post(
  '/integrations',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const integration = await IntegrationConfig.findOneAndUpdate(
      { type: req.body.type, provider: req.body.provider },
      req.body,
      { upsert: true, new: true }
    );
    res.json(integration);
  })
);

router.post(
  '/automation-rules',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const rule = await AutomationRule.create(req.body);
    res.json(rule);
  })
);

router.get(
  '/automation-rules',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const rules = await AutomationRule.find();
    res.json(rules);
  })
);

router.get(
  '/recommendations/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const recommendations = await Recommendation.findOne({ user: req.params.userId });
    res.json(recommendations ?? { courses: [] });
  })
);

router.post(
  '/recommendations/:userId',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const recommendation = await Recommendation.findOneAndUpdate(
      { user: req.params.userId },
      { user: req.params.userId, courses: req.body.courses, generatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(recommendation);
  })
);

export default router;
