import Link from 'next/link'
import { Gem } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-charcoal-900 flex flex-col">
      <nav className="px-6 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
            <Gem className="w-4 h-4 text-charcoal-900" />
          </div>
          <span className="font-display font-semibold text-white text-lg">PreciousAI</span>
        </Link>
      </nav>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  )
}
