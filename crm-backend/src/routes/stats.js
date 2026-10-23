const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/statsController');

router.get('/admin', protect, authorize('admin'), c.admin);
router.get('/seller', protect, authorize('seller'), c.seller);

module.exports = router;
