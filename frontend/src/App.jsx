import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Search from './pages/Search.jsx';
import MyBookings from './pages/MyBookings.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import NewListing from './pages/NewListing.jsx';

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return user ? <Navigate to="/app" replace /> : children;
}
function AppHome() {
  const { user } = useAuth();
  if (user.role === 'driver') return <Search />;
  if (user.role === 'owner') return <OwnerDashboard />;
  return <AdminDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<Protected><AppHome /></Protected>} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/bookings" element={<Protected><MyBookings /></Protected>} />
      <Route path="/owner/dashboard" element={<Protected><OwnerDashboard /></Protected>} />
      <Route path="/admin/dashboard" element={<Protected><AdminDashboard /></Protected>} />
      <Route path="/listings/new" element={<Protected><NewListing /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}