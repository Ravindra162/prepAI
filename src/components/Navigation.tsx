import React, { memo, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Code, Home, BookOpen, Play, User, LogOut, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useUserContext } from '../contexts/UserContext';

export const Navigation: React.FC = memo(() => {
  const location = useLocation();
  const { user, logout } = useUserContext();
  const navigate = useNavigate();

  const navItems = useMemo(() => [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/sheets', icon: BookOpen, label: 'DSA Sheets' },
    { path: '/playground', icon: Play, label: 'Playground' },
    { path: '/interview', icon: Brain, label: 'AI Interview', isExternal: true },
    { path: '/profile', icon: User, label: 'Profile' },
  ], []);

  const userInitial = useMemo(() => 
    user?.name.charAt(0).toUpperCase(), [user?.name]
  );

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-lg border-b border-slate-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Code className="w-8 h-8 text-blue-600" />
            <h1
              onClick={handleLogoClick}
              className="text-xl font-bold text-slate-800 cursor-pointer">PrepAI</h1>
          </div>
          
          <div className="hidden md:flex space-x-8">
            {navItems.map(({ path, icon: Icon, label, isExternal }) => (
              isExternal ? (
                <button
                  key={path}
                  onClick={() => window.open(path, '_blank')}
                  className={clsx(
                    'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    'text-slate-600 hover:text-purple-600 hover:bg-purple-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ) : (
                <Link
                  key={path}
                  to={path}
                  className={clsx(
                    'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    location.pathname === path
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              )
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {userInitial}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-600">{user?.role}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
});