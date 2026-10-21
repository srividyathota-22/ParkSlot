import { useState } from 'react';
import { api } from '../api.js';
import Field from './Field.jsx';

export default function VerifyBox({ profile, onDone }) {
  const [f, setF] = useState({ idDocUrl: '', ownershipDocUrl: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!profile || profile.verificationStatus === 'verified') return null;

  const rejected = profile.verificationStatus === 'rejected';
  const waiting = profile.verificationStatus === 'pending' && profile.idDocUrl && profile.ownershipDocUrl;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try { await api('/owner/verify', { method: 'POST', body: f }); await onDone(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  if (waiting) {
    return <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">Your proofs are with an admin. You can add listings as soon as you are verified.</p>;
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <h2 className="font-display text-lg font-semibold">Verify your account</h2>
      {rejected && <p className="text-sm text-red-700">Rejected{profile.rejectionReason ? `: ${profile.rejectionReason}` : '.'} Please send new proofs.</p>}
      <p className="text-sm text-ink/70">Paste a link to each document, for example a Google Drive share link.</p>
      <Field label="ID proof link" type="url" required value={f.idDocUrl} onChange={(e) => setF({ ...f, idDocUrl: e.target.value })} />
      <Field label="Ownership proof link" type="url" required value={f.ownershipDocUrl} onChange={(e) => setF({ ...f, ownershipDocUrl: e.target.value })} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button className="btn-primary !w-auto px-6" disabled={busy}>{busy ? 'Sending' : 'Send for verification'}</button>
    </form>
  );
}