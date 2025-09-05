import { Shield, Zap, Lock, Users, ArrowRight, CheckCircle, Clock, X, Building, Mail, Phone, User } from 'lucide-react'
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
    <div className="min-h-screen bg-white">
      {/* Signup Form Modal */}
      {showSignupForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Start Your Free Trial</h2>
                  <p className="text-gray-600 mt-1">Get 1,000 free identity verifications to test our platform</p>
                </div>
                <button
                  onClick={() => setShowSignupForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        required
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="John"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Smith"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Business Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        id="company"
                        name="company"
                        required
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Acme Corp"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    id="jobTitle"
                    name="jobTitle"
                    required
                    value={formData.jobTitle}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="CTO, Product Manager, etc."
                  />
                </div>

                <div>
                  <label htmlFor="estimatedVolume" className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Monthly Verification Volume *
                  </label>
                  <select
                    id="estimatedVolume"
                    name="estimatedVolume"
                    required
                    value={formData.estimatedVolume}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select volume range</option>
                    <option value="1-1000">1 - 1,000 verifications</option>
                    <option value="1000-10000">1,000 - 10,000 verifications</option>
                    <option value="10000-50000">10,000 - 50,000 verifications</option>
                    <option value="50000+">50,000+ verifications</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="useCase" className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Use Case *
                  </label>
                  <textarea
                    id="useCase"
                    name="useCase"
                    required
                    value={formData.useCase}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Tell us how you plan to use identity verification (e.g., user onboarding, KYC compliance, fraud prevention, etc.)"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      We'll create your account within 24 hours
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      You'll receive API keys and documentation
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      Get 1,000 free verifications to test the platform
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      Optional onboarding call with our team
                    </li>
                  </ul>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowSignupForm(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
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

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container-max section-padding">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Idswyft VaaS</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Solutions</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#benefits" className="text-gray-600 hover:text-gray-900 transition-colors">Benefits</a>
              <a href="#contact" className="btn btn-primary">Get Started</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="section-padding py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container-max">
          <div className="text-center animate-fadeInUp">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="gradient-text">Identity Verification</span>
              <br />
              Made Simple for Business
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto animate-fadeInUp animate-delay-200">
              Reduce fraud and meet compliance requirements with our turnkey identity verification solution. 
              Verify customers instantly with 99% accuracy - no technical expertise required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeInUp animate-delay-400">
              <button 
                className="btn btn-primary text-lg px-8 py-4"
                onClick={() => setShowSignupForm(true)}
              >
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button className="btn btn-secondary text-lg px-8 py-4">
                Schedule Demo
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4">No credit card required • 1,000 free verifications</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section-padding py-16 bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">85%</div>
              <div className="text-gray-600">Fraud Reduction</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">&lt;30s</div>
              <div className="text-gray-600">Customer Onboarding</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Automated Processing</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
              <div className="text-gray-600">Compliance Ready</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding py-20 bg-gray-50">
        <div className="container-max">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Protect Your Business from Fraud
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our turnkey solution helps businesses of all sizes reduce fraud, improve customer trust, 
              and meet regulatory compliance requirements automatically.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Instant Document Verification</h3>
              <p className="text-gray-600 mb-6">
                Automatically verify government IDs, passports, and licenses from 190+ countries. Stop fraudsters before they can harm your business.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Detect fake documents instantly
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Global document coverage
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  No manual review needed
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Customer Identity Matching</h3>
              <p className="text-gray-600 mb-6">
                Ensure your customers are who they claim to be. Advanced facial recognition prevents account takeover and identity theft.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Prevent account takeovers
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Stop synthetic identities
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Real person verification
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Compliance & Reporting</h3>
              <p className="text-gray-600 mb-6">
                Meet KYC, AML, and regulatory requirements automatically. Comprehensive audit trails and reporting keep you compliant.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Automatic compliance checks
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Complete audit trails
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Regulatory reporting
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding py-20 bg-white">
        <div className="container-max">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Why Businesses Choose Idswyft
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of companies who trust us to protect their business and customers.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Reduce Fraud by 85%</h3>
                  <p className="text-gray-600">Stop fraudulent accounts before they cost your business. Our customers see average fraud reduction of 85% within the first month.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Launch in Days, Not Months</h3>
                  <p className="text-gray-600">No technical expertise required. Our turnkey solution can be deployed and operational within days.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Stay Compliant Automatically</h3>
                  <p className="text-gray-600">Meet KYC, AML, and GDPR requirements without the headache. Automatic compliance reporting and audit trails.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-yellow-100 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Improve Customer Experience</h3>
                  <p className="text-gray-600">Faster onboarding means happier customers. Verify identities in under 30 seconds with minimal friction.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">$2.4M</div>
                <div className="text-gray-600 mb-4">Average annual fraud savings</div>
                <div className="text-2xl font-bold text-green-600 mb-2">150%</div>
                <div className="text-gray-600 mb-4">ROI in first year</div>
                <div className="text-2xl font-bold text-purple-600 mb-2">40%</div>
                <div className="text-gray-600">Faster customer onboarding</div>
              </div>
              <div className="mt-8 text-center">
                <button 
                  onClick={() => setShowSignupForm(true)}
                  className="btn btn-primary"
                >
                  Calculate Your Savings <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section-padding py-20 bg-gray-50">
        <div className="container-max">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Pay per verification with volume discounts. No hidden fees or monthly commitments.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Starter</h3>
                <div className="text-3xl font-bold text-gray-900 mb-4">
                  $0.50<span className="text-sm font-normal text-gray-600">/verification</span>
                </div>
                <p className="text-gray-600 mb-6">Perfect for small applications and testing</p>
                <button 
                  onClick={() => setShowSignupForm(true)}
                  className="btn btn-outline w-full mb-6"
                >
                  Start Free Trial
                </button>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    1,000 free verifications
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Document verification
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Face verification
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    API access
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Email support
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-600 p-8 rounded-xl shadow-lg text-white relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Professional</h3>
                <div className="text-3xl font-bold mb-4">
                  $0.30<span className="text-sm font-normal opacity-80">/verification</span>
                </div>
                <p className="opacity-80 mb-6">For growing businesses and scale</p>
                <button 
                  onClick={() => setShowSignupForm(true)}
                  className="btn btn-secondary w-full mb-6"
                >
                  Start Free Trial
                </button>
                <ul className="space-y-3 text-sm opacity-90">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-blue-200 mr-2" />
                    Everything in Starter
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-blue-200 mr-2" />
                    Volume discounts
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-blue-200 mr-2" />
                    Webhook notifications
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-blue-200 mr-2" />
                    Priority support
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-blue-200 mr-2" />
                    SLA guarantee
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Enterprise</h3>
                <div className="text-3xl font-bold text-gray-900 mb-4">
                  Custom<span className="text-sm font-normal text-gray-600"> pricing</span>
                </div>
                <p className="text-gray-600 mb-6">For large-scale implementations</p>
                <button className="btn btn-primary w-full mb-6">Contact Sales</button>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Everything in Professional
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Custom integrations
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    On-premise deployment
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    24/7 phone support
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Enterprise SLA
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding py-20 bg-blue-600">
        <div className="container-max text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Protect Your Business?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses who trust Idswyft to reduce fraud and improve customer trust.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowSignupForm(true)}
              className="btn btn-secondary text-lg px-8 py-4"
            >
              Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button className="btn btn-outline text-lg px-8 py-4 text-white border-white hover:bg-white hover:text-blue-600">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="section-padding py-12 bg-gray-900 text-white">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-6 w-6 text-blue-400" />
                <span className="text-lg font-semibold">Idswyft VaaS</span>
              </div>
              <p className="text-gray-400 text-sm">
                Enterprise-grade identity verification for modern applications.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-white transition-colors">LinkedIn</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-400">
              © 2024 Idswyft. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
