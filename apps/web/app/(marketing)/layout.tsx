import Link from 'next/link'
import { Gem } from 'lucide-react'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-charcoal-900">
      <nav className="fixed top-0 left-0 right-0 z-50 dark-glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
              <Gem className="w-4 h-4 text-charcoal-900" />
            </div>
            <span className="font-display font-semibold text-white text-lg">PreciousAI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm text-charcoal-300 hover:text-gold-500 transition-colors">Features</Link>
            <Link href="/#pricing" className="text-sm text-charcoal-300 hover:text-gold-500 transition-colors">Pricing</Link>
            <Link href="/login" className="text-sm text-charcoal-300 hover:text-white transition-colors">Sign in</Link>
            <Link
              href="/signup"
              className="text-sm bg-gold-500 hover:bg-gold-400 text-charcoal-900 font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="border-t border-charcoal-800 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gold-gradient flex items-center justify-center">
              <Gem className="w-3 h-3 text-charcoal-900" />
            </div>
            <span className="font-display text-white text-sm">PreciousAI</span>
          </div>
          <p className="text-charcoal-400 text-sm">© {new Date().getFullYear()} PreciousAI. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-charcoal-400 hover:text-white text-sm transition-colors">Privacy</Link>
            <Link href="/terms" className="text-charcoal-400 hover:text-white text-sm transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
