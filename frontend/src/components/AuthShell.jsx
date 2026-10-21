import { Link } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';

export default function AuthShell({ title, subtitle, children, footer }) {
  const reduce = useReducedMotion();
  return (
      <div className="relative min-h-screen overflow-hidden">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/auth-side.mp4"
        poster="/videos/auth-side-poster.jpg"
        autoPlay={!reduce}
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8 text-white">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-volt font-display text-lg font-bold text-asphalt">P</span>
            <span className="font-display text-lg font-semibold">ParkSlot</span>
          </Link>
          <h2 className="text-3xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-white/70">{subtitle}</p>

          <div className="mt-6 text-white">{children}</div>
          <p className="mt-6 text-sm text-white/70">{footer}</p>
        </div>
      </div>
    </div>
  );
}