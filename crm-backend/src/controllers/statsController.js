const Lead = require('../models/Lead');
const User = require('../models/User');

const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0));
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function statusBreakdown(match) {
  const rows = await Lead.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const out = { new: 0, contacted: 0, interested: 0, won: 0, lost: 0 };
  rows.forEach((r) => (out[r._id] = r.count));
  return out;
}

async function leadsPerDay(match, days = 14) {
  const rows = await Lead.aggregate([
    { $match: { ...match, createdAt: { $gte: daysAgo(days - 1) } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
        count: { $sum: 1 },
      },
    },
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(daysAgo(i).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    result.push({ date: d, count: map[d] || 0 });
  }
  return result;
}

const rate = (won, total) => (total ? Math.round((won / total) * 1000) / 10 : 0);

exports.admin = async (req, res, next) => {
  try {
    const [total, today, unassigned, status, perDay, bySource, sellersTotal, sellersActive, perSeller, recent] =
      await Promise.all([
        Lead.countDocuments(),
        Lead.countDocuments({ createdAt: { $gte: startOfToday() } }),
        Lead.countDocuments({ assignedTo: null }),
        statusBreakdown({}),
        leadsPerDay({}),
        Lead.aggregate([{ $group: { _id: '$source', count: { $sum: 1 } } }]),
        User.countDocuments({ role: 'seller' }),
        User.countDocuments({ role: 'seller', isActive: true }),
        Lead.aggregate([
          { $match: { assignedTo: { $ne: null } } },
          {
            $group: {
              _id: '$assignedTo',
              total: { $sum: 1 },
              won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
            },
          },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'seller' } },
          { $unwind: '$seller' },
          { $project: { _id: 0, sellerId: '$_id', name: '$seller.name', total: 1, won: 1 } },
          { $sort: { total: -1 } },
        ]),
        Lead.find().sort({ createdAt: -1 }).limit(5).populate('assignedTo', 'name'),
      ]);

    res.json({
      cards: {
        totalLeads: total,
        todayLeads: today,
        unassigned,
        won: status.won,
        conversionRate: rate(status.won, total),
        sellersTotal,
        sellersActive,
      },
      statusBreakdown: status,
      leadsPerDay: perDay,
      sourceBreakdown: bySource.map((s) => ({ source: s._id, count: s.count })),
      sellerPerformance: perSeller.map((s) => ({ ...s, conversionRate: rate(s.won, s.total) })),
      recentLeads: recent,
    });
  } catch (err) {
    next(err);
  }
};

exports.seller = async (req, res, next) => {
  try {
    const match = { assignedTo: req.user._id };
    const [total, today, status, perDay, recent] = await Promise.all([
      Lead.countDocuments(match),
      Lead.countDocuments({ ...match, createdAt: { $gte: startOfToday() } }),
      statusBreakdown(match),
      leadsPerDay(match),
      Lead.find(match).sort({ createdAt: -1 }).limit(5),
    ]);

    res.json({
      cards: {
        totalLeads: total,
        todayLeads: today,
        won: status.won,
        conversionRate: rate(status.won, total),
      },
      statusBreakdown: status,
      leadsPerDay: perDay,
      recentLeads: recent,
    });
  } catch (err) {
    next(err);
  }
};
