import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

/**
 * MainMenu Component
 * 
 * Displays two main options:
 * 1. Device Control - Prompts for IP and redirects to device webpage
 * 2. AI Analysis - Opens the AI analysis dashboard
 * 
 * All text automatically switches based on selected language.
 */
const MainMenu = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showIPModal, setShowIPModal] = useState(false);
  const [ipAddress, setIpAddress] = useState('');

  const handleDeviceControl = () => {
    setShowIPModal(true);
  };

  const handleIPSubmit = () => {
    if (ipAddress.trim()) {
      // Redirect to device IP in new tab
      window.open(`http://${ipAddress}/website`, '_blank');
      setShowIPModal(false);
      setIpAddress('');
    }
  };

  const handleAIAnalysis = () => {
    navigate('/ai-analysis');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm py-6">
        <h1 className="text-4xl font-bold text-center text-gray-800">
          {t('mainMenu')}
        </h1>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-wrap justify-center gap-8 max-w-5xl mx-auto">
          
          {/* Device Control Card */}
          <div 
            onClick={handleDeviceControl}
            className="bg-white rounded-2xl shadow-lg p-8 w-full md:w-96 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-2xl"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-blue-100 rounded-full p-6">
                <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
              {t('deviceControl')}
            </h2>
            <p className="text-gray-600 text-center">
              {t('deviceControlDesc')}
            </p>
          </div>

          {/* AI Analysis Card */}
          <div 
            onClick={handleAIAnalysis}
            className="bg-white rounded-2xl shadow-lg p-8 w-full md:w-96 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-2xl"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-purple-100 rounded-full p-6">
                <svg className="w-16 h-16 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
              {t('aiAnalysis')}
            </h2>
            <p className="text-gray-600 text-center">
              {t('aiAnalysisDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* IP Address Modal */}
      {showIPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              {t('enterIP')}
            </h3>
            <input
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder={t('ipPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
              onKeyPress={(e) => e.key === 'Enter' && handleIPSubmit()}
            />
            <div className="flex gap-4">
              <button
                onClick={handleIPSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                {t('connect')}
              </button>
              <button
                onClick={() => {
                  setShowIPModal(false);
                  setIpAddress('');
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Button */}
      <button className="fixed bottom-6 right-6 bg-gray-800 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors duration-200">
        <span className="text-2xl">{t('help')}</span>
      </button>
    </div>
  );
};

export default MainMenu;
