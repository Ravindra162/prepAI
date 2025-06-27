import React from 'react';
import { Users, Mail, TrendingUp, AlertCircle } from 'lucide-react';
import { AdminStatsCard } from '../../components/AdminStatsCard';
import { AdminChart } from '../../components/AdminChart';
import { RecentUsers } from '../../components/RecentUsers';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-xl text-slate-600">Monitor platform performance and user engagement</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCard
          title="Total Users"
          value="1,247"
          change="+12.5%"
          icon={Users}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        <AdminStatsCard
          title="Email Subscribers"
          value="428"
          change="+18.2%"
          icon={Mail}
          color="bg-gradient-to-r from-green-500 to-green-600"
        />
        <AdminStatsCard
          title="Emails Sent Today"
          value="156"
          change="Daily delivery"
          icon={TrendingUp}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
        />
        <AdminStatsCard
          title="Email Success Rate"
          value="98.5%"
          change="+0.3%"
          icon={AlertCircle}
          color="bg-gradient-to-r from-orange-500 to-red-500"
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Growth Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-800">User Growth</h2>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <AdminChart />
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-800">Recent Users</h2>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <RecentUsers />
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-semibold text-slate-800">System Alerts</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
            <div>
              <p className="font-medium text-orange-800">High API Usage</p>
              <p className="text-sm text-orange-600">Code execution API approaching daily limit</p>
            </div>
            <span className="text-xs text-orange-600">2 mins ago</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="font-medium text-blue-800">New Sheet Created</p>
              <p className="text-sm text-blue-600">Advanced Dynamic Programming sheet added</p>
            </div>
            <span className="text-xs text-blue-600">1 hour ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};