import React, { useState, useEffect } from 'react';
import { CheckCircle, BookOpen, Play } from 'lucide-react';
import { progressAPI } from '../services/api';

interface Activity {
  id: string;
  type: 'solved' | 'started' | 'bookmarked';
  title: string;
  sheet: string;
  time: string;
  icon: React.ComponentType<any>;
  color: string;
}

export const RecentActivity: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        const overview = await progressAPI.getOverview();
        
        // Transform the dailyProgress data into activity format
        const recentActivities: Activity[] = [];
        
        if (overview.dailyProgress) {
          overview.dailyProgress.slice(0, 4).forEach((day: any, index: number) => {
            if (day.problems_solved > 0) {
              const date = new Date(day.date);
              const timeAgo = getTimeAgo(date);
              
              recentActivities.push({
                id: `activity-${index}`,
                type: 'solved',
                title: `${day.problems_solved} problem${day.problems_solved > 1 ? 's' : ''}`,
                sheet: 'Mixed Sheets',
                time: timeAgo,
                icon: CheckCircle,
                color: 'text-green-500'
              });
            }
          });
        }

        // Add some default activities if no recent progress
        if (recentActivities.length === 0) {
          recentActivities.push(
            {
              id: 'welcome',
              type: 'started',
              title: 'Welcome to your coding journey!',
              sheet: 'Getting Started',
              time: 'Just now',
              icon: Play,
              color: 'text-blue-500'
            }
          );
        }

        setActivities(recentActivities);
      } catch (error) {
        console.error('Failed to fetch recent activity:', error);
        // Fallback to default activity
        setActivities([
          {
            id: 'default',
            type: 'started',
            title: 'Start solving problems',
            sheet: 'DSA Sheets',
            time: 'Ready when you are',
            icon: BookOpen,
            color: 'text-blue-500'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-5 h-5 bg-slate-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-slate-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center space-x-3">
            <activity.icon className={`w-5 h-5 ${activity.color}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">{activity.title}</p>
              <p className="text-xs text-slate-500">{activity.sheet} • {activity.time}</p>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="text-center py-4">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No recent activity yet</p>
            <p className="text-xs text-slate-400">Start solving problems to see your progress!</p>
          </div>
        )}
      </div>
    </div>
  );
};
