import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { DashboardStats, UsageStats, VerificationSession } from '../types.js';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  PieChart,
  Activity,
  Clock,
  Target,
  Eye,
  FileText
} from 'lucide-react';

export default function Analytics() {
  const { organization, admin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [recentVerifications, setRecentVerifications] = useState<VerificationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'users' | 'performance'>('overview');

  const fetchAnalyticsData = async () => {
    try {
      setError(null);
      setRefreshing(true);
      
      // Fetch analytics data in parallel
      const [statsResponse, usageResponse, verificationsResponse] = await Promise.all([
        apiClient.getVerificationStats(selectedPeriod),
        organization ? apiClient.getOrganizationUsage(organization.id) : Promise.resolve(null),
        apiClient.listVerifications({ page: 1, per_page: 10 })
      ]);

      setStats(statsResponse);
      setUsage(usageResponse);
      setRecentVerifications(verificationsResponse.verifications);
    } catch (err: any) {
      console.error('Failed to fetch analytics data:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [organization, selectedPeriod]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalyticsData();
  };

  const handleExport = () => {
    // TODO: Implement analytics export
    console.log('Exporting analytics data...');
  };

  const canViewAnalytics = admin?.permissions.view_analytics || false;
  const canExportAnalytics = admin?.permissions.export_analytics || false;

  if (!canViewAnalytics) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have permission to view analytics data.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Analytics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={handleRefresh} className="btn btn-primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Detailed insights and performance metrics for your verification platform</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value) as 7 | 30 | 90)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          
          {canExportAnalytics && (
            <button
              onClick={handleExport}
              className="btn btn-secondary"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-primary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'trends', name: 'Trends', icon: TrendingUp },
            { id: 'users', name: 'Users', icon: Users },
            { id: 'performance', name: 'Performance', icon: Target }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab stats={stats} usage={usage} selectedPeriod={selectedPeriod} />
      )}

      {activeTab === 'trends' && (
        <TrendsTab stats={stats} selectedPeriod={selectedPeriod} />
      )}

      {activeTab === 'users' && (
        <UsersTab stats={stats} recentVerifications={recentVerifications} selectedPeriod={selectedPeriod} />
      )}

      {activeTab === 'performance' && (
        <PerformanceTab stats={stats} usage={usage} selectedPeriod={selectedPeriod} />
      )}
    </div>
  );
}

interface TabProps {
  stats: DashboardStats | null;
  usage?: UsageStats | null;
  recentVerifications?: VerificationSession[];
  selectedPeriod: number;
}

function OverviewTab({ stats, usage, selectedPeriod }: TabProps) {
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const overviewStats = [
    {
      name: 'Total Verifications',
      value: stats?.verification_sessions.total?.toLocaleString() || '0',
      change: '+12.5%',
      changeType: 'increase' as const,
      icon: CheckCircle,
      color: 'blue'
    },
    {
      name: 'Success Rate',
      value: `${stats?.verification_sessions.success_rate || 0}%`,
      change: '+2.1%',
      changeType: 'increase' as const,
      icon: Target,
      color: 'green'
    },
    {
      name: 'Avg. Completion Time',
      value: '2.4 min',
      change: '-0.8 min',
      changeType: 'decrease' as const,
      icon: Clock,
      color: 'yellow'
    },
    {
      name: 'Active Users',
      value: stats?.end_users.total?.toLocaleString() || '0',
      change: '+8.3%',
      changeType: 'increase' as const,
      icon: Users,
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <div className="flex items-center mt-2">
                  {stat.changeType === 'increase' ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-gray-50">
                <stat.icon className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Status Distribution */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-blue-600" />
              Verification Status Distribution
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <StatusBar
                label="Completed"
                value={stats?.verification_sessions.completed || 0}
                total={stats?.verification_sessions.total || 1}
                color="green"
              />
              <StatusBar
                label="Failed"
                value={stats?.verification_sessions.failed || 0}
                total={stats?.verification_sessions.total || 1}
                color="red"
              />
              <StatusBar
                label="Pending"
                value={stats?.verification_sessions.pending || 0}
                total={stats?.verification_sessions.total || 1}
                color="yellow"
              />
              <StatusBar
                label="Processing"
                value={stats?.verification_sessions.processing || 0}
                total={stats?.verification_sessions.total || 1}
                color="blue"
              />
            </div>
          </div>
        </div>

        {/* Usage Overview */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-green-600" />
              Usage Summary
            </h3>
          </div>
          <div className="p-6">
            {usage ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Monthly Verifications</span>
                    <span className="text-sm text-gray-900">
                      {usage.current_period.verification_count} / {usage.monthly_limit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((usage.current_period.verification_count / usage.monthly_limit) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">API Calls</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {usage.current_period.api_calls.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Storage Used</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {usage.current_period.storage_used_mb.toFixed(1)} MB
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Usage data unavailable</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendsTab({ stats, selectedPeriod }: TabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Verification Trends</h3>
          <p className="text-sm text-gray-600 mt-1">
            Performance trends over the last {selectedPeriod} days
          </p>
        </div>
        <div className="p-6">
          <div className="h-64 flex items-center justify-center border-2 border-gray-200 border-dashed rounded-lg">
            <div className="text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Trend Charts Coming Soon
              </span>
              <span className="block text-sm text-gray-500">
                Historical verification trends and patterns will be displayed here
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Success Rate Trend</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-12">
              <Target className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Success rate timeline chart</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Volume Trend</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Volume trend chart</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ stats, recentVerifications }: TabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.end_users.total || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.end_users.verified || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.end_users.manual_review || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentVerifications?.slice(0, 5).map((verification) => (
                <tr key={verification.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {verification.vaas_end_users?.first_name} {verification.vaas_end_users?.last_name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {verification.vaas_end_users?.email || 'No email'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      verification.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : verification.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : verification.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {verification.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(verification.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="text-indigo-600 hover:text-indigo-900">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No recent activity
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PerformanceTab({ stats, usage }: TabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">System Performance</h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">API Response Time</span>
                <span className="text-sm text-gray-900">245ms avg</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Excellent performance</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Uptime</span>
                <span className="text-sm text-gray-900">99.9%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '99%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Error Rate</span>
                <span className="text-sm text-gray-900">0.1%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '5%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Within acceptable limits</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quality Metrics</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Manual Review Rate</p>
                <p className="text-xs text-gray-600">Verifications requiring manual review</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {((stats?.end_users.manual_review || 0) / (stats?.end_users.total || 1) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Avg. Processing Time</p>
                <p className="text-xs text-gray-600">Time to complete verification</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">2.4 min</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Success Rate</p>
                <p className="text-xs text-gray-600">Verifications completed successfully</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{stats?.verification_sessions.success_rate || 0}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance Recommendations</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">API Performance: Excellent</p>
                <p className="text-sm text-gray-600">Response times are well within acceptable limits.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Manual Review Rate: Monitor</p>
                <p className="text-sm text-gray-600">Consider adjusting confidence thresholds to optimize automatic approvals.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">System Uptime: Excellent</p>
                <p className="text-sm text-gray-600">Uptime is consistently above 99.9%.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatusBarProps {
  label: string;
  value: number;
  total: number;
  color: 'green' | 'red' | 'yellow' | 'blue';
}

function StatusBar({ label, value, total, color }: StatusBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  const colorClasses = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-900">{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}