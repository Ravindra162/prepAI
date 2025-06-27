import React from 'react';
import { TrendingUp, Target, Zap, Calendar } from 'lucide-react';
import { useUserContext } from '../contexts/UserContext';

export const ProgressStats: React.FC = () => {
  const { user } = useUserContext();

  const stats = [
    {
      icon: Target,
      label: 'Problems Solved',
      value: user?.totalSolved ?? 0,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      icon: Zap,
      label: 'Current Streak',
      value: `${user?.streak ?? 0} days`,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    },
    {
      icon: Calendar,
      label: 'Member Since',
      value: new Date(user?.joinDate ?? '').toLocaleDateString(),
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      icon: TrendingUp,
      label: 'This Month',
      value: '23 solved',
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-slate-800">Progress Statistics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className={`p-4 ${stat.bg} rounded-lg`}>
            <div className="flex items-center space-x-3">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
              <div>
                <p className="text-sm text-slate-600">{stat.label}</p>
                <p className="text-xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <h3 className="font-semibold text-slate-800 mb-3">Weekly Progress</h3>
        <div className="space-y-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
            <div key={day} className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{day}</span>
              <div className="w-32 bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                  style={{ width: `${Math.random() * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-slate-800">
                {Math.floor(Math.random() * 10)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};