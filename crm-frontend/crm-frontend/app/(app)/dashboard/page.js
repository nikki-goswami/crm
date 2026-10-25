'use client';
import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { api, useAuthUser, STATUS_HEX } from '@/lib/api';

const FALLBACK = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6'];
const TONES = [
  'border-indigo-500 bg-indigo-50/50 text-indigo-600',
  'border-emerald-500 bg-emerald-50/50 text-emerald-600',
  'border-amber-500 bg-amber-50/50 text-amber-600',
  'border-rose-500 bg-rose-50/50 text-rose-600',
  'border-violet-500 bg-violet-50/50 text-violet-600',
];

const norm = (arr = []) =>
  arr.map((x) => ({
    label: String(x.label ?? x.name ?? x.status ?? x.source ?? x.date ?? x._id ?? ''),
    value: Number(x.value ?? x.count ?? x.total ?? 0),
  }));

const pick = (d, ...keys) => {
  for (const k of keys) {
    if (Array.isArray(d?.[k])) return d[k];
  }
  return [];
};

const hex = (label, i) => (STATUS_HEX && STATUS_HEX[label]) || FALLBACK[i % FALLBACK.length];

function Panel({ title, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-4 text-sm font-bold text-slate-800">{title}</h3>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const user = useAuthUser();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const endpoint = `/stats/${user.role === 'admin' ? 'admin' : 'seller'}`;
    api(endpoint)
      .then((data) => {
        setD(data);
        setErr('');
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span className="text-sm font-medium">Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        <p className="font-semibold">Failed to load dashboard data:</p>
        <p>{err}</p>
      </div>
    );
  }

  if (!d) return null;

  const cardsRaw = d.cards ?? d.summary ?? {};
  const cards = Array.isArray(cardsRaw)
    ? norm(cardsRaw)
    : Object.entries(cardsRaw)
        .filter(([, v]) => typeof v === 'number')
        .map(([label, value]) => ({ label, value }));

  // Status breakdown handling (backend sends object { new, contacted, interested, won, lost })
  let statusList = [];
  if (Array.isArray(d.statusBreakdown)) {
    statusList = d.statusBreakdown;
  } else if (d.statusBreakdown && typeof d.statusBreakdown === 'object') {
    statusList = Object.entries(d.statusBreakdown).map(([label, value]) => ({ label, value }));
  } else {
    statusList = pick(d, 'statusChart', 'byStatus', 'status');
  }
  const status = norm(statusList);

  const trend = norm(pick(d, 'leadsPerDay', 'trend', 'last14Days', 'daily'));
  const source = norm(pick(d, 'sourceBreakdown', 'sourceChart', 'bySource', 'source'));
  const sellers = pick(d, 'sellerPerformance', 'sellers');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {user?.name?.split(' ')[0] || 'User'} 👋
        </h1>
        <p className="text-sm text-slate-500">Today&apos;s leads and overall team pipeline overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => {
          const t = TONES[i % TONES.length].split(' ');
          return (
            <div key={c.label} className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm transition hover:shadow-md ${t[0]}`}>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {c.label.replace(/([A-Z])/g, ' $1')}
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">{c.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Leads Trend (Last 14 Days)" className="lg:col-span-2">
          <div className="h-64">
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => (v && v.length > 5 ? v.slice(5) : v)} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} width={28} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area dataKey="value" name="Leads" stroke="#6366f1" strokeWidth={2.5} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No trend data available</div>
            )}
          </div>
        </Panel>

        <Panel title="Leads by Status">
          <div className="h-48">
            {status.some((s) => s.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={status} dataKey="value" nameKey="label" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="none">
                    {status.map((s, i) => (
                      <Cell key={s.label || i} fill={hex(s.label, i)} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No status data available</div>
            )}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600">
            {status.map((s, i) => (
              <li key={s.label} className="flex items-center gap-1.5 capitalize">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: hex(s.label, i) }} />
                <span>{s.label}</span>
                <b className="ml-auto text-slate-900">{s.value}</b>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Leads by Source">
          <div className="h-56">
            {source.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={source}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} width={28} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" name="Leads" radius={[6, 6, 0, 0]}>
                    {source.map((s, i) => (
                      <Cell key={s.label || i} fill={FALLBACK[(i + 1) % FALLBACK.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No source data available</div>
            )}
          </div>
        </Panel>

        {sellers.length > 0 && (
          <Panel title="Seller Performance">
            <ul className="space-y-4">
              {sellers.map((s, i) => {
                const total = s.total ?? s.leads ?? s.count ?? 0;
                const won = s.won ?? s.converted ?? 0;
                const rate = total ? Math.round((won / total) * 100) : 0;
                return (
                  <li key={s._id ?? s.sellerId ?? i}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-900">{s.name ?? s.seller ?? s.label}</span>
                      <span className="text-slate-500 font-medium">
                        {won}/{total} converted ({rate}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
