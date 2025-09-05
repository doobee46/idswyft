import { Shield, Zap, Users, ArrowRight, CheckCircle, X, Sparkles } from 'lucide-react'
import { useState } from 'react'

function App() {
  const [showSignupForm, setShowSignupForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    estimatedVolume: '',
    useCase: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Get VaaS Backend URL from environment or use default
      const vaasBackendUrl = import.meta.env.VITE_VAAS_BACKEND_URL || 'https://api-vaas.idswyft.app'
      
      const response = await fetch(`${vaasBackendUrl}/api/organizations/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert(`🎉 Success! Your account has been created for ${result.data.organization.name}.\n\nYou'll receive login credentials via email within 24 hours.\n\nSubscription Tier: ${result.data.organization.subscription_tier.toUpperCase()}`)
        setShowSignupForm(false)
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          company: '',
          jobTitle: '',
          estimatedVolume: '',
          useCase: ''
        })
      } else {
        // Handle validation errors
        if (result.error?.details && Array.isArray(result.error.details)) {
          const errorMessages = result.error.details.map((detail: any) => 
            `${detail.field}: ${detail.message}`
          ).join('\n')
          alert(`❌ Please fix the following errors:\n\n${errorMessages}`)
        } else {
          alert(`❌ Signup failed: ${result.error?.message || 'Unknown error occurred'}`)
        }
      }
    } catch (error) {
      console.error('Signup error:', error)
      alert('❌ Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-gray-900 text-xl font-bold">Idswyft VaaS</span>
                <div className="text-xs text-gray-500 font-medium">Identity Verification</div>
              </div>
            </div>
            <div className="hidden lg:flex items-center space-x-10">
              <a href="#features" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">Features</a>
              <a href="#pricing" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">Pricing</a>
              <a href="#api" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">API</a>
              <a href="https://docs.idswyft.com" target="_blank" className="text-gray-700 hover:text-gray-900 transition-colors font-medium text-sm">Documentation</a>
              <button
                onClick={() => setShowSignupForm(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-7 py-3 rounded-2xl font-semibold text-sm hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 ease-out"
              >
                Start Free Trial
              </button>
            </div>
            <button
              onClick={() => setShowSignupForm(true)}
              className="lg:hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/20">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Trusted by 1000+ companies worldwide</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              Identity Verification
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"> as a Service</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-600 mb-12 leading-relaxed font-light">
              Integrate powerful identity verification into your application in minutes, not months. 
              Document processing, face recognition, and fraud detection - all through one simple API.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16">
              <button
                onClick={() => setShowSignupForm(true)}
                className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-105 transition-all duration-300 ease-out"
              >
                <span className="flex items-center justify-center">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <a 
                href="https://docs.idswyft.com" 
                target="_blank"
                className="flex items-center justify-center px-10 py-4 rounded-2xl font-semibold text-lg text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:bg-white hover:shadow-lg transition-all duration-300"
              >
                View Documentation
              </a>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">99.5%</div>
                <div className="text-gray-600 font-medium">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">&lt;30s</div>
                <div className="text-gray-600 font-medium">Average Processing</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">150+</div>
                <div className="text-gray-600 font-medium">Document Types</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Everything you need for identity verification
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              From document scanning to fraud detection, our comprehensive platform handles every aspect of identity verification.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="group">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-3xl p-8 hover:shadow-2xl hover:shadow-gray-900/5 transition-all duration-500 border border-gray-100/50 hover:border-gray-200/50">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Document Processing</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  AI-powered OCR extracts data from government IDs, passports, and driver's licenses with 99.5% accuracy.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    150+ supported document types
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    Real-time fraud detection
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    Tamper detection algorithms
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="group">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-3xl p-8 hover:shadow-2xl hover:shadow-gray-900/5 transition-all duration-500 border border-gray-100/50 hover:border-gray-200/50">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Face Recognition</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Advanced biometric matching compares selfies against document photos to prevent identity spoofing.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    Liveness detection
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    Anti-spoofing technology
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    99.2% accuracy rate
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="group">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-3xl p-8 hover:shadow-2xl hover:shadow-gray-900/5 transition-all duration-500 border border-gray-100/50 hover:border-gray-200/50">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Developer-First API</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  RESTful APIs, webhooks, and SDKs that integrate seamlessly into your existing infrastructure.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    &lt;30 minute integration
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    Real-time webhooks
                  </li>
                  <li className="flex items-center text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    Comprehensive documentation
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Start free, scale as you grow. No hidden fees or long-term commitments.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-3xl p-8 border border-gray-200/50 hover:shadow-xl hover:shadow-gray-900/5 transition-all duration-500">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Starter</h3>
                <div className="text-5xl font-bold text-gray-900 mb-2">$299</div>
                <div className="text-gray-600">/month + $2 per verification</div>
                <div className="text-sm text-gray-500 mt-2">Up to 500 verifications</div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Document verification</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Face matching</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">API access</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Email support</span>
                </li>
              </ul>
              <button
                onClick={() => setShowSignupForm(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                Start Free Trial
              </button>
            </div>
            
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 text-white relative overflow-hidden transform scale-105">
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">Professional</h3>
                <div className="text-5xl font-bold mb-2">$799</div>
                <div className="text-blue-100">/month + $1.50 per verification</div>
                <div className="text-sm text-blue-100 mt-2">Up to 2,000 verifications</div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-white mr-3 flex-shrink-0" />
                  <span className="text-white">Everything in Starter</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-white mr-3 flex-shrink-0" />
                  <span className="text-white">Fraud detection</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-white mr-3 flex-shrink-0" />
                  <span className="text-white">Webhooks</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-white mr-3 flex-shrink-0" />
                  <span className="text-white">Priority support</span>
                </li>
              </ul>
              <button
                onClick={() => setShowSignupForm(true)}
                className="w-full bg-white text-blue-600 py-4 rounded-2xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                Start Free Trial
              </button>
            </div>
            
            <div className="bg-white rounded-3xl p-8 border border-gray-200/50 hover:shadow-xl hover:shadow-gray-900/5 transition-all duration-500">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Enterprise</h3>
                <div className="text-5xl font-bold text-gray-900 mb-2">$2,499</div>
                <div className="text-gray-600">/month + $1 per verification</div>
                <div className="text-sm text-gray-500 mt-2">Unlimited verifications</div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Everything in Professional</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Custom integrations</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">SLA guarantee</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Dedicated support</span>
                </li>
              </ul>
              <button
                onClick={() => setShowSignupForm(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8">
            Ready to get started?
          </h2>
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join thousands of companies already using Idswyft VaaS to verify identities and prevent fraud.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button
              onClick={() => setShowSignupForm(true)}
              className="bg-white text-blue-600 px-10 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              Start Free Trial
            </button>
            <a 
              href="https://docs.idswyft.com" 
              target="_blank"
              className="bg-white/10 backdrop-blur-sm text-white px-10 py-4 rounded-2xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              View Documentation
            </a>
          </div>
        </div>
      </section>

      {/* Signup Form Modal */}
      {showSignupForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Start Your Free Trial</h2>
                  <p className="text-gray-600">Get 1,000 free identity verifications to test our platform</p>
                </div>
                <button
                  onClick={() => setShowSignupForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-xl"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-semibold text-gray-900 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="John"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-semibold text-gray-900 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-semibold text-gray-900 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    required
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Acme Corporation"
                  />
                </div>

                <div>
                  <label htmlFor="jobTitle" className="block text-sm font-semibold text-gray-900 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    id="jobTitle"
                    name="jobTitle"
                    required
                    value={formData.jobTitle}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="CTO, Product Manager, etc."
                  />
                </div>

                <div>
                  <label htmlFor="estimatedVolume" className="block text-sm font-semibold text-gray-900 mb-2">
                    Expected Monthly Verification Volume *
                  </label>
                  <select
                    id="estimatedVolume"
                    name="estimatedVolume"
                    required
                    value={formData.estimatedVolume}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  >
                    <option value="">Select volume range</option>
                    <option value="1-1000">1 - 1,000 verifications</option>
                    <option value="1000-10000">1,000 - 10,000 verifications</option>
                    <option value="10000-50000">10,000 - 50,000 verifications</option>
                    <option value="50000+">50,000+ verifications</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="useCase" className="block text-sm font-semibold text-gray-900 mb-2">
                    Primary Use Case *
                  </label>
                  <textarea
                    id="useCase"
                    name="useCase"
                    required
                    value={formData.useCase}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
                    placeholder="Tell us how you plan to use identity verification (e.g., user onboarding, KYC compliance, fraud prevention, etc.)"
                  />
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-100/50">
                  <h4 className="font-semibold text-gray-900 mb-4">What happens next?</h4>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      We'll create your account within 24 hours
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      You'll receive API keys and documentation
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      Get 1,000 free verifications to test the platform
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      Optional onboarding call with our team
                    </li>
                  </ul>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowSignupForm(false)}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-200 font-semibold"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Creating Account...
                      </div>
                    ) : (
                      'Start Free Trial'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App