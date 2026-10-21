import {
  Activity,
  ArrowRight,
  Check,
  Dumbbell,
  MapPin,
  MessageCircle,
  Moon,
  Sun,
  Utensils,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* EDIT HERE                                                           */
/* ------------------------------------------------------------------ */

// >>> SWAP ME: owner's photo for the hero background.
// Put the file at public/images/owner.jpg (served as /images/owner.jpg),
// or paste any image URL here.
const OWNER_PHOTO = '/images/owner.jpg';

// >>> SWAP ME: WhatsApp number in international format, digits only.
// Example: '919876543210'
const WHATSAPP_NUMBER = '91XXXXXXXXXX';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Hi Kushal, I want to join Guru Fitness Health Club.'
)}`;

// >>> CONFIRM WITH THE OWNER: only the monthly price (₹500) is real.
// The 6-month and yearly prices are suggestions.
const PLANS = [
  {
    name: 'Monthly',
    note: 'Try it, no long commitment',
    price: '₹500',
    per: '/month',
    cta: 'Join monthly',
  },
  {
    name: '6 Months',
    note: 'Save ₹500 vs paying monthly',
    price: '₹2,500',
    per: '/6 months',
    cta: 'Join 6 months',
  },
  {
    name: 'Yearly',
    note: 'Save ₹1,500 vs paying monthly',
    price: '₹4,500',
    per: '/year',
    cta: 'Join yearly',
    best: true,
  },
];

const PLAN_INCLUDES = ['Full gym access', 'Free workout program', 'Free diet program'];
const CURRENT_YEAR = new Date().getFullYear();

/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-50 antialiased selection:bg-zinc-50 selection:text-zinc-950">
      {/* ============================ HERO ============================ */}
      <section
        className="relative flex min-h-[100svh] flex-col bg-cover bg-center bg-no-repeat md:bg-fixed"
        style={{ backgroundImage: `url(${OWNER_PHOTO})`, backgroundPositionY: '22%' }}
      >
        {/* Dark overlay so text stays readable */}
        <div aria-hidden="true" className="absolute inset-0 bg-black/60" />

        {/* Top bar */}
        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50">
              <Dumbbell className="h-5 w-5 text-zinc-950" aria-hidden="true" />
            </span>
            <span className="text-sm font-bold tracking-wide">Guru Fitness</span>
          </div>
          <a
            href="#contact"
            className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold backdrop-blur-xl transition-colors hover:bg-white/20"
          >
            Contact
          </a>
        </header>

        {/* Hero content */}
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-7 px-6 py-16 text-center">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-xs font-semibold backdrop-blur-xl">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Datta Mandir Chowk, Dhule
          </span>

          <h1 className="text-balance text-5xl font-black leading-[0.92] tracking-tighter sm:text-7xl lg:text-[7.5rem]">
            Guru Fitness
            <br />
            Health Club
          </h1>

          <p className="text-xl font-semibold tracking-tight text-zinc-200 sm:text-3xl">
            Dhule&apos;s Most Affordable Premium Gym
          </p>

          {/* Price badge */}
          <div className="flex items-baseline gap-2 rounded-[1.75rem] border border-white/20 bg-white/10 px-4 py-4 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:gap-2.5 sm:px-8">
            <span className="text-sm font-semibold text-zinc-300 sm:text-lg">Only</span>
            <span className="text-4xl font-black leading-none tracking-tighter sm:text-8xl">
              ₹500
            </span>
            <span className="text-sm font-semibold text-zinc-300 sm:text-lg">/month</span>
          </div>

          <a
            href="#pricing"
            className="group inline-flex min-h-14 items-center gap-2.5 rounded-full bg-zinc-50 px-8 font-bold text-zinc-950 transition-transform hover:scale-[1.03]"
          >
            See plans
            <ArrowRight
              className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </a>
        </div>
      </section>

      {/* ========================= WHAT YOU GET ========================= */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-28">
        <div className="mb-12 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            What you get
          </span>
          <h2 className="text-balance text-4xl font-extrabold leading-none tracking-tighter sm:text-6xl">
            Free, with every membership.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <article className="group flex min-h-[300px] min-w-0 flex-col rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6 transition duration-200 hover:-translate-y-1 hover:border-zinc-600 sm:p-9">
            <div className="flex items-center gap-3">
              <span className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-zinc-800 bg-zinc-900">
                <Dumbbell className="h-[30px] w-[30px]" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
                <Activity className="h-[22px] w-[22px] text-zinc-400" strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-auto flex flex-col gap-3 pt-10">
              <span className="self-start rounded-full bg-zinc-50 px-3 py-1.5 text-xs font-extrabold tracking-wider text-zinc-950">
                FREE
              </span>
              <h3 className="text-3xl font-extrabold leading-tight tracking-tight">
                Personalized Workout Program
              </h3>
              <p className="text-[17px] leading-relaxed text-zinc-400">
                A training plan made for your body, your goal and your schedule. Not a
                copy-paste chart.
              </p>
            </div>
          </article>

          <article className="group flex min-h-[300px] min-w-0 flex-col rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6 transition duration-200 hover:-translate-y-1 hover:border-zinc-600 sm:p-9">
            <div className="flex items-center gap-3">
              <span className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-zinc-800 bg-zinc-900">
                <Utensils className="h-[30px] w-[30px]" strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-auto flex flex-col gap-3 pt-10">
              <span className="self-start rounded-full bg-zinc-50 px-3 py-1.5 text-xs font-extrabold tracking-wider text-zinc-950">
                FREE
              </span>
              <h3 className="text-3xl font-extrabold leading-tight tracking-tight">
                Personalized Diet Program
              </h3>
              <p className="text-[17px] leading-relaxed text-zinc-400">
                Eating guidance that fits your goal and your routine, so the gym work
                actually shows.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* ============================ PRICING ============================ */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-10 pt-24">
        <div className="mb-12 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            Pricing
          </span>
          <h2 className="text-balance text-4xl font-extrabold leading-none tracking-tighter sm:text-6xl">
            Pick a plan. Start today.
          </h2>
        </div>

        <div className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={
                'relative flex min-w-0 flex-col gap-7 rounded-[2rem] border p-6 transition duration-200 hover:-translate-y-1 sm:p-9 ' +
                (plan.best
                  ? 'border-zinc-500 bg-zinc-900 shadow-[0_30px_80px_rgba(250,250,250,0.07)]'
                  : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600')
              }
            >
              {plan.best && (
                <span className="absolute -top-3.5 left-9 rounded-full bg-zinc-50 px-3.5 py-1.5 text-xs font-extrabold tracking-wider text-zinc-950">
                  BEST VALUE
                </span>
              )}

              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-sm text-zinc-400">{plan.note}</p>
              </div>

              <p className="flex items-baseline gap-2">
                <span className="text-5xl font-black leading-none tracking-tighter sm:text-6xl">
                  {plan.price}
                </span>
                <span className="text-sm text-zinc-400 sm:text-base">{plan.per}</span>
              </p>

              <ul className="flex flex-col gap-3.5 text-[15px]">
                {PLAN_INCLUDES.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <Check className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <a
                href="#contact"
                className={
                  'mt-auto inline-flex min-h-[52px] items-center justify-center rounded-full font-bold transition-colors ' +
                  (plan.best
                    ? 'bg-zinc-50 text-zinc-950 hover:bg-zinc-200'
                    : 'border border-zinc-700 hover:bg-zinc-800')
                }
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* ============================ CONTACT ============================ */}
      <section id="contact" className="mx-auto max-w-6xl px-6 pb-12 pt-24">
        <div className="grid gap-5 md:grid-cols-2">
          {/* Owner + address */}
          <div className="flex min-w-0 flex-col gap-7 rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6 sm:p-9">
            <div className="flex items-center gap-4">
              <div className="h-[72px] w-[72px] flex-none overflow-hidden rounded-full border border-zinc-700">
                <img
                  src={OWNER_PHOTO}
                  alt="Kushal Solanke, owner"
                  className="h-full w-full origin-[72%_40%] scale-[3.2] object-cover object-[72%_34%]"
                />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Owner</p>
                <p className="text-2xl font-extrabold tracking-tight">Kushal Solanke</p>
              </div>
            </div>

            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-zinc-50 font-bold text-zinc-950 transition-colors hover:bg-zinc-200"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Message on WhatsApp
            </a>

            <div className="flex items-start gap-3.5 border-t border-zinc-800 pt-6">
              <MapPin className="mt-0.5 h-[22px] w-[22px] flex-none" strokeWidth={1.8} aria-hidden="true" />
              <div>
                <p className="font-bold">Guru Fitness Health Club</p>
                <p className="leading-relaxed text-zinc-400">Datta Mandir Chowk, Dhule</p>
              </div>
            </div>
          </div>

          {/* Timings */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-1 items-center gap-5 rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-8">
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[1.1rem] border border-zinc-800 bg-zinc-900">
                <Sun className="h-[26px] w-[26px]" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm text-zinc-400">Morning</p>
                <p className="text-2xl font-extrabold tracking-tight sm:text-[26px]">
                  5:00 AM – 10:00 AM
                </p>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-5 rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-8">
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[1.1rem] border border-zinc-800 bg-zinc-900">
                <Moon className="h-[26px] w-[26px]" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm text-zinc-400">Evening</p>
                <p className="text-2xl font-extrabold tracking-tight sm:text-[26px]">
                  5:00 PM – 10:00 PM
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl border-t border-zinc-900 px-6 pb-12 pt-8 text-center text-sm text-zinc-400">
        © {CURRENT_YEAR} Guru Fitness Health Club · Datta Mandir Chowk, Dhule
      </footer>
    </div>
  );
}
