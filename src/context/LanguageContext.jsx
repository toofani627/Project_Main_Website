import React, { createContext, useState, useContext, useEffect } from 'react';

// Language Context for bilingual support (English & Hindi)
const LanguageContext = createContext();

// All translations for the entire application
const translations = {
  en: {
    // Language Selection
    selectLanguage: 'Select Language',
    english: 'English',
    hindi: 'हिन्दी',
    
    // Main Menu
    mainMenu: 'Main Menu',
    deviceControl: 'Device Control',
    deviceControlDesc: 'Monitor and control connected IoT devices',
    aiAnalysis: 'AI Analysis',
    aiAnalysisDesc: 'Analyze environmental data with AI insights',
    backToMenu: '← Back to Menu',
    
    // Device Control
    enterIP: 'Enter Device IP Address',
    ipPlaceholder: 'e.g., 192.168.1.100',
    connect: 'Connect',
    cancel: 'Cancel',
    
    // AI Analysis Dashboard
    aiAnalysisDashboard: 'AI Analysis Dashboard',
    deviceInformation: 'Device Information',
    environmentalData: 'Environmental Data',
    device: 'Device',
    temperature: 'Temperature (°C)',
    humidity: 'Humidity (%)',
    soil: 'Soil (%)',
    light: 'Light',
    gps: 'GPS',
    timestamp: 'Timestamp',
    
    // Buttons
    getData: 'Get Data',
    exportJSON: 'Export JSON',
    clearData: 'Clear Data',
    runAIAnalysis: 'Run AI Analysis',
    
    // Status Log
    statusLog: 'Status Log',
    successfullyFetched: '✓ Successfully fetched data from 3 devices',
    dataUpdated: '📊 Data updated at',
    readyForAnalysis: '→ Ready for AI analysis',
    
    // Crop Selection
    selectCropType: 'Select Crop Type',
    chooseCrop: 'Choose a crop...',
    wheat: 'Wheat',
    rice: 'Rice',
    maize: 'Maize',
    sugarcane: 'Sugarcane',
    cotton: 'Cotton',
    
    // pH Scale
    soilPHScale: 'Soil pH Scale',
    phNote: 'pH values from acidic (red) to neutral (green) to alkaline (blue)',
    
    // Additional Query
    additionalQuery: 'Additional Query',
    queryPlaceholder: 'Enter any specific questions or observations about your crops or environmental conditions...',
    
    // Help
    help: '?',
  },
  hi: {
    // Language Selection
    selectLanguage: 'भाषा चुनें',
    english: 'English',
    hindi: 'हिन्दी',
    
    // Main Menu
    mainMenu: 'मुख्य मेनू',
    deviceControl: 'उपकरण नियंत्रण',
    deviceControlDesc: 'कनेक्टेड IoT उपकरणों की निगरानी और नियंत्रण करें',
    aiAnalysis: 'एआई विश्लेषण',
    aiAnalysisDesc: 'एआई अंतर्दृष्टि के साथ पर्यावरणीय डेटा का विश्लेषण करें',
    backToMenu: '← मेनू पर वापस जाएं',
    
    // Device Control
    enterIP: 'डिवाइस आईपी पता दर्ज करें',
    ipPlaceholder: 'उदाहरण: 192.168.1.100',
    connect: 'कनेक्ट करें',
    cancel: 'रद्द करें',
    
    // AI Analysis Dashboard
    aiAnalysisDashboard: 'एआई विश्लेषण डैशबोर्ड',
    deviceInformation: 'उपकरण की जानकारी',
    environmentalData: 'पर्यावरणीय डेटा',
    device: 'उपकरण',
    temperature: 'तापमान (°C)',
    humidity: 'आर्द्रता (%)',
    soil: 'मिट्टी (%)',
    light: 'प्रकाश',
    gps: 'जीपीएस',
    timestamp: 'समय',
    
    // Buttons
    getData: 'डेटा प्राप्त करें',
    exportJSON: 'JSON निर्यात करें',
    clearData: 'डेटा साफ करें',
    runAIAnalysis: 'एआई विश्लेषण चलाएं',
    
    // Status Log
    statusLog: 'स्थिति लॉग',
    successfullyFetched: '✓ 3 उपकरणों से डेटा सफलतापूर्वक प्राप्त किया',
    dataUpdated: '📊 डेटा अपडेट किया गया',
    readyForAnalysis: '→ एआई विश्लेषण के लिए तैयार',
    
    // Crop Selection
    selectCropType: 'फसल का प्रकार चुनें',
    chooseCrop: 'एक फसल चुनें...',
    wheat: 'गेहूं',
    rice: 'चावल',
    maize: 'मक्का',
    sugarcane: 'गन्ना',
    cotton: 'कपास',
    
    // pH Scale
    soilPHScale: 'मिट्टी pH स्केल',
    phNote: 'pH मान अम्लीय (लाल) से तटस्थ (हरा) से क्षारीय (नीला) तक',
    
    // Additional Query
    additionalQuery: 'अतिरिक्त प्रश्न',
    queryPlaceholder: 'अपनी फसलों या पर्यावरणीय परिस्थितियों के बारे में कोई विशिष्ट प्रश्न या टिप्पणी दर्ज करें...',
    
    // Help
    help: '?',
  },
};

export const LanguageProvider = ({ children }) => {
  // Check localStorage for saved language preference, default to null to show language selection
  const [language, setLanguage] = useState(() => {
    // Version check - force language selection for new deployment
    const APP_VERSION = '2.0'; // Increment this to force language reselection
    const savedVersion = localStorage.getItem('appVersion');
    
    // If version doesn't match, clear language and force reselection
    if (savedVersion !== APP_VERSION) {
      localStorage.removeItem('language');
      localStorage.setItem('appVersion', APP_VERSION);
      return null;
    }
    
    const savedLanguage = localStorage.getItem('language');
    // Only return saved language if it's valid ('en' or 'hi'), otherwise return null
    return (savedLanguage === 'en' || savedLanguage === 'hi') ? savedLanguage : null;
  });

  // Save language preference to localStorage whenever it changes
  useEffect(() => {
    if (language) {
      localStorage.setItem('language', language);
    }
  }, [language]);

  // Get translated text based on current language
  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
