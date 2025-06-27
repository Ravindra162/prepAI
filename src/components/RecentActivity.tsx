import React from 'react';
import { CheckCircle, BookOpen, Clock } from 'lucide-react';

const activities = [
  {
    id: 1,
    type: 'solved',
    title: 'Two Sum',
    sheet: 'Striver A2Z',
    time: '2 hours ago',
    icon: CheckCircle,
    color: 'text-green-500'
  },
  {
    id: 2,
    type: 'started',
    title: 'Binary Search',
    sheet: 'Love Babbar',
    time: '5 hours ago',
    icon: Clock,
    color: 'text-orange-500'
  },
  {
    id: 3,
    type: 'solved',
    title: 'Kadane\'s Algorithm',
    sheet: 'Striver A2Z',
    time: '1 day ago',
    icon: CheckCircle,
    color: 'text-green-500'
  },
  {
    id: 4,
    type: 'bookmarked',
    title: 'Longest Substring',
    sheet: 'NeetCode 150',
    time: '2 days ago',
    icon: BookOpen,
    color: 'text-blue-500'
  }
];

export const RecentActivity: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center space-x-3">
            <activity.icon className={`w-5 h-5 ${activity.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {activity.title}
              </p>
              <p className="text-xs text-slate-500">{activity.sheet}</p>
            </div>
            <span className="text-xs text-slate-400">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};