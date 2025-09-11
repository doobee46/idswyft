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
  Calendar,
  ArrowUpRight,
  BarChart3,
  FileText,
  Shield
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
  color: 'blue' | 'green' | 'yellow' | 'purple';
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
    const baseClass = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border";
    switch (status) {
      case 'completed':
        return <span className={`${baseClass} bg-green-100/80 text-green-800 border-green-200/50`}>Completed</span>;
      case 'failed':
        return <span className={`${baseClass} bg-red-100/80 text-red-800 border-red-200/50`}>Failed</span>;
      case 'pending':
        return <span className={`${baseClass} bg-blue-100/80 text-blue-800 border-blue-200/50`}>Pending</span>;
      case 'processing':
        return <span className={`${baseClass} bg-yellow-100/80 text-yellow-800 border-yellow-200/50`}>Processing</span>;
      default:
        return <span className={`${baseClass} bg-gray-100/80 text-gray-800 border-gray-200/50`}>{status}</span>;
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
              <div key={i} className="stat-card-glass p-6">
                <div className="h-4 bg-white/40 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-white/40 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-white/40 rounded w-1/3"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="content-card-glass p-6">
              <div className="h-4 bg-white/40 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-white/40 rounded"></div>
                ))}
              </div>
            </div>
            <div className="content-card-glass p-6">
              <div className="h-4 bg-white/40 rounded w-1/2 mb-4"></div>
              <div className="h-48 bg-white/40 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="content-card-glass p-8 text-center animate-scale-in">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Error Loading Dashboard</h3>
          <p className="text-slate-600 mb-6">{error}</p>
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
      color: 'purple',
    },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-in-up">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome back!</h1>
          <p className="text-slate-600">Here's what's happening with your identity verification platform.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/80 font-medium text-slate-700 glass-shimmer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link 
            to="/verifications/start" 
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-medium"
          >
            <span>Start Verification</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div 
            key={index} 
            className={`stat-card-glass p-6 animate-fade-in-stagger border-l-4 ${
              card.color === 'blue' ? 'border-blue-500' :
              card.color === 'green' ? 'border-green-500' :
              card.color === 'yellow' ? 'border-yellow-500' :
              'border-purple-500'
            }`}
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-600 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-slate-800 mb-3">{card.value}</p>
                {card.change && (
                  <div className="flex items-center">
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      card.change.trend === 'up' 
                        ? 'bg-green-100/80 text-green-700' 
                        : 'bg-red-100/80 text-red-700'
                    }`}>
                      {card.change.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      <span>{card.change.value}%</span>
                    </div>
                    <span className="text-xs text-slate-500 ml-2">{card.change.period}</span>
                  </div>
                )}
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg text-white ${
                card.color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                card.color === 'green' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                card.color === 'yellow' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                'bg-gradient-to-br from-purple-500 to-purple-600'
              }`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Verifications */}
        <div className="content-card-glass animate-fade-in-stagger" style={{ animationDelay: '600ms' }}>
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Recent Verifications</h3>
              </div>
              <Link 
                to="/verifications" 
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors"
              >
                <span>View all</span>
                <ArrowUpRight className="w-3 h-3 transition-transform hover:translate-x-0.5 hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentVerifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 mb-4">No verifications yet</p>
                <Link 
                  to="/verifications/start" 
                  className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  <span>Start your first verification</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentVerifications.map((verification, index) => (
                  <div 
                    key={verification.id} 
                    className="table-row-glass p-4 rounded-2xl border border-white/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                          <Users className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">
                            {verification.vaas_end_users?.first_name} {verification.vaas_end_users?.last_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-slate-500 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(verification.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(verification.status)}
                        <Link
                          to={`/verifications/${verification.id}`}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/40 transition-all duration-200 hover:opacity-100"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Usage Overview */}
        <div className="content-card-glass animate-fade-in-stagger" style={{ animationDelay: '750ms' }}>
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Usage Overview</h3>
              </div>
              <Link 
                to="/organization" 
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors"
              >
                <span>View details</span>
                <ArrowUpRight className="w-3 h-3 transition-transform hover:translate-x-0.5 hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            {usage ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700">Verifications This Month</span>
                    <span className="text-sm font-bold text-slate-800">
                      {usage.current_period.verification_count}
                      {usage.monthly_limit > 0 && (
                        <span className="text-slate-500 font-normal"> / {usage.monthly_limit}</span>
                      )}
                    </span>
                  </div>
                  <div className="progress-bar-glass">
                    <div
                      className="progress-fill"
                      style={{
                        width: usage.monthly_limit > 0 
                          ? `${Math.min((usage.current_period.verification_count / usage.monthly_limit) * 100, 100)}%`
                          : '0%'
                      }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">API Calls</div>
                    <div className="text-lg font-bold text-slate-800">{usage.current_period.api_calls}</div>
                  </div>
                  <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Storage</div>
                    <div className="text-lg font-bold text-slate-800">{usage.current_period.storage_used_mb} MB</div>
                  </div>
                </div>

                <div className="border-t border-white/20 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-semibold text-slate-700">Current Plan</span>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100/80 backdrop-blur-sm text-blue-700 border border-blue-200/50">
                      {organization?.subscription_tier}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">Usage data unavailable</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}