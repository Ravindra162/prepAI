import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { AdminNavigation } from './AdminNavigation';

interface LayoutProps {
  isAdmin?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ isAdmin = false }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {isAdmin ? <AdminNavigation /> : <Navigation />}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};