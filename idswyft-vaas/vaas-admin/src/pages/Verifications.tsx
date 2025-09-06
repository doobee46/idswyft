import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  MoreHorizontal,
  FileText,
  User,
  Calendar
} from 'lucide-react';
import { apiClient } from '../services/api';
import type { Verification, VerificationStatus } from '../types.js';

interface VerificationFilters {
  status: VerificationStatus | 'all';
  dateFrom: string;
  dateTo: string;
  searchTerm: string;
}

export default function Verifications() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<VerificationFilters>({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    searchTerm: ''
  });
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadVerifications();
  }, [currentPage, filters]);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        per_page: 20
      };

      if (filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.dateFrom) {
        params.start_date = filters.dateFrom;
      }
      if (filters.dateTo) {
        params.end_date = filters.dateTo;
      }
      if (filters.searchTerm) {
        params.search = filters.searchTerm;
      }

      const result = await apiClient.listVerifications(params);
      setVerifications(result.verifications || []);
      
      // Handle pagination meta - safely extract total pages
      const totalPages = result.meta?.pagination?.total_pages || 
                        result.meta?.pages || 
                        Math.ceil((result.meta?.total || 0) / 20) || 1;
      setTotalPages(totalPages);
    } catch (error) {
      console.error('Failed to load verifications:', error);
      // Set safe defaults on error
      setVerifications([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (verificationId: string, newStatus: VerificationStatus, reason?: string) => {
    try {
      if (newStatus === 'verified') {
        await apiClient.approveVerification(verificationId, reason);
      } else if (newStatus === 'failed') {
        await apiClient.rejectVerification(verificationId, reason || 'Rejected', reason);
      } else {
        // For other status updates, use generic patch
        await apiClient.patch(`/verifications/${verificationId}/status`, {
          status: newStatus,
          reason
        });
      }
      
      // Update the verification in the list safely
      setVerifications(prev => 
        prev ? prev.map(v => 
          v.id === verificationId 
            ? { ...v, status: newStatus, updated_at: new Date().toISOString() }
            : v
        ) : []
      );
      
      if (selectedVerification?.id === verificationId) {
        setSelectedVerification(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Failed to update verification status:', error);
    }
  };

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'manual_review':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    const baseClass = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'verified':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'failed':
        return `${baseClass} bg-red-100 text-red-800`;
      case 'manual_review':
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'pending':
        return `${baseClass} bg-blue-100 text-blue-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportVerifications = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.searchTerm) params.append('search', filters.searchTerm);

      const response = await apiClient.get(`/verifications/export?${params}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `verifications-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export verifications:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Verifications</h1>
          <p className="text-gray-600 mt-1">Review and manage verification requests</p>
        </div>
        
        <button
          onClick={exportVerifications}
          className="btn btn-secondary"
          disabled={loading}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                className="form-input pl-10"
                placeholder="Search by email or reference..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Status</label>
            <select
              className="form-input"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as VerificationStatus | 'all' }))}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
              <option value="manual_review">Manual Review</option>
            </select>
          </div>

          <div>
            <label className="form-label">From Date</label>
            <input
              type="date"
              className="form-input"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label">To Date</label>
            <input
              type="date"
              className="form-input"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={() => {
              setFilters({
                status: 'all',
                dateFrom: '',
                dateTo: '',
                searchTerm: ''
              });
              setCurrentPage(1);
            }}
            className="btn btn-secondary mr-3"
          >
            Clear Filters
          </button>
          <button
            onClick={() => {
              setCurrentPage(1);
              loadVerifications();
            }}
            className="btn btn-primary"
          >
            <Filter className="w-4 h-4 mr-2" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Verification List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Loading verifications...
                    </div>
                  </td>
                </tr>
              ) : !verifications || verifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No verifications found matching your criteria
                  </td>
                </tr>
              ) : (
                verifications.map((verification) => (
                  <tr key={verification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-8 h-8 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {verification.customer_email || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {verification.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(verification.status)}
                        <span className={`ml-2 ${getStatusBadge(verification.status)}`}>
                          {verification.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {verification.verification_type || 'Document'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(verification.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedVerification(verification);
                            setShowDetails(true);
                          }}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {verification.status === 'manual_review' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(verification.id, 'verified')}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(verification.id, 'failed', 'Rejected during manual review')}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verification Details Modal */}
      {showDetails && selectedVerification && (
        <VerificationDetailsModal
          verification={selectedVerification}
          onClose={() => {
            setShowDetails(false);
            setSelectedVerification(null);
          }}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}

interface VerificationDetailsModalProps {
  verification: Verification;
  onClose: () => void;
  onStatusUpdate: (id: string, status: VerificationStatus, reason?: string) => void;
}

function VerificationDetailsModal({ verification, onClose, onStatusUpdate }: VerificationDetailsModalProps) {
  const [reason, setReason] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVerificationDetails();
  }, [verification.id]);

  const loadVerificationDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/verifications/${verification.id}/documents`);
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Failed to load verification details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: VerificationStatus) => {
    await onStatusUpdate(verification.id, newStatus, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Verification Details</h3>
            <p className="text-sm text-gray-500 mt-1">ID: {verification.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Verification Info */}
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Verification Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium ${verification.status === 'verified' ? 'text-green-600' : verification.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {verification.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="font-medium">{verification.verification_type || 'Document'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-medium">{verification.customer_email || 'Anonymous'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="font-medium">{formatDate(verification.created_at)}</span>
                </div>
                {verification.updated_at !== verification.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Updated:</span>
                    <span className="font-medium">{formatDate(verification.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {verification.status === 'manual_review' && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Manual Review Actions</h4>
                <div className="space-y-3">
                  <div>
                    <label className="form-label">Reason (Optional)</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Enter reason for approval/rejection..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleStatusUpdate('verified')}
                      className="btn btn-primary flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('failed')}
                      className="btn btn-danger flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Documents & Files</h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                Loading documents...
              </div>
            ) : documents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No documents available</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium">{doc.type || 'Document'}</span>
                      </div>
                      <button
                        onClick={() => window.open(doc.url, '_blank')}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        View
                      </button>
                    </div>
                    {doc.analysis && (
                      <div className="mt-2 text-xs text-gray-500">
                        Analysis: {doc.analysis}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}