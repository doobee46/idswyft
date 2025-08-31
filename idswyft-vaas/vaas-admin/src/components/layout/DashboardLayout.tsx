import React, { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  CheckCircle,
  Webhook,
  Settings,
  BarChart3,
  Building,
  LogOut,
  Shield,
  Bell,
  User,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    current: false,
  },
  {
    name: 'Verifications',
    href: '/verifications',
    icon: CheckCircle,
    current: false,
  },
  {
    name: 'End Users',
    href: '/users',
    icon: Users,
    current: false,
  },
  {
    name: 'Webhooks',
    href: '/webhooks',
    icon: Webhook,
    current: false,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    current: false,
  },
  {
    name: 'Organization',
    href: '/organization',
    icon: Building,
    current: false,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    current: false,
  },
];

export default function DashboardLayout() {
  const { isAuthenticated, admin, organization, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Update current navigation item based on location
  const updatedNavigation = navigationItems.map(item => ({
    ...item,
    current: location.pathname.startsWith(item.href),
  }));

  const AdminMenu = () => (
    <div className="relative">
      <button
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors w-full text-left"
      >
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {admin?.first_name} {admin?.last_name}
          </div>
          <div className="text-xs text-gray-500 truncate">{admin?.role}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {userMenuOpen && (
        <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-900">
              {admin?.first_name} {admin?.last_name}
            </div>
            <div className="text-xs text-gray-500">{admin?.email}</div>
            <div className="text-xs text-primary-600 mt-1">{organization?.name}</div>
          </div>
          <div className="p-1">
            <Link
              to="/profile"
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-md"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const Sidebar = ({ className = '' }: { className?: string }) => (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="ml-3 text-xl font-bold text-gray-900">VaaS Admin</span>
      </div>

      {/* Organization info */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</div>
        <div className="text-sm font-medium text-gray-900 mt-1">{organization?.name}</div>
        <div className="flex items-center mt-2">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            organization?.billing_status === 'active' ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
          <span className={`text-xs font-medium ${
            organization?.billing_status === 'active' ? 'text-green-600' : 'text-red-600'
          }`}>
            {organization?.billing_status?.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {updatedNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                item.current
                  ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${item.current ? 'text-primary-600' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User menu at bottom */}
      <div className="px-4 py-4 border-t border-gray-200">
        <AdminMenu />
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-0 right-0 -mr-12 pt-2">
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
        <Sidebar />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <Sidebar />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-600 lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="ml-4 text-2xl font-semibold text-gray-900 lg:ml-0">
                {updatedNavigation.find(item => item.current)?.name || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="text-gray-400 hover:text-gray-500 p-2 rounded-lg hover:bg-gray-100">
                <Bell className="h-5 w-5" />
              </button>

              {/* Desktop user menu */}
              <div className="hidden lg:block">
                <AdminMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}