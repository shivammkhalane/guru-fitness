import React from 'react';
import AdminLogin from './AdminLogin';

export default function ProtectedAdminRoute({ children }) {
  const isAdminAuthenticated = localStorage.getItem('guru_admin_auth') === 'true';

  if (!isAdminAuthenticated) {
    return <AdminLogin />;
  }

  return children;
}