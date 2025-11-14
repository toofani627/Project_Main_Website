import React, { createContext, useState, useContext, useEffect } from 'react';

// Language Context for multilingual support (English, Hindi & Tamil)
const LanguageContext = createContext();

// All translations for the entire application
const translations = {
  en: {
    // Language Selection
    selectLanguage: 'Select Language',
    english: 'English',
    hindi: 'हिन्दी',
    tamil: 'தமிழ்',
    
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
    noDataAvailable: 'No data available. Click "Get Data" to fetch from device.',
    
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
    phInstruction: 'Place the pH paper in the soil and match the color with the box',
    
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
    deviceControl: 'डिवाइस कंट्रोल',
    deviceControlDesc: 'जुड़े IoT डिवाइस को देखें और कंट्रोल करें',
    aiAnalysis: 'AI जांच',
    aiAnalysisDesc: 'AI की मदद से खेत का डेटा देखें',
    backToMenu: '← मेनू पर वापस',
    
    // Device Control
    enterIP: 'डिवाइस IP एड्रेस लिखें',
    ipPlaceholder: 'जैसे: 192.168.1.100',
    connect: 'जोड़ें',
    cancel: 'रद्द करें',
    
    // AI Analysis Dashboard
    aiAnalysisDashboard: 'AI जांच डैशबोर्ड',
    deviceInformation: 'डिवाइस की जानकारी',
    environmentalData: 'खेत का डेटा',
    device: 'डिवाइस',
    temperature: 'तापमान (°C)',
    humidity: 'नमी (%)',
    soil: 'मिट्टी नमी (%)',
    light: 'रोशनी',
    gps: 'लोकेशन',
    timestamp: 'समय',
    
    // Buttons
    getData: 'डेटा लाएं',
    exportJSON: 'JSON सेव करें',
    clearData: 'डेटा मिटाएं',
    runAIAnalysis: 'AI से जांच करें',
    
    // Status Log
    statusLog: 'स्टेटस',
    successfullyFetched: '✓ 3 डिवाइस से डेटा मिल गया',
    dataUpdated: '📊 डेटा अपडेट हुआ',
    readyForAnalysis: '→ AI जांच के लिए तैयार',
    noDataAvailable: 'डेटा नहीं है। "डेटा लाएं" बटन दबाएं।',
    
    // Crop Selection
    selectCropType: 'फसल चुनें',
    chooseCrop: 'फसल चुनें...',
    wheat: 'गेहूं',
    rice: 'चावल',
    maize: 'मक्का',
    sugarcane: 'गन्ना',
    cotton: 'कपास',
    
    // pH Scale
    soilPHScale: 'मिट्टी pH लेवल',
    phNote: 'pH - खट्टा (लाल) से साधारण (हरा) से खारी (नीला)',
    phInstruction: 'pH पेपर को मिट्टी में रखें और रंग को बॉक्स से मिलाएं',
    
    // Additional Query
    additionalQuery: 'और सवाल',
    queryPlaceholder: 'फसल या मौसम के बारे में कोई सवाल लिखें...',
    
    // Help
    help: '?',
  },
  ta: {
    // Language Selection
    selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    english: 'English',
    hindi: 'हिन्दी',
    tamil: 'தமிழ்',
    
    // Main Menu
    mainMenu: 'பிரதான மெனு',
    deviceControl: 'சாதன கட்டுப்பாடு',
    deviceControlDesc: 'இணைக்கப்பட்ட IoT சாதனங்களைப் பார்க்கவும் கட்டுப்படுத்தவும்',
    aiAnalysis: 'AI பகுப்பாய்வு',
    aiAnalysisDesc: 'AI உதவியுடன் வயல் தரவைப் பார்க்கவும்',
    backToMenu: '← மெனுவுக்குத் திரும்பு',
    
    // Device Control
    enterIP: 'சாதன IP முகவரியை உள்ளிடவும்',
    ipPlaceholder: 'எ.கா: 192.168.1.100',
    connect: 'இணைக்கவும்',
    cancel: 'ரத்து செய்',
    
    // AI Analysis Dashboard
    aiAnalysisDashboard: 'AI பகுப்பாய்வு டாஷ்போர்டு',
    deviceInformation: 'சாதன தகவல்',
    environmentalData: 'வயல் தரவு',
    device: 'சாதனம்',
    temperature: 'வெப்பநிலை (°C)',
    humidity: 'ஈரப்பதம் (%)',
    soil: 'மண் ஈரப்பதம் (%)',
    light: 'ஒளி',
    gps: 'இடம்',
    timestamp: 'நேரம்',
    
    // Buttons
    getData: 'தரவைப் பெறவும்',
    exportJSON: 'JSON சேமிக்கவும்',
    clearData: 'தரவை அழிக்கவும்',
    runAIAnalysis: 'AI பகுப்பாய்வு செய்யவும்',
    
    // Status Log
    statusLog: 'நிலை',
    successfullyFetched: '✓ 3 சாதனங்களிலிருந்து தரவு பெறப்பட்டது',
    dataUpdated: '📊 தரவு புதுப்பிக்கப்பட்டது',
    readyForAnalysis: '→ AI பகுப்பாய்வுக்கு தயார்',
    noDataAvailable: 'தரவு இல்லை. "தரவைப் பெறவும்" பொத்தானை அழுத்தவும்.',
    
    // Crop Selection
    selectCropType: 'பயிரைத் தேர்ந்தெடுக்கவும்',
    chooseCrop: 'பயிரைத் தேர்ந்தெடுக்கவும்...',
    wheat: 'கோதுமை',
    rice: 'நெல்',
    maize: 'சோளம்',
    sugarcane: 'கரும்பு',
    cotton: 'பருத்தி',
    
    // pH Scale
    soilPHScale: 'மண் pH அளவு',
    phNote: 'pH - அமிலம் (சிவப்பு) முதல் நடுநிலை (பச்சை) முதல் காரம் (நீலம்)',
    phInstruction: 'pH காகிதத்தை மண்ணில் வைத்து நிறத்தை பெட்டியுடன் பொருத்தவும்',
    
    // Additional Query
    additionalQuery: 'கூடுதல் கேள்வி',
    queryPlaceholder: 'பயிர் அல்லது வானிலை பற்றி ஏதேனும் கேள்விகளை எழுதவும்...',
    
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
    // Only return saved language if it's valid ('en', 'hi', or 'ta'), otherwise return null
    return (savedLanguage === 'en' || savedLanguage === 'hi' || savedLanguage === 'ta') ? savedLanguage : null;
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
