import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell as BellIcon } from 'lucide-react';
import { api } from '../api.js';
import { fmt } from '../lib.jsx';

export default function Bell() {
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const load = useCallback(() => api('/notifications').then(setData).catch(() => {}), []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && data.unread) {
      await api('/notifications/read-all', { method: 'PATCH', body: {} }).catch(() => {});
      setData((d) => ({ ...d, unread: 0 }));
    }
  }

  return (
    <div ref={box} className="relative">
      <button onClick={toggle} className="relative rounded-md p-2 hover:bg-white/10" aria-label={`Notifications, ${data.unread} unread`}>
        <BellIcon className="h-5 w-5" />
        {data.unread > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-volt px-1 text-[10px] font-bold text-asphalt">{data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-[2000] mt-2 max-h-96 w-80 overflow-auto rounded-xl bg-white text-ink shadow-xl">
          {data.notifications.length === 0 && <p className="p-4 text-sm text-ink/60">Nothing yet.</p>}
          {data.notifications.map((n) => (
            <div key={n._id} className={`border-b border-ink/10 p-3 text-sm ${n.read ? '' : 'bg-volt/10'}`}>
              <p>{n.message}</p>
              <p className="mt-0.5 text-xs text-ink/55">{fmt(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}