import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';
import { UserProvider } from './contexts/UserContext';
import { ProblemProvider } from './contexts/ProblemContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load heavy components
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Register = lazy(() => import('./pages/Register').then(module => ({ default: module.Register })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Sheets = lazy(() => import('./pages/Sheets').then(module => ({ default: module.Sheets })));
const SheetDetail = lazy(() => import('./pages/SheetDetail').then(module => ({ default: module.SheetDetail })));
const Playground = lazy(() => import('./pages/Playground').then(module => ({ default: module.Playground })));
const Interview = lazy(() => import('./pages/Interview').then(module => ({ default: module.Interview })));
const InterviewSession = lazy(() => import('./pages/InterviewSession').then(module => ({ default: module.InterviewSession })));
const InterviewReport = lazy(() => import('./pages/InterviewReport'));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe').then(module => ({ default: module.Unsubscribe })));

// Admin pages - lazy loaded
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers').then(module => ({ default: module.AdminUsers })));
const AdminEmailLogs = lazy(() => import('./pages/admin/AdminEmailLogs').then(module => ({ default: module.AdminEmailLogs })));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics').then(module => ({ default: module.AdminAnalytics })));

function App() {
  return (
    <ErrorBoundary>
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
              <Route path="/login" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Login />
                </Suspense>
              } />
              <Route path="/register" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Register />
                </Suspense>
              } />
              <Route path="/unsubscribe" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Unsubscribe />
                </Suspense>
              } />
              
              {/* Interview routes */}
              <Route path="/interview" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Interview />
                </Suspense>
              } />
              <Route path="/interview/session/:sessionId" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <InterviewSession />
                </Suspense>
              } />
              <Route path="/interview/:sessionId/report" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <InterviewReport />
                </Suspense>
              } />
              
              {/* Protected user routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <Dashboard />
                  </Suspense>
                } />
                <Route path="sheets" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <Sheets />
                  </Suspense>
                } />
                <Route path="sheets/:sheetId" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <SheetDetail />
                  </Suspense>
                } />
                <Route path="playground" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <Playground />
                  </Suspense>
                } />
                <Route path="profile" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <Profile />
                  </Suspense>
                } />
              </Route>
              
              {/* Protected admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <Layout isAdmin />
                </ProtectedRoute>
              }>
                <Route index element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminDashboard />
                  </Suspense>
                } />
                <Route path="users" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminUsers />
                  </Suspense>
                } />
                <Route path="email-logs" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminEmailLogs />
                  </Suspense>
                } />
                <Route path="analytics" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminAnalytics />
                  </Suspense>
                } />
              </Route>
            </Routes>
          </div>
        </Router>
      </ProblemProvider>
    </UserProvider>
    </ErrorBoundary>
  );
}

export default App;