/**
 * Advanced Threshold Settings Component
 * 
 * Enhanced UI for visual threshold management in VaaS admin
 * Connects to the centralized threshold configuration system
 */

import React, { useState, useEffect } from 'react';
import { Settings, Sliders, Eye, Shield, BarChart3, Info, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiClient } from '../services/api';

interface ThresholdData {
  production: {
    photo_consistency: number;
    face_matching: number;
    liveness: number;
    cross_validation: number;
    quality_minimum: number;
    ocr_confidence: number;
    pdf417_confidence: number;
  };
  sandbox: {
    photo_consistency: number;
    face_matching: number;
    liveness: number;
    cross_validation: number;
    quality_minimum: number;
    ocr_confidence: number;
    pdf417_confidence: number;
  };
  meta: {
    organization_id: string;
    using_defaults: boolean;
    last_updated: string;
  };
}

interface PreviewData {
  preview: {
    production: {
      face_matching: number;
      liveness: number;
    };
    sandbox: {
      face_matching: number;
      liveness: number;
    };
  };
  explanation: {
    auto_approve_threshold: string;
    manual_review_threshold: string;
    face_matching_production: string;
    liveness_detection: string;
  };
}

interface Props {
  organizationId: string;
  canEdit: boolean;
  onThresholdsUpdated?: () => void;
}

export default function AdvancedThresholdSettings({ organizationId, canEdit, onThresholdsUpdated }: Props) {
  const [thresholds, setThresholds] = useState<ThresholdData | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(85);
  const [manualReviewThreshold, setManualReviewThreshold] = useState(60);
  const [requireLiveness, setRequireLiveness] = useState(true);
  const [requireBackOfId, setRequireBackOfId] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadThresholds();
  }, [organizationId]);

  useEffect(() => {
    // Generate preview when settings change
    if (autoApproveThreshold && manualReviewThreshold) {
      generatePreview();
    }
  }, [autoApproveThreshold, manualReviewThreshold, requireLiveness, requireBackOfId, maxAttempts]);

  const loadThresholds = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get('/admin/thresholds');
      setThresholds(response.data);
      
      // Initialize form with current values (would come from organization settings)
      // For now, using example values
      setAutoApproveThreshold(85);
      setManualReviewThreshold(60);
      setRequireLiveness(true);
      setRequireBackOfId(false);
      setMaxAttempts(3);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load threshold settings');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePreview = async () => {
    try {
      const response = await apiClient.post('/admin/thresholds/preview', {
        auto_approve_threshold: autoApproveThreshold,
        manual_review_threshold: manualReviewThreshold,
        require_liveness: requireLiveness,
        require_back_of_id: requireBackOfId,
        max_verification_attempts: maxAttempts
      });
      setPreview(response.data);
    } catch (err) {
      console.warn('Failed to generate preview:', err);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      await apiClient.put('/admin/thresholds', {
        auto_approve_threshold: autoApproveThreshold,
        manual_review_threshold: manualReviewThreshold,
        require_liveness: requireLiveness,
        require_back_of_id: requireBackOfId,
        max_verification_attempts: maxAttempts
      });

      setSuccess('Threshold settings updated successfully');
      await loadThresholds();
      onThresholdsUpdated?.();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to update threshold settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsSaving(true);
      
      await apiClient.post('/admin/thresholds/reset');
      
      setSuccess('Thresholds reset to defaults');
      await loadThresholds();
      
    } catch (err: any) {
      setError(err.message || 'Failed to reset thresholds');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* High-Level Threshold Controls */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Sliders className="h-5 w-5 mr-2 text-blue-600" />
            Verification Confidence Thresholds
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure the overall confidence levels for automatic decisions
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Auto-Approve Threshold */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                Auto-Approve Threshold
              </label>
              <span className="text-lg font-semibold text-green-600">
                {autoApproveThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="70"
              max="95"
              step="1"
              value={autoApproveThreshold}
              onChange={(e) => setAutoApproveThreshold(Number(e.target.value))}
              disabled={!canEdit}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>70% (Lenient)</span>
              <span>95% (Strict)</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Verifications above this confidence are automatically approved
            </p>
          </div>

          {/* Manual Review Threshold */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                Manual Review Threshold
              </label>
              <span className="text-lg font-semibold text-yellow-600">
                {manualReviewThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="80"
              step="1"
              value={manualReviewThreshold}
              onChange={(e) => setManualReviewThreshold(Number(e.target.value))}
              disabled={!canEdit}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-yellow"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>30% (Fewer Reviews)</span>
              <span>80% (More Reviews)</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Verifications above this confidence require manual admin review
            </p>
          </div>

          {/* Settings Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Liveness Detection</label>
                <p className="text-xs text-gray-500">Require real-time selfie verification</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireLiveness}
                  onChange={(e) => setRequireLiveness(e.target.checked)}
                  disabled={!canEdit}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Back of ID Required</label>
                <p className="text-xs text-gray-500">Require both sides of documents</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireBackOfId}
                  onChange={(e) => setRequireBackOfId(e.target.checked)}
                  disabled={!canEdit}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Max Attempts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Verification Attempts
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              disabled={!canEdit}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              How many times users can retry failed verifications
            </p>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {preview && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-blue-900 flex items-center mb-4">
            <Eye className="h-5 w-5 mr-2" />
            Impact Preview
          </h4>
          
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-blue-800 mb-2">Production Environment</h5>
                <ul className="space-y-1 text-blue-700">
                  <li>• Face matching: {(preview.preview.production.face_matching * 100).toFixed(0)}% required</li>
                  <li>• Liveness detection: {(preview.preview.production.liveness * 100).toFixed(0)}% required</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 mb-2">Sandbox Environment</h5>
                <ul className="space-y-1 text-blue-700">
                  <li>• Face matching: {(preview.preview.sandbox.face_matching * 100).toFixed(0)}% required</li>
                  <li>• Liveness detection: {(preview.preview.sandbox.liveness * 100).toFixed(0)}% required</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-blue-300 pt-3 mt-4">
              <h5 className="font-medium text-blue-800 mb-2">Verification Behavior</h5>
              <ul className="space-y-1 text-blue-700">
                <li>• {preview.explanation.auto_approve_threshold}</li>
                <li>• {preview.explanation.manual_review_threshold}</li>
                <li>• {preview.explanation.liveness_detection}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Current Technical Thresholds Display */}
      {thresholds && showAdvanced && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-gray-600" />
              Technical Threshold Details
            </h4>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-800 mb-3">Production Environment</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Photo Consistency:</span>
                    <span className="font-mono">{(thresholds.production.photo_consistency * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Face Matching:</span>
                    <span className="font-mono">{(thresholds.production.face_matching * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Liveness Detection:</span>
                    <span className="font-mono">{(thresholds.production.liveness * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cross Validation:</span>
                    <span className="font-mono">{(thresholds.production.cross_validation * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-800 mb-3">Sandbox Environment</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Photo Consistency:</span>
                    <span className="font-mono">{(thresholds.sandbox.photo_consistency * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Face Matching:</span>
                    <span className="font-mono">{(thresholds.sandbox.face_matching * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Liveness Detection:</span>
                    <span className="font-mono">{(thresholds.sandbox.liveness * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cross Validation:</span>
                    <span className="font-mono">{(thresholds.sandbox.cross_validation * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <Info className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="ml-3">
                  <h6 className="text-sm font-medium text-yellow-800">About Technical Thresholds</h6>
                  <p className="text-sm text-yellow-700 mt-1">
                    These technical thresholds are automatically calculated based on your high-level settings above. 
                    They control the specific AI model confidence levels for each verification step.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800"
        >
          <Settings className="h-4 w-4 mr-1" />
          {showAdvanced ? 'Hide' : 'Show'} Technical Details
        </button>
        
        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            disabled={!canEdit || isSaving}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </button>
          
          <button
            onClick={handleSave}
            disabled={!canEdit || isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Shield className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Threshold Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}