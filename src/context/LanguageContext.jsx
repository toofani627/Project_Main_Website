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
    soil: 'Soil Moisture (Real)',
    soilTemp: 'Soil Temp (°C)',
    nitrogen: 'Nitrogen (Mock)',
    phosphorus: 'Phosphorus (Mock)',
    potassium: 'Potassium (Mock)',
    phLevel: 'pH Level (Mock)',
    electricalConductivity: 'EC (Mock)',
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
    successfullyFetched: 'Successfully fetched data from 3 devices',
    dataUpdated: 'Data updated at',
    readyForAnalysis: 'Ready for AI analysis',
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
    
    // Historical Farm Profile
    historicalFarmProfile: 'Historical Farm Profile',
    crop1Name: 'Previous Crop 1',
    crop1DateGrown: 'Crop 1 — Date Grown',
    crop2Name: 'Previous Crop 2',
    crop2DateGrown: 'Crop 2 — Date Grown',
    cropNamePlaceholder: 'e.g., Wheat, Rice',
    fertilizerUsed: 'Fertilizer Used',
    chooseFertilizer: 'Select fertilizer...',
    fertilizerNamePlaceholder: 'Enter fertilizer name',
    fertilizerAmount: 'Fertilizer Amount',
    fertilizerUnit: 'Fertilizer Unit',

    // Additional Query
    additionalQuery: 'Additional Query',
    queryPlaceholder: 'Enter any specific questions or observations about your crops or environmental conditions...',
    
    // Missing AI Dashboard Items
    selectedCrop: 'Selected crop:',
    sensorOnline: 'SENSOR ONLINE',
    sensorOffline: 'SENSOR OFFLINE',
    lastSynced: 'Last synced:',
    soilMoistureTitle: 'SOIL MOISTURE',
    phLevelTitle: 'pH LEVEL',
    acidic: 'ACIDIC',
    alkaline: 'ALKALINE',
    idealPh: 'OPTIMAL / NEUTRAL — IDEAL FOR MOST CROPS',
    npkLevels: 'NPK LEVELS',
    mockedData: 'MOCKED DATA',
    weather: 'WEATHER',
    today: 'TODAY',
    tomorrow: 'TOMORROW',
    soilTemperatureTitle: 'SOIL TEMPERATURE',
    deviceTitle: 'DEVICE',
    reading: 'READING...',
    demoDataBtn: 'DEMO DATA',
    deviceCleared: 'Device cleared — enter new ID',
    changeDevice: 'CHANGE DEVICE',
    poweredBy: 'Powered by',
    developedBy: 'Developed by',
    poor: 'Poor',
    fair: 'Fair',
    good: 'Good',
    rainy: 'Rainy',
    partlyCloudy: 'Partly Cloudy',
    overcast: 'Overcast',
    clear: 'Clear',
    
    // Help
    help: '?',
    
    // AI Analysis Table Headers
    tableDevice: 'DEVICE',
    tableTemp: 'TEMP',
    tableHumid: 'HUMID',
    tableSoil: 'MOISTURE',
    tableN: 'N',
    tableP: 'P',
    tableK: 'K',
    tablePh: 'pH',
    tableEc: 'EC',
    tableTime: 'TIME',
    showLess: 'Show Less',
    allDevices: 'All',
    
    // Setup Page
    welcome: 'Welcome',
    tellUsAboutFarm: 'Tell Us About Your Farm',
    setupDesc: 'This helps our AI give you accurate recommendations from the very first analysis. You can update these anytime from your profile.',
    stepLastCrops: 'Last Crops',
    stepFertilizers: 'Fertilizers',
    stepDone: 'Done',
    lastCropsGrown: 'Last Crops Grown',
    enterRecentCrops: 'Enter your most recent crops, starting from the latest',
    cropSingular: 'crop',
    cropPlural: 'crops',
    mostRecentCrop: 'Most Recent Crop',
    secondMostRecent: '2nd Most Recent',
    cropNum: 'Crop #',
    cropName: 'Crop Name',
    cropNamePlaceholderNew: 'e.g. Wheat, Rice, Cotton',
    dateHarvested: 'Date Harvested',
    remove: 'Remove',
    addAnotherCrop: '+ Add Another Crop',
    fertilizersUsedTitle: 'Fertilizers Used',
    inputsLast12Months: 'Inputs from the last 12 months',
    recordSingular: 'record',
    recordPlural: 'records',
    entry: 'Entry',
    fertilizerInput: 'Fertilizer / Input',
    fertPlaceholder: 'e.g. Urea, DAP, Compost',
    amountKg: 'Amount (KG)',
    amountPlaceholder: 'e.g. 34',
    perArea: 'Per Area',
    perBigha: '/ Bigha',
    perHectare: '/ Hectare',
    perAcre: '/ Acre',
    addFertilizerBtn: '+ Add Fertilizer',
    saveStartAnalysis: 'Save & Start Analysis →',
    saving: 'Saving...',
    skipForNow: 'Skip for now →',
    pleaseEnterCrop: 'Please enter at least one crop.',
    couldNotSave: 'Could not save. Please try again.',
    
    // Profile Page
    farmerAccount: 'FARMER ACCOUNT',
    updateCropRecords: 'Update your crop and fertilizer records below.',
    loading: 'Loading...',
    lastDeviceConnected: 'Last Device Connected',
    setAutomatically: 'Set automatically when you run an analysis',
    noDeviceRecorded: 'No device recorded yet',
    lastCropsTitle: 'Last Crops Grown',
    mostRecentFirst: 'Most recent first',
    lastCropLabel: 'LAST CROP',
    secondLastLabel: '2ND LAST',
    cropNameLabel: 'CROP NAME',
    dateHarvestedLabel: 'DATE HARVESTED',
    addNewCropBtn: '+ Add New Crop',
    fertilizerRecordsTitle: 'Fertilizer Records',
    inputsUsed: 'Inputs used',
    fertilizerNameLabel: 'FERTILIZER NAME',
    amountLabel: 'AMOUNT',
    unitLabel: 'UNIT',
    addNewFertilizerBtn: '+ Add New Fertilizer',
    logout: 'Logout',
    saveChanges: 'Save Changes',
    dataSyncCloud: 'Data is synced to the cloud and cached locally as backup.',
    companionPlantingTitle: 'Companion Planting',
    companionPlantingDesc: 'Find the best companion crops for better yields and pest control',
    navDashboard: 'DASHBOARD',
    navCompanion: 'COMPANION PLANTING',
    navProfile: 'PROFILE',
    languageLabel: 'LANGUAGE',
    farmerNameLabel: 'FARMER NAME',
    enterNameDesc: 'Enter your name',
    namePlaceholder: 'e.g. John Doe',

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
    soil: 'मिट्टी नमी (असली)',
    soilTemp: 'मिट्टी तापमान (°C)',
    nitrogen: 'नाइट्रोजन (मॉक)',
    phosphorus: 'फॉस्फोरस (मॉक)',
    potassium: 'पोटैशियम (मॉक)',
    phLevel: 'pH स्तर (मॉक)',
    electricalConductivity: 'EC (मॉक)',
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
    successfullyFetched: '3 डिवाइस से डेटा मिल गया',
    dataUpdated: 'डेटा अपडेट हुआ',
    readyForAnalysis: 'AI जांच के लिए तैयार',
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
    
    // Historical Farm Profile
    historicalFarmProfile: 'पिछली खेती की जानकारी',
    crop1Name: 'पिछली फसल 1',
    crop1DateGrown: 'फसल 1 — उगाई गई तारीख',
    crop2Name: 'पिछली फसल 2',
    crop2DateGrown: 'फसल 2 — उगाई गई तारीख',
    cropNamePlaceholder: 'जैसे: गेहूं, धान',
    fertilizerUsed: 'इस्तेमाल की खाद',
    chooseFertilizer: 'खाद चुनें...',
    fertilizerNamePlaceholder: 'खाद का नाम लिखें',
    fertilizerAmount: 'खाद की मात्रा',
    fertilizerUnit: 'खाद की इकाई',

    // Additional Query
    additionalQuery: 'और सवाल',
    queryPlaceholder: 'फसल या मौसम के बारे में कोई सवाल लिखें...',
    
    // Missing AI Dashboard Items
    selectedCrop: 'चुनी गई फसल:',
    sensorOnline: 'सेंसर ऑनलाइन',
    sensorOffline: 'सेंसर ऑफलाइन',
    lastSynced: 'अंतिम सिंक:',
    soilMoistureTitle: 'मिट्टी की नमी',
    phLevelTitle: 'pH स्तर',
    acidic: 'अम्लीय',
    alkaline: 'क्षारीय',
    idealPh: 'आदर्श — तटस्थ',
    npkLevels: 'NPK स्तर',
    mockedData: 'मॉक डेटा',
    weather: 'मौसम',
    today: 'आज',
    tomorrow: 'कल',
    soilTemperatureTitle: 'मिट्टी का तापमान',
    deviceTitle: 'डिवाइस',
    reading: 'डेटा पढ़ रहा है...',
    demoDataBtn: 'डेमो डेटा',
    deviceCleared: 'डिवाइस ID हटाया — नया ID डालें',
    changeDevice: 'ID बदलें',
    poweredBy: 'द्वारा संचालित',
    developedBy: 'द्वारा विकसित',
    poor: 'खराब',
    fair: 'सामान्य',
    good: 'अच्छा',
    rainy: 'बारिश',
    partlyCloudy: 'आंशिक बादल',
    overcast: 'बादल',
    clear: 'साफ',

    // Help
    help: '?',
    
    // AI Analysis Table Headers
    tableDevice: 'डिवाइस',
    tableTemp: 'तापमान',
    tableHumid: 'नमी',
    tableSoil: 'नमी',
    tableN: 'N',
    tableP: 'P',
    tableK: 'K',
    tablePh: 'pH',
    tableEc: 'EC',
    tableTime: 'समय',
    showLess: 'कम दिखाएं',
    allDevices: 'सभी',
    
    // Setup Page
    welcome: 'स्वागत है',
    tellUsAboutFarm: 'अपने खेत के बारे में बताएं',
    setupDesc: 'इससे हमारे AI को सटीक सलाह देने में मदद मिलेगी। आप इसे कभी भी अपनी प्रोफ़ाइल से अपडेट कर सकते हैं।',
    stepLastCrops: 'पिछली फसलें',
    stepFertilizers: 'खाद',
    stepDone: 'पूरा हुआ',
    lastCropsGrown: 'हाल ही में उगाई गई फसलें',
    enterRecentCrops: 'अपनी सबसे हालिया फसलें दर्ज करें (नवीनतम से शुरू करें)',
    cropSingular: 'फसल',
    cropPlural: 'फसलें',
    mostRecentCrop: 'सबसे हालिया फसल',
    secondMostRecent: 'दूसरी हालिया फसल',
    cropNum: 'फसल #',
    cropName: 'फसल का नाम',
    cropNamePlaceholderNew: 'जैसे गेहूं, धान, कपास',
    dateHarvested: 'कटाई की तारीख',
    remove: 'हटाएं',
    addAnotherCrop: '+ एक और फसल जोड़ें',
    fertilizersUsedTitle: 'इस्तेमाल की गई खाद',
    inputsLast12Months: 'पिछले 12 महीनों का इनपुट',
    recordSingular: 'रिकॉर्ड',
    recordPlural: 'रिकॉर्ड',
    entry: 'प्रविष्टि',
    fertilizerInput: 'खाद / इनपुट',
    fertPlaceholder: 'जैसे यूरिया, डीएपी (DAP), कम्पोस्ट',
    amountKg: 'मात्रा (किलो)',
    amountPlaceholder: 'जैसे 34',
    perArea: 'प्रति क्षेत्र',
    perBigha: '/ बीघा',
    perHectare: '/ हेक्टेयर',
    perAcre: '/ एकड़',
    addFertilizerBtn: '+ खाद जोड़ें',
    saveStartAnalysis: 'सेव करें और जांच शुरू करें →',
    saving: 'सेव हो रहा है...',
    skipForNow: 'अभी छोड़ें →',
    pleaseEnterCrop: 'कृपया कम से कम एक फसल दर्ज करें।',
    couldNotSave: 'सेव नहीं हो सका। कृपया पुनः प्रयास करें।',
    
    // Profile Page
    farmerAccount: 'किसान खाता',
    updateCropRecords: 'अपनी फसल और खाद की जानकारी नीचे अपडेट करें।',
    loading: 'लोड हो रहा है...',
    lastDeviceConnected: 'अंतिम कनेक्टेड डिवाइस',
    setAutomatically: 'जब आप जांच करते हैं तो स्वचालित रूप से सेट हो जाता है',
    noDeviceRecorded: 'अभी तक कोई डिवाइस दर्ज नहीं है',
    lastCropsTitle: 'पिछली फसलें',
    mostRecentFirst: 'हाल की फसल पहले',
    lastCropLabel: 'अंतिम फसल',
    secondLastLabel: 'दूसरी अंतिम',
    cropNameLabel: 'फसल का नाम',
    dateHarvestedLabel: 'कटाई की तारीख',
    addNewCropBtn: '+ नई फसल जोड़ें',
    fertilizerRecordsTitle: 'खाद का रिकॉर्ड',
    inputsUsed: 'उपयोग किए गए इनपुट',
    fertilizerNameLabel: 'खाद का नाम',
    amountLabel: 'मात्रा',
    unitLabel: 'इकाई',
    addNewFertilizerBtn: '+ नई खाद जोड़ें',
    logout: 'लॉगआउट',
    saveChanges: 'बदलाव सेव करें',
    dataSyncCloud: 'डेटा क्लाउड में सिंक होता है और स्थानीय रूप से बैकअप रहता है।',
    companionPlantingTitle: 'साथी फसल',
    companionPlantingDesc: 'बेहतर पैदावार और कीट नियंत्रण के लिए सर्वश्रेष्ठ साथी फसलें खोजें',
    navDashboard: 'डैशबोर्ड',
    navCompanion: 'साथी फसल',
    navProfile: 'प्रोफाइल',
    languageLabel: 'भाषा',
    farmerNameLabel: 'किसान का नाम',
    enterNameDesc: 'अपना नाम दर्ज करें',
    namePlaceholder: 'उदा. राम',

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
    soil: 'மண் ஈரப்பதம் (உண்மை)',
    soilTemp: 'மண் வெப்பநிலை (°C)',
    nitrogen: 'நைட்ரஜன் (மாக்)',
    phosphorus: 'பாஸ்பரஸ் (மாக்)',
    potassium: 'பொட்டாசியம் (மாக்)',
    phLevel: 'pH நிலை (மாக்)',
    electricalConductivity: 'EC (மாக்)',
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
    successfullyFetched: '3 சாதனங்களிலிருந்து தரவு பெறப்பட்டது',
    dataUpdated: 'தரவு புதுப்பிக்கப்பட்டது',
    readyForAnalysis: 'AI பகுப்பாய்வுக்கு தயார்',
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
    
    // Historical Farm Profile
    historicalFarmProfile: 'முந்தைய வயல் விவரங்கள்',
    crop1Name: 'முந்தைய பயிர் 1',
    crop1DateGrown: 'பயிர் 1 — வளர்க்கப்பட்ட தேதி',
    crop2Name: 'முந்தைய பயிர் 2',
    crop2DateGrown: 'பயிர் 2 — வளர்க்கப்பட்ட தேதி',
    cropNamePlaceholder: 'எ.கா: கோதுமை, நெல்',
    fertilizerUsed: 'பயன்படுத்திய உரம்',
    chooseFertilizer: 'உரத்தைத் தேர்ந்தெடுக்கவும்...',
    fertilizerNamePlaceholder: 'உரத்தின் பெயரை உள்ளிடவும்',
    fertilizerAmount: 'உர அளவு',
    fertilizerUnit: 'உர அலகு',

    // Additional Query
    additionalQuery: 'கூடுதல் கேள்வி',
    queryPlaceholder: 'பயிர் அல்லது வானிலை பற்றி ஏதேனும் கேள்விகளை எழுதவும்...',
    
    // Missing AI Dashboard Items
    selectedCrop: 'தேர்ந்தெடுக்கப்பட்ட பயிர்:',
    sensorOnline: 'உணரி ஆன்லைன்',
    sensorOffline: 'உணரி ஆஃப்லைன்',
    lastSynced: 'கடைசி ஒத்திசைவு:',
    soilMoistureTitle: 'மண் ஈரப்பதம்',
    phLevelTitle: 'pH நிலை',
    acidic: 'அமிலத்தன்மை',
    alkaline: 'காரத்தன்மை',
    idealPh: 'சிறந்த நிலை - பெரும்பாலான பயிர்களுக்கு உகந்தது',
    npkLevels: 'NPK அளவுகள்',
    mockedData: 'போலி தரவு',
    weather: 'வானிலை',
    today: 'இன்று',
    tomorrow: 'நாளை',
    soilTemperatureTitle: 'மண் வெப்பநிலை',
    deviceTitle: 'சாதனம்',
    reading: 'படிக்கிறது...',
    demoDataBtn: 'டெமோ தரவு',
    deviceCleared: 'சாதனம் அழிக்கப்பட்டது — புதிய ID உள்ளிடவும்',
    changeDevice: 'சாதனத்தை மாற்றுக',
    poweredBy: 'வழங்குபவர்',
    developedBy: 'உருவாக்கியவர்',
    poor: 'மோசம்',
    fair: 'சுமார்',
    good: 'நன்று',
    rainy: 'மழை',
    partlyCloudy: 'பகுதி மேகமூட்டம்',
    overcast: 'மேகமூட்டம்',
    clear: 'தெளிவானது',

    // Help
    help: '?',
    
    // AI Analysis Table Headers
    tableDevice: 'சாதனம்',
    tableTemp: 'வெப்பம்',
    tableHumid: 'ஈரப்பதம்',
    tableSoil: 'ஈரப்பதம்',
    tableN: 'N',
    tableP: 'P',
    tableK: 'K',
    tablePh: 'pH',
    tableEc: 'EC',
    tableTime: 'நேரம்',
    showLess: 'குறைவாக காட்டு',
    allDevices: 'அனைத்து',
    
    // Setup Page
    welcome: 'வரவேற்கிறோம்',
    tellUsAboutFarm: 'உங்கள் வயலைப் பற்றி சொல்லுங்கள்',
    setupDesc: 'எங்கள் AI துல்லியமான பரிந்துரைகளை வழங்க இது உதவும். உங்கள் சுயவிவரத்திலிருந்து எப்போது வேண்டுமானாலும் இதைப் புதுப்பிக்கலாம்.',
    stepLastCrops: 'கடைசி பயிர்கள்',
    stepFertilizers: 'உரங்கள்',
    stepDone: 'முடிந்தது',
    lastCropsGrown: 'சமீபத்தில் வளர்க்கப்பட்ட பயிர்கள்',
    enterRecentCrops: 'உங்கள் மிகச் சமீபத்திய பயிர்களை உள்ளிடவும்',
    cropSingular: 'பயிர்',
    cropPlural: 'பயிர்கள்',
    mostRecentCrop: 'மிக சமீபத்திய பயிர்',
    secondMostRecent: '2வது சமீபத்தியது',
    cropNum: 'பயிர் #',
    cropName: 'பயிரின் பெயர்',
    cropNamePlaceholderNew: 'எ.கா. கோதுமை, நெல், பருத்தி',
    dateHarvested: 'அறுவடை தேதி',
    remove: 'அகற்று',
    addAnotherCrop: '+ மற்றொரு பயிர் சேர்க்க',
    fertilizersUsedTitle: 'பயன்படுத்திய உரங்கள்',
    inputsLast12Months: 'கடந்த 12 மாத உள்ளீடுகள்',
    recordSingular: 'பதிவு',
    recordPlural: 'பதிவுகள்',
    entry: 'பதிவு',
    fertilizerInput: 'உரம் / உள்ளீடு',
    fertPlaceholder: 'எ.கா. யூரியா, டிஏபி (DAP)',
    amountKg: 'அளவு (கிலோ)',
    amountPlaceholder: 'எ.கா. 34',
    perArea: 'பரப்பளவிற்கு',
    perBigha: '/ பிகா',
    perHectare: '/ ஹெக்டேர்',
    perAcre: '/ ஏக்கர்',
    addFertilizerBtn: '+ உரம் சேர்க்க',
    saveStartAnalysis: 'சேமித்து பகுப்பாய்வைத் தொடங்கு →',
    saving: 'சேமிக்கிறது...',
    skipForNow: 'இப்போதைக்கு தவிர் →',
    pleaseEnterCrop: 'குறைந்தது ஒரு பயிரையாவது உள்ளிடவும்.',
    couldNotSave: 'சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    
    // Profile Page
    farmerAccount: 'விவசாயி கணக்கு',
    updateCropRecords: 'உங்கள் பயிர் மற்றும் உர பதிவுகளை கீழே புதுப்பிக்கவும்.',
    loading: 'ஏற்றுகிறது...',
    lastDeviceConnected: 'கடைசியாக இணைக்கப்பட்ட சாதனம்',
    setAutomatically: 'பகுப்பாய்வை இயக்கும்போது தானாகவே அமைக்கப்படும்',
    noDeviceRecorded: 'சாதனம் எதுவும் பதிவு செய்யப்படவில்லை',
    lastCropsTitle: 'கடைசி பயிர்கள்',
    mostRecentFirst: 'சமீபத்தியது முதலில்',
    lastCropLabel: 'கடைசி பயிர்',
    secondLastLabel: '2வது கடைசி',
    cropNameLabel: 'பயிர் பெயர்',
    dateHarvestedLabel: 'அறுவடை தேதி',
    addNewCropBtn: '+ புதிய பயிர் சேர்க்க',
    fertilizerRecordsTitle: 'உரப் பதிவுகள்',
    inputsUsed: 'பயன்படுத்திய உள்ளீடுகள்',
    fertilizerNameLabel: 'உரத்தின் பெயர்',
    amountLabel: 'அளவு',
    unitLabel: 'அலகு',
    addNewFertilizerBtn: '+ புதிய உரம் சேர்க்க',
    logout: 'வெளியேறு',
    saveChanges: 'மாற்றங்களைச் சேமி',
    dataSyncCloud: 'தரவு கிளவுட் உடன் ஒத்திசைக்கப்பட்டு, உள்ளூரில் காப்புப்பிரதியாகச் சேமிக்கப்படுகிறது.',
    companionPlantingTitle: 'கூட்டுப் பயிர்',
    companionPlantingDesc: 'சிறந்த மகசூல் மற்றும் கீட் கட்டுப்பாட்டிற்கான சிறந்த கூட்டுப் பயிர்களைக் கண்டறியவும்',
    navDashboard: 'டாஷ்போர்டு',
    navCompanion: 'கூட்டுப் பயிர்',
    navProfile: 'சுயவிவரம்',
    languageLabel: 'மொழி',
    farmerNameLabel: 'விவசாயி பெயர்',
    enterNameDesc: 'உங்கள் பெயரை உள்ளிடவும்',
    namePlaceholder: 'உதா. ராமன்',

  },
};

export const LanguageProvider = ({ children }) => {
  // Check localStorage for saved language preference, default to 'en'
  const [language, setLanguage] = useState(() => {
    const APP_VERSION = '2.0'; 
    const savedVersion = localStorage.getItem('appVersion');
    
    // If version doesn't match, default to English
    if (savedVersion !== APP_VERSION) {
      localStorage.setItem('language', 'en');
      localStorage.setItem('appVersion', APP_VERSION);
      return 'en';
    }
    
    const savedLanguage = localStorage.getItem('language');
    // Only return saved language if it's valid, otherwise return 'en'
    return (savedLanguage === 'en' || savedLanguage === 'hi' || savedLanguage === 'ta') ? savedLanguage : 'en';
  });

  // Save language preference to localStorage whenever it changes
  useEffect(() => {
    if (language) {
      localStorage.setItem('language', language);
      document.documentElement.lang = language;
      if (language === 'hi') {
        document.body.classList.add('lang-hi');
      } else {
        document.body.classList.remove('lang-hi');
      }
    } else {
      document.documentElement.lang = 'en';
      document.body.classList.remove('lang-hi');
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
