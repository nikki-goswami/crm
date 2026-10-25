'use client';
import { useEffect } from 'react';

export const inputCls =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

export function Field({ label, children }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>;
}

export function Modal({ title, onClose, maxWidth = 'max-w-md', children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${maxWidth} rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Avatar({ name, className = '' }) {
  const t = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold text-white ${className}`}>{t}</span>
  );
}
