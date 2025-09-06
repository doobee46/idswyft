import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/auth/Login';
import EmailVerification from './components/auth/EmailVerification';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './components/dashboard/Dashboard';
import Organization from './pages/Organization';
import Verifications from './pages/Verifications';
import Webhooks from './pages/Webhooks';
import DebugInfo from './components/debug/DebugInfo';

// Development route for debugging
const DevInfo = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Development Info</h1>
    <DebugInfo />
  </div>
);

// Placeholder components for other routes
const Users = () => <div className="p-6"><h1 className="text-2xl font-bold">End Users</h1><p>Coming soon...</p></div>;
const Analytics = () => <div className="p-6"><h1 className="text-2xl font-bold">Analytics</h1><p>Coming soon...</p></div>;
const Settings = () => <div className="p-6"><h1 className="text-2xl font-bold">Settings</h1><p>Coming soon...</p></div>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/dev" element={<DevInfo />} />
            
            {/* Protected routes */}
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="verifications" element={<Verifications />} />
              <Route path="users" element={<Users />} />
              <Route path="webhooks" element={<Webhooks />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="organization" element={<Organization />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
