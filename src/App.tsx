/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import SeasonalLayout from './layouts/SeasonalLayout';
import ManagerLayout from './layouts/ManagerLayout';
import TaskList from './pages/seasonal/TaskList';
import DocumentTask from './pages/seasonal/DocumentTask';
import Dashboard from './pages/supervisor/Dashboard';
import OperationalReports from './pages/supervisor/OperationalReports';
import DatabaseTable from './pages/supervisor/DatabaseTable';
import ToastNotification from './components/ToastNotification';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;

  return <>{children}</>;
}

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === 'seasonal') return <Navigate to="/seasonal" />;
  return <Navigate to="/admin" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/seasonal" element={
            <ProtectedRoute allowedRoles={['seasonal']}>
              <SeasonalLayout />
            </ProtectedRoute>
          }>
            <Route index element={<TaskList />} />
            <Route path="document" element={<DocumentTask />} />
          </Route>

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['supervisor', 'manager']}>
              <ManagerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="operational-reports" element={<OperationalReports />} />
            <Route path="db/:tableName" element={<DatabaseTable />} />
          </Route>

          <Route path="/" element={<RoleHome />} />
        </Routes>
      </Router>
      <ToastNotification />
    </AuthProvider>
  );
}
