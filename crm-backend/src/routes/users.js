const router = require('express').Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/error');
const c = require('../controllers/userController');

router.use(protect, authorize('admin'));

router.get('/', c.listSellers);
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name daalo'),
    body('email').isEmail().withMessage('Valid email daalo'),
    body('password').isLength({ min: 6 }).withMessage('Password kam se kam 6 character ka ho'),
  ],
  validate,
  c.createSeller
);
router.patch('/:id', c.updateSeller);

module.exports = router;
