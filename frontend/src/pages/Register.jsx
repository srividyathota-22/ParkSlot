import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import Field from '../components/Field.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = [
  ['driver', 'I need parking'],
  ['owner', 'I have a slot to rent'],
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'driver' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim() });
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes under a minute."
      footer={<>Already registered? <Link className="font-medium text-orange-400 hover:underline" to="/login">Log in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div role="group" aria-label="Account type" className="grid grid-cols-2 gap-2">
          {ROLES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={form.role === value}
              onClick={() => setForm({ ...form, role: value })}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                form.role === value 
                  ? 'border-orange-400 bg-orange-400 text-black shadow-md' 
                  : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {form.role === 'owner' && (
          <p className="text-sm text-white/70">
            An admin checks your ID and ownership proof before your listings go live.
          </p>
        )}

        <Field label="Full name" autoComplete="name" required value={form.name} onChange={set('name')} className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-400/50" />
        
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-400/50" />
        
        <Field label="Phone (optional)" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-400/50" />
        
        <Field label="Password" type="password" autoComplete="new-password" minLength={6} required value={form.password} onChange={set('password')} placeholder="At least 6 characters" className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-400/50" />

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <button className="w-full rounded-lg bg-orange-500 text-black font-semibold py-2.5 hover:bg-orange-400 disabled:opacity-50 transition flex items-center justify-center gap-2" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Creating account' : 'Create account'}
        </button>

      </form>
    </AuthShell>
  );
}
