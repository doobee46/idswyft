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

// VS Code style syntax highlighting component
const SyntaxHighlighter = ({ code, language }: { code: string; language: string }) => {
  const highlightCode = (text: string, lang: string) => {
    const lines = text.split('\n')
    
    return lines.map((line, lineIndex) => {
      // Process the line and create React elements with proper syntax highlighting
      const processLine = (inputLine: string) => {
        // For JSON, use a specialized approach
        if (lang === 'json') {
          let processedLine = inputLine
          const parts: React.ReactNode[] = []
          let lastIndex = 0
          
          // Find and highlight different parts in order of precedence
          const matches: Array<{ start: number; end: number; content: string; className: string }> = []
          
          // Property names (keys)
          let regex = /"([^"]*)"(\s*:)/g
          let match
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#79c0ff]'
            })
          }
          
          // String values
          regex = /:\s*"([^"]*)"/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#a5d6ff]'
            })
          }
          
          // Numbers
          regex = /:\s*(\d+(?:\.\d+)?)\b/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#79c0ff]'
            })
          }
          
          // Booleans and null
          regex = /:\s*\b(true|false|null)\b/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#ff7b72]'
            })
          }
          
          // Brackets and punctuation
          regex = /([{}[\],])/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#ffa657]'
            })
          }
          
          // Sort matches by position and render
          matches.sort((a, b) => a.start - b.start)
          
          // Remove overlapping matches (keep first one)
          const filteredMatches = []
          let lastEnd = 0
          for (const match of matches) {
            if (match.start >= lastEnd) {
              filteredMatches.push(match)
              lastEnd = match.end
            }
          }
          
          // Build the line with colored parts
          let currentPos = 0
          const lineElements: React.ReactNode[] = []
          
          for (let i = 0; i < filteredMatches.length; i++) {
            const match = filteredMatches[i]
            
            // Add text before this match
            if (match.start > currentPos) {
              lineElements.push(
                <span key={`text-${i}`} className="text-gray-300">
                  {inputLine.slice(currentPos, match.start)}
                </span>
              )
            }
            
            // Add the highlighted match
            lineElements.push(
              <span key={`match-${i}`} className={match.className}>
                {match.content}
              </span>
            )
            
            currentPos = match.end
          }
          
          // Add remaining text
          if (currentPos < inputLine.length) {
            lineElements.push(
              <span key="remaining" className="text-gray-300">
                {inputLine.slice(currentPos)}
              </span>
            )
          }
          
          return <>{lineElements}</>
        }
        
        // For curl/bash
        if (lang === 'curl' || lang === 'bash') {
          const matches: Array<{ start: number; end: number; content: string; className: string }> = []
          let regex: RegExp
          let match: RegExpExecArray | null
          
          // Comments
          regex = /(#.*$)/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#8b949e]'
            })
          }
          
          // Commands at beginning of line
          regex = /^(\s*)(curl|jq|echo|cd|ls|mkdir|npm|git)\b/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index + match[1].length, // Skip whitespace
              end: match.index + match[0].length,
              content: match[2], // Just the command
              className: 'text-[#79c0ff]'
            })
          }
          
          // Command line flags
          regex = /(\s)(-[a-zA-Z]+(?:=[^\s]*)?)\b/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index + match[1].length, // Skip whitespace
              end: match.index + match[0].length,
              content: match[2], // Just the flag
              className: 'text-[#ffa657]'
            })
          }
          
          // URLs
          regex = /(https?:\/\/[^\s\\]+)/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#a5d6ff]'
            })
          }
          
          // Strings in quotes
          regex = /(["'])((?:\\.|[^\\])*?)\1/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#a5d6ff]'
            })
          }
          
          // Sort and filter overlapping matches
          matches.sort((a, b) => a.start - b.start)
          const filteredMatches = []
          let lastEnd = 0
          for (const match of matches) {
            if (match.start >= lastEnd) {
              filteredMatches.push(match)
              lastEnd = match.end
            }
          }
          
          // Build the line with colored parts
          let currentPos = 0
          const lineElements: React.ReactNode[] = []
          
          for (let i = 0; i < filteredMatches.length; i++) {
            const match = filteredMatches[i]
            
            // Add text before this match
            if (match.start > currentPos) {
              lineElements.push(
                <span key={`text-${i}`} className="text-gray-300">
                  {inputLine.slice(currentPos, match.start)}
                </span>
              )
            }
            
            // Add the highlighted match
            lineElements.push(
              <span key={`match-${i}`} className={match.className}>
                {match.content}
              </span>
            )
            
            currentPos = match.end
          }
          
          // Add remaining text
          if (currentPos < inputLine.length) {
            lineElements.push(
              <span key="remaining" className="text-gray-300">
                {inputLine.slice(currentPos)}
              </span>
            )
          }
          
          return <>{lineElements}</>
        }
        
        // For JavaScript
        if (lang === 'javascript') {
          const matches: Array<{ start: number; end: number; content: string; className: string }> = []
          let regex: RegExp
          let match: RegExpExecArray | null
          
          // Comments
          regex = /(\/\/.*$)/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#8b949e]'
            })
          }
          
          // Strings
          regex = /(["'`])((?:\\.|[^\\])*?)\1/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#a5d6ff]'
            })
          }
          
          // Keywords
          regex = /\b(const|let|var|function|async|await|import|from|export|default|if|else|for|while|return|try|catch|new)\b/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#ff7b72]'
            })
          }
          
          // Functions
          regex = /(\w+)(?=\()/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[1].length,
              content: match[1],
              className: 'text-[#d2a8ff]'
            })
          }
          
          // Numbers
          regex = /\b(\d+(?:\.\d+)?)\b/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#79c0ff]'
            })
          }
          
          // Sort and filter overlapping matches
          matches.sort((a, b) => a.start - b.start)
          const filteredMatches = []
          let lastEnd = 0
          for (const match of matches) {
            if (match.start >= lastEnd) {
              filteredMatches.push(match)
              lastEnd = match.end
            }
          }
          
          // Build the line
          let currentPos = 0
          const lineElements: React.ReactNode[] = []
          
          for (let i = 0; i < filteredMatches.length; i++) {
            const match = filteredMatches[i]
            
            if (match.start > currentPos) {
              lineElements.push(
                <span key={`text-${i}`} className="text-gray-300">
                  {inputLine.slice(currentPos, match.start)}
                </span>
              )
            }
            
            lineElements.push(
              <span key={`match-${i}`} className={match.className}>
                {match.content}
              </span>
            )
            
            currentPos = match.end
          }
          
          if (currentPos < inputLine.length) {
            lineElements.push(
              <span key="remaining" className="text-gray-300">
                {inputLine.slice(currentPos)}
              </span>
            )
          }
          
          return <>{lineElements}</>
        }
        
        // For Python
        if (lang === 'python') {
          const matches: Array<{ start: number; end: number; content: string; className: string }> = []
          let regex: RegExp
          let match: RegExpExecArray | null
          
          // Comments
          regex = /(#.*$)/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#8b949e]'
            })
          }
          
          // Strings
          regex = /(["'])((?:\\.|[^\\])*?)\1/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#a5d6ff]'
            })
          }
          
          // Keywords
          regex = /\b(def|class|import|from|if|elif|else|for|while|return|try|except|with|as|async|await|None|True|False)\b/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#ff7b72]'
            })
          }
          
          // Functions
          regex = /(\w+)(?=\()/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[1].length,
              content: match[1],
              className: 'text-[#d2a8ff]'
            })
          }
          
          // Numbers
          regex = /\b(\d+(?:\.\d+)?)\b/g
          while ((match = regex.exec(inputLine)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0],
              className: 'text-[#79c0ff]'
            })
          }
          
          // Sort and filter overlapping matches
          matches.sort((a, b) => a.start - b.start)
          const filteredMatches = []
          let lastEnd = 0
          for (const match of matches) {
            if (match.start >= lastEnd) {
              filteredMatches.push(match)
              lastEnd = match.end
            }
          }
          
          // Build the line
          let currentPos = 0
          const lineElements: React.ReactNode[] = []
          
          for (let i = 0; i < filteredMatches.length; i++) {
            const match = filteredMatches[i]
            
            if (match.start > currentPos) {
              lineElements.push(
                <span key={`text-${i}`} className="text-gray-300">
                  {inputLine.slice(currentPos, match.start)}
                </span>
              )
            }
            
            lineElements.push(
              <span key={`match-${i}`} className={match.className}>
                {match.content}
              </span>
            )
            
            currentPos = match.end
          }
          
          if (currentPos < inputLine.length) {
            lineElements.push(
              <span key="remaining" className="text-gray-300">
                {inputLine.slice(currentPos)}
              </span>
            )
          }
          
          return <>{lineElements}</>
        }
        
        // For other languages, return plain text
        return <span className="text-gray-300">{inputLine}</span>
      }
      
      // Line numbers for multi-line code
      const showLineNumbers = lines.length > 5
      const lineNumber = showLineNumbers ? (lineIndex + 1).toString().padStart(2, ' ') : ''
      
      return (
        <div key={lineIndex} className="block">
          {showLineNumbers && (
            <span className="text-[#8b949e] select-none mr-4 inline-block w-8 text-right">
              {lineNumber}
            </span>
          )}
          {processLine(line)}
        </div>
      )
    })
  }
  
  return (
    <div className="text-gray-300">
      {highlightCode(code, language)}
    </div>
  )
}

const features = [
  {
    name: 'AI-Powered Document Verification',
    description: 'Advanced GPT-4o Vision OCR extraction with confidence scores, quality analysis (blur, brightness, resolution), and authenticity checks with 99% accuracy. Supports all document types with intelligent data extraction.',
    icon: DocumentCheckIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    badge: 'AI-Enhanced'
  },
  {
    name: 'Enhanced Liveness Detection',
    description: 'AI-powered liveness detection using GPT-4o Vision to detect spoofing attempts, analyze facial depth, skin texture, lighting, and micro-expressions for bulletproof security.',
    icon: CameraIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    badge: 'AI-Powered'
  },
  {
    name: 'Smart Face Matching',
    description: 'Intelligent face comparison between document photos and selfies using advanced AI algorithms. Accounts for age differences, lighting variations, and photo quality.',
    icon: SparklesIcon,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    badge: 'AI-Enhanced'
  },
  {
    name: 'Back-of-ID Verification',
    description: 'Revolutionary QR code and barcode scanning with cross-validation between front and back of IDs. Extracts verification codes and security features for maximum accuracy.',
    icon: AcademicCapIcon,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    badge: 'New'
  },
  {
    name: 'Developer-First API',
    description: 'RESTful API with TypeScript/Python SDKs, comprehensive AI analysis results, detailed liveness reports, cross-validation data, and webhooks for seamless integration.',
    icon: CodeBracketIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    name: 'Privacy Compliant',
    description: 'GDPR and CCPA compliant with end-to-end encryption, data retention policies, and user rights management. All AI processing respects data privacy.',
    icon: LockClosedIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
]

const stats = [
  { name: 'AI Accuracy Rate', value: '99.8%', icon: ChartBarIcon },
  { name: 'Liveness Detection', value: '99.5%', icon: SparklesIcon },
  { name: 'API Response Time', value: '<200ms', icon: BoltIcon },
  { name: 'Document Types', value: '200+', icon: DocumentCheckIcon },
]

const getCodeExamples = (apiUrl: string) => ({
  curl: `# Complete 6-Step AI-Powered Verification Flow

# Step 1: Start verification session
curl -X POST ${apiUrl}/api/verify/start \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "user_123"}' \\
  | jq -r '.verification_id'
# Returns: verif_abc123

# Step 2: Upload front of ID with GPT-4o Vision OCR
curl -X POST ${apiUrl}/api/verify/document \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -F "verification_id=verif_abc123" \\
  -F "document=@passport_front.jpg" \\
  -F "document_type=passport"

# Step 3: Upload back of ID with PDF417 barcode scanning
curl -X POST ${apiUrl}/api/verify/back-of-id \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -F "verification_id=verif_abc123" \\
  -F "back_of_id=@passport_back.jpg" \\
  -F "document_type=passport"

# Step 4: Upload selfie for face matching
curl -X POST ${apiUrl}/api/verify/selfie \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -F "verification_id=verif_abc123" \\
  -F "selfie=@selfie.jpg"

# Step 5: Generate live token for AI liveness
curl -X POST ${apiUrl}/api/verify/live-token \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"verification_id": "verif_abc123"}'

# Step 6: Perform live capture with AI liveness detection
curl -X POST ${apiUrl}/api/verify/live-capture \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"verification_id": "verif_abc123", "live_image_data": "data:image/jpeg;base64,..."}'

# Get comprehensive results with PDF417 data
curl -X GET ${apiUrl}/api/verify/results/verif_abc123 \\
  -H "X-API-Key: YOUR_API_KEY"`,
  javascript: `// Option 1: Using the Official SDK v2.0.0 (Recommended)
// npm install idswyft-sdk
import { IdswyftSDK } from 'idswyft-sdk';
const client = new IdswyftSDK({ apiKey: 'your_api_key' });

// Complete 6-Step Verification Flow
const session = await client.startVerification({ user_id: 'user_123' });

// Step 1: Upload front of document with AI OCR
await client.uploadDocument({
  verification_id: session.verification_id,
  document: frontImageFile,
  document_type: 'passport'
});

// Step 2: Upload back of ID for PDF417 barcode scanning
await client.verifyBackOfId({
  verification_id: session.verification_id,
  document_type: 'passport',
  back_of_id_file: backImageFile
});

// Step 3: Upload selfie for face matching
await client.uploadSelfie({
  verification_id: session.verification_id,
  selfie: selfieFile
});

// Step 4: Generate live token for AI liveness
const liveToken = await client.generateLiveToken({
  verification_id: session.verification_id
});

// Step 5: Perform live capture with AI liveness detection
await client.liveCapture({
  verification_id: session.verification_id,
  live_image_data: liveCaptureBase64
});

// Step 6: Get comprehensive results
const results = await client.getVerificationResults(session.verification_id);

console.log(results.status); // 'verified'
console.log(results.ocr_data?.full_name); // 'John Doe'
console.log(results.back_of_id?.barcode_data?.format); // 'PDF417'
console.log(results.liveness_analysis?.ai_assessment); // 'GENUINE_PERSON'
console.log(results.face_match_score); // 0.92`,
  python: `# Option 1: Using the Official SDK v2.0.0 (Recommended)
# pip install idswyft
import idswyft

client = idswyft.IdswyftClient(api_key='your_api_key')

# Complete 6-Step Verification Flow
session = client.start_verification(user_id='user_123')

# Step 1: Upload front of document with AI OCR
client.upload_document(
    verification_id=session['verification_id'],
    document_file=front_image_file,
    document_type='passport'
)

# Step 2: Upload back of ID for PDF417 barcode scanning
client.verify_back_of_id(
    verification_id=session['verification_id'],
    document_type='passport',
    back_of_id_file=back_image_file
)

# Step 3: Upload selfie for face matching
client.upload_selfie(
    verification_id=session['verification_id'],
    selfie_file=selfie_file
)

# Step 4: Generate live token for AI liveness
live_token = client.generate_live_token(
    verification_id=session['verification_id']
)

# Step 5: Perform live capture with AI liveness detection
client.live_capture(
    verification_id=session['verification_id'],
    live_image_data=live_capture_base64
)

# Step 6: Get comprehensive results
results = client.get_verification_results(session['verification_id'])

print(f"Status: {results['status']}")
print(f"Name: {results['ocr_data']['full_name']}")
print(f"Barcode Format: {results['back_of_id']['barcode_data']['format']}")
print(f"AI Liveness: {results['liveness_analysis']['ai_assessment']}")
print(f"Face Match Score: {results['face_match_score']}")`,
  response: `{
  "verification_id": "verif_abc123",
  "status": "verified",
  "user_id": "user_123",
  "session_id": "session_789",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:15Z",
  "completion_steps": ["document", "back_of_id", "selfie", "live_capture"],
  
  // Enhanced Document Analysis with AI
  "documents": [{
    "id": "doc_123",
    "file_name": "passport.jpg",
    "document_type": "passport",
    "ocr_data": {
      "document_number": "P123456789",
      "full_name": "John Doe",
      "date_of_birth": "1990-01-01",
      "expiry_date": "2030-01-01",
      "nationality": "US",
      "issuing_authority": "U.S. Department of State",
      "place_of_birth": "New York, NY",
      "confidence_scores": {
        "document_number": 0.98,
        "full_name": 0.97,
        "date_of_birth": 0.99,
        "expiry_date": 0.96
      }
    },
    "quality_analysis": {
      "overallQuality": "excellent",
      "isBlurry": false,
      "blurScore": 342.5,
      "brightness": 128,
      "contrast": 45,
      "resolution": { "width": 1920, "height": 1080, "isHighRes": true },
      "fileSize": { "bytes": 2457600, "isReasonableSize": true },
      "issues": [],
      "recommendations": []
    }
  }],
  
  // NEW: Back-of-ID with PDF417 Barcode Data
  "back_of_id": {
    "id": "back_456",
    "file_name": "passport_back.jpg", 
    "barcode_data": {
      "format": "PDF417",
      "raw_data": "P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<P1234567891USA9001015M3001015<<<<<<<<<<<<<<04",
      "parsed_data": {
        "document_code": "P",
        "issuing_country": "USA", 
        "surname": "DOE",
        "given_names": "JOHN",
        "passport_number": "P123456789",
        "nationality": "USA",
        "date_of_birth": "900101",
        "sex": "M",
        "expiration_date": "300101",
        "personal_number": "",
        "check_digit": "4"
      },
      "verification_codes": ["MRZ123", "SEC789"],
      "confidence": 0.96
    },
    "cross_validation": {
      "front_back_match": true,
      "document_number_match": true,
      "name_match": true,
      "date_of_birth_match": true,
      "expiry_date_match": true,
      "discrepancies": []
    }
  },
  
  // Enhanced AI Liveness Detection
  "liveness_analysis": {
    "overall_score": 0.94,
    "ai_assessment": "GENUINE_PERSON",
    "details": {
      "facial_depth": 0.92,
      "skin_texture": 0.95,
      "lighting_analysis": 0.91,
      "micro_expressions": 0.96,
      "spoof_detection": 0.98
    },
    "confidence": 0.97,
    "flags": []
  },
  
  // Smart Face Matching Results  
  "face_match_score": 0.92,
  "face_analysis": {
    "quality_check": "excellent",
    "age_estimation": { "document": 34, "selfie": 35, "variance": 1 },
    "lighting_compensation": true,
    "pose_normalization": true
  },
  
  // AI-Enhanced Overall Assessment
  "confidence_score": 0.93,
  "ai_risk_score": 0.08,
  "authenticity_score": 0.95,
  "manual_review_reason": null,
  "verification_metadata": {
    "processing_time_ms": 847,
    "ai_models_used": ["gpt-4o-vision", "face-recognition-v2", "liveness-ai"],
    "security_features_detected": ["hologram", "microprint", "uv_ink"]
  }
}`
})

const integrationSteps = [
  {
    step: '1',
    title: 'Get API Key',
    description: 'Sign up and get your free API key with Idswyft Flow™ enabled',
    icon: CommandLineIcon,
    color: 'from-blue-500 to-blue-600'
  },
  {
    step: '2', 
    title: 'Implement Idswyft Flow™',
    description: 'Integrate our 6-step verification process with comprehensive SDK support',
    icon: SparklesIcon,
    color: 'from-purple-500 to-purple-600'
  },
  {
    step: '3',
    title: 'Go Live',
    description: 'Deploy with 99.8% accuracy verification and real-time results',
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
    <div className="bg-gray-50">
      {/* Hero section */}
      <div className="relative overflow-hidden bg-white">
        
        {/* Hero Background Image */}
        <div className="absolute inset-0 z-0">
        	<img 
                src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
                alt="Digital identity verification technology"
                className="w-full h-full object-cover opacity-3"
        	/>
        </div>

        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-20 sm:pb-40 z-10">
          <div className="text-center">
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {/* Badge - Mobile optimized */}
              <div className="inline-flex items-center px-4 py-2 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 mb-8 shadow-lg shadow-blue-500/10">
                <SparklesIcon className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm font-semibold text-gray-700">New: AI-Powered Verification with GPT-4o Vision</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight px-2">
                <span className="block">AI-Powered Identity</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                  Verification
                </span>
              </h1>
              <p className="max-w-4xl mx-auto text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-8 sm:mb-12 leading-relaxed font-light px-3">
                The most <span className="font-semibold text-gray-900">advanced AI-powered</span> identity verification platform. 
                GPT-4o Vision OCR, AI liveness detection, smart face matching, and back-of-ID scanning with cross-validation.
                <span className="block mt-2 sm:mt-4 text-sm sm:text-base lg:text-lg text-gray-500">AI-Enhanced • Developer-friendly • Production-ready</span>
              </p>
            </div>
            
            <div className={`flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center items-center mb-12 sm:mb-20 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} px-3`}>
              <Link
                to="/developer"
                className="group inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 transform hover:scale-105 touch-manipulation"
              >
                <CommandLineIcon className="w-5 h-5 mr-2" />
                Get API Key Free
                <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/demo"
                className="group inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 text-lg font-semibold text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 transform hover:scale-105 touch-manipulation"
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
                  <div className="group bg-white/60 backdrop-blur-lg rounded-3xl p-6 shadow-lg shadow-gray-900/5 border border-gray-100/50 hover:shadow-2xl hover:shadow-gray-900/10 hover:border-gray-200/50 transition-all duration-500 transform hover:scale-105">
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
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-2">
              Deploy the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Idswyft Flow™</span> in minutes
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-3">
              Simple REST API, comprehensive SDKs, and detailed documentation for the complete 6-step verification process.
              Get the most advanced identity verification running faster than any other platform.
            </p>
          </div>
          
          {/* The Idswyft Flow - Marketing Section */}
          <div className="p-8 sm:p-12 mb-12 sm:mb-16 relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-r from-blue-400/5 to-purple-400/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-r from-cyan-400/5 to-blue-400/5 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 text-center mb-10">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-full border border-blue-200/50 mb-6">
                <SparklesIcon className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm font-semibold text-blue-900">Introducing the Idswyft Flow™</span>
              </div>
              
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                The most <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">comprehensive verification</span><br className="hidden sm:block" />
                in a single flow
              </h3>
              
              <p className="text-lg sm:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8">
                Our proprietary <strong className="text-blue-900">Idswyft Flow™</strong> combines 6 critical verification steps into one seamless process. 
                From GPT-4o Vision OCR to PDF417 barcode cross-validation and AI liveness detection—
                <span className="block mt-2 text-blue-700 font-medium">everything your application needs to verify identities with 99.8% accuracy.</span>
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:bg-white/90 transition-all duration-300 group">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                    <CheckCircleIcon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">99.8% Accuracy</h4>
                  <p className="text-sm text-gray-600">Industry-leading precision with AI-powered cross-validation</p>
                </div>
                
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:bg-white/90 transition-all duration-300 group">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                    <BoltIcon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">6 Steps, 1 Flow</h4>
                  <p className="text-sm text-gray-600">Complete verification from document to liveness in one process</p>
                </div>
                
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:bg-white/90 transition-all duration-300 group">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                    <SparklesIcon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">AI-Enhanced</h4>
                  <p className="text-sm text-gray-600">GPT-4o Vision, PDF417 parsing, and advanced liveness detection</p>
                </div>
              </div>
            </div>
            
            {/* The 6-Step Flow Visualization */}
            <div className="relative">
              <h4 className="text-2xl font-bold text-center text-gray-900 mb-8">The Idswyft Flow™ in Action</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { step: "1", title: "Start Session", desc: "Initialize secure verification session", icon: "🚀", color: "from-blue-500 to-blue-600" },
                  { step: "2", title: "AI Document OCR", desc: "GPT-4o Vision extracts data from front of ID", icon: "🤖", color: "from-purple-500 to-purple-600" },
                  { step: "3", title: "PDF417 Scanning", desc: "Parse barcode from back of ID with cross-validation", icon: "📊", color: "from-cyan-500 to-cyan-600" },
                  { step: "4", title: "Face Matching", desc: "Smart comparison with age and lighting compensation", icon: "👤", color: "from-green-500 to-green-600" },
                  { step: "5", title: "Live Token", desc: "Generate secure token for real-time verification", icon: "🔒", color: "from-orange-500 to-orange-600" },
                  { step: "6", title: "AI Liveness", desc: "Anti-spoofing detection with micro-expression analysis", icon: "✨", color: "from-pink-500 to-pink-600" },
                ].map((flowStep, index) => (
                  <div key={flowStep.step} className="relative">
                    {/* Connection line for desktop */}
                    {index < 5 && (
                      <div className="hidden lg:block absolute top-6 -right-3 w-6 h-0.5 bg-gradient-to-r from-gray-300 to-gray-400 z-0"></div>
                    )}
                    
                    <div className="relative bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 group z-10">
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-10 h-10 bg-gradient-to-r ${flowStep.color} rounded-full flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform`}>
                          {flowStep.step}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-2">
                            <span className="text-lg mr-2">{flowStep.icon}</span>
                            <h5 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-blue-900 transition-colors">{flowStep.title}</h5>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{flowStep.desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-8">
                <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  Complete Verification in &lt;15 seconds
                </div>
              </div>
            </div>
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
          
          {/* Terminal-style Code Example */}
          <div className="bg-[#0d1117] rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
            {/* Terminal Header */}
            <div className="bg-[#161b22] px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#ff5f56] rounded-full"></div>
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#ffbd2e] rounded-full"></div>
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#27ca3f] rounded-full"></div>
              </div>
              <div className="flex items-center space-x-2 text-gray-400 text-xs sm:text-sm">
                <span className="hidden sm:inline">terminal</span>
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 3a1 1 0 000 2h.01a1 1 0 100-2H5zm4 0a1 1 0 000 2h6a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            {/* Terminal Tabs */}
            <div className="bg-[#21262d] px-3 sm:px-6 py-2 border-b border-gray-700">
              <div className="flex space-x-1">
                {Object.keys(codeExamples).slice(0, 3).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveTab(lang)}
                    className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-mono font-medium rounded-t-lg transition-all duration-200 touch-manipulation ${
                      activeTab === lang 
                        ? 'bg-[#0d1117] text-[#25AEE5] border-t-2 border-[#25AEE5]' 
                        : 'bg-[#161b22] text-gray-400 hover:text-gray-300 hover:bg-[#1c2128]'
                    }`}
                  >
                    {lang === 'javascript' ? '📄 app.js' : lang === 'python' ? '🐍 main.py' : '⚡ bash'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Terminal Content */}
            <div className="bg-[#0d1117] p-3 sm:p-6 font-mono">
              {/* Terminal Prompt */}
              <div className="flex items-center mb-3 text-xs sm:text-sm">
                <span className="text-[#25AEE5] mr-1">➜</span>
                <span className="text-[#1B3572] mr-1">idswyft-demo</span>
                <span className="text-gray-500 mr-1">git:(main)</span>
                <span className="text-[#27ca3f]">✗</span>
              </div>
              
              <pre className="text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap sm:whitespace-pre">
                <code className="leading-relaxed">
                  <SyntaxHighlighter code={codeExamples[activeTab as keyof typeof codeExamples]} language={activeTab} />
                </code>
              </pre>
              
              {/* Terminal Cursor */}
              <div className="flex items-center mt-2">
                <span className="text-[#25AEE5] mr-1">➜</span>
                <span className="text-[#1B3572] mr-1">idswyft-demo</span>
                <span className="text-gray-500 mr-1">git:(main)</span>
                <span className="text-[#27ca3f] mr-2">✗</span>
                <div className="w-2 h-4 bg-[#25AEE5] animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Terminal Response Preview */}
          <div className="mt-8 bg-[#0d1117] rounded-2xl overflow-hidden border border-gray-800">
            <div className="bg-[#161b22] px-4 py-3 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-5 h-5 text-[#27ca3f]" />
                  <h4 className="text-sm font-semibold text-gray-300 font-mono">API Response</h4>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-[#27ca3f] rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-400 font-mono">200 OK</span>
                </div>
              </div>
            </div>
            <div className="bg-[#0d1117] p-4 font-mono">
              <pre className="text-xs sm:text-sm overflow-x-auto leading-relaxed">
                <code>
                  <SyntaxHighlighter code={codeExamples.response} language="json" />
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              AI-powered enterprise features,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                developer-first experience
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              From GPT-4o Vision OCR to AI liveness detection, we provide cutting-edge AI tools 
              with the simplicity developers love and the enterprise security teams require.
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
                  {feature.badge && (
                    <div className={`absolute -top-2 -right-2 px-2 py-1 text-xs font-bold rounded-full ${
                      feature.badge === 'AI-Enhanced' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' :
                      feature.badge === 'AI-Powered' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
                      feature.badge === 'New' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {feature.badge}
                    </div>
                  )}
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
                    <h3 className="text-xl font-bold text-gray-900 mb-2">REST API</h3>
                    <p className="text-gray-600 mb-4">Simple REST API with comprehensive documentation. Use any HTTP client in your preferred language.</p>
                    <div className="flex flex-wrap gap-2">
                      {['JavaScript/fetch', 'Python/requests', 'Go/http', 'PHP/cURL', 'Ruby/Net::HTTP'].map((lang) => (
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
              to="/demo"
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