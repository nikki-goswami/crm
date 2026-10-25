'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, EP, STATUSES, STATUS_STYLE, useAuthUser, asList } from '@/lib/api';
import { Modal, Field, Avatar, inputCls } from '@/components/ui';

// ---------------------------------------------
// 1. Add Single Lead Modal
// ---------------------------------------------
function AddLead({ sellers, isAdmin, onClose, onDone }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', message: '', source: 'manual', assignedTo: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const body = { name: f.name.trim(), phone: f.phone.trim(), source: f.source };
    if (f.email) body.email = f.email.trim();
    if (f.message) body.message = f.message.trim();
    if (isAdmin && f.assignedTo) body.assignedTo = f.assignedTo;
    try {
      await api(EP.leads, { method: 'POST', body });
      onDone();
    } catch (er) {
      setErr(er.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Add New Lead" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {err && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        <Field label="Full Name"><input required value={f.name} onChange={set('name')} placeholder="Client name" className={inputCls} /></Field>
        <Field label="Phone Number"><input required value={f.phone} onChange={set('phone')} placeholder="9876543210 (10 digits)" className={inputCls} /></Field>
        <Field label="Email Address (optional)"><input type="email" value={f.email} onChange={set('email')} placeholder="client@example.com" className={inputCls} /></Field>
        <Field label="Source">
          <select value={f.source} onChange={set('source')} className={inputCls}>
            <option value="manual">Manual Entry</option>
            <option value="website">Website</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="import">Imported</option>
          </select>
        </Field>
        <Field label="Notes / Initial Requirement (optional)">
          <textarea rows={2} value={f.message} onChange={set('message')} placeholder="e.g. Interested in 2BHK apartment" className={inputCls} />
        </Field>
        {isAdmin && (
          <Field label="Assign Seller (optional)">
            <select value={f.assignedTo} onChange={set('assignedTo')} className={inputCls}>
              <option value="">Leave Unassigned (or use Auto-Assign)</option>
              {sellers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 shadow-sm transition">
            {busy ? 'Saving...' : 'Save Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------
// 2. Lead Details & Call/Notes Timeline Modal
// ---------------------------------------------
function LeadDetailsModal({ leadId, isAdmin, sellers, onClose, onRefresh }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState('');

  const fetchLead = useCallback(() => {
    api(EP.leadDetails(leadId))
      .then((data) => {
        setLead(data);
        setErr('');
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  async function handleAddNote(e) {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      await api(EP.leadNotes(leadId), {
        method: 'POST',
        body: { text: newNote.trim() },
      });
      setNewNote('');
      fetchLead();
      onRefresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSavingNote(false);
    }
  }

  async function handleStatusChange(status) {
    try {
      await api(EP.leadStatus(leadId), { method: 'PATCH', body: { status } });
      fetchLead();
      onRefresh();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function handleAssignChange(sellerId) {
    try {
      await api(EP.leadAssign(leadId), { method: 'PATCH', body: { sellerId: sellerId || null } });
      fetchLead();
      onRefresh();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to permanently delete "${lead.name}"?`)) return;
    setDeleting(true);
    try {
      await api(EP.leadDelete(leadId), { method: 'DELETE' });
      onRefresh();
      onClose();
    } catch (e) {
      setErr(e.message);
      setDeleting(false);
    }
  }

  return (
    <Modal title={lead ? lead.name : 'Lead Details'} onClose={onClose} maxWidth="max-w-2xl">
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : lead ? (
        <div className="space-y-6">
          {err && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-4">
            <div>
              <span className="block text-xs font-medium text-slate-500">Phone</span>
              <a href={`tel:${lead.phone}`} className="text-sm font-semibold text-indigo-600 hover:underline font-mono">
                {lead.phone}
              </a>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500">Email</span>
              <span className="text-sm text-slate-800 truncate block">{lead.email || 'None'}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500">Status</span>
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`mt-0.5 cursor-pointer rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 outline-none ${STATUS_STYLE[lead.status] ?? 'bg-white ring-slate-300'}`}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500">Source</span>
              <span className="mt-0.5 inline-block rounded-md bg-slate-200 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                {lead.source}
              </span>
            </div>
          </div>

          {/* Assignment and Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 text-xs text-slate-500">
            <div>
              <span>Created on: </span>
              <strong className="text-slate-700">
                {new Date(lead.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </strong>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <span>Assigned to:</span>
                <select
                  value={lead.assignedTo?._id ?? lead.assignedTo ?? ''}
                  onChange={(e) => handleAssignChange(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {sellers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Initial Message / Note if exists */}
          {lead.message && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 text-sm text-slate-700">
              <span className="block text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">Client Requirement / Inquiry</span>
              <p>{lead.message}</p>
            </div>
          )}

          {/* Call / Notes Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Activity & Call Timeline</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-semibold">{lead.notes?.length || 0}</span>
              </h3>
            </div>

            {/* Add Note Input */}
            <form onSubmit={handleAddNote} className="mb-4 flex gap-2">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Log a call summary, client feedback, or follow-up note..."
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                disabled={savingNote || !newNote.trim()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {savingNote ? 'Adding...' : 'Log Note'}
              </button>
            </form>

            {/* Timeline Stream */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {lead.notes && lead.notes.length > 0 ? (
                lead.notes.slice().reverse().map((n, i) => (
                  <div key={n._id || i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-xs">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">
                      📞
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span className="font-semibold text-slate-700">{n.by?.name || 'Team Member'}</span>
                        <span>{new Date(n.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{n.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                  No call notes recorded yet. Add your first note above!
                </div>
              )}
            </div>
          </div>

          {/* Admin Delete Action */}
          {isAdmin && (
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-400">Admin Actions</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition"
              >
                {deleting ? 'Deleting...' : 'Delete Lead'}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

// ---------------------------------------------
// 3. Bulk CSV Import Modal
// ---------------------------------------------
function ImportCsvModal({ onClose, onDone }) {
  const [csvText, setCsvText] = useState('');
  const [parsedLeads, setParsedLeads] = useState([]);
  const [autoAssign, setAutoAssign] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  }

  function parseCsv(text) {
    try {
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setErr('CSV file must have at least a header line and 1 data row');
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
      const nameIdx = headers.findIndex((h) => h.includes('name'));
      const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile'));
      const emailIdx = headers.findIndex((h) => h.includes('email'));
      const sourceIdx = headers.findIndex((h) => h.includes('source'));
      const msgIdx = headers.findIndex((h) => h.includes('note') || h.includes('message') || h.includes('query'));

      if (nameIdx === -1 || phoneIdx === -1) {
        setErr('CSV must have columns for "name" and "phone"');
        return;
      }

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        // Simple comma split respecting quotes
        const parts = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts[nameIdx] && parts[phoneIdx]) {
          rows.push({
            name: parts[nameIdx],
            phone: parts[phoneIdx],
            email: emailIdx !== -1 ? parts[emailIdx] : '',
            source: sourceIdx !== -1 && parts[sourceIdx] ? parts[sourceIdx] : 'import',
            message: msgIdx !== -1 ? parts[msgIdx] : '',
          });
        }
      }

      setParsedLeads(rows);
      setErr('');
    } catch {
      setErr('Failed to parse CSV file. Please verify format.');
    }
  }

  function downloadSample() {
    const sample = `name,phone,email,source,message\nJohn Doe,9876543210,john@example.com,website,Interested in 2BHK\nPooja Sharma,9876543211,pooja@example.com,whatsapp,Call back tomorrow\n`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crm_sample_leads_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submitImport() {
    if (parsedLeads.length === 0) return;
    setBusy(true);
    setErr('');
    try {
      const res = await api(EP.bulkImport, {
        method: 'POST',
        body: { leads: parsedLeads, autoAssign },
      });
      setResult(res);
      onDone();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Bulk Import Leads via CSV" onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-4">
        {err && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}

        {result ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-3">
            <div className="text-3xl">🎉</div>
            <h3 className="text-base font-bold text-emerald-900">Import Completed Successfully</h3>
            <p className="text-sm text-emerald-800">
              <strong>{result.createdCount}</strong> leads successfully imported into CRM.
              {result.skippedCount > 0 && <span> ({result.skippedCount} skipped as duplicate or invalid format)</span>}
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Done & View Leads
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Required columns: <strong>name, phone</strong> (email, source, message optional)</span>
              <button
                type="button"
                onClick={downloadSample}
                className="text-indigo-600 hover:underline font-semibold"
              >
                📥 Download Sample CSV
              </button>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-indigo-400 transition bg-slate-50/50">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              <p className="mt-2 text-xs text-slate-400">Select a .csv file from your computer</p>
            </div>

            {parsedLeads.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Found {parsedLeads.length} valid rows</span>
                  <label className="flex items-center gap-2 cursor-pointer text-indigo-600">
                    <input
                      type="checkbox"
                      checked={autoAssign}
                      onChange={(e) => setAutoAssign(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Auto-assign to active sellers (Round-Robin)</span>
                  </label>
                </div>

                {/* Preview first 3 items */}
                <div className="rounded-xl border border-slate-200 bg-white p-2.5 max-h-40 overflow-y-auto text-xs divide-y divide-slate-100">
                  {parsedLeads.slice(0, 5).map((l, i) => (
                    <div key={i} className="py-1.5 flex justify-between">
                      <span className="font-semibold text-slate-900">{l.name}</span>
                      <span className="font-mono text-slate-600">{l.phone}</span>
                      <span className="text-slate-400 truncate max-w-[120px]">{l.email || 'No email'}</span>
                    </div>
                  ))}
                  {parsedLeads.length > 5 && (
                    <div className="py-1 text-center text-slate-400 italic">...and {parsedLeads.length - 5} more rows</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
              <button
                disabled={busy || parsedLeads.length === 0}
                onClick={submitImport}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition"
              >
                {busy ? 'Importing Leads...' : `Import ${parsedLeads.length} Leads`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------
// Main Leads Component
// ---------------------------------------------
export default function Leads() {
  const user = useAuthUser();
  const isAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [bannerMsg, setBannerMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    const q = new URLSearchParams({ page, limit: 10 });
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    api(`${EP.leads}?${q}`)
      .then((r) => {
        setRes(r);
        setErr('');
      })
      .catch((e) => setErr(e.message));
  }, [search, status, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (isAdmin) {
      api(EP.sellers)
        .then((r) => setSellers(asList(r, 'sellers', 'users', 'data', 'items')))
        .catch(() => {});
    }
  }, [isAdmin]);

  const act = (p, body) =>
    api(p, { method: 'PATCH', body })
      .then(load)
      .catch((e) => setErr(e.message));

  // Auto Assign Round Robin
  async function triggerAutoAssign() {
    if (!window.confirm('Distribute all unassigned leads equally across active team members using Round-Robin?')) return;
    setAutoAssigning(true);
    try {
      const res = await api(EP.autoAssign, { method: 'POST' });
      setBannerMsg(res.message || 'Leads successfully distributed!');
      load();
      setTimeout(() => setBannerMsg(''), 5000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setAutoAssigning(false);
    }
  }

  // Export to CSV
  async function exportLeadsToCsv() {
    try {
      const data = await api(`${EP.leads}?limit=1000`);
      const items = asList(data, 'items', 'leads', 'data');
      if (items.length === 0) {
        alert('No leads to export');
        return;
      }

      let csv = 'Name,Phone,Email,Status,Source,Assigned Seller,Created Date\n';
      items.forEach((l) => {
        const sellerName = l.assignedTo?.name || 'Unassigned';
        const dateStr = l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-US') : '';
        csv += `"${l.name || ''}","${l.phone || ''}","${l.email || ''}","${l.status || ''}","${l.source || ''}","${sellerName}","${dateStr}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  }

  const leads = asList(res, 'items', 'leads', 'data');
  const pages = res?.pages ?? res?.totalPages ?? 1;
  const total = res?.total ?? leads.length;
  const unassignedCount = leads.filter((l) => !l.assignedTo).length;

  return (
    <div className="space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads Management</h1>
          <p className="text-sm text-slate-500">{total} total leads in pipeline</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV */}
          <button
            type="button"
            onClick={exportLeadsToCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <span>📤</span>
            <span>Export CSV</span>
          </button>

          {/* Admin Tools: Import CSV & Auto-Assign */}
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setOpenImport(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
              >
                <span>📥</span>
                <span>Import CSV</span>
              </button>

              <button
                type="button"
                onClick={triggerAutoAssign}
                disabled={autoAssigning}
                title="Automatically distribute unassigned leads evenly among active sellers"
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-violet-700 disabled:opacity-50 transition"
              >
                <span>⚡</span>
                <span>Auto-Assign Leads</span>
              </button>
            </>
          )}

          {/* Add Single Lead */}
          <button
            onClick={() => setOpenAdd(true)}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <span>+</span>
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Success banner */}
      {bannerMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center justify-between">
          <span>{bannerMsg}</span>
          <button onClick={() => setBannerMsg('')} className="text-emerald-600 font-bold hover:text-emerald-900">×</button>
        </div>
      )}

      {/* Error alert */}
      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-2 items-center justify-between rounded-xl bg-white p-3 border border-slate-200 shadow-xs">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <input
            placeholder="Search by client name or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs capitalize text-slate-900 outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {isAdmin && unassignedCount > 0 && (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            {unassignedCount} unassigned leads
          </span>
        )}
      </div>

      {/* Leads Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              {['Lead', 'Phone', 'Status', 'Source', ...(isAdmin ? ['Assigned Seller'] : []), 'Timeline / Notes', 'Date'].map((h) => (
                <th key={h} className="px-5 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((l) => (
              <tr key={l._id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5">
                  <div
                    onClick={() => setSelectedLeadId(l._id)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <Avatar name={l.name} className="h-9 w-9 text-xs" />
                    <div>
                      <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {l.name}
                      </div>
                      {l.email && <div className="text-xs text-slate-500">{l.email}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 tabular-nums text-slate-600 font-mono text-xs">
                  <a href={`tel:${l.phone}`} className="hover:underline hover:text-indigo-600">
                    {l.phone}
                  </a>
                </td>
                <td className="px-5 py-3.5">
                  <select
                    value={l.status}
                    onChange={(e) => act(EP.leadStatus(l._id), { status: e.target.value })}
                    aria-label="Change status"
                    className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 outline-none ${STATUS_STYLE[l.status] ?? 'bg-slate-50 text-slate-700 ring-slate-200'}`}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3.5">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs capitalize font-medium text-slate-600">{l.source}</span>
                </td>
                {isAdmin && (
                  <td className="px-5 py-3.5">
                    <select
                      value={l.assignedTo?._id ?? l.assignedTo ?? ''}
                      onChange={(e) => act(EP.leadAssign(l._id), { sellerId: e.target.value || null })}
                      aria-label="Assign seller"
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500"
                    >
                      <option value="">Unassigned</option>
                      {sellers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </td>
                )}
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => setSelectedLeadId(l._id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    <span>💬</span>
                    <span>Timeline</span>
                  </button>
                </td>
                <td className="px-5 py-3.5 text-slate-500 text-xs">
                  {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                </td>
              </tr>
            ))}
            {res && leads.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-5 py-12 text-center text-slate-500">
                  No leads found. Click &quot;+ Add Lead&quot; or &quot;Import CSV&quot; to populate your pipeline.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition">
            Previous
          </button>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition">
            Next
          </button>
        </div>
      </div>

      {/* Modals */}
      {openAdd && (
        <AddLead sellers={sellers} isAdmin={isAdmin} onClose={() => setOpenAdd(false)} onDone={() => { setOpenAdd(false); load(); }} />
      )}

      {openImport && (
        <ImportCsvModal onClose={() => setOpenImport(false)} onDone={() => { load(); }} />
      )}

      {selectedLeadId && (
        <LeadDetailsModal
          leadId={selectedLeadId}
          isAdmin={isAdmin}
          sellers={sellers}
          onClose={() => setSelectedLeadId(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}
