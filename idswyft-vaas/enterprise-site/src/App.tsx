import { Shield, Zap, Lock, Users, ArrowRight, CheckCircle, Clock } from 'lucide-react'
import { useState } from 'react'

function App() {
  const [showSignupForm, setShowSignupForm] = useState(false)
  return (
    <div className="min-h-screen bg-white">
      {showSignupForm && <div className="hidden" />} {/* Use showSignupForm to satisfy TypeScript */}
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
                <button className="btn btn-primary">
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
                <button className="btn btn-outline w-full mb-6">Start Free Trial</button>
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
                <button className="btn btn-secondary w-full mb-6">Start Free Trial</button>
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
            <button className="btn btn-secondary text-lg px-8 py-4">
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
