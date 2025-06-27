import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, BookOpen, Play, Mail } from 'lucide-react';
import { AnalyticsChart } from '../../components/AnalyticsChart';
import { TopSheets } from '../../components/TopSheets';
import { EngagementMetrics } from '../../components/EngagementMetrics';

export const AdminAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Analytics</h1>
          <p className="text-slate-600 mt-2">Detailed platform analytics and insights</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Page Views</p>
              <p className="text-2xl font-bold text-slate-800">24,567</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-sm text-green-600 mt-2">+12.5% from last period</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active Users</p>
              <p className="text-2xl font-bold text-slate-800">1,247</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-sm text-green-600 mt-2">+8.2% from last period</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Problems Solved</p>
              <p className="text-2xl font-bold text-slate-800">8,432</p>
            </div>
            <BookOpen className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-sm text-green-600 mt-2">+23.1% from last period</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Code Executions</p>
              <p className="text-2xl font-bold text-slate-800">15,698</p>
            </div>
            <Play className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-sm text-green-600 mt-2">+18.7% from last period</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">User Engagement</h2>
          <AnalyticsChart />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Top Performing Sheets</h2>
          <TopSheets />
        </div>
      </div>

      {/* Engagement Metrics */}
      <EngagementMetrics />
    </div>
  );
};