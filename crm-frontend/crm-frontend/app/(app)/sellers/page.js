'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, EP, useAuthUser, asList } from '@/lib/api';
import { Modal, Field, Avatar, inputCls } from '@/components/ui';

const isBlocked = (s) => s.isBlocked ?? s.blocked ?? s.isActive === false;

function AddSeller({ onClose, onDone }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api(EP.sellers, { method: 'POST', body: f });
      onDone();
    } catch (er) {
      setErr(er.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Add New Seller" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {err && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        <Field label="Full Name"><input required value={f.name} onChange={set('name')} placeholder="Seller name" className={inputCls} /></Field>
        <Field label="Email Address"><input type="email" required value={f.email} onChange={set('email')} placeholder="seller@company.com" className={inputCls} /></Field>
        <Field label="Phone Number"><input value={f.phone} onChange={set('phone')} placeholder="9876543210" className={inputCls} /></Field>
        <Field label="Password"><input type="password" required minLength={6} value={f.password} onChange={set('password')} placeholder="At least 6 characters" className={inputCls} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 shadow-sm transition">
            {busy ? 'Creating...' : 'Create Seller'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Sellers() {
  const user = useAuthUser();
  const isAdmin = user?.role === 'admin';

  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api(EP.sellers)
      .then((r) => {
        setList(asList(r, 'sellers', 'users', 'data', 'items'));
        setErr('');
      })
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (user && !isAdmin) {
    return <p className="rounded-lg bg-amber-50 p-4 text-amber-800">This page is accessible to administrators only.</p>;
  }

  const toggle = (s) => {
    const currentlyBlocked = isBlocked(s);
    return api(EP.sellerBlock(s._id), {
      method: 'PATCH',
      body: { isActive: currentlyBlocked }, // If currently blocked, set isActive true to unblock
    })
      .then(load)
      .catch((e) => setErr(e.message));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sellers</h1>
          <p className="text-sm text-slate-500">{list?.length ?? 0} team members</p>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition">
          + Add Seller
        </button>
      </div>

      {err && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>{['Seller', 'Phone', 'Status', 'Joined Date', 'Actions'].map((h, i) => <th key={i} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(list ?? []).map((s) => (
              <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} className="h-9 w-9 text-xs" />
                    <div>
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-500">{s.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{s.phone || '-'}</td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${isBlocked(s) ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
                    {isBlocked(s) ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-500 text-xs">
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => toggle(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isBlocked(s) ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                  >
                    {isBlocked(s) ? 'Unblock' : 'Block'}
                  </button>
                </td>
              </tr>
            ))}
            {list && list.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">No sellers found. Click &quot;+ Add Seller&quot; to add the first team member.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && <AddSeller onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />}
    </div>
  );
}
