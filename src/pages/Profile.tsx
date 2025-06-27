import React, { useState } from 'react';
import { User, Mail, Bell, Shield, Calendar, Target, Zap, BookOpen } from 'lucide-react';
import { ProfileSection } from '../components/ProfileSection';
import { NotificationSettings } from '../components/NotificationSettings';
import { ProgressStats } from '../components/ProgressStats';

export const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'progress', label: 'Progress', icon: Target },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto"></div>
        <h1 className="text-3xl font-bold text-slate-800">Your Profile</h1>
        <p className="text-slate-600">Manage your account settings and preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'progress' && <ProgressStats />}
      </div>
    </div>
  );
};