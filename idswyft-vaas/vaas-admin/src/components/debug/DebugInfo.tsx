import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function DebugInfo() {
  const auth = useAuth();
  
  return (
    <div className="p-6 bg-gray-100 border-2 border-blue-500">
      <h2 className="text-xl font-bold mb-4">Debug Information</h2>
      <div className="space-y-2 text-sm">
        <div><strong>Loading:</strong> {auth.loading ? 'Yes' : 'No'}</div>
        <div><strong>Authenticated:</strong> {auth.isAuthenticated ? 'Yes' : 'No'}</div>
        <div><strong>Error:</strong> {auth.error || 'None'}</div>
        <div><strong>Admin:</strong> {auth.admin ? auth.admin.email : 'None'}</div>
        <div><strong>Organization:</strong> {auth.organization ? auth.organization.name : 'None'}</div>
        <div><strong>Token:</strong> {auth.token ? 'Present' : 'None'}</div>
        <div><strong>Current URL:</strong> {window.location.href}</div>
        <div><strong>React Version:</strong> {React.version}</div>
      </div>
    </div>
  );
}