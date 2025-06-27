import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, emailAPI } from '../services/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  isSubscribed: boolean;
  streak: number;
  totalSolved: number;
  role: 'user' | 'admin';
  preferences: {
    emailNotifications: boolean;
    dailyProblems: number;
    preferredTime: string;
    selectedSheets: string[];
  };
}

interface UserContextType {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<void>;
  updateSubscription: (isSubscribed: boolean) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isLoggedIn = user !== null && !!localStorage.getItem('authToken');

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          await refreshUserData();
        } catch (error) {
          console.error('Failed to load user data:', error);
          localStorage.removeItem('authToken');
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUserData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshUserData = async () => {
    try {
      const [profileResponse, preferencesResponse] = await Promise.all([
        authAPI.getProfile().catch(() => null),
        emailAPI.getEmailPreferences().catch(() => ({ 
          emailNotifications: false, 
          dailyProblems: 3, 
          preferredTime: '09:00', 
          selectedSheets: [] 
        }))
      ]);

      if (!profileResponse) {
        throw new Error('Failed to get user profile');
      }

      // Use emailNotifications as the single source of truth for subscription status
      setUser({
        id: profileResponse.id,
        name: profileResponse.name,
        email: profileResponse.email,
        joinDate: profileResponse.joinDate || new Date().toISOString(),
        isSubscribed: preferencesResponse.emailNotifications,
        streak: profileResponse.streak || 0,
        totalSolved: profileResponse.totalSolved || 0,
        role: profileResponse.role || 'user',
        preferences: {
          emailNotifications: preferencesResponse.emailNotifications,
          dailyProblems: preferencesResponse.dailyProblems,
          preferredTime: preferencesResponse.preferredTime,
          selectedSheets: preferencesResponse.selectedSheets
        }
      });
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authAPI.login(email, password);
      
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        await refreshUserData();
        toast.success('Successfully logged in!');
      } else {
        throw new Error('No token received');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authAPI.register(name, email, password);
      
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        await refreshUserData();
        toast.success('Successfully registered and logged in!');
      } else {
        throw new Error('No token received');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    toast.success('Successfully logged out!');
  };

  const updatePreferences = async (newPreferences: Partial<User['preferences']>) => {
    if (!user) {
      toast.error('Please log in to update preferences');
      return;
    }

    try {
      // If email notifications are being updated, use the subscription API
      if ('emailNotifications' in newPreferences) {
        await emailAPI.updateSubscription(newPreferences.emailNotifications!);
      }

      // For other preferences, use the appropriate API based on subscription status
      const otherPrefs = Object.fromEntries(
        Object.entries(newPreferences).filter(([key]) => key !== 'emailNotifications')
      );

      if (Object.keys(otherPrefs).length > 0) {
        const currentSubscriptionStatus = newPreferences.emailNotifications ?? user.preferences.emailNotifications;
        
        if (currentSubscriptionStatus) {
          // If subscribed, use the subscribe API to update all preferences
          await emailAPI.subscribe(
            newPreferences.selectedSheets || user.preferences.selectedSheets,
            newPreferences.dailyProblems || user.preferences.dailyProblems,
            newPreferences.preferredTime || user.preferences.preferredTime
          );
        } else {
          // If not subscribed, use the preferences API to save for later
          await emailAPI.updatePreferences(otherPrefs);
        }
      }

      // Update local state with consistent subscription status
      const updatedEmailNotifications = newPreferences.emailNotifications ?? user.preferences.emailNotifications;
      
      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          ...newPreferences
        },
        isSubscribed: updatedEmailNotifications
      });

      // Refresh user data from server to ensure consistency after a delay
      setTimeout(() => {
        refreshUserData().catch(console.error);
      }, 300);

    } catch (error: any) {
      console.error('Update preferences error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update preferences';
      toast.error(errorMessage);
      throw error;
    }
  };

  const updateSubscription = async (isSubscribed: boolean) => {
    if (!user) {
      toast.error('Please log in to update subscription');
      return;
    }

    try {
      if (isSubscribed) {
        // For subscribing, use current user preferences for selected sheets
        await emailAPI.subscribe(
          user.preferences.selectedSheets.length > 0 ? user.preferences.selectedSheets : [],
          user.preferences.dailyProblems,
          user.preferences.preferredTime
        );
      } else {
        await emailAPI.updateSubscription(false);
      }

      // Update local state immediately with consistent subscription status
      setUser({
        ...user,
        isSubscribed,
        preferences: {
          ...user.preferences,
          emailNotifications: isSubscribed
        }
      });

      const action = isSubscribed ? 'subscribed to' : 'unsubscribed from';
      toast.success(`Successfully ${action} daily emails!`);

      // Refresh user data from server after a short delay to ensure consistency
      setTimeout(() => {
        refreshUserData().catch(console.error);
      }, 300);

    } catch (error: any) {
      console.error('Update subscription error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update subscription';
      toast.error(errorMessage);
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      isLoggedIn,
      loading,
      login,
      register,
      logout,
      updatePreferences,
      updateSubscription,
      refreshUserData
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
