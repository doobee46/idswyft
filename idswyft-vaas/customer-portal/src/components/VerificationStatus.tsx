import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Shield,
  Calendar,
  FileText,
  User
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import BrandedHeader from './BrandedHeader';
import customerPortalAPI from '../services/api';

interface VerificationStatusData {
  id: string;
  status: 'pending' | 'processing' | 'verified' | 'failed' | 'expired' | 'manual_review';
  organization_name: string;
  organization_branding?: {
    company_name: string;
    logo_url?: string;
    primary_color?: string;
  };
  created_at: string;
  completed_at?: string;
  expires_at?: string;
  failure_reason?: string;
  confidence_score?: number;
  documents_uploaded: number;
  estimated_completion?: string;
}

interface VerificationStatusProps {
  sessionToken: string;
}

const VerificationStatus: React.FC<VerificationStatusProps> = ({ sessionToken }) => {
  const [status, setStatus] = useState<VerificationStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Organization context for branding
  const { setBranding, setOrganizationName } = useOrganization();

  useEffect(() => {
    loadStatus();
    
    // Auto-refresh for pending/processing statuses
    const interval = setInterval(() => {
      if (status?.status === 'pending' || status?.status === 'processing' || status?.status === 'manual_review') {
        loadStatus(true);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [sessionToken, status?.status]);

  const loadStatus = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(!silent);
      
      const statusData = await customerPortalAPI.getVerificationStatus(sessionToken);
      setStatus(statusData as any); // Type compatibility for now
      
      // Apply organization branding if available
      if ((statusData as any).organization_branding) {
        setBranding((statusData as any).organization_branding);
      }
      if ((statusData as any).organization_name) {
        setOrganizationName((statusData as any).organization_name);
      }
      
      setError(null);
    } catch (error: any) {
      console.error('Failed to load status:', error);
      if (error.response?.status === 404) {
        setError('Verification session not found. Please check your link.');
      } else {
        setError('Failed to load verification status. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'failed':
        return <XCircle className="w-8 h-8 text-red-600" />;
      case 'expired':
        return <XCircle className="w-8 h-8 text-gray-500" />;
      case 'manual_review':
        return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
      case 'processing':
        return <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-8 h-8 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'expired':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'manual_review':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Your identity has been successfully verified!';
      case 'failed':
        return 'Identity verification failed. Please contact support.';
      case 'expired':
        return 'This verification session has expired.';
      case 'manual_review':
        return 'Your documents are under manual review. We\'ll notify you once complete.';
      case 'processing':
        return 'We\'re currently processing your verification.';
      case 'pending':
        return 'Verification documents are pending upload.';
      default:
        return 'Unknown verification status.';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatStatusText = (status: string) => {
    switch (status) {
      case 'manual_review':
        return 'Manual Review';
      case 'verified':
        return 'Verified';
      case 'failed':
        return 'Failed';
      case 'expired':
        return 'Expired';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Status</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => loadStatus()}
              className="btn btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Branded Header */}
        <BrandedHeader 
          subtitle="Verification Status"
          className="mb-8"
        />

        {/* Status Card */}
        <div className="card p-8 mb-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon(status.status)}
            </div>
            
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border mb-4 ${getStatusColor(status.status)}`}>
              {formatStatusText(status.status)}
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {getStatusMessage(status.status)}
            </h2>

            {status.failure_reason && (
              <p className="text-red-600 text-sm mb-4">
                Reason: {status.failure_reason}
              </p>
            )}

            {status.confidence_score && (
              <p className="text-gray-600 text-sm mb-4">
                Confidence Score: {Math.round(status.confidence_score * 100)}%
              </p>
            )}

            {/* Auto-refresh indicator */}
            {(status.status === 'pending' || status.status === 'processing' || status.status === 'manual_review') && (
              <div className="flex items-center justify-center text-xs text-gray-500 mb-4">
                <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Auto-refreshing every 30 seconds
              </div>
            )}

            {/* Manual refresh button */}
            <button
              onClick={() => loadStatus()}
              disabled={refreshing}
              className="btn btn-outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Status'}
            </button>
          </div>
        </div>

        {/* Details Card */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Details</h3>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Submitted</p>
                <p className="text-sm text-gray-600">{formatDate(status.created_at)}</p>
              </div>
            </div>

            {status.completed_at && (
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Completed</p>
                  <p className="text-sm text-gray-600">{formatDate(status.completed_at)}</p>
                </div>
              </div>
            )}

            {status.expires_at && status.status === 'pending' && (
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Expires</p>
                  <p className="text-sm text-gray-600">{formatDate(status.expires_at)}</p>
                </div>
              </div>
            )}

            <div className="flex items-start">
              <FileText className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Documents Uploaded</p>
                <p className="text-sm text-gray-600">{status.documents_uploaded} document(s)</p>
              </div>
            </div>

            <div className="flex items-start">
              <User className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Verification ID</p>
                <p className="text-sm text-gray-600 font-mono">{status.id.substring(0, 8)}...</p>
              </div>
            </div>

            {status.estimated_completion && status.status === 'processing' && (
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Estimated Completion</p>
                  <p className="text-sm text-gray-600">{status.estimated_completion}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Questions about your verification?{' '}
            <a 
              href="mailto:support@idswyft.app" 
              className="text-primary-600 hover:text-primary-700"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerificationStatus;