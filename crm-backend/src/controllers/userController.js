const User = require('../models/User');
const Lead = require('../models/Lead');

// Admin: seller banana
exports.createSeller = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ message: 'Is email ka user already hai' });
    }
    const seller = await User.create({ name, email, phone, password, role: 'seller' });
    res.status(201).json({ id: seller._id, name: seller.name, email: seller.email, phone: seller.phone, isActive: seller.isActive });
  } catch (err) {
    next(err);
  }
};

// Admin: sellers list (leads count ke saath)
exports.listSellers = async (req, res, next) => {
  try {
    const sellers = await User.find({ role: 'seller' }).sort({ createdAt: -1 }).lean();
    const counts = await Lead.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', total: { $sum: 1 } } },
    ]);
    const map = Object.fromEntries(counts.map((c) => [String(c._id), c.total]));
    res.json(sellers.map((s) => ({ ...s, leadsCount: map[String(s._id)] || 0 })));
  } catch (err) {
    next(err);
  }
};

// Admin: seller edit / block-unblock
exports.updateSeller = async (req, res, next) => {
  try {
    const seller = await User.findOne({ _id: req.params.id, role: 'seller' });
    if (!seller) return res.status(404).json({ message: 'Seller nahi mila' });

    ['name', 'phone', 'isActive'].forEach((f) => {
      if (req.body[f] !== undefined) seller[f] = req.body[f];
    });
    if (req.body.password) seller.password = req.body.password;
    await seller.save();
    res.json({ id: seller._id, name: seller.name, email: seller.email, phone: seller.phone, isActive: seller.isActive });
  } catch (err) {
    next(err);
  }
};
