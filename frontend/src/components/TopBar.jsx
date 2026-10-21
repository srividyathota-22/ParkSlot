import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Bell from './Bell.jsx';

export default function TopBar({ links = [] }) {
  const { user, logout } = useAuth();
  return (
    <header className="flex items-center justify-between bg-asphalt px-5 py-3 text-mist">
      <Link to="/" className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-volt font-display font-bold text-asphalt">P</span>
        <span className="font-display text-lg font-semibold">ParkSlot</span>
      </Link>
      <nav className="flex items-center gap-2 text-sm">
        {links.map(([to, label]) => <Link key={to} to={to} className="rounded-md px-3 py-1.5 hover:bg-white/10">{label}</Link>)}
        <Bell />
        <span className="hidden text-fog sm:inline">{user.name}</span>
        <button onClick={logout} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-white/10"><LogOut className="h-4 w-4" /> Log out</button>
      </nav>
    </header>
  );
}