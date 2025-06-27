import React, { useState, useEffect } from 'react';
import { Bell, Mail, Clock, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { useUserContext } from '../contexts/UserContext';
import { sheetsAPI } from '../services/api';
import toast from 'react-hot-toast';

interface Sheet {
  id: string;
  title: string;
  description: string;
  difficulty?: string;
  author?: string;
}

export const NotificationSettings: React.FC = () => {
  const { user, updatePreferences, updateSubscription, loading } = useUserContext();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    emailNotifications: user?.preferences.emailNotifications ?? false,
    dailyProblems: user?.preferences.dailyProblems ?? 3,
    preferredTime: user?.preferences.preferredTime ?? '09:00',
    selectedSheets: user?.preferences.selectedSheets ?? [],
  });

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
  }, [user]);

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
      await updateSubscription(!settings.emailNotifications);
      setSettings(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }));
    } catch (error) {
      // Error is already handled in context
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await updatePreferences(settings);
    } catch (error) {
      // Error is already handled in context
    } finally {
      setSaving(false);
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
                {settings.emailNotifications ? 'Subscribed to Daily Emails' : 'Not Subscribed'}
              </p>
              <p className="text-sm text-slate-600">
                {settings.emailNotifications 
                  ? 'You will receive daily problem recommendations' 
                  : 'Enable to receive daily problem recommendations'
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleSubscriptionToggle}
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              settings.emailNotifications
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50`}
          >
            {saving ? 'Updating...' : settings.emailNotifications ? 'Unsubscribe' : 'Subscribe'}
          </button>
        </div>
      </div>

      {/* Email Settings (only show if subscribed) */}
      {settings.emailNotifications && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-slate-600" />
              <div>
                <p className="font-medium text-slate-800">Email Notifications</p>
                <p className="text-sm text-slate-600">Daily problem recommendations via email</p>
              </div>
            </div>
            <div className="text-green-600 font-medium">Enabled</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <BookOpen className="w-5 h-5 text-slate-600" />
              <p className="font-medium text-slate-800">Daily Problems</p>
            </div>
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
            <input
              type="time"
              value={settings.preferredTime}
              onChange={(e) => setSettings({ ...settings, preferredTime: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sheet Selection */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-medium text-slate-800 mb-3">Select Problem Sheets</h3>
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
          </div>

          <button
            onClick={handleSave}
            disabled={saving || settings.selectedSheets.length === 0}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>

          {settings.selectedSheets.length === 0 && (
            <p className="text-sm text-red-600 text-center">
              Please select at least one sheet to receive problem recommendations.
            </p>
          )}
        </div>
      )}
    </div>
  );
};