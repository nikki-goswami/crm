const router = require('express').Router();
const { body } = require('express-validator');
const { login, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/error');

router.post(
  '/login',
  [body('email').isEmail().withMessage('Valid email daalo'), body('password').notEmpty().withMessage('Password daalo')],
  validate,
  login
);
router.get('/me', protect, me);

module.exports = router;
