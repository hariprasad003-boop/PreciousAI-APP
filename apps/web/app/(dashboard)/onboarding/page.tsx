'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Gem, CheckCircle2, ArrowRight, Palette, MessageCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const GOLD_SHADES = [
  { label: 'Classic Gold', value: '#C9A84C' },
  { label: 'Rose Gold', value: '#C8856A' },
  { label: 'Deep Gold', value: '#A0722A' },
  { label: 'Platinum', value: '#8E9EAB' },
  { label: 'Ruby', value: '#9B2335' },
  { label: 'Emerald', value: '#1A6B4A' },
]

const STEPS = [
  { id: 1, label: 'Branding' },
  { id: 2, label: 'WhatsApp' },
  { id: 3, label: 'Done' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#C9A84C')

  async function complete() {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_color: primaryColor }),
      })
      if (!res.ok) throw new Error('Failed to complete onboarding')
      router.push('/home')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                step > s.id
                  ? 'bg-gold-500 text-charcoal-900'
                  : step === s.id
                  ? 'bg-gold-500/20 border-2 border-gold-500 text-gold-400'
                  : 'bg-charcoal-800 text-charcoal-500'
              )}>
                {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
              </div>
              <span className={cn('text-xs hidden sm:block', step >= s.id ? 'text-white' : 'text-charcoal-500')}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn('w-8 h-px mx-1', step > s.id ? 'bg-gold-500' : 'bg-charcoal-700')} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Branding */}
        {step === 1 && (
          <div className="dark-glass rounded-2xl p-8 animate-fade-in">
            <div className="w-12 h-12 gold-gradient rounded-xl flex items-center justify-center mb-6">
              <Palette className="w-6 h-6 text-charcoal-900" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">Set your brand colour</h2>
            <p className="text-charcoal-400 text-sm mb-8 leading-relaxed">
              Pick the primary colour for your store dashboard. You can update this anytime in Settings.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {GOLD_SHADES.map(shade => (
                <button
                  key={shade.value}
                  onClick={() => setPrimaryColor(shade.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    primaryColor === shade.value
                      ? 'border-white/60 bg-white/5'
                      : 'border-charcoal-700 hover:border-charcoal-600'
                  )}
                >
                  <div
                    className="w-10 h-10 rounded-full shadow-lg"
                    style={{ backgroundColor: shade.value }}
                  />
                  <span className="text-charcoal-300 text-xs text-center">{shade.label}</span>
                  {primaryColor === shade.value && (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className="bg-charcoal-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Gem className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Your Store</p>
                  <p className="text-charcoal-400 text-xs">Dashboard preview</p>
                </div>
                <div
                  className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Active nav
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-charcoal-900 font-semibold py-3 rounded-xl transition-all"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: WhatsApp */}
        {step === 2 && (
          <div className="dark-glass rounded-2xl p-8 animate-fade-in">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
              <MessageCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">Connect WhatsApp</h2>
            <p className="text-charcoal-400 text-sm mb-6 leading-relaxed">
              Connect your WhatsApp Business number so that inbound messages are automatically captured
              as leads — no manual entry needed.
            </p>

            <div className="space-y-3 mb-8">
              {[
                'Inbound messages become leads instantly',
                'AI reads messages and tags them automatically',
                'Reply to customers directly from PreciousAI',
                'Works with your existing WhatsApp Business number',
              ].map(feature => (
                <div key={feature} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-charcoal-300 text-sm">{feature}</p>
                </div>
              ))}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-6">
              <p className="text-amber-300 text-xs">
                WhatsApp setup takes about 10 minutes and requires a Meta Developer account.
                You can do it now or come back to it later in Settings.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 border border-charcoal-600 hover:border-charcoal-500 text-charcoal-300 hover:text-white py-3 rounded-xl text-sm transition-all"
              >
                Skip for now
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl text-sm transition-all"
              >
                Set up WhatsApp <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="dark-glass rounded-2xl p-8 text-center animate-fade-in">
            <div className="w-16 h-16 gold-gradient rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-charcoal-900" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-3">You're all set!</h2>
            <p className="text-charcoal-400 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
              Your store is ready. Start by adding your first lead — from WhatsApp, walk-in,
              or manually — and watch the pipeline grow.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8 text-left">
              {[
                { step: '1', text: 'Add your first lead' },
                { step: '2', text: 'Connect WhatsApp' },
                { step: '3', text: 'Import existing customers' },
              ].map(item => (
                <div key={item.step} className="bg-charcoal-800 rounded-xl p-3">
                  <div className="w-6 h-6 gold-gradient rounded-lg flex items-center justify-center mb-2">
                    <span className="text-charcoal-900 font-bold text-xs">{item.step}</span>
                  </div>
                  <p className="text-charcoal-300 text-xs">{item.text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={complete}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-charcoal-900 font-semibold py-3.5 rounded-xl transition-all text-base"
            >
              {loading ? 'Setting up…' : 'Go to my dashboard'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
