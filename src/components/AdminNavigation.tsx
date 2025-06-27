import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, BarChart3, Users, BookOpen, Settings, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useUserContext } from '../contexts/UserContext';

export const AdminNavigation: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useUserContext();

  const navItems = [
    { path: '/admin', icon: BarChart3, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/sheets', icon: BookOpen, label: 'Sheets' },
    { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <nav className="bg-slate-900 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-orange-500" />
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          </div>
          
          <div className="hidden md:flex space-x-8">
            {navItems.map(({ path, icon: Icon, label }) => (
              <Link
                key={path}
                to={path}
                className={clsx(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  location.pathname === path
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="text-slate-300 hover:text-white text-sm"
            >
              ← Back to App
            </Link>
            
            <button className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-slate-300">Administrator</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-300 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};