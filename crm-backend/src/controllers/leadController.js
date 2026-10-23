const Lead = require('../models/Lead');
const { LEAD_STATUSES } = require('../models/Lead');
const User = require('../models/User');
const { createLead, httpError } = require('../services/leadService');
const { normalizePhone, isValidPhone } = require('../utils/phone');

// Seller sirf apni lead dekh/badal sakta hai
function canAccess(user, lead) {
  return user.role === 'admin' || String(lead.assignedTo) === String(user._id);
}

exports.create = async (req, res, next) => {
  try {
    const { name, phone, email, message, assignedTo } = req.body;
    const isSeller = req.user.role === 'seller';
    const lead = await createLead({
      name,
      phone,
      email,
      message,
      source: 'manual',
      createdBy: req.user._id,
      // seller banaye to usi ko assign, admin banaye to dropdown wala (ya khali)
      assignedTo: isSeller ? req.user._id : assignedTo || null,
    });
    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { status, source, seller, search, from, to, page = 1, limit = 10 } = req.query;
    const q = {};

    if (req.user.role === 'seller') q.assignedTo = req.user._id;
    else if (seller === 'unassigned') q.assignedTo = null;
    else if (seller) q.assignedTo = seller;

    if (status) q.status = status;
    if (source) q.source = source;
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }
    if (search) {
      const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ name: rx }, { phone: rx }, { email: rx }];
    }

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const [items, total] = await Promise.all([
      Lead.find(q)
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l),
      Lead.countDocuments(q),
    ]);

    res.json({ items, total, page: p, pages: Math.ceil(total / l) });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .populate('notes.by', 'name');
    if (!lead) throw httpError(404, 'Lead nahi mili');
    if (!canAccess(req.user, { assignedTo: lead.assignedTo?._id })) throw httpError(403, 'Access denied');
    res.json(lead);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) throw httpError(404, 'Lead nahi mili');
    if (!canAccess(req.user, lead)) throw httpError(403, 'Access denied');

    ['name', 'email', 'message'].forEach((f) => {
      if (req.body[f] !== undefined) lead[f] = req.body[f];
    });
    await lead.save();
    res.json(lead);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!LEAD_STATUSES.includes(status)) throw httpError(400, 'Galat status');
    const lead = await Lead.findById(req.params.id);
    if (!lead) throw httpError(404, 'Lead nahi mili');
    if (!canAccess(req.user, lead)) throw httpError(403, 'Access denied');

    lead.status = status;
    await lead.save();
    res.json(lead);
  } catch (err) {
    next(err);
  }
};

// Admin: seller assign / reassign
exports.assign = async (req, res, next) => {
  try {
    const { sellerId } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) throw httpError(404, 'Lead nahi mili');

    if (sellerId) {
      const seller = await User.findOne({ _id: sellerId, role: 'seller', isActive: true });
      if (!seller) throw httpError(400, 'Seller nahi mila');
      lead.assignedTo = seller._id;
    } else {
      lead.assignedTo = null;
    }
    await lead.save();
    res.json(await lead.populate('assignedTo', 'name'));
  } catch (err) {
    next(err);
  }
};

exports.addNote = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) throw httpError(404, 'Lead nahi mili');
    if (!canAccess(req.user, lead)) throw httpError(403, 'Access denied');

    lead.notes.push({ text: req.body.text, by: req.user._id });
    await lead.save();
    await lead.populate('notes.by', 'name');
    res.status(201).json(lead.notes);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) throw httpError(404, 'Lead nahi mili');
    res.json({ message: 'Lead delete ho gayi' });
  } catch (err) {
    next(err);
  }
};

// Admin: Bulk Leads Import (e.g., from CSV)
exports.bulkImport = async (req, res, next) => {
  try {
    const { leads = [], autoAssign = false } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ message: 'No leads provided for import' });
    }

    let sellers = [];
    if (autoAssign) {
      sellers = await User.find({ role: 'seller', isActive: true }).select('_id');
    }

    let createdCount = 0;
    let skippedCount = 0;
    const errors = [];
    let sellerIdx = 0;

    for (let i = 0; i < leads.length; i++) {
      const item = leads[i];
      try {
        const normalized = normalizePhone(item.phone);
        if (!isValidPhone(normalized)) {
          skippedCount++;
          errors.push({ row: i + 1, phone: item.phone, error: 'Invalid phone format (needs 10-digit Indian number)' });
          continue;
        }

        const existing = await Lead.findOne({ phone: normalized });
        if (existing) {
          skippedCount++;
          errors.push({ row: i + 1, phone: item.phone, error: 'Phone number already exists in CRM' });
          continue;
        }

        let assignedTo = item.assignedTo || null;
        if (autoAssign && sellers.length > 0 && !assignedTo) {
          assignedTo = sellers[sellerIdx % sellers.length]._id;
          sellerIdx++;
        }

        await Lead.create({
          name: item.name ? String(item.name).trim() : 'Unknown Lead',
          phone: normalized,
          email: item.email ? String(item.email).trim() : undefined,
          message: item.message ? String(item.message).trim() : undefined,
          source: item.source ? String(item.source).trim() : 'import',
          createdBy: req.user._id,
          assignedTo,
        });
        createdCount++;
      } catch (err) {
        skippedCount++;
        errors.push({ row: i + 1, phone: item.phone, error: err.message });
      }
    }

    res.json({
      success: true,
      createdCount,
      skippedCount,
      total: leads.length,
      errors: errors.slice(0, 20),
    });
  } catch (err) {
    next(err);
  }
};

// Admin: Auto-assign unassigned leads among active sellers (Round-Robin)
exports.autoAssign = async (req, res, next) => {
  try {
    const sellers = await User.find({ role: 'seller', isActive: true }).sort({ createdAt: 1 });
    if (sellers.length === 0) {
      return res.status(400).json({ message: 'No active sellers found to assign leads to' });
    }

    const { leadIds } = req.body || {};
    const query = { assignedTo: null };
    if (Array.isArray(leadIds) && leadIds.length > 0) {
      query._id = { $in: leadIds };
    }

    const unassignedLeads = await Lead.find(query).sort({ createdAt: 1 });
    if (unassignedLeads.length === 0) {
      return res.json({ message: 'No unassigned leads found', assignedCount: 0 });
    }

    const bulkOps = unassignedLeads.map((lead, index) => {
      const assignedSeller = sellers[index % sellers.length];
      return {
        updateOne: {
          filter: { _id: lead._id },
          update: { $set: { assignedTo: assignedSeller._id } },
        },
      };
    });

    await Lead.bulkWrite(bulkOps);

    res.json({
      success: true,
      message: `Successfully assigned ${unassignedLeads.length} leads across ${sellers.length} active sellers`,
      assignedCount: unassignedLeads.length,
      sellersCount: sellers.length,
    });
  } catch (err) {
    next(err);
  }
};

