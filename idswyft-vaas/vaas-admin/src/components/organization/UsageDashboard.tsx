import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';
import { UsageStats } from '../../types.js';
import { BarChart3, TrendingUp, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

interface UsageDashboardProps {
  organizationId: string;
}

export default function UsageDashboard({ organizationId }: UsageDashboardProps) {
  const { organization } = useAuth();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsageStats();
  }, [organizationId]);

  const loadUsageStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stats = await apiClient.getOrganizationUsage(organizationId);
      setUsageStats(stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load usage statistics');
      // Mock data for development
      setUsageStats({
        current_period: {
          verification_count: 245,
          api_calls: 1250,
          storage_used_mb: 125.5
        },
        monthly_limit: 1000,
        overage_cost_per_verification: 0.15
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !usageStats) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load usage stats</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={loadUsageStats}
            className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const usagePercentage = Math.min((usageStats.current_period.verification_count / usageStats.monthly_limit) * 100, 100);
  const isOverLimit = usageStats.current_period.verification_count > usageStats.monthly_limit;
  const overageCount = Math.max(0, usageStats.current_period.verification_count - usageStats.monthly_limit);
  const overageCost = overageCount * usageStats.overage_cost_per_verification;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Current Usage</h3>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <UsageCard
              title="Verifications"
              value={usageStats.current_period.verification_count.toLocaleString()}
              subtitle={`of ${usageStats.monthly_limit.toLocaleString()} monthly limit`}
              percentage={usagePercentage}
              isWarning={usagePercentage > 80}
              isError={isOverLimit}
            />
            
            <UsageCard
              title="API Calls"
              value={usageStats.current_period.api_calls.toLocaleString()}
              subtitle="This month"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            
            <UsageCard
              title="Storage Used"
              value={`${usageStats.current_period.storage_used_mb.toFixed(1)} MB`}
              subtitle="Document storage"
              icon={<Calendar className="h-5 w-5" />}
            />
          </div>

          {/* Usage Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Monthly Verification Usage</span>
              <span>{usageStats.current_period.verification_count} / {usageStats.monthly_limit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  isOverLimit
                    ? 'bg-red-500'
                    : usagePercentage > 80
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
            {isOverLimit && (
              <p className="text-sm text-red-600 mt-2">
                You have exceeded your monthly limit by {overageCount.toLocaleString()} verifications.
              </p>
            )}
          </div>

          {/* Overage Information */}
          {isOverLimit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Overage Charges Apply
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Additional {overageCount.toLocaleString()} verifications at ${usageStats.overage_cost_per_verification} each.
                    </p>
                    <p className="font-medium mt-1">
                      Estimated overage cost: ${overageCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Plan Information */}
          <div className="bg-gray-50 rounded-md p-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 capitalize">
                  {organization?.subscription_tier} Plan
                </h4>
                <p className="text-sm text-gray-600">
                  {usageStats.monthly_limit.toLocaleString()} verifications per month
                </p>
              </div>
              <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Usage Chart Placeholder */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Usage Trends</h3>
        </div>
        <div className="p-6">
          <div className="h-64 flex items-center justify-center border-2 border-gray-200 border-dashed rounded-lg">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Usage charts coming soon
              </span>
              <span className="block text-sm text-gray-500">
                Historical usage data and trends will be displayed here
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface UsageCardProps {
  title: string;
  value: string;
  subtitle: string;
  percentage?: number;
  isWarning?: boolean;
  isError?: boolean;
  icon?: React.ReactNode;
}

function UsageCard({ title, value, subtitle, percentage, isWarning, isError, icon }: UsageCardProps) {
  const getStatusColor = () => {
    if (isError) return 'text-red-600';
    if (isWarning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (isError || isWarning) {
      return <AlertTriangle className="h-5 w-5" />;
    }
    return <CheckCircle className="h-5 w-5" />;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
        </div>
        <div className={`flex-shrink-0 ${getStatusColor()}`}>
          {percentage !== undefined ? getStatusIcon() : icon}
        </div>
      </div>
      {percentage !== undefined && (
        <div className="mt-3">
          <div className={`text-xs font-medium ${getStatusColor()}`}>
            {percentage.toFixed(1)}% of limit used
          </div>
        </div>
      )}
    </div>
  );
}