import React, { memo } from 'react';
import { Bell, CheckCircle, XCircle, Mail } from 'lucide-react';
import { useUserContext } from '../contexts/UserContext';

interface NotificationQuickSettingsProps {
  onOpenFull: () => void;
}

export const NotificationQuickSettings: React.FC<NotificationQuickSettingsProps> = memo(({ onOpenFull }) => {
  const { user } = useUserContext();

  const isSubscribed = user?.preferences?.emailNotifications || false;
  const dailyProblems = user?.preferences?.dailyProblems || 1;
  const selectedSheets = user?.preferences?.selectedSheets || [];

  return (
    <div className="space-y-3">
      {/* Status Overview */}
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
        <div className="flex items-center space-x-3">
          {isSubscribed ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-800">
              {isSubscribed ? 'Email Notifications Active' : 'Email Notifications Disabled'}
            </p>
            <p className="text-xs text-slate-600">
              {isSubscribed 
                ? `Receiving ${dailyProblems} problem${dailyProblems > 1 ? 's' : ''} daily from ${selectedSheets.length} sheet${selectedSheets.length !== 1 ? 's' : ''}`
                : 'Click below to start receiving daily problem recommendations'
              }
            </p>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-red-500'}`}></div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-2">
        <button
          onClick={onOpenFull}
          className="flex-1 py-2 px-3 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Bell className="w-4 h-4" />
          <span>{isSubscribed ? 'Manage' : 'Setup'} Notifications</span>
        </button>
        {isSubscribed && (
          <div className="flex items-center justify-center px-3 py-2 bg-green-50 text-green-600 text-xs rounded-lg">
            <Mail className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {isSubscribed && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-blue-50 rounded text-center">
            <p className="font-medium text-blue-800">{dailyProblems}</p>
            <p className="text-blue-600">Daily Problems</p>
          </div>
          <div className="p-2 bg-green-50 rounded text-center">
            <p className="font-medium text-green-800">{selectedSheets.length}</p>
            <p className="text-green-600">Active Sheets</p>
          </div>
        </div>
      )}
    </div>
  );
});

NotificationQuickSettings.displayName = 'NotificationQuickSettings';
