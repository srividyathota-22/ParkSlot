import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import Field from '../components/Field.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const DEMO = [
  ['Driver', 'driver@parking.com'],
  ['Owner', 'owner@parking.com'],
];

const inputClass = "w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-colors";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password);
      navigate('/app');
        
      
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Log in"
      subtitle="Pick up where you left off."
      footer={<>New here? <Link className="font-medium text-orange-400 hover:underline" to="/register">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field 
          label="Email" 
          type="email" 
          autoComplete="email" 
          required 
          value={form.email} 
          onChange={set('email')} 
          placeholder="you@example.com" 
          className={inputClass}
        />
        
        <Field 
          label="Password" 
          type="password" 
          autoComplete="current-password" 
          required 
          value={form.password} 
          onChange={set('password')} 
          className={inputClass}
        />

        {}
        {error && (
          <div className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-2">
            <p role="alert" className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <button 
          type="submit"
          className="w-full rounded-lg bg-orange-500 text-black font-semibold py-2.5 hover:bg-orange-400 disabled:opacity-50 transition flex items-center justify-center gap-2 mt-2" 
          disabled={busy}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Logging in...' : 'Log in'}
        </button>
        <div className="pt-6 mt-6 border-t border-white/10">
          <p className="text-xs text-center text-white/50 mb-3 uppercase tracking-wider font-semibold">
            Demo Accounts
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO.map(([label, email]) => (
              <button
                key={email}
                type="button"
                onClick={() => setForm({ email, password: 'password123' })}
                className="text-xs bg-white/5 border border-white/10 text-white/80 py-2 rounded hover:bg-white/10 hover:text-white transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

      </form>
    </AuthShell>
  );
}
