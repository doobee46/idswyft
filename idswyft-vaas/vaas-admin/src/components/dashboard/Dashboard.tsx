import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  ExternalLink,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';
import { DashboardStats, UsageStats, VerificationSession } from '../../types.js';

interface StatCard {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down';
    period: string;
  };
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red';
}

export default function Dashboard() {
  const { organization } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [recentVerifications, setRecentVerifications] = useState<VerificationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      // Fetch all dashboard data in parallel
      const [statsResponse, usageResponse, verificationsResponse] = await Promise.all([
        apiClient.getVerificationStats(30),
        organization ? apiClient.getOrganizationUsage(organization.id) : Promise.resolve(null),
        apiClient.listVerifications({ page: 1, per_page: 5 })
      ]);

      setStats(statsResponse);
      setUsage(usageResponse);
      setRecentVerifications(verificationsResponse.verifications);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [organization]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'failed':
        return <span className="badge badge-danger">Failed</span>;
      case 'pending':
        return <span className="badge badge-info">Pending</span>;
      case 'processing':
        return <span className="badge badge-warning">Processing</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="card p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={handleRefresh} className="btn btn-primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statCards: StatCard[] = [
    {
      title: 'Total Verifications',
      value: stats?.verification_sessions.total || 0,
      change: {
        value: 12,
        trend: 'up',
        period: 'vs last month'
      },
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'blue',
    },
    {
      title: 'Success Rate',
      value: `${stats?.verification_sessions.success_rate || 0}%`,
      change: {
        value: 2.4,
        trend: 'up',
        period: 'vs last month'
      },
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'green',
    },
    {
      title: 'Pending Reviews',
      value: stats?.end_users.manual_review || 0,
      icon: <Clock className="w-6 h-6" />,
      color: 'yellow',
    },
    {
      title: 'Active Users',
      value: stats?.end_users.total || 0,
      change: {
        value: 8.1,
        trend: 'up',
        period: 'vs last month'
      },
      icon: <Users className="w-6 h-6" />,
      color: 'blue',
    },
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-500',
      text: 'text-blue-600',
      bgLight: 'bg-blue-50',
    },
    green: {
      bg: 'bg-green-500',
      text: 'text-green-600',
      bgLight: 'bg-green-50',
    },
    yellow: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-600',
      bgLight: 'bg-yellow-50',
    },
    red: {
      bg: 'bg-red-500',
      text: 'text-red-600',
      bgLight: 'bg-red-50',
    },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your verifications.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/verifications/start" className="btn btn-primary">
            Start Verification
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                {card.change && (
                  <div className="flex items-center mt-2">
                    {card.change.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      card.change.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {card.change.value}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">{card.change.period}</span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-full ${colorClasses[card.color].bgLight}`}>
                <div className={colorClasses[card.color].text}>
                  {card.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Verifications */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Verifications</h3>
              <Link to="/verifications" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentVerifications.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No verifications yet</p>
                <Link to="/verifications/start" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Start your first verification
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentVerifications.map((verification) => (
                  <div key={verification.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {verification.vaas_end_users?.first_name} {verification.vaas_end_users?.last_name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(verification.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(verification.status)}
                      <Link
                        to={`/verifications/${verification.id}`}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Usage Overview */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Usage Overview</h3>
              <Link to="/organization" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View details
              </Link>
            </div>
          </div>
          <div className="p-6">
            {usage ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Verifications This Month</span>
                    <span className="text-sm text-gray-900">
                      {usage.current_period.verification_count}
                      {usage.monthly_limit > 0 && ` / ${usage.monthly_limit}`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{
                        width: usage.monthly_limit > 0 
                          ? `${Math.min((usage.current_period.verification_count / usage.monthly_limit) * 100, 100)}%`
                          : '0%'
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">API Calls</span>
                    <span className="text-sm text-gray-900">{usage.current_period.api_calls}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Storage Used</span>
                    <span className="text-sm text-gray-900">{usage.current_period.storage_used_mb} MB</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Current Plan</span>
                    <span className="badge badge-info">{organization?.subscription_tier}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Usage data unavailable</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}