import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  ShieldCheckIcon, 
  CodeBracketIcon, 
  DocumentTextIcon,
  BuildingOfficeIcon 
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

interface LayoutProps {
  children: ReactNode
}

const getEnterpriseUrl = () => {
  // In production, use the enterprise subdomain (check for any idswyft.app subdomain)
  if (window.location.hostname.endsWith('.idswyft.app') || window.location.hostname === 'idswyft.app') {
    return 'https://enterprise.idswyft.app'
  }
  // In development, use localhost
  return 'http://localhost:3015'
}

const navigation = [
  { name: 'Home', href: '/', icon: ShieldCheckIcon },
  { name: 'Developer', href: '/developer', icon: CodeBracketIcon },
  { name: 'Demo', href: '/demo', icon: DocumentTextIcon },
  { name: 'Docs', href: '/docs', icon: DocumentTextIcon },
  { name: 'Enterprise', href: getEnterpriseUrl(), icon: BuildingOfficeIcon, external: true },
]

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isUserVerificationRoute = location.pathname.startsWith('/user-verification')
  
  if (isAdminRoute && location.pathname !== '/admin/login') {
    // Admin layout will be handled separately
    return <>{children}</>
  }
  
  if (isUserVerificationRoute) {
    // User verification page - no navbar, no footer, clean standalone experience
    return <>{children}</>
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Floating Pill Navigation */}
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-6xl px-6">
        <div className="bg-white/90 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl shadow-black/10 px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <ShieldCheckIcon className="h-4 w-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-gray-900 text-lg font-bold">Idswyft</span>
                  <div className="text-xs text-gray-500 font-medium">Identity Verification</div>
                </div>
              </Link>
            </div>
            
            {/* Navigation links - Centered */}
            <div className="hidden lg:flex items-center space-x-8">
              {navigation.slice(0, -1).map((item) => {
                const Icon = item.icon
                const isActive = !item.external && (location.pathname === item.href || 
                  (item.href !== '/' && location.pathname.startsWith(item.href)))
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'text-sm font-medium transition-all hover:scale-105 transform',
                      isActive
                        ? 'text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
            
            {/* Right side */}
            <div className="flex items-center space-x-3">
              {/* Enterprise Link */}
              <a
                href={getEnterpriseUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 transition-all hover:scale-105 transform"
              >
                <BuildingOfficeIcon className="h-4 w-4 mr-1.5" />
                Enterprise
              </a>
              
              <a
                href="https://github.com/doobee46/idswyft"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700 hover:scale-105 transition-all transform"
              >
                <span className="sr-only">GitHub</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              
              {/* Mobile menu button */}
              <button className="lg:hidden w-8 h-8 rounded-full bg-gray-100/50 hover:bg-gray-200/50 transition-colors flex items-center justify-center backdrop-blur-sm">
                <div className="w-4 h-4 flex flex-col justify-between">
                  <div className="w-4 h-0.5 bg-gray-600 rounded"></div>
                  <div className="w-4 h-0.5 bg-gray-600 rounded"></div>
                  <div className="w-4 h-0.5 bg-gray-600 rounded"></div>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        <div className="lg:hidden mt-2">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-white/30 shadow-xl shadow-black/5 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = !item.external && (location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href)))
              
              if (item.external) {
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2.5 rounded-xl text-base font-medium space-x-3 text-gray-600 hover:bg-gray-50/80 hover:text-gray-900 transition-colors"
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </a>
                )
              }
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center px-3 py-2.5 rounded-xl text-base font-medium space-x-3 transition-colors',
                    isActive
                      ? 'bg-primary-50/80 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
      
      {/* Main content */}
      <main className="flex-1 pt-24">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="mb-6">
                <img 
                  src="https://bqrhaxpjlvyjekrwggqx.supabase.co/storage/v1/object/public/assets/logo_main.png" 
                  alt="Idswyft" 
                  className="h-10 w-auto flex-shrink-0"
                  onError={(e) => {
                    // Fallback to icon and text if image fails to load
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="hidden items-center space-x-2">
                  <ShieldCheckIcon className="h-8 w-8 text-primary-600 flex-shrink-0" />
                  <span className="text-xl font-bold text-gray-900">Idswyft</span>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Open-source identity verification platform built for developers. 
                Secure, fast, and compliant with GDPR and CCPA.
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                Developer
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/docs" className="text-sm text-gray-600 hover:text-gray-900">
                    API Documentation
                  </Link>
                </li>
                <li>
                  <Link to="/developer" className="text-sm text-gray-600 hover:text-gray-900">
                    Get API Key
                  </Link>
                </li>
                <li>
                  <a 
                    href="https://github.com/idswyft/idswyft" 
                    className="text-sm text-gray-600 hover:text-gray-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub Repository
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                Legal
              </h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                    GDPR Compliance
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              © 2024 Idswyft. Open source under MIT License.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}