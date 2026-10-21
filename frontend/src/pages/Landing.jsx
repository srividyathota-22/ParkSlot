import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Bike, CalendarCheck, CarFront, MapPin, ParkingSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx'; 

function Reveal({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function BgVideo({ src, poster }) {
  const reduce = useReducedMotion();
  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      src={src}
      poster={poster}
      autoPlay={!reduce}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  );
}

const STEPS = [
  [MapPin, 'Search', 'Pick your destination, date, time and vehicle. Free bays show up on the map.'],
  [CalendarCheck, 'Reserve', 'Book the exact slot. Many owners confirm instantly; others reply within hours.'],
  [ParkingSquare, 'Park', 'Arrive, park in your bay and go. The booking closes itself when your time ends.'],
];
const go = (id) => (e) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="bg-paper text-ink">
      <section className="relative min-h-[92vh] overflow-hidden bg-asphalt text-mist">
        <BgVideo src="/videos/hero.mp4" poster="/videos/hero-poster.jpg" />
        <div className="absolute inset-0 bg-gradient-to-r from-asphalt via-asphalt/70 to-asphalt/10" />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-volt font-display text-lg font-bold text-asphalt">P</span>
            <span className="font-display text-lg font-semibold">ParkSlot</span>
          </Link>
          <nav className="hidden gap-8 text-sm text-mist/80 md:flex">
          <a href="#how" onClick={go('how')} className="hover:text-white">How it works</a>
          <a href="#vehicles" onClick={go('vehicles')} className="hover:text-white">Cars and bikes</a>
          <a href="#owners" onClick={go('owners')} className="hover:text-white">For owners</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/app" className="btn-volt !py-2 text-sm">Open app</Link>
            ) : (
              <>
                <Link to="/login" className="px-3 py-2 text-sm hover:text-white">Log in</Link>
                <Link to="/register" className="btn-volt !py-2 text-sm">Sign up</Link>
              </>
            )}
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(92vh-5rem)] max-w-6xl flex-col justify-center px-6 pb-16">
          <Reveal>
            <h1 className="max-w-2xl font-display text-5xl font-semibold leading-[1.02] md:text-7xl">
              Your spot is <span className="text-volt">waiting.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-5 max-w-lg text-lg text-mist/80">
              Rent private parking near metro stations and offices. Reserve ahead for your car or your bike.
            </p>
          </Reveal>
          <Reveal delay={0.3} className="mt-8 flex flex-wrap gap-3">
            <Link to={user ? '/app' : '/register'} className="btn-volt">
              Find parking <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to={user ? '/app' : '/register'} className="btn-ghost">List your slot</Link>
          </Reveal>

          <Reveal delay={0.45} className="mt-10 w-full max-w-xs md:absolute md:bottom-12 md:right-6 md:mt-0">
            <div className="rounded-2xl border border-white/10 bg-panel/80 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-xs text-fog">
                <span>Indiranagar Metro</span>
                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 font-medium text-emerald-300">Confirmed</span>
              </div>
              <p className="mt-2 font-display text-xl text-white">Bay A1 · 10:00 to 12:00</p>
              <p className="mt-1 text-sm text-fog">Tuesday · Covered · 2 min walk</p>
              <div className="mt-3 flex items-end justify-between">
                <span className="font-display text-2xl text-sun">₹80</span>
                <span className="text-xs text-fog">2 hours</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="max-w-xl font-display text-4xl font-semibold md:text-5xl">Three steps from search to parked.</h2>
        </Reveal>
        <ol className="mt-12 divide-y divide-ink/10 border-y border-ink/10">
          {STEPS.map(([Icon, title, text], i) => (
            <Reveal key={title} delay={i * 0.08}>
              <li className="grid items-center gap-3 py-8 md:grid-cols-[5rem_12rem_1fr]">
                <span className="font-display text-3xl text-sign">0{i + 1}</span>
                <span className="flex items-center gap-3 font-display text-2xl font-semibold">
                  <Icon className="h-6 w-6 text-sign" /> {title}
                </span>
                <p className="max-w-lg text-ink/70">{text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* CARS AND BIKES */}
      <section id="vehicles" className="bg-asphalt py-24 text-mist">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 lg:grid-cols-2">
          <Reveal>
            <div className="relative aspect-video overflow-hidden rounded-2xl">
              <BgVideo src="/bike/rider-arrives.mp4" poster="/bike/rider-arrives-poster.jpg" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-4xl font-semibold md:text-5xl">Cars and bikes both get a bay.</h2>
            <p className="mt-4 max-w-md text-mist/75">
              Choose a 2-wheeler or 4-wheeler and see only the slots that fit. No circling the block.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
            {[
                ['/videos/car-bay.jpg', 'Car bay'],
                ['/bike/bike-wall-poster.jpg', 'Bike bay'],
              ].map(([src, label]) => (
                <figure key={src} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  <img src={src} alt={label} className="h-full w-full object-cover" loading="lazy" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-asphalt/90 to-transparent px-3 pb-2 pt-8 text-sm">
                    {label}
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-panel px-4 py-2"><CarFront className="h-4 w-4 text-volt" /> Cars from <b className="text-sun">₹30</b>/hr</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-panel px-4 py-2"><Bike className="h-4 w-4 text-volt" /> Bikes from <b className="text-sun">₹15</b>/hr</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* OWNERS */}
      <section id="owners" className="w-full my-12 md:my-16">
        <div className="relative w-full overflow-hidden h-[650px] md:h-[550px] flex items-center bg-asphalt">
          
          <BgVideo src="/videos/owners.mp4" poster="/videos/owners-poster.jpg" />
          <div className="absolute inset-0 bg-gradient-to-r from-asphalt via-asphalt/80 to-asphalt/10" />

          <div className="relative z-10 w-full max-w-6xl mx-auto px-6">
            <Reveal className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold text-mist leading-[1.1]">
                Turn an empty slot <br/> into income.
              </h2>
              
              <p className="mt-5 text-fog text-base md:text-lg max-w-lg leading-relaxed">
                List your parking, set your hours and price, and approve bookings. An admin verifies every owner first.
              </p>
              
              <Link 
                to={user ? '/app' : '/register'} 
                className="mt-8 btn-volt !px-8 !py-3.5 flex w-fit items-center gap-2 text-sm md:text-base"
              >
                List your slot <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
          
        </div>
      </section>
      <footer className="border-t border-ink/10 bg-paper px-6 py-12 text-sm text-ink/70">
        <div className="mx-auto max-w-6xl">

          <div className="grid grid-cols-2 gap-6 md:grid-cols-5 lg:gap-12 xl:gap-16">
            
            <div className="col-span-2 md:col-span-2 lg:pr-8">
              <Link to="/" className="mb-4 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-volt font-display text-base font-bold text-asphalt">P</span>
                <span className="font-display text-lg font-semibold text-ink">ParkSlot</span>
              </Link>
              <p className="max-w-xs leading-relaxed">
                Your spot is waiting. Rent private parking near metro stations and offices. Reserve ahead for your car or your bike.
              </p>
            </div>

            <div>
              <h3 className="mb-4 font-semibold text-ink">Explore</h3>
              <ul className="flex flex-col gap-3">
                <li><a href="#how" onClick={go('how')} className="hover:text-volt hover:underline transition-colors">How it works</a></li>
                <li><a href="#vehicles" onClick={go('vehicles')} className="hover:text-volt hover:underline transition-colors">Cars and bikes</a></li>
                <li><a href="#owners" onClick={go('owners')} className="hover:text-volt hover:underline transition-colors">For owners</a></li>
                <li><Link to="/app" className="hover:text-volt hover:underline transition-colors">Find parking</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-semibold text-ink">Account</h3>
              <ul className="flex flex-col gap-3">
                {user ? (
                  <li><Link to="/app" className="hover:text-volt hover:underline transition-colors">Open App</Link></li>
                ) : (
                  <>
                    <li><Link to="/login" className="hover:text-volt hover:underline transition-colors">Log in</Link></li>
                    <li><Link to="/register" className="hover:text-volt hover:underline transition-colors">Create an account</Link></li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-ink">Why ParkSlot</h3>
              <ul className="flex flex-col gap-3">
                <li className="cursor-default">No circling the block</li>
                <li className="cursor-default">Verified slot owners</li>
                <li className="cursor-default">Cheaper than public lots</li>
                <li className="cursor-default">Guaranteed reservations</li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 flex flex-col items-center justify-between border-t border-ink/10 pt-8 sm:flex-row">
            <p>© 2026 ParkSlot. All rights reserved.</p>
          </div>
        </div>
      </footer>
     
    </div>
  );
}
