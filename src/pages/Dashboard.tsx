import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Play, TrendingUp, Target, Zap, Trophy } from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { ProgressChart } from '../components/ProgressChart';
import { RecentActivity } from '../components/RecentActivity';
import { problemsAPI, progressAPI } from '../services/api';
import { useUserContext } from '../contexts/UserContext';

interface UserStats {
  totalCompleted: number;
  totalAttempted: number;
  totalBookmarked: number;
  sheetsStarted: number;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
}

interface ProgressOverview {
  totalSolved: number;
  totalBookmarked: number;
  sheetsStarted: number;
  activeDays: number;
  currentStreak: number;
  dailyProgress: Array<{
    date: string;
    problems_solved: number;
  }>;
}

export const Dashboard: React.FC = () => {
  const { user } = useUserContext();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [progressOverview, setProgressOverview] = useState<ProgressOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch user stats and progress overview in parallel
        const [statsResponse, overviewResponse] = await Promise.all([
          problemsAPI.getUserStats(),
          progressAPI.getOverview()
        ]);

        setUserStats(statsResponse);
        setProgressOverview(overviewResponse);
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Calculate completion percentage
  const completionPercentage = userStats?.totalAttempted ? 
    Math.round((userStats.totalCompleted / userStats.totalAttempted) * 100) : 0;

  // Get streak display
  const streakDisplay = progressOverview?.currentStreak 
    ? `${progressOverview.currentStreak} day${progressOverview.currentStreak > 1 ? 's' : ''}`
    : '0 days';

  // Calculate recent activity trend
  const recentProblems = progressOverview?.dailyProgress?.slice(0, 7).reduce((sum, day) => parseInt(sum) + parseInt(day.problems_solved), 0) || 0;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-64 mx-auto animate-pulse"></div>
          <div className="h-6 bg-slate-200 rounded-lg w-96 mx-auto animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-slate-200 rounded w-16 mb-1"></div>
              <div className="h-3 bg-slate-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-800">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-800">
          Welcome Back{user?.name ? `, ${user.name}` : ''}!
        </h1>
        <p className="text-xl text-slate-600">Ready to level up your coding skills?</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Problems Solved"
          value={userStats?.totalCompleted?.toString() || '0'}
          change={`${completionPercentage}% completion rate`}
          icon={Target}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        <StatsCard
          title="Current Streak"
          value={streakDisplay}
          change={progressOverview?.currentStreak ? 'Keep it up!' : 'Start your streak!'}
          icon={Zap}
          color="bg-gradient-to-r from-orange-500 to-red-500"
        />
        <StatsCard
          title="Sheets Started"
          value={progressOverview?.sheetsStarted?.toString() || '0'}
          change={`${userStats?.totalBookmarked || 0} bookmarked`}
          icon={BookOpen}
          color="bg-gradient-to-r from-green-500 to-green-600"
        />
        <StatsCard
          title="This Week"
          value={`${recentProblems} solved`}
          change={`${progressOverview?.activeDays || 0} active days`}
          icon={Trophy}
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
            <ProgressChart dailyProgress={progressOverview?.dailyProgress} />
          </div>
        </div>

        {/* Recent Activity and Stats */}
        <div className="space-y-6">
          {/* User Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Your Progress</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Attempted</span>
                <span className="font-semibold text-slate-800">{userStats?.totalAttempted || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Solved</span>
                <span className="font-semibold text-green-600">{userStats?.totalCompleted || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Success Rate</span>
                <span className="font-semibold text-blue-600">{completionPercentage}%</span>
              </div>
              {progressOverview?.dailyProgress && progressOverview.dailyProgress.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="text-sm text-slate-600 mb-2">Recent Activity</div>
                  <div className="grid grid-cols-7 gap-1">
                    {progressOverview.dailyProgress.slice(0, 7).reverse().map((day, index) => (
                      <div
                        key={index}
                        className={`h-3 w-3 rounded-sm ${
                          day.problems_solved > 0
                            ? day.problems_solved > 3
                              ? 'bg-green-600'
                              : day.problems_solved > 1
                              ? 'bg-green-400'
                              : 'bg-green-200'
                            : 'bg-slate-100'
                        }`}
                        title={`${day.date}: ${day.problems_solved} problems solved`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

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
              <div className="w-full p-3 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div>
                      <span className="font-medium text-purple-800">AI Technical Interview</span>
                      <p className="text-xs text-purple-600 mt-1">Fill form and start your interview session</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      window.open('/interview', '_blank');
                    }}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                  >
                    Start Interview
                  </button>
                </div>
              </div>
              {userStats?.totalCompleted === 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-800">Start with your first problem!</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};