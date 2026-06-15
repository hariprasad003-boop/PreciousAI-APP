import Link from 'next/link'
import { Gem, MessageCircle, Mic, Users, Star, TrendingUp, Bell, ArrowRight, CheckCircle2, Zap, Shield } from 'lucide-react'

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'WhatsApp & Instagram CRM',
    description: 'Leads from WhatsApp and Instagram are automatically captured, parsed by AI, and turned into rich customer profiles — no manual entry.',
  },
  {
    icon: Mic,
    title: 'Voice-to-CRM',
    description: 'Speak a quick note after a customer visit. AI transcribes and extracts name, budget, occasion, and intent directly into the CRM.',
  },
  {
    icon: Zap,
    title: 'AI Lead Intelligence',
    description: 'Claude reads every message and automatically tags leads: Bridal, Budget AED 20K, High Intent. Your pipeline stays organised without effort.',
  },
  {
    icon: Users,
    title: 'Customer 360 View',
    description: 'Full purchase history, family details, metal and stone preferences, favourite categories — everything in one elegant profile.',
  },
  {
    icon: Bell,
    title: 'Birthday & Anniversary Reminders',
    description: 'Never miss a gifting moment. Automated reminders with AI-suggested messages and product recommendations sent at the right time.',
  },
  {
    icon: TrendingUp,
    title: 'VIP & High-Value Scoring',
    description: 'AI identifies your best customers, predicts next purchases, and flags VIP candidates before your competitors reach them.',
  },
]

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    description: 'For single-store jewellers just getting started',
    features: ['1 staff seat', '500 customer records', 'Lead pipeline & CRM', 'Manual entry + Excel import', 'Email reminders'],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    description: 'For growing stores that want AI superpowers',
    features: ['5 staff seats', '5,000 customer records', 'Up to 3 locations', 'AI lead tagging', 'WhatsApp integration', 'Voice-to-CRM', 'AI follow-up assistant', 'Customer 360 + family tree', 'Birthday/anniversary automation'],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    description: 'For store groups and luxury chains',
    features: ['Unlimited seats & customers', 'Unlimited locations', 'Everything in Pro', 'AI VIP scoring', 'Custom domain (white-label)', 'Dedicated onboarding', 'Priority support'],
    cta: 'Contact us',
    highlighted: false,
  },
]

const TESTIMONIALS = [
  {
    quote: "We went from losing leads in WhatsApp to closing 40% more walk-ins within the first month. The AI tagging alone is worth it.",
    name: 'Khalid Al Mansoori',
    store: 'Al Mansoori Jewellers, Dubai',
    initials: 'KM',
  },
  {
    quote: "The birthday reminders with personalised messages have become our biggest revenue driver. Customers feel remembered.",
    name: 'Priya Menon',
    store: 'Menon Gold Palace, Kochi',
    initials: 'PM',
  },
]

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-800" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, #C9A84C 0%, transparent 50%), radial-gradient(circle at 75% 20%, #C9A84C 0%, transparent 40%)' }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-charcoal-800 border border-gold-500/30 rounded-full px-4 py-1.5 mb-8">
            <Star className="w-3.5 h-3.5 text-gold-500" />
            <span className="text-xs text-gold-400 font-medium">AI-powered CRM built for jewellery retail</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Turn every lead into a{' '}
            <span className="text-gold-gradient">lifelong customer</span>
          </h1>
          <p className="text-lg md:text-xl text-charcoal-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            PreciousAI is the CRM built exclusively for jewellery and gemstone retailers.
            Capture leads from WhatsApp and Instagram, let AI build customer profiles,
            and never miss a follow-up again.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-charcoal-900 font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 text-base"
            >
              Start your free trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#features"
              className="inline-flex items-center gap-2 border border-charcoal-600 hover:border-gold-500 text-white px-8 py-4 rounded-xl transition-all text-base"
            >
              See how it works
            </Link>
          </div>
          <p className="text-charcoal-500 text-sm mt-6">14-day free trial · No credit card required · Setup in 10 minutes</p>

          {/* Mock dashboard preview */}
          <div className="mt-16 relative mx-auto max-w-4xl">
            <div className="dark-glass rounded-2xl p-6 text-left">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-charcoal-400 text-xs ml-2">goldpalace.preciousai.app</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { label: 'Leads this week', value: '24', trend: '↑ 12%' },
                  { label: 'Follow-ups due', value: '8', trend: 'Today' },
                  { label: 'Conversion rate', value: '34%', trend: '↑ 5%' },
                ].map(stat => (
                  <div key={stat.label} className="bg-charcoal-800 rounded-lg p-3">
                    <p className="text-charcoal-400 text-xs">{stat.label}</p>
                    <p className="text-white font-bold text-xl font-display">{stat.value}</p>
                    <p className="text-gold-500 text-xs">{stat.trend}</p>
                  </div>
                ))}
              </div>
              <div className="bg-charcoal-800 rounded-lg p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-charcoal-300 text-xs">New WhatsApp lead — AI tagged automatically</p>
                  <p className="text-white text-sm font-medium">"Looking for bridal jewellery under AED 20,000"</p>
                  <div className="flex gap-2 mt-1">
                    {['Bridal', 'AED 20K budget', 'High Intent'].map(tag => (
                      <span key={tag} className="text-xs bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-charcoal-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              Everything a jeweller needs
            </h2>
            <p className="text-charcoal-400 text-lg max-w-xl mx-auto">
              Built for the unique rhythms of jewellery retail — walk-ins, WhatsApp conversations, occasion-based buying.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="dark-glass rounded-2xl p-6 hover:border-gold-500/40 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center mb-4 group-hover:bg-gold-500/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-gold-500" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-charcoal-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-charcoal-900">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl font-bold text-white mb-3">Trusted by jewellers</h2>
            <p className="text-charcoal-400">Across UAE and India</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="dark-glass rounded-2xl p-8">
                <p className="text-charcoal-200 text-base leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
                    <span className="text-charcoal-900 font-bold text-sm">{t.initials}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-charcoal-400 text-xs">{t.store}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-charcoal-950">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Simple, honest pricing</h2>
            <p className="text-charcoal-400 text-lg">Start free, upgrade when you're ready</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl p-8 flex flex-col ${
                  plan.highlighted
                    ? 'bg-gold-500 text-charcoal-900'
                    : 'dark-glass text-white'
                }`}
              >
                {plan.highlighted && (
                  <div className="text-xs font-bold uppercase tracking-wider mb-3 text-charcoal-700">Most popular</div>
                )}
                <h3 className={`font-display text-2xl font-bold mb-1 ${plan.highlighted ? 'text-charcoal-900' : 'text-white'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-6 ${plan.highlighted ? 'text-charcoal-700' : 'text-charcoal-400'}`}>
                  {plan.description}
                </p>
                <div className="mb-8">
                  {plan.price ? (
                    <div className="flex items-baseline gap-1">
                      <span className={`font-display text-5xl font-bold ${plan.highlighted ? 'text-charcoal-900' : 'text-white'}`}>
                        ${plan.price}
                      </span>
                      <span className={`text-sm ${plan.highlighted ? 'text-charcoal-700' : 'text-charcoal-400'}`}>/month</span>
                    </div>
                  ) : (
                    <p className={`font-display text-3xl font-bold ${plan.highlighted ? 'text-charcoal-900' : 'text-white'}`}>
                      Custom
                    </p>
                  )}
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-charcoal-800' : 'text-gold-500'}`} />
                      <span className={plan.highlighted ? 'text-charcoal-800' : 'text-charcoal-300'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.price ? '/signup' : 'mailto:hello@preciousai.app'}
                  className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.highlighted
                      ? 'bg-charcoal-900 text-white hover:bg-charcoal-800'
                      : 'border border-gold-500/40 text-gold-400 hover:bg-gold-500/10'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-charcoal-500 text-sm mt-8">
            All prices in USD · Billed monthly · Cancel anytime
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-charcoal-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="w-16 h-16 gold-gradient rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Gem className="w-8 h-8 text-charcoal-900" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Ready to grow your store?
          </h2>
          <p className="text-charcoal-400 text-lg mb-8">
            Join jewellers across UAE and India who are closing more sales with less effort.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-charcoal-900 font-semibold px-10 py-4 rounded-xl transition-all hover:scale-105 text-base"
          >
            Start your free 14-day trial <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="flex items-center justify-center gap-6 mt-8">
            {[Shield, CheckCircle2, Star].map((Icon, i) => (
              <div key={i} className="flex items-center gap-2 text-charcoal-400 text-sm">
                <Icon className="w-4 h-4 text-gold-500" />
                {['No credit card', 'Setup in 10 min', '14-day free trial'][i]}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
