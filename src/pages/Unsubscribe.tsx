import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, XCircle } from 'lucide-react';
import { emailAPI } from '../services/api';
import toast from 'react-hot-toast';

export const Unsubscribe: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleUnsubscribe = async () => {
    try {
      setLoading(true);
      setError('');
      
      await emailAPI.unsubscribe();
      
      setSuccess(true);
      toast.success('Successfully unsubscribed from daily emails!');
    } catch (err: any) {
      console.error('Unsubscribe error:', err);
      setError(err.response?.data?.error || 'Failed to unsubscribe. Please try again.');
      toast.error('Failed to unsubscribe');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToProfile = () => {
    navigate('/profile');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <Mail className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Email Subscription Management
          </h1>
          <p className="text-slate-600">
            Manage your daily problem email notifications
          </p>
        </div>

        {!success ? (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                You're about to unsubscribe from daily problem recommendations. 
                You can always re-subscribe later from your profile settings.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleUnsubscribe}
                disabled={loading}
                className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Unsubscribing...' : 'Unsubscribe from Daily Emails'}
              </button>

              <button
                onClick={handleGoToProfile}
                className="w-full py-3 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Manage Preferences Instead
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                Successfully Unsubscribed
              </h2>
              <p className="text-slate-600 mb-4">
                You will no longer receive daily problem recommendation emails.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGoToProfile}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Profile Settings
              </button>

              <button
                onClick={handleGoHome}
                className="w-full py-3 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500">
            Need help? Contact us at support@interviewprep.com
          </p>
        </div>
      </div>
    </div>
  );
};
