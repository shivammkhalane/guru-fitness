import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Activity,
    ArrowRight,
    ArrowUpRight,
    CheckCircle2,
    ChevronDown,
    Dumbbell,
    MapPin,
    MessageCircle,
    Moon,
    Quote,
    ShieldCheck,
    Star,
    Sun,
    User,
    Utensils,
    Zap
} from 'lucide-react';
import SpotlightCard from './react-bits/SpotlightCard';
import ShinyText from './react-bits/ShinyText';

function InstagramIcon({ className = 'h-4 w-4' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
    );
}

const testimonials = [
    { name: "Rahul D.", role: "Student", text: "Best gym in Dhule! The free diet plan actually works and Kushal's guidance is top notch." },
    { name: "Sneha P.", role: "Working Professional", text: "Premium equipment without the crazy fees. The environment is so motivating and safe." },
    { name: "Amit K.", role: "Athlete", text: "Lost 10kg in 3 months. The atmosphere here is pure motivation. Highly recommend to everyone in Dhule!" },
    { name: "Pooja M.", role: "Fitness Enthusiast", text: "Zero hidden charges and the machines are always well-maintained. Cleanest gym in town." },
    { name: "Vikram S.", role: "Member", text: "Finally a gym in Dhule that feels international. The 6-month bundle is unbeatable value." },
];

const faqs = [
    { q: "Are there any registration or hidden fees?", a: "No! We believe in transparent pricing. You only pay for your membership duration. Zero joining fees, zero registration fees." },
    { q: "Is the personalized diet plan really free?", a: "Yes. Every active member gets a custom diet and workout program tailored to their specific body type and goals at no extra cost." },
    { q: "Do I need prior gym experience?", a: "Not at all. We welcome beginners. Our trainers will guide you on how to use the equipment safely and effectively from day one." },
    { q: "Can I upgrade my plan later?", a: "Absolutely. You can start with a monthly pass (₹500) and upgrade to a 6-month or yearly bundle anytime to save more." },
];

export default function LandingPage() {
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800 selection:text-white">
            {/* ===================== Top Navigation ===================== */}
            <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
                    <a href="/" className="flex items-center gap-3 group">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950 font-black text-sm shadow-md transition-transform group-hover:scale-105">
                            GF
                        </span>
                        <div>
                            <span className="block text-sm font-bold tracking-tight text-white">Guru Fitness</span>
                            <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Health Club • Dhule</span>
                        </div>
                    </a>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
                        <a href="#features" className="transition-colors hover:text-white">Features</a>
                        <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
                        <a href="#testimonials" className="transition-colors hover:text-white">Reviews</a>
                        <a href="#faqs" className="transition-colors hover:text-white">FAQs</a>
                        <a href="#contact" className="transition-colors hover:text-white">Contact</a>
                    </nav>

                    {/* Action CTAs */}
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <a
                            href="https://www.instagram.com/guru_fitness_dhule/"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Guru Fitness on Instagram"
                            title="Follow @guru_fitness_dhule on Instagram"
                            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/90 text-zinc-400 transition-all hover:border-pink-500/50 hover:bg-zinc-800 hover:text-pink-400 hover:scale-105"
                        >
                            <InstagramIcon className="h-4 w-4" />
                        </a>
                        <a
                            href="/login"
                            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 hover:border-zinc-600 hover:scale-[1.02]"
                        >
                            Member Portal
                        </a>
                        <a
                            href="/admin"
                            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs sm:text-sm font-bold text-zinc-950 shadow-md transition-all hover:bg-zinc-200 hover:scale-[1.02]"
                        >
                            Admin
                        </a>
                    </div>
                </div>
            </header>

            {/* ===================== Hero Section ===================== */}
            <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
                {/* Kushal Solanke Owner Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/images/owner.jpg'), url('/996d2593-0390-4e29-80f1-932c54bf779e.jpeg')" }}
                />
                {/* Contrast Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/90 via-zinc-950/75 to-zinc-950" />

                <div className="relative z-10 mx-auto max-w-4xl">
                    {/* Location Badge */}
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-zinc-900/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-200 backdrop-blur-md shadow-lg">
                        <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <span>Datta Mandir Chowk, Dhule</span>
                    </div>

                    {/* Main Title */}
                    <h1 className="mb-4 text-5xl font-black tracking-tight text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] sm:text-7xl md:text-8xl">
                        GURU FITNESS <br className="hidden sm:block" /> HEALTH CLUB
                    </h1>

                    {/* Subheading with React Bits ShinyText */}
                    <div className="mx-auto mb-10 max-w-2xl text-xl font-semibold tracking-tight sm:text-3xl">
                        <ShinyText text="Dhule's Most Affordable Premium Gym." speed={3.5} />
                    </div>

                    {/* Floating Price Badge */}
                    <div className="animate-float mx-auto mb-12 flex max-w-fit items-center gap-4 rounded-3xl border border-white/20 bg-zinc-950/80 p-2.5 pr-7 shadow-[0_0_50px_rgba(255,255,255,0.12)] backdrop-blur-2xl transition-all hover:scale-105 hover:bg-zinc-900/90 cursor-default">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-zinc-950 shadow-inner">
                            <Dumbbell className="h-8 w-8" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Starting at just</p>
                            <p className="text-4xl font-black tracking-tight text-white">
                                ₹500<span className="text-lg font-medium text-zinc-400">/month</span>
                            </p>
                        </div>
                    </div>

                    {/* Hero CTAs */}
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <a
                            href="/login"
                            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-bold text-zinc-950 shadow-[0_0_40px_rgba(255,255,255,0.25)] transition-all hover:bg-zinc-200 hover:scale-105 sm:w-auto"
                        >
                            Member Portal Login
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </a>
                        <a
                            href="#pricing"
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/30 hover:scale-105 sm:w-auto"
                        >
                            View Membership Plans
                        </a>
                    </div>
                </div>
            </section>

            {/* ===================== Features Section ===================== */}
            <section id="features" className="relative z-20 -mt-10 mx-auto max-w-6xl px-4 sm:-mt-16">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {[
                        {
                            icon: Activity,
                            title: "Personalized Workout",
                            desc: "Custom workout routines tailored to your specific goals and physique, included at zero extra cost."
                        },
                        {
                            icon: Utensils,
                            title: "Custom Diet Program",
                            desc: "Comprehensive nutrition planning built around local Indian diets to maximize your gains."
                        },
                        {
                            icon: Star,
                            title: "Premium Equipment",
                            desc: "Heavy-duty machines, clean free-weights zone, and dedicated cardio section maintained daily."
                        }
                    ].map((feature, i) => {
                        const Icon = feature.icon;
                        return (
                            <SpotlightCard key={i} className="p-8 group cursor-default">
                                <div className="mb-5 inline-flex rounded-2xl bg-zinc-800 p-3.5 text-white transition-all duration-300 group-hover:scale-110 group-hover:bg-white group-hover:text-zinc-950 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <h3 className="mb-2 text-xl font-bold tracking-tight text-white">{feature.title}</h3>
                                <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                                    {feature.desc}
                                </p>
                            </SpotlightCard>
                        );
                    })}
                </div>
            </section>

            {/* ===================== Testimonials (Marquee) ===================== */}
            <section id="testimonials" className="py-24 overflow-hidden border-t border-zinc-900 mt-20">
                <div className="mb-12 text-center px-4">
                    <div className="inline-flex items-center gap-1 text-amber-400 mb-2">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                        ))}
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Hear From Our Athletes</h2>
                    <p className="mt-2 text-zinc-400">Real fitness transformations from members in Dhule.</p>
                </div>

                {/* Infinite Scrolling Container */}
                <div className="relative w-full overflow-hidden flex items-center">
                    <div className="absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-zinc-950 to-transparent sm:w-40 pointer-events-none" />
                    <div className="absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-zinc-950 to-transparent sm:w-40 pointer-events-none" />

                    <div className="animate-marquee gap-6 px-3">
                        {[...testimonials, ...testimonials].map((testimonial, i) => (
                            <SpotlightCard key={i} className="w-[310px] shrink-0 p-6 sm:w-[360px]">
                                <Quote className="mb-4 h-6 w-6 text-zinc-600" />
                                <p className="mb-6 text-sm text-zinc-300 leading-relaxed font-medium">"{testimonial.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-white">
                                        {testimonial.name[0]}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{testimonial.name}</h4>
                                        <span className="text-xs text-zinc-400">{testimonial.role} • Verified Member</span>
                                    </div>
                                </div>
                            </SpotlightCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===================== Pricing Section ===================== */}
            <section id="pricing" className="mx-auto max-w-6xl px-4 py-24 border-t border-zinc-900">
                <div className="mb-16 text-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Transparent Memberships</span>
                    <h2 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">Unbeatable Value.</h2>
                    <p className="mt-3 text-lg text-zinc-400">Zero joining fees. No hidden charges. Pure fitness.</p>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-center">
                    {/* Monthly Pass */}
                    <SpotlightCard className="p-8">
                        <h3 className="text-lg font-bold text-zinc-400">Monthly Pass</h3>
                        <div className="my-6">
                            <span className="text-5xl font-black tracking-tight text-white">₹500</span>
                            <span className="text-sm text-zinc-400"> / month</span>
                        </div>
                        <ul className="mb-8 flex flex-col gap-3.5 text-sm text-zinc-300">
                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Full Gym Access</li>
                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Free Diet Program</li>
                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Digital QR Access Pass</li>
                        </ul>
                        <a
                            href="#contact"
                            className="block text-center w-full rounded-xl border border-zinc-700 bg-zinc-800/50 py-3.5 font-bold text-white transition-all hover:bg-zinc-800 hover:scale-[1.02]"
                        >
                            Get Started
                        </a>
                    </SpotlightCard>

                    {/* 6-Months Bundle (Featured) */}
                    <div className="relative rounded-3xl border-2 border-white/40 bg-zinc-900/90 p-8 shadow-[0_0_50px_rgba(255,255,255,0.15)] md:scale-105 md:p-10 transition-transform hover:scale-[1.07] duration-300 backdrop-blur-xl">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-xs font-black uppercase tracking-wider text-zinc-950 shadow-lg">
                            Most Popular
                        </div>
                        <h3 className="text-lg font-bold text-zinc-200">6-Month Bundle</h3>
                        <div className="my-6 flex items-baseline gap-2.5">
                            <span className="text-6xl font-black tracking-tight text-white">₹2,500</span>
                            <span className="text-sm font-medium text-zinc-400 line-through">₹3,000</span>
                        </div>
                        <p className="text-xs text-emerald-400 font-semibold mb-6">Save ₹500 vs paying monthly</p>
                        <ul className="mb-8 flex flex-col gap-3.5 text-sm text-zinc-200">
                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-white shrink-0" /> Full Gym Access</li>
                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-white shrink-0" /> Advanced Workout Split</li>
                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-white shrink-0" /> Personalized Diet Program</li>
                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-white shrink-0" /> Priority Trainer Guidance</li>
                        </ul>
                        <a
                            href="#contact"
                            className="block text-center w-full rounded-2xl bg-white py-4 font-black text-zinc-950 transition-all hover:bg-zinc-200 shadow-xl hover:scale-[1.02]"
                        >
                            Claim 6-Month Offer
                        </a>
                    </div>

                    {/* Yearly Pass */}
                    <SpotlightCard className="p-8">
                        <h3 className="text-lg font-bold text-zinc-400">Yearly Pass</h3>
                        <div className="my-6 flex items-baseline gap-2.5">
                            <span className="text-5xl font-black tracking-tight text-white">₹4,500</span>
                            <span className="text-sm font-medium text-zinc-500 line-through">₹6,000</span>
                        </div>
                        <p className="text-xs text-emerald-400 font-semibold mb-6">Save ₹1,500 for maximum fitness commitment</p>
                        <ul className="mb-8 flex flex-col gap-3.5 text-sm text-zinc-300">
                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> 365 Days Unrestricted Access</li>
                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Quarterly Physique Tracking</li>
                            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Full Diet & Workout Plan</li>
                        </ul>
                        <a
                            href="#contact"
                            className="block text-center w-full rounded-xl border border-zinc-700 bg-zinc-800/50 py-3.5 font-bold text-white transition-all hover:bg-zinc-800 hover:scale-[1.02]"
                        >
                            Get Yearly Pass
                        </a>
                    </SpotlightCard>
                </div>
            </section>

            {/* ===================== FAQs Section ===================== */}
            <section id="faqs" className="mx-auto max-w-3xl px-4 py-24 border-t border-zinc-900">
                <div className="mb-12 text-center">
                    <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Frequently Asked Questions</h2>
                    <p className="mt-2 text-zinc-400">Everything you need to know about joining Guru Fitness.</p>
                </div>
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition-colors hover:border-zinc-700">
                            <button
                                type="button"
                                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                className="flex w-full items-center justify-between p-6 text-left"
                            >
                                <span className="font-bold text-white text-base">{faq.q}</span>
                                <ChevronDown className={`h-5 w-5 text-zinc-400 transition-transform duration-300 shrink-0 ${openFaq === index ? 'rotate-180' : ''}`} />
                            </button>
                            {openFaq === index && (
                                <div className="p-6 pt-0 text-zinc-300 text-sm leading-relaxed border-t border-zinc-800/50">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* ===================== Call to Action ===================== */}
            <section className="border-t border-zinc-900 bg-zinc-900/30">
                <div className="mx-auto max-w-4xl px-4 py-20 text-center">
                    <Zap className="mx-auto mb-6 h-12 w-12 text-yellow-500" />
                    <h2 className="mb-4 text-4xl font-black tracking-tight text-white sm:text-5xl">Ready to Transform Your Fitness?</h2>
                    <p className="mb-10 text-lg text-zinc-400 max-w-xl mx-auto">
                        Join Dhule's fastest-growing fitness community today. Drop by the gym or message Kushal on WhatsApp to get started.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href="https://wa.me/919130564188?text=Hi%20Kushal%2C%20I%20want%20to%20join%20Guru%20Fitness%20Health%20Club."
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-bold text-zinc-950 transition-all hover:bg-zinc-200 hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                        >
                            <MessageCircle className="h-5 w-5 text-emerald-600" />
                            Message Kushal on WhatsApp
                        </a>
                        <a
                            href="https://www.instagram.com/guru_fitness_dhule/"
                            target="_blank"
                            rel="noreferrer"
                            className="group relative inline-flex w-full sm:w-auto items-center justify-center gap-2.5 overflow-hidden rounded-2xl p-[1.5px] transition-all hover:scale-105 shadow-[0_0_35px_rgba(225,48,108,0.2)] hover:shadow-[0_0_50px_rgba(225,48,108,0.4)]"
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] animate-shine" />
                            <span className="relative flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-zinc-950 px-8 py-4 text-sm font-bold text-white transition-colors group-hover:bg-zinc-900">
                                <InstagramIcon className="h-5 w-5 text-[#E1306C] transition-transform group-hover:scale-110" />
                                <span>Follow @guru_fitness_dhule</span>
                                <ArrowUpRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </span>
                        </a>
                    </div>
                </div>
            </section>

            {/* ===================== Footer ===================== */}
            <footer id="contact" className="border-t border-zinc-900 bg-black">
                <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                    <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
                        {/* Contact */}
                        <div>
                            <h4 className="mb-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Gym Owner</h4>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-zinc-300">
                                    <div className="rounded-xl bg-zinc-900 p-2.5">
                                        <User className="h-4 w-4 text-zinc-300" />
                                    </div>
                                    <div>
                                        <span className="font-bold text-white block">Kushal Solanke</span>
                                        <span className="text-xs text-zinc-400">Owner & Head Trainer</span>
                                    </div>
                                </div>
                                <a
                                    href="https://wa.me/919130564188?text=Hi%20Kushal%2C%20I%20want%20to%20join%20Guru%20Fitness."
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#25D366]/15 px-4 py-3 text-sm font-bold text-[#25D366] transition-all hover:bg-[#25D366]/25 hover:scale-[1.02]"
                                >
                                    <MessageCircle className="h-4 w-4" /> Message on WhatsApp
                                </a>
                                <a
                                    href="https://www.instagram.com/guru_fitness_dhule/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 px-3 text-xs font-semibold text-zinc-200 transition-all hover:border-pink-500/50 hover:bg-zinc-900 hover:text-white group"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-sm transition-transform group-hover:scale-110">
                                        <InstagramIcon className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="font-bold text-white flex items-center gap-1 group-hover:text-pink-400 transition-colors">
                                            @guru_fitness_dhule
                                            <ArrowUpRight className="h-3 w-3 text-zinc-400 group-hover:text-pink-400 transition-transform group-hover:translate-x-0.5" />
                                        </span>
                                        <span className="text-[10px] text-zinc-400">Follow on Instagram</span>
                                    </div>
                                </a>
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <h4 className="mb-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Gym Location</h4>
                            <div className="flex items-start gap-3 text-zinc-300">
                                <div className="rounded-xl bg-zinc-900 p-2.5 shrink-0">
                                    <MapPin className="h-4 w-4 text-red-400" />
                                </div>
                                <p className="font-medium leading-relaxed text-zinc-200">
                                    <strong className="text-white block font-semibold">Guru Fitness Health Club</strong>
                                    Datta Mandir Chowk,<br />
                                    Dhule, Maharashtra
                                </p>
                            </div>
                        </div>

                        {/* Timings */}
                        <div>
                            <h4 className="mb-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Gym Timings</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
                                    <div className="flex items-center gap-3">
                                        <Sun className="h-4 w-4 text-amber-400" />
                                        <span className="font-semibold text-white text-sm">Morning</span>
                                    </div>
                                    <span className="text-xs font-medium text-zinc-300">5:00 AM - 10:00 AM</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
                                    <div className="flex items-center gap-3">
                                        <Moon className="h-4 w-4 text-blue-400" />
                                        <span className="font-semibold text-white text-sm">Evening</span>
                                    </div>
                                    <span className="text-xs font-medium text-zinc-300">5:00 PM - 10:00 PM</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="mt-16 flex flex-col items-center justify-between border-t border-zinc-900 pt-8 text-xs text-zinc-500 sm:flex-row gap-4">
                        <p>© {new Date().getFullYear()} Guru Fitness Health Club. All rights reserved.</p>
                        <div className="flex items-center gap-6">
                            <a
                                href="https://www.instagram.com/guru_fitness_dhule/"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 font-medium text-pink-400/90 hover:text-pink-300 transition-colors"
                            >
                                <InstagramIcon className="h-3.5 w-3.5" />
                                <span>Instagram</span>
                            </a>
                            <Link to="/login" className="font-medium text-zinc-400 hover:text-white transition-colors">
                                Member Portal
                            </Link>
                            <Link to="/admin" className="font-medium text-zinc-400 hover:text-white transition-colors">
                                 Gym Owner Login
                             </Link>
                            <a href="/privacy" className="font-medium text-zinc-400 hover:text-white transition-colors">
                                Privacy
                            </a>
                            <a href="/terms" className="font-medium text-zinc-400 hover:text-white transition-colors">
                                Terms
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}