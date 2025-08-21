import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDocumentationApiUrl } from '../config/api'
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
  ChartBarIcon,
  PlayIcon,
  CommandLineIcon,
  CubeIcon,
  AcademicCapIcon,
  BookOpenIcon,
  RocketLaunchIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    name: 'AI-Powered Document Verification',
    description: 'Advanced OCR extraction with confidence scores, quality analysis (blur, brightness, resolution), and authenticity checks with 99% accuracy.',
    icon: DocumentCheckIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    name: 'Live Camera Capture & Face Matching',
    description: 'Real-time camera capture with advanced liveness detection, challenge-response verification, and instant face matching against document photos.',
    icon: CameraIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    name: 'Developer-First API',
    description: 'RESTful API with TypeScript/Python SDKs, comprehensive AI analysis results, webhooks, and detailed documentation for seamless integration.',
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

const getCodeExamples = (apiUrl: string) => ({
  curl: `# Complete verification flow
curl -X POST ${apiUrl}/api/verify/start \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_123"}'

curl -X POST ${apiUrl}/api/verify/document \
  -H "X-API-Key: YOUR_API_KEY" \
  -F "verification_id=verif_abc123" \
  -F "document=@passport.jpg" \
  -F "document_type=passport"

curl -X POST ${apiUrl}/api/verify/live-capture \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"verification_id": "verif_abc123", "live_image_data": "base64..."}'

curl -X GET ${apiUrl}/api/verify/results/verif_abc123 \
  -H "X-API-Key: YOUR_API_KEY"`,
  javascript: `import { IdswyftSDK } from '@idswyft/sdk';

const client = new IdswyftSDK({
  apiKey: 'your_api_key',
  sandbox: false
});

// Complete verification flow
const session = await client.startVerification({
  user_id: 'user_123'
});

await client.uploadDocument({
  verification_id: session.verification_id,
  document_type: 'passport',
  document_file: documentFile
});

await client.liveCapture({
  verification_id: session.verification_id,
  live_image_data: capturedImageBase64
});

const results = await client.getResults(session.verification_id);
console.log(results.status); // 'verified'
console.log(results.ocr_data.name); // 'John Doe'
console.log(results.liveness_score); // 0.94`,
  python: `import idswyft

client = idswyft.IdswyftClient(
    api_key="your_api_key",
    sandbox=False
)

# Complete verification flow
session = client.start_verification(user_id="user_123")

client.upload_document(
    verification_id=session["verification_id"],
    document_type="passport",
    document_file="passport.jpg"
)

client.live_capture(
    verification_id=session["verification_id"],
    live_image_data=captured_image_base64
)

results = client.get_results(session["verification_id"])
print(f"Status: {results['status']}")
print(f"Name: {results['ocr_data']['name']}")
print(f"Liveness: {results['liveness_score']}")`,
  response: `{
  "id": "verif_abc123",
  "status": "verified",
  "type": "document",
  "confidence_score": 0.95,
  "user_id": "user_123",
  "developer_id": "dev_xyz789",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:15Z",
  "ocr_data": {
    "name": "John Doe",
    "date_of_birth": "1990-01-01",
    "document_number": "P123456789",
    "expiration_date": "2030-01-01",
    "nationality": "US",
    "confidence_scores": {
      "name": 0.98,
      "date_of_birth": 0.95,
      "document_number": 0.92,
      "expiration_date": 0.94
    }
  },
  "quality_analysis": {
    "overallQuality": "excellent",
    "isBlurry": false,
    "blurScore": 342.5,
    "brightness": 128,
    "contrast": 45,
    "resolution": {
      "width": 1920,
      "height": 1080,
      "isHighRes": true
    },
    "fileSize": {
      "bytes": 2457600,
      "isReasonableSize": true
    },
    "issues": [],
    "recommendations": ["Increase lighting for even better clarity"]
  }
}`
})

const integrationSteps = [
  {
    step: '1',
    title: 'Get API Key',
    description: 'Sign up and get your free API key instantly',
    icon: CommandLineIcon,
    color: 'from-blue-500 to-blue-600'
  },
  {
    step: '2', 
    title: 'Start Session',
    description: 'Create verification session with user ID',
    icon: CubeIcon,
    color: 'from-purple-500 to-purple-600'
  },
  {
    step: '3',
    title: 'Verify & Capture',
    description: 'Upload documents + live capture for complete verification',
    icon: RocketLaunchIcon,
    color: 'from-green-500 to-green-600'
  }
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
  const [activeTab, setActiveTab] = useState('javascript')
  const [isVisible, setIsVisible] = useState(false)
  const apiUrl = getDocumentationApiUrl()
  const codeExamples = getCodeExamples(apiUrl)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="bg-white">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Enhanced Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[1200px] h-[1200px] bg-gradient-to-r from-blue-400/15 to-purple-400/15 rounded-full blur-3xl"></div>
          <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-20 sm:pb-40">
          <div className="text-center">
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {/* Badge - Mobile optimized */}
              <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-full border border-blue-200/50 mb-6 sm:mb-8">
                <CameraIcon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm font-medium text-blue-900">New: Live camera capture with real-time verification</span>
              </div>
              
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-gray-900 mb-6 sm:mb-8 leading-tight px-2">
                <span className="block">Identity Verification</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600">
                  For Developers
                </span>
              </h1>
              <p className="max-w-4xl mx-auto text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-8 sm:mb-12 leading-relaxed font-light px-3">
                The most <span className="font-semibold text-gray-900">developer-friendly</span> identity verification platform. 
                Advanced document OCR, live camera capture, face recognition, and AI quality analysis in a single API call.
                <span className="block mt-2 sm:mt-4 text-sm sm:text-base lg:text-lg text-gray-500">Open source • Privacy-first • Production-ready</span>
              </p>
            </div>
            
            <div className={`flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center items-center mb-12 sm:mb-20 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} px-3`}>
              <Link
                to="/developer"
                className="group inline-flex items-center justify-center w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 touch-manipulation"
              >
                <CommandLineIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Get API Key Free
                <ArrowRightIcon className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/verify"
                className="group inline-flex items-center justify-center w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-xl transition-all duration-300 transform hover:scale-105 touch-manipulation"
              >
                <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Try Live Demo
                <ArrowRightIcon className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/docs"
                className="group inline-flex items-center justify-center w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium text-gray-600 hover:text-gray-900 transition-colors touch-manipulation"
              >
                <BookOpenIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                View Docs
                <ArrowRightIcon className="ml-2 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            {/* Enhanced stats - Mobile optimized */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 max-w-5xl mx-auto px-3">
              {stats.map((stat, index) => (
                <div 
                  key={stat.name} 
                  className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{transitionDelay: `${(index + 1) * 200}ms`}}
                >
                  <div className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-xl border border-gray-200/50 hover:shadow-2xl hover:border-gray-300/50 transition-all duration-300 transform hover:scale-105">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <stat.icon className="relative h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-600 mx-auto mb-2 sm:mb-3 group-hover:text-purple-600 transition-colors" />
                    </div>
                    <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1 group-hover:text-gray-700 transition-colors">{stat.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Integration Preview - Mobile optimized */}
      <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-2">
              Start verifying in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">5 minutes</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-3">
              Simple REST API, comprehensive SDKs, and detailed documentation. 
              Get up and running faster than any other verification platform.
            </p>
          </div>
          
          {/* Integration Steps - Mobile optimized */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12 lg:mb-16">
            {integrationSteps.map((step, _) => (
              <div key={step.step} className="text-center group">
                <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-r ${step.color} text-white mb-4 sm:mb-6 group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300 transform group-hover:scale-110`}>
                  <step.icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 px-2">{step.description}</p>
                <div className="text-xs sm:text-sm font-mono text-blue-600 mt-2">Step {step.step}</div>
              </div>
            ))}
          </div>
          
          {/* Code Example - Mobile optimized */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="bg-gray-900 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex space-x-1">
                {Object.keys(codeExamples).slice(0, 3).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveTab(lang)}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded transition-colors touch-manipulation ${
                      activeTab === lang 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {lang === 'javascript' ? 'JS' : lang === 'python' ? 'Python' : 'cURL'}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 sm:p-6">
              <pre className="text-xs sm:text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap sm:whitespace-pre">
                <code>{codeExamples[activeTab as keyof typeof codeExamples]}</code>
              </pre>
            </div>
          </div>
          
          {/* Response Preview */}
          <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center mb-4">
              <CheckCircleIcon className="w-6 h-6 text-green-600 mr-2" />
              <h4 className="text-lg font-semibold text-green-900">Instant Response</h4>
            </div>
            <pre className="text-sm text-green-800 overflow-x-auto bg-white/50 p-4 rounded-lg">
              <code>{codeExamples.response}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Enterprise-grade features,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                developer-first experience
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              From document scanning to face matching, we provide enterprise-grade tools 
              with the simplicity developers love and the compliance features teams trust.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, _) => (
              <div 
                key={feature.name} 
                className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl hover:border-gray-200 transition-all duration-300 transform hover:scale-105"
              >
                <div className="relative mb-6">
                  <div className={`inline-flex p-4 rounded-2xl ${feature.bgColor} group-hover:shadow-lg transition-all duration-300`}>
                    <feature.icon className={`h-8 w-8 ${feature.color} group-hover:scale-110 transition-transform duration-300`} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">{feature.name}</h3>
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">{feature.description}</p>
                <div className="mt-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <div className="inline-flex items-center text-sm font-medium text-blue-600">
                    Learn more <ArrowRightIcon className="ml-1 w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer Experience Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">developer happiness</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every feature designed with developer experience in mind. 
              From comprehensive SDKs to real-time webhooks and detailed documentation.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="inline-flex p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                      <CodeBracketIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Multiple SDKs</h3>
                    <p className="text-gray-600 mb-4">JavaScript, Python, Go, PHP, and REST API. Choose your preferred language.</p>
                    <div className="flex flex-wrap gap-2">
                      {['JavaScript', 'Python', 'Go', 'PHP', 'cURL'].map((lang) => (
                        <span key={lang} className="inline-flex px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="inline-flex p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                      <BoltIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Real-time Webhooks</h3>
                    <p className="text-gray-600 mb-4">Get instant notifications when verification status changes. Automatic retries included.</p>
                    <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-gray-700">
                      POST /your-webhook-url<br/>
                      {'{"verification_id": "ver_123", "status": "verified"}'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="inline-flex p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                      <AcademicCapIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Comprehensive Docs</h3>
                    <p className="text-gray-600 mb-4">Interactive API explorer, code examples, and step-by-step guides for every feature.</p>
                    <Link to="/docs" className="inline-flex items-center text-blue-600 font-medium hover:text-blue-700">
                      Explore Documentation <ArrowRightIcon className="ml-1 w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              {/* AI Quality Analysis Showcase */}
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">🤖 AI Quality Analysis</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm">Live</span>
                    </div>
                  </div>
                  <p className="text-blue-100 mt-2">Real-time document quality assessment</p>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-green-800">Overall Quality</span>
                    <span className="px-3 py-1 bg-green-600 text-white text-sm font-bold rounded-full">EXCELLENT</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-gray-600">Sharpness</div>
                      <div className="font-bold text-gray-900">342.5</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-gray-600">Brightness</div>
                      <div className="font-bold text-gray-900">128.3</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-gray-600">Resolution</div>
                      <div className="font-bold text-gray-900">1920×1080 ✓</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-gray-600">File Size</div>
                      <div className="font-bold text-gray-900">2.1MB ✓</div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start space-x-2">
                      <SparklesIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-blue-900">AI Recommendations</div>
                        <div className="text-sm text-blue-700 mt-1">Document quality is excellent. No improvements needed.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-xl"></div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-xl"></div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Use cases section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Trusted across <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">industries</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From fintech to healthcare, our verification platform powers identity 
              checks across industries with unmatched reliability and compliance.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase, index) => (
              <div key={index} className="group bg-white p-6 rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="inline-flex p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl group-hover:from-blue-100 group-hover:to-purple-100 transition-all duration-300">
                      <useCase.icon className="w-6 h-6 text-blue-600 group-hover:text-purple-600 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-900 font-semibold group-hover:text-blue-900 transition-colors">{useCase.text}</span>
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                      <span className="text-sm text-blue-600 font-medium">Learn more →</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Performance Stats */}
          <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Performance That Scales</h3>
              <p className="text-blue-100">Industry-leading metrics across all platforms</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">99.2%</div>
                <div className="text-blue-200 text-sm">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">&lt;200ms</div>
                <div className="text-blue-200 text-sm">Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">150+</div>
                <div className="text-blue-200 text-sm">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">99.9%</div>
                <div className="text-blue-200 text-sm">Uptime SLA</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Loved by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">developers</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join 10,000+ developers who trust Idswyft for their identity verification needs. 
              See what they're saying about our platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, _) => (
              <div key={testimonial.name} className="group bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl hover:border-gray-200 transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center mb-6">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                  <div className="ml-2 text-sm font-medium text-gray-500">5.0</div>
                </div>
                <blockquote className="text-gray-700 mb-6 text-lg leading-relaxed font-medium italic group-hover:text-gray-800 transition-colors">
                  "{testimonial.content}"
                </blockquote>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 group-hover:text-blue-900 transition-colors">{testimonial.name}</div>
                    <div className="text-gray-600 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Social Proof */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center space-x-6 bg-white rounded-2xl px-8 py-4 shadow-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <UserGroupIcon className="w-6 h-6 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">10K+</span>
                <span className="text-gray-600">Developers</span>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex items-center space-x-2">
                <GlobeAltIcon className="w-6 h-6 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900">50+</span>
                <span className="text-gray-600">Countries</span>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="w-6 h-6 text-green-600" />
                <span className="text-2xl font-bold text-gray-900">1M+</span>
                <span className="text-gray-600">Verifications</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA section */}
      <section className="relative py-32 overflow-hidden">
        {/* Enhanced Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600"></div>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 mb-8">
            <RocketLaunchIcon className="w-4 h-4 text-white mr-2" />
            <span className="text-sm font-medium text-white">Start building today</span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
            Ready to ship?
            <span className="block text-4xl md:text-5xl font-light text-blue-100 mt-4">
              Start verifying identities in minutes
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-16 max-w-4xl mx-auto leading-relaxed">
            Get your API key and start integrating identity verification into your app today. 
            <span className="block mt-2 font-semibold text-white">Free tier includes 1,000 verifications per month. No credit card required.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Link
              to="/developer"
              className="group inline-flex items-center px-10 py-5 bg-white text-blue-600 font-bold text-lg rounded-2xl hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              <CommandLineIcon className="w-6 h-6 mr-2" />
              Get Free API Key
              <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/verify"
              className="group inline-flex items-center px-10 py-5 bg-transparent border-2 border-white text-white font-bold text-lg rounded-2xl hover:bg-white/10 transition-all duration-300 transform hover:scale-105"
            >
              <PlayIcon className="w-6 h-6 mr-2" />
              Try Live Demo
              <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/docs"
              className="group inline-flex items-center px-8 py-4 text-white font-medium hover:text-blue-100 transition-colors"
            >
              <BookOpenIcon className="w-5 h-5 mr-2" />
              Read Documentation
              <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          {/* Enhanced Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-white mb-1">5min</div>
              <div className="text-blue-200 font-medium">Integration Time</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-white mb-1">1,000</div>
              <div className="text-blue-200 font-medium">Free Monthly Calls</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-white mb-1">24/7</div>
              <div className="text-blue-200 font-medium">Developer Support</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl font-bold text-white mb-1">SOC2</div>
              <div className="text-blue-200 font-medium">Enterprise Ready</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}