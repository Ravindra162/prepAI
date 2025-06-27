import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Play, TrendingUp, Calendar, Target, Zap } from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { ProgressChart } from '../components/ProgressChart';
import { RecentActivity } from '../components/RecentActivity';

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-800">Welcome Back!</h1>
        <p className="text-xl text-slate-600">Ready to level up your coding skills?</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Problems Solved"
          value="127"
          change="+12 this week"
          icon={Target}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        <StatsCard
          title="Current Streak"
          value="8 days"
          change="Personal best!"
          icon={Zap}
          color="bg-gradient-to-r from-orange-500 to-red-500"
        />
        <StatsCard
          title="Sheets Progress"
          value="3/12"
          change="25% complete"
          icon={BookOpen}
          color="bg-gradient-to-r from-green-500 to-green-600"
        />
        <StatsCard
          title="Code Runs"
          value="342"
          change="+25 today"
          icon={Play}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">Progress Overview</h2>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <ProgressChart />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <RecentActivity />
          
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/sheets"
                className="block w-full p-3 text-left rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Browse DSA Sheets</span>
                </div>
              </Link>
              <Link
                to="/playground"
                className="block w-full p-3 text-left rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Play className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">Open Playground</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};