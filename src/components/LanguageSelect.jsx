import React from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * LanguageSelect Component
 * 
 * This is the first screen users see on app load.
 * Allows users to select between English and Hindi.
 * The selection is stored in localStorage and affects all UI text throughout the app.
 */
const LanguageSelect = () => {
  const { changeLanguage, t } = useLanguage();

  const handleLanguageSelect = (lang) => {
    changeLanguage(lang);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-12">
          Select Language
        </h1>
        <div className="flex gap-6">
          {/* English Button */}
          <button
            onClick={() => handleLanguageSelect('en')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 px-12 rounded-xl text-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            English
          </button>
          
          {/* Hindi Button */}
          <button
            onClick={() => handleLanguageSelect('hi')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-6 px-12 rounded-xl text-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            हिन्दी
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelect;
