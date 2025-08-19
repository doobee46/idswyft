import React from 'react'
import { Link } from 'react-router-dom'
import { 
  ShieldCheckIcon, 
  CodeBracketIcon, 
  CloudIcon,
  LockClosedIcon,
  DocumentCheckIcon,
  CameraIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  StarIcon,
  UserGroupIcon,
  ClockIcon,
  GlobeAltIcon,
  BoltIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    name: 'Document Verification',
    description: 'Advanced OCR and authenticity checks for government-issued IDs, passports, and driver licenses with 99% accuracy.',
    icon: DocumentCheckIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    name: 'Face Recognition',
    description: 'State-of-the-art face matching technology comparing selfies with document photos in real-time.',
    icon: CameraIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    name: 'Developer-First API',
    description: 'RESTful API with comprehensive SDKs, webhooks, and detailed documentation for seamless integration.',
    icon: CodeBracketIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    name: 'Privacy Compliant',
    description: 'GDPR and CCPA compliant with end-to-end encryption, data retention policies, and user rights management.',
    icon: LockClosedIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  {
    name: 'Cloud Ready',
    description: 'Deploy anywhere with support for AWS, Google Cloud, Azure, and self-hosted environments.',
    icon: CloudIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  },
  {
    name: 'Open Source',
    description: 'Fully open source under MIT license. Contribute to the community or customize for your needs.',
    icon: ShieldCheckIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
]

const stats = [
  { name: 'Verification Accuracy', value: '99.2%', icon: ChartBarIcon },
  { name: 'API Response Time', value: '<200ms', icon: BoltIcon },
  { name: 'Countries Supported', value: '150+', icon: GlobeAltIcon },
  { name: 'Developers Trust Us', value: '10K+', icon: UserGroupIcon },
]

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'CTO at FinTech Startup',
    content: 'Idswyft reduced our KYC processing time by 80%. The API is incredibly easy to integrate and the accuracy is outstanding.',
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Lead Developer at MarketPlace Co.',
    content: 'Best identity verification solution we\'ve tried. Open source nature allows us to customize it perfectly for our needs.',
    rating: 5,
  },
  {
    name: 'Elena Rodriguez',
    role: 'Product Manager at HealthTech',
    content: 'GDPR compliance was crucial for us. Idswyft handles all privacy requirements seamlessly while maintaining great UX.',
    rating: 5,
  },
]

const useCases = [
  { text: 'Fintech KYC and AML compliance', icon: ShieldCheckIcon },
  { text: 'Marketplace seller verification', icon: UserGroupIcon },
  { text: 'Age verification for restricted content', icon: ClockIcon },
  { text: 'Account recovery and security', icon: LockClosedIcon },
  { text: 'Remote employee onboarding', icon: CodeBracketIcon },
  { text: 'Healthcare patient verification', icon: DocumentCheckIcon },
]

export function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center">
            <div className="fade-in">
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
                Identity Verification
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  Made Simple
                </span>
              </h1>
              <p className="max-w-3xl mx-auto text-xl text-gray-600 mb-12 leading-relaxed">
                Open-source identity verification platform with advanced document OCR, face recognition, 
                and developer-friendly APIs. Deploy in minutes, scale to millions, maintain compliance.
              </p>
            </div>
            
            <div className="slide-up flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
              <Link
                to="/developer"
                className="btn-primary px-8 py-4 text-lg font-semibold rounded-xl"
              >
                Get API Key Free
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/verify"
                className="btn-secondary px-8 py-4 text-lg font-semibold rounded-xl border-2"
              >
                Try Live Demo
              </Link>
            </div>
            
            {/* Floating stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={stat.name} className={`slide-up animate-float`} style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50">
                    <stat.icon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600 mt-1">{stat.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Everything you need for identity verification
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From document scanning to face matching, we provide enterprise-grade tools 
              that developers love and compliance teams trust.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={feature.name} className={`feature-card fade-in`} style={{animationDelay: `${index * 0.1}s`}}>
                <div className={`inline-flex p-3 rounded-xl ${feature.bgColor} mb-6`}>
                  <feature.icon className={`h-8 w-8 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.name}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-8">
                Trusted by companies worldwide
              </h2>
              <p className="text-lg text-gray-600 mb-12">
                From startups to enterprises, our verification platform powers identity 
                checks across industries and use cases with unmatched reliability.
              </p>
              <div className="space-y-4">
                {useCases.map((useCase, index) => (
                  <div key={index} className="flex items-center p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <useCase.icon className="h-6 w-6 text-blue-600 mr-4 flex-shrink-0" />
                    <span className="text-gray-900 font-medium">{useCase.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-16 lg:mt-0">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8">
                <div className="text-center">
                  <div className="inline-flex p-4 bg-white rounded-full shadow-lg mb-6">
                    <ShieldCheckIcon className="h-12 w-12 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    99.2% Accuracy Rate
                  </h3>
                  <p className="text-gray-600 mb-8">
                    Industry-leading accuracy with continuous ML model improvements
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white rounded-xl p-4">
                      <div className="font-semibold text-gray-900">150+ Countries</div>
                      <div className="text-gray-600">Document Support</div>
                    </div>
                    <div className="bg-white rounded-xl p-4">
                      <div className="font-semibold text-gray-900">&lt; 200ms</div>
                      <div className="text-gray-600">Response Time</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              What developers are saying
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of developers who trust Idswyft for their identity verification needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={testimonial.name} className={`card p-8 fade-in`} style={{animationDelay: `${index * 0.2}s`}}>
                <div className="flex items-center mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-gray-500 text-sm">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600"></div>
        <div className="absolute inset-0 bg-black/20"></div>
        
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Ready to start verifying identities?
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
            Get your API key and start integrating identity verification into your app today. 
            Free tier includes 1,000 verifications per month.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              to="/developer"
              className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 shadow-xl"
            >
              Start for Free
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              View Documentation
            </Link>
          </div>
          
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div className="text-white">
              <div className="text-2xl font-bold">5min</div>
              <div className="text-blue-200">Integration Time</div>
            </div>
            <div className="text-white">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-blue-200">Support Available</div>
            </div>
            <div className="text-white">
              <div className="text-2xl font-bold">SOC2</div>
              <div className="text-blue-200">Compliant</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}