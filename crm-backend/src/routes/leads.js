const router = require('express').Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/error');
const c = require('../controllers/leadController');

router.use(protect);

router.get('/', c.list);
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name daalo'),
    body('phone').notEmpty().withMessage('Phone daalo'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email daalo'),
  ],
  validate,
  c.create
);

router.post('/bulk', authorize('admin'), c.bulkImport);
router.post('/auto-assign', authorize('admin'), c.autoAssign);

router.get('/:id', c.getOne);
router.patch('/:id', c.update);
router.patch('/:id/status', c.updateStatus);
router.post('/:id/notes', [body('text').trim().notEmpty().withMessage('Note likho')], validate, c.addNote);

// sirf admin
router.patch('/:id/assign', authorize('admin'), c.assign);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;
