const mongoose = require('mongoose');

const LEAD_STATUSES = ['new', 'contacted', 'interested', 'won', 'lost'];
const LEAD_SOURCES = ['manual', 'website', 'whatsapp', 'import'];

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // normalized: 91XXXXXXXXXX
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    message: { type: String, trim: true },
    source: { type: String, enum: LEAD_SOURCES, default: 'manual' },
    status: { type: String, enum: LEAD_STATUSES, default: 'new' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: [noteSchema],
  },
  { timestamps: true }
);

leadSchema.index({ name: 'text', email: 'text' });

module.exports = mongoose.model('Lead', leadSchema);
module.exports.LEAD_STATUSES = LEAD_STATUSES;
module.exports.LEAD_SOURCES = LEAD_SOURCES;
