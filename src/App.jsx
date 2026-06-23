import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { getSession } from './lib/auth';

import Login           from './pages/Login';
import Setup           from './pages/Setup';
import AIAnalysis      from './components/AIAnalysis';
import Profile         from './components/Profile';
import MultiCrop       from './components/MultiCrop';
import Layout          from './components/Layout';
import AnalysisResults from './components/AnalysisResults';
import About           from './pages/About';
import MapPage         from './pages/Map';
import AdminDashboard  from './pages/AdminDashboard';
import MarketAnalytics from './pages/MarketAnalytics';

/** Redirects to /login if not authenticated */
const ProtectedRoute = ({ children }) => {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  return children;
};

const AppContent = () => {
  const session = getSession();

  return (
    <Routes>
      {/* Public: login */}
      <Route
        path="/login"
        element={session ? <Navigate to="/setup" replace /> : <Login />}
      />

      {/* After login: farm setup (new users) / skip for returning users */}
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <Setup />
          </ProtectedRoute>
        }
      />

      {/* Protected app routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/ai-analysis"      element={<AIAnalysis />} />
        <Route path="/analysis-results" element={<AnalysisResults />} />
        <Route path="/profile"          element={<Profile />} />
        <Route path="/multi-crop"       element={<MultiCrop />} />
        <Route path="/map"              element={<MapPage />} />
        <Route path="/about"            element={<About />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/admin-market" element={<MarketAnalytics />} />

      {/* Catch-all */}
      <Route
        path="*"
        element={session ? <Navigate to="/setup" replace /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
};

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
