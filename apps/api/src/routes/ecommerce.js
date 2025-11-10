import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import CourseProduct from '../models/CourseProduct.js';
import Coupon from '../models/Coupon.js';
import Affiliate from '../models/Affiliate.js';
import Sale from '../models/Sale.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.post(
  '/products',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const product = await CourseProduct.findOneAndUpdate({ course: req.body.course }, req.body, { upsert: true, new: true });
    res.json(product);
  })
);

router.get(
  '/products',
  requireAuth,
  asyncHandler(async (req, res) => {
    const products = await CourseProduct.find({ visible: true });
    res.json(products);
  })
);

router.post(
  '/coupons',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.create(req.body);
    res.json(coupon);
  })
);

router.post(
  '/coupons/:code/redeem',
  requireAuth,
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findOne({ code: req.params.code });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    if (coupon.endAt && coupon.endAt < new Date()) return res.status(400).json({ message: 'Coupon expired' });
    coupon.used = (coupon.used ?? 0) + 1;
    await coupon.save();
    res.json(coupon);
  })
);

router.post(
  '/affiliates',
  requireAuth,
  asyncHandler(async (req, res) => {
    const affiliate = await Affiliate.findOneAndUpdate({ user: req.user._id }, req.body, { upsert: true, new: true });
    res.json(affiliate);
  })
);

router.post(
  '/sales',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sale = await Sale.create({ ...req.body, user: req.user._id });
    res.json(sale);
  })
);

router.get(
  '/sales',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const sales = await Sale.find().populate('course').populate('affiliate');
    res.json(sales);
  })
);

export default router;
