import React, { useState, useEffect } from 'react';
import { Bell, Mail, Clock, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { useUserContext } from '../contexts/UserContext';
import { sheetsAPI, emailAPI } from '../services/api';
import toast from 'react-hot-toast';

interface Sheet {
  id: string;
  title: string;
  description: string;
  difficulty?: string;
  author?: string;
}

export const NotificationSettings: React.FC = () => {
  const { user, updateSubscription, refreshUserData, loading } = useUserContext();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    emailNotifications: user?.preferences.emailNotifications ?? false,
    dailyProblems: user?.preferences.dailyProblems ?? 3,
    preferredTime: user?.preferences.preferredTime ?? '09:00',
    selectedSheets: user?.preferences.selectedSheets ?? [],
  });

  const [sentStats, setSentStats] = useState<{
    totalSent: number;
    uniqueProblems: number;
    firstSent: string | null;
    lastSent: string | null;
    lastHistoryCleared: string | null;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  // Load available sheets
  useEffect(() => {
    const loadSheets = async () => {
      try {
        const response = await sheetsAPI.getAllSheets();
        setSheets(response.sheets || []);
      } catch (error) {
        console.error('Failed to load sheets:', error);
        toast.error('Failed to load available sheets');
      } finally {
        setLoadingSheets(false);
      }
    };

    loadSheets();
  }, []);

  // Update settings when user data changes
  useEffect(() => {
    if (user) {
      setSettings({
        emailNotifications: user.preferences.emailNotifications,
        dailyProblems: user.preferences.dailyProblems,
        preferredTime: user.preferences.preferredTime,
        selectedSheets: user.preferences.selectedSheets,
      });
    }
  }, [user?.preferences.emailNotifications, user?.preferences.dailyProblems, user?.preferences.preferredTime, user?.preferences.selectedSheets]);

  // Load sent statistics if subscribed
  useEffect(() => {
    const loadStats = async () => {
      if (!user?.preferences.emailNotifications) return;
      
      try {
        setLoadingStats(true);
        const stats = await emailAPI.getSentStats();
        setSentStats(stats);
      } catch (error) {
        console.error('Failed to load sent stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [user?.preferences.emailNotifications]);

  const handleSheetToggle = (sheetId: string) => {
    setSettings(prev => ({
      ...prev,
      selectedSheets: prev.selectedSheets.includes(sheetId)
        ? prev.selectedSheets.filter((id: string) => id !== sheetId)
        : [...prev.selectedSheets, sheetId]
    }));
  };

  const handleSubscriptionToggle = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      const newSubscriptionStatus = !settings.emailNotifications;
      
      if (newSubscriptionStatus) {
        // Subscribing - show fresh start option if user has history
        const shouldClearHistory = sentStats && sentStats.totalSent > 0 && 
          confirm('You have previously received problems. Would you like to start fresh and clear your history? This will allow previously sent problems to be sent again.');

        if (shouldClearHistory) {
          await emailAPI.clearProblemHistory();
          toast.success('History cleared! Starting fresh.');
          // Reload stats after clearing
          const newStats = await emailAPI.getSentStats();
          setSentStats(newStats);
        }

        // If subscribing, use the subscribe API with current preferences
        const subscribeResult = await emailAPI.subscribe(
          settings.selectedSheets,
          settings.dailyProblems,
          settings.preferredTime
        );
        
        // Update local state immediately to reflect the change
        setSettings(prev => ({
          ...prev,
          emailNotifications: true
        }));
        
        toast.success('Successfully subscribed to daily emails!');
        
        // Show message if immediate email was sent
        if (subscribeResult.immediateSent) {
          toast.success('🚀 Your first email is being sent now since it\'s within your preferred time!');
        }
      } else {
        // If unsubscribing, use the updateSubscription API
        await updateSubscription(false);
        
        // Update local state immediately to reflect the change
        setSettings(prev => ({
          ...prev,
          emailNotifications: false
        }));
      }
      
      // Force refresh user data from server to ensure we get the latest state
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for backend to process
      await refreshUserData(); // Refresh user data from server
      
    } catch (error: any) {
      console.error('Subscription toggle error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update subscription';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      
      if (settings.emailNotifications) {
        // If subscribed, use the subscribe API to update all preferences
        const subscribeResult = await emailAPI.subscribe(
          settings.selectedSheets,
          settings.dailyProblems,
          settings.preferredTime
        );
        
        // Show message if immediate email was sent
        if (subscribeResult.immediateSent) {
          toast.success('🚀 Preferences updated and email sent now since it\'s within your preferred time!');
        }
      } else {
        // If not subscribed, use the preferences API to save preferences
        const updateResult = await emailAPI.updatePreferences({
          selectedSheets: settings.selectedSheets,
          dailyProblems: settings.dailyProblems,
          preferredTime: settings.preferredTime
        });
        
        // Show message if immediate email was sent (shouldn't happen when not subscribed, but just in case)
        if (updateResult.immediateSent) {
          toast.success('🚀 Preferences updated and email sent now since it\'s within your preferred time!');
        }
      }
      
      toast.success('Preferences saved successfully!');
      
      // Refresh user data after a delay to ensure backend consistency
      setTimeout(() => {
        if (user) {
          // Update user context to reflect the changes
          setSettings({
            emailNotifications: settings.emailNotifications,
            dailyProblems: settings.dailyProblems,
            preferredTime: settings.preferredTime,
            selectedSheets: settings.selectedSheets,
          });
        }
      }, 200);
      
    } catch (error: any) {
      console.error('Save preferences error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save preferences';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your problem history? This will allow previously sent problems to be sent again.')) {
      return;
    }

    try {
      setClearingHistory(true);
      const result = await emailAPI.clearProblemHistory();
      toast.success(`History cleared! ${result.clearedCount} problems removed from your sent list.`);
      
      // Reload stats
      const stats = await emailAPI.getSentStats();
      setSentStats(stats);
    } catch (error: any) {
      console.error('Clear history error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to clear history';
      toast.error(errorMessage);
    } finally {
      setClearingHistory(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Bell className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-slate-800">Email Notification Settings</h2>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Select which problem sheets you want to receive problems from</li>
          <li>2. Set your preferred time and daily problem count</li>
          <li>3. Click "Subscribe" to start receiving daily email recommendations</li>
        </ol>
      </div>

      {/* Subscription Status */}
      <div className="p-4 bg-slate-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {settings.emailNotifications ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
            <div>
              <p className="font-medium text-slate-800">
                {settings.emailNotifications ? 'Subscribed to Daily Emails' : 'Email Notifications'}
              </p>
              <p className="text-sm text-slate-600">
                {settings.emailNotifications 
                  ? 'You will receive daily problem recommendations' 
                  : settings.selectedSheets.length > 0 
                    ? 'Enable to receive daily problem recommendations from selected sheets'
                    : 'Select sheets below, then subscribe to receive daily recommendations'
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleSubscriptionToggle}
            disabled={saving || (!settings.emailNotifications && settings.selectedSheets.length === 0)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              settings.emailNotifications
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? 'Updating...' : settings.emailNotifications ? 'Unsubscribe' : 'Subscribe'}
          </button>
        </div>
      </div>

      {/* Email Settings */}
      <div className="space-y-4">
        {/* Always show sheet selection, but disable subscribe button if none selected */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <h3 className="font-medium text-slate-800 mb-3">Select Problem Sheets</h3>
          <p className="text-sm text-slate-600 mb-3">
            Choose which problem sheets you'd like to receive daily recommendations from.
          </p>
          {loadingSheets ? (
            <div className="text-slate-500">Loading sheets...</div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sheets.map((sheet) => (
                <label key={sheet.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.selectedSheets.includes(sheet.id)}
                    onChange={() => handleSheetToggle(sheet.id)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-slate-800">{sheet.title}</p>
                    <p className="text-sm text-slate-600">{sheet.description}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          
          {settings.selectedSheets.length === 0 ? (
            <p className="text-sm text-red-600 text-center mt-2">
              Please select at least one sheet to enable email subscriptions.
            </p>
          ) : !settings.emailNotifications ? (
            <p className="text-sm text-green-600 text-center mt-2">
              ✓ {settings.selectedSheets.length} sheet{settings.selectedSheets.length > 1 ? 's' : ''} selected. Ready to subscribe!
            </p>
          ) : (
            <p className="text-sm text-blue-600 text-center mt-2">
              ✓ Receiving emails from {settings.selectedSheets.length} selected sheet{settings.selectedSheets.length > 1 ? 's' : ''}.
            </p>
          )}
        </div>

        {/* Email Preferences - Always visible */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center space-x-3 mb-3">
            <BookOpen className="w-5 h-5 text-slate-600" />
            <p className="font-medium text-slate-800">Daily Problems</p>
          </div>
          <p className="text-sm text-slate-600 mb-2">How many problems would you like to receive daily?</p>
          <select
            value={settings.dailyProblems}
            onChange={(e) => setSettings({ ...settings, dailyProblems: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={1}>1 problem per day</option>
            <option value={2}>2 problems per day</option>
            <option value={3}>3 problems per day</option>
            <option value={5}>5 problems per day</option>
          </select>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center space-x-3 mb-3">
            <Clock className="w-5 h-5 text-slate-600" />
            <p className="font-medium text-slate-800">Preferred Time</p>
          </div>
          <p className="text-sm text-slate-600 mb-2">What time would you like to receive daily emails?</p>
          <input
            type="time"
            value={settings.preferredTime}
            onChange={(e) => {
              // Normalize time to HH:MM format (remove seconds if present)
              const normalizedTime = e.target.value.split(':').slice(0, 2).join(':');
              setSettings({ ...settings, preferredTime: normalizedTime });
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Show subscription status if subscribed */}
        {settings.emailNotifications && (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Email Notifications Active</p>
                <p className="text-sm text-green-600">You're receiving daily problem recommendations</p>
              </div>
            </div>
            <div className="text-green-600 font-medium">✓ Enabled</div>
          </div>
        )}

        {/* Sent Problems History - show if subscribed */}
        {settings.emailNotifications && sentStats && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <CheckCircle className="w-5 h-5 text-yellow-600" />
              <p className="font-medium text-yellow-800">Problem History</p>
            </div>
            <div className="space-y-2 text-sm text-yellow-700">
              <p>Total problems sent: <span className="font-medium">{sentStats.totalSent}</span></p>
              <p>Unique problems: <span className="font-medium">{sentStats.uniqueProblems}</span></p>
              {sentStats.firstSent && (
                <p>First sent: <span className="font-medium">{new Date(sentStats.firstSent).toLocaleDateString()}</span></p>
              )}
              {sentStats.lastSent && (
                <p>Last sent: <span className="font-medium">{new Date(sentStats.lastSent).toLocaleDateString()}</span></p>
              )}
              {sentStats.lastHistoryCleared && (
                <p>History last cleared: <span className="font-medium">{new Date(sentStats.lastHistoryCleared).toLocaleDateString()}</span></p>
              )}
            </div>
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
              <p className="text-sm text-yellow-800 mb-2">
                <strong>Fresh Start:</strong> Clear your history to receive previously sent problems again.
              </p>
              <button
                onClick={handleClearHistory}
                disabled={clearingHistory}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearingHistory ? 'Clearing...' : 'Clear History & Start Fresh'}
              </button>
            </div>
          </div>
        )}

        {/* Save button - always visible for updating preferences */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};