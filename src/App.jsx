import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import LanguageSelect from './components/LanguageSelect';
import MainMenu from './components/MainMenu';
import AIAnalysis from './components/AIAnalysis';

/**
 * AppContent Component
 * 
 * Handles routing logic based on language selection:
 * - If no language is selected, show LanguageSelect screen
 * - Once language is selected, show MainMenu and allow navigation
 */
const AppContent = () => {
  const { language } = useLanguage();

  // If no language selected yet, show language selection screen
  if (!language) {
    return <LanguageSelect />;
  }

  // Once language is selected, show main app with routing
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/ai-analysis" element={<AIAnalysis />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

/**
 * Main App Component
 * 
 * Wraps entire application with LanguageProvider context.
 * This ensures all components have access to language state and translations.
 */
function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
