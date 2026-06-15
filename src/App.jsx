import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { getSession } from './lib/auth';

import Login           from './pages/Login';
import Setup           from './pages/Setup';
import AIAnalysis      from './components/AIAnalysis';
import Profile         from './components/Profile';
import MultiCrop       from './components/MultiCrop';
import Layout          from './components/Layout';
import AnalysisResults from './components/AnalysisResults';

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
      </Route>

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
      <Router>
        <AppContent />
      </Router>
    </LanguageProvider>
  );
}

export default App;
