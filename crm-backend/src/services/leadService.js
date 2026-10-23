const Lead = require('../models/Lead');
const User = require('../models/User');
const { normalizePhone, isValidPhone } = require('../utils/phone');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Lead banane ka EK hi function.
 * Manual, website form, WhatsApp, import, sab yahi call karenge.
 * Sirf `source` badlega.
 */
async function createLead({ name, phone, email, message, source = 'manual', createdBy = null, assignedTo = null }) {
  const normalized = normalizePhone(phone);
  if (!isValidPhone(normalized)) throw httpError(400, 'Valid phone number daalo');

  const existing = await Lead.findOne({ phone: normalized }).populate('assignedTo', 'name');
  if (existing) {
    const who = existing.assignedTo ? ` (${existing.assignedTo.name} ke paas)` : '';
    throw httpError(409, `Yeh number already lead me hai${who}`);
  }

  if (assignedTo) {
    const seller = await User.findOne({ _id: assignedTo, role: 'seller', isActive: true });
    if (!seller) throw httpError(400, 'Seller nahi mila');
  }

  return Lead.create({ name, phone: normalized, email, message, source, createdBy, assignedTo });
}

module.exports = { createLead, httpError };
