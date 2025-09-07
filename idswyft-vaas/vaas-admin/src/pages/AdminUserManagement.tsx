import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import type { 
  AdminRole,
  AdminPermission,
  AdminUser, 
  AdminUserFormData,
  AdminUserUpdateData,
  AdminUserInvite,
  AdminUserStats,
  AdminUserFilters,
  AdminUserResponse,
  AdminStatus
} from '../types';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  UserCheck, 
  UserX, 
  UserPlus,
  Mail,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Unlock,
  RotateCcw,
  Settings,
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

// Status colors
const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
  locked: 'bg-orange-100 text-orange-800'
};

// Status icons
const statusIcons = {
  active: CheckCircle,
  inactive: XCircle,
  pending: Clock,
  suspended: UserX,
  locked: Unlock
};

export default function AdminUserManagement() {
  const { organization, admin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [invites, setInvites] = useState<AdminUserInvite[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState<AdminUserFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Form data
  const [createFormData, setCreateFormData] = useState<AdminUserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    role_id: '',
    phone_number: '',
    timezone: '',
    language: 'en',
    send_invite: true
  });
  
  const [editFormData, setEditFormData] = useState<AdminUserUpdateData>({});
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);

  // Load admin users
  const loadUsers = useCallback(async (page = 1, newFilters = filters) => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const params = {
        ...newFilters,
        page,
        per_page: ITEMS_PER_PAGE,
        search: search.trim() || undefined
      };

      const response = await apiClient.getAdminUsers(organization.id, params);
      setUsers(response.users);
      setTotalPages(response.total_pages);
      setTotal(response.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load admin users:', error);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, filters, search]);

  // Load roles and permissions
  const loadRoles = useCallback(async () => {
    if (!organization?.id) return;
    
    try {
      const [rolesData, permissionsData] = await Promise.all([
        apiClient.getAdminRoles(organization.id),
        apiClient.getAdminPermissions()
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Failed to load roles and permissions:', error);
    }
  }, [organization?.id]);

  // Load invites
  const loadInvites = useCallback(async () => {
    if (!organization?.id) return;
    
    try {
      const invitesData = await apiClient.getAdminUserInvites(organization.id);
      setInvites(invitesData);
    } catch (error) {
      console.error('Failed to load admin invites:', error);
    }
  }, [organization?.id]);

  // Load statistics
  const loadStats = useCallback(async () => {
    if (!organization?.id) return;
    
    setStatsLoading(true);
    try {
      const statsData = await apiClient.getAdminUserStats(organization.id);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load admin user stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [organization?.id]);

  // Initial load
  useEffect(() => {
    loadUsers();
    loadRoles();
    loadInvites();
    loadStats();
  }, [loadUsers, loadRoles, loadInvites, loadStats]);

  // Handle filter changes
  const handleFilterChange = (key: keyof AdminUserFilters, value: string) => {
    const newFilters: AdminUserFilters = { ...filters };
    if (value) {
      switch (key) {
        case 'status':
          newFilters.status = value as AdminStatus;
          break;
        default:
          (newFilters as any)[key] = value;
      }
    } else {
      delete newFilters[key];
    }
    setFilters(newFilters);
    loadUsers(1, newFilters);
  };

  // Handle search
  const handleSearch = () => {
    loadUsers(1);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUsers(currentPage), loadRoles(), loadInvites(), loadStats()]);
    setRefreshing(false);
  };

  // Create user
  const handleCreateUser = async () => {
    if (!organization?.id) return;
    
    try {
      await apiClient.createAdminUser(organization.id, createFormData);
      setShowCreateModal(false);
      setCreateFormData({
        email: '',
        first_name: '',
        last_name: '',
        role_id: '',
        phone_number: '',
        timezone: '',
        language: 'en',
        send_invite: true
      });
      await Promise.all([loadUsers(), loadInvites(), loadStats()]);
    } catch (error) {
      console.error('Failed to create admin user:', error);
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!organization?.id || !selectedUser?.id) return;
    
    try {
      await apiClient.updateAdminUser(organization.id, selectedUser.id, editFormData);
      setShowEditModal(false);
      setEditFormData({});
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      console.error('Failed to update admin user:', error);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!organization?.id || !selectedUser?.id) return;
    
    try {
      await apiClient.deleteAdminUser(organization.id, selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      await Promise.all([loadUsers(), loadStats()]);
    } catch (error) {
      console.error('Failed to delete admin user:', error);
    }
  };

  // Suspend user
  const handleSuspendUser = async (user: AdminUser) => {
    if (!organization?.id) return;
    
    try {
      await apiClient.suspendAdminUser(organization.id, user.id, 'Suspended by admin');
      await loadUsers();
    } catch (error) {
      console.error('Failed to suspend user:', error);
    }
  };

  // Activate user
  const handleActivateUser = async (user: AdminUser) => {
    if (!organization?.id) return;
    
    try {
      await apiClient.activateAdminUser(organization.id, user.id);
      await loadUsers();
    } catch (error) {
      console.error('Failed to activate user:', error);
    }
  };

  // Unlock user
  const handleUnlockUser = async (user: AdminUser) => {
    if (!organization?.id) return;
    
    try {
      await apiClient.unlockAdminUser(organization.id, user.id);
      await loadUsers();
    } catch (error) {
      console.error('Failed to unlock user:', error);
    }
  };

  // Resend invite
  const handleResendInvite = async (invite: AdminUserInvite) => {
    if (!organization?.id) return;
    
    try {
      await apiClient.resendAdminInvite(organization.id, invite.id);
      await loadInvites();
    } catch (error) {
      console.error('Failed to resend invite:', error);
    }
  };

  // Revoke invite
  const handleRevokeInvite = async (invite: AdminUserInvite) => {
    if (!organization?.id) return;
    
    try {
      await apiClient.revokeAdminInvite(organization.id, invite.id);
      await loadInvites();
    } catch (error) {
      console.error('Failed to revoke invite:', error);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get relative time
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading && users.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg border">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b">
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="p-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded mb-4"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Users className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600 mt-1">Manage admin users, roles, and permissions</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Team Member
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && !statsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Admins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_admins}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active_admins}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending Invites</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending_invites}</p>
              </div>
              <Mail className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Suspended</p>
                <p className="text-2xl font-bold text-red-600">{stats.suspended_admins}</p>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border mb-6">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Search
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-md flex items-center ${
                  showFilters 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="p-6 bg-gray-50 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={filters.role_id || ''}
                  onChange={(e) => handleFilterChange('role_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Roles</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.display_name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="locked">Locked</option>
                </select>
              </div>

              {/* Last Login From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Login From</label>
                <input
                  type="datetime-local"
                  value={filters.last_login_from || ''}
                  onChange={(e) => handleFilterChange('last_login_from', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({});
                    setSearch('');
                    loadUsers(1, {});
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Users Table */}
      <div className="bg-white rounded-lg border mb-6">
        <div className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Team Members ({total.toLocaleString()} total)
            </h2>
            {loading && (
              <div className="flex items-center text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const StatusIcon = statusIcons[user.status];
                const canModify = admin?.id !== user.id; // Prevent self-modification
                
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.phone_number && (
                            <div className="text-xs text-gray-400">{user.phone_number}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.role.display_name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-32">{user.role.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                      {user.two_factor_enabled && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <Shield className="h-3 w-3 mr-1" />
                            2FA
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.last_login_at ? (
                        <div>
                          <div className="font-medium">{getRelativeTime(user.last_login_at)}</div>
                          <div className="text-gray-500 text-xs">{formatTimestamp(user.last_login_at)}</div>
                          {user.last_ip_address && (
                            <div className="text-gray-400 text-xs">{user.last_ip_address}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {canModify && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setEditFormData({
                                  first_name: user.first_name,
                                  last_name: user.last_name,
                                  role_id: user.role_id,
                                  phone_number: user.phone_number || '',
                                  timezone: user.timezone || '',
                                  language: user.language || 'en'
                                });
                                setShowEditModal(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            
                            {user.status === 'active' ? (
                              <button
                                onClick={() => handleSuspendUser(user)}
                                className="text-red-600 hover:text-red-900"
                                title="Suspend User"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            ) : user.status === 'suspended' ? (
                              <button
                                onClick={() => handleActivateUser(user)}
                                className="text-green-600 hover:text-green-900"
                                title="Activate User"
                              >
                                <UserCheck className="h-4 w-4" />
                              </button>
                            ) : null}
                            
                            {user.status === 'locked' && (
                              <button
                                onClick={() => handleUnlockUser(user)}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Unlock User"
                              >
                                <Unlock className="h-4 w-4" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No team members found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {Object.keys(filters).length > 0 || search
                ? 'Try adjusting your search criteria or filters.'
                : 'Get started by adding your first team member.'}
            </p>
            {(!Object.keys(filters).length && !search) && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Team Member
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, total)} of{' '}
                {total.toLocaleString()} results
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadUsers(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={page}
                        onClick={() => loadUsers(page)}
                        disabled={loading}
                        className={`px-3 py-1 text-sm rounded ${
                          page === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        } disabled:opacity-50`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => loadUsers(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pending Invites Section */}
      {invites.length > 0 && (
        <div className="bg-white rounded-lg border mb-6">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Pending Invites ({invites.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {invites.map((invite) => (
              <div key={invite.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{invite.email}</div>
                  <div className="text-sm text-gray-500">
                    {invite.role.display_name} • Invited by {invite.invited_by_name}
                  </div>
                  <div className="text-xs text-gray-400">
                    Expires {formatTimestamp(invite.expires_at)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    invite.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    invite.status === 'expired' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                  </span>
                  {invite.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleResendInvite(invite)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => handleRevokeInvite(invite)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Revoke
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add Team Member</h3>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={createFormData.first_name}
                    onChange={(e) => setCreateFormData({...createFormData, first_name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={createFormData.last_name}
                    onChange={(e) => setCreateFormData({...createFormData, last_name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({...createFormData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={createFormData.role_id}
                  onChange={(e) => setCreateFormData({...createFormData, role_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.display_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={createFormData.phone_number || ''}
                  onChange={(e) => setCreateFormData({...createFormData, phone_number: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={createFormData.send_invite}
                  onChange={(e) => setCreateFormData({...createFormData, send_invite: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Send invitation email immediately
                </label>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!createFormData.email || !createFormData.first_name || !createFormData.last_name || !createFormData.role_id}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional modals would be implemented here: Edit Modal, User Details Modal, Role Management Modal, Delete Confirmation Modal */}
      
    </div>
  );
}