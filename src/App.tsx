import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { UserProvider } from './contexts/UserContext';
import { ProblemProvider } from './contexts/ProblemContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Sheets } from './pages/Sheets';
import { SheetDetail } from './pages/SheetDetail';
import { Playground } from './pages/Playground';
import { Profile } from './pages/Profile';
import { Unsubscribe } from './pages/Unsubscribe';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminSheets } from './pages/admin/AdminSheets';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';

function App() {
  return (
    <UserProvider>
      <ProblemProvider>
        <Router>
          <div className="App">
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              
              {/* Protected user routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="sheets" element={<Sheets />} />
                <Route path="sheets/:sheetId" element={<SheetDetail />} />
                <Route path="playground" element={<Playground />} />
                <Route path="profile" element={<Profile />} />
              </Route>
              
              {/* Protected admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <Layout isAdmin />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="sheets" element={<AdminSheets />} />
                <Route path="analytics" element={<AdminAnalytics />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </ProblemProvider>
    </UserProvider>
  );
}

export default App;