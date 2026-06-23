import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getSession, getProfileKey } from '../lib/auth';

/**
 * AIAnalysis Component
 *
 * Full AI Analysis dashboard with:
 * - Device information table with live ESP32 sensor data (WebSocket)
 * - Control buttons (Get Data, Export JSON, Clear Data)
 * - Crop type selector, pH scale, farm history, and AI analysis
 *
 * Sensor flow: POST /api/request-data → READ_SENSORS → GET /api/device-data-ws
 */
const LOADING_LINES = [
  'INITIALIZING SENSOR PIPELINE...',
  'READING SOIL MOISTURE DATA...',
  'PARSING NPK LEVELS...',
  'FETCHING GEOLOCATION...',
  'CROSS-REFERENCING WEATHER DATA...',
  'LOADING CROP DATABASE...',
  'RUNNING NEURAL INFERENCE...',
  'CALCULATING YIELD PROBABILITIES...',
  'EVALUATING COMPANION SYNERGIES...',
  'RANKING CROP RECOMMENDATIONS...',
  'COMPUTING SOIL HEALTH SCORE...',
  'ANALYSIS COMPLETE ✓',
];

const AIAnalysis = () => {
  const { t, changeLanguage, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleLanguageSwitch = () => {
    // Clear language to show selection screen again
    changeLanguage(null);
    localStorage.removeItem('language');
  };
  
  // Device data state
  const [devices, setDevices] = useState(() => {
    const saved = localStorage.getItem('ai_analysis_devices');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('ai_analysis_devices', JSON.stringify(devices));
  }, [devices]);

  const [selectedCrop, setSelectedCrop] = useState('');
  const [cropStage, setCropStage] = useState('');
  const [fieldArea, setFieldArea] = useState('');
  const [areaUnit, setAreaUnit] = useState('bigha'); // Default unit
  const [query, setQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState(null); // { soil_score, soil_summary, top_crops }
  const [companionMode, setCompanionMode] = useState(false);
  const [profitMode, setProfitMode] = useState(false);
  const [showMoreCrops, setShowMoreCrops] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showCropResults, setShowCropResults] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorPopup, setErrorPopup] = useState({ show: false, message: '', solution: '', type: 'error' });
  const [farmerName, setFarmerName] = useState('');
  
  // Device ID state - captured from URL or manually entered
  const [deviceId, setDeviceId] = useState('');
  const [showDeviceIdInput, setShowDeviceIdInput] = useState(false);
  const [manualDeviceId, setManualDeviceId] = useState('');
  const [availableDevices, setAvailableDevices] = useState([]);

  useEffect(() => {
    if (!deviceId || showDeviceIdInput) {
      const fetchDevices = async () => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || '';
          const res = await fetch(`${baseUrl}/api/devices`);
          if (res.ok) {
            const data = await res.json();
            setAvailableDevices(data.devices || []);
          }
        } catch (e) {
          console.error("Could not fetch devices", e);
        }
      };
      fetchDevices();
      const interval = setInterval(fetchDevices, 5000);
      return () => clearInterval(interval);
    }
  }, [deviceId, showDeviceIdInput]);
  
  // Table display state - show only 4 rows by default
  const [showAllRows, setShowAllRows] = useState(false);

  // Browser Geolocation Weather State
  const [browserWeather, setBrowserWeather] = useState(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`);
          const data = await res.json();
          setBrowserWeather({
            lat,
            lon,
            temperature: data.current.temperature_2m,
            humidity: data.current.relative_humidity_2m
          });
        } catch (e) {
          console.error("Browser weather fetch failed", e);
        }
      }, (error) => {
        console.warn("Geolocation denied or unavailable:", error.message);
      });
    }
  }, []);
  
  // Capture device_id from URL on mount (for local network redirect)
  useEffect(() => {
    const urlDeviceId = searchParams.get('device_id');
    if (urlDeviceId) {
      setDeviceId(urlDeviceId);
      localStorage.setItem('captured_device_id', urlDeviceId);
      console.log('✅ Device ID captured from URL:', urlDeviceId);
    } else {
      // Check if previously captured
      const savedDeviceId = localStorage.getItem('captured_device_id');
      if (savedDeviceId) {
        setDeviceId(savedDeviceId);
        console.log('✅ Device ID loaded from storage:', savedDeviceId);
      } else {
        console.log('⚠️ No device ID - user must enter manually');
      }
    }
  }, [searchParams]);

  // On mount, set default land size from profile
  useEffect(() => {
    try {
      const profileKey = getProfileKey();
      const raw = localStorage.getItem(profileKey);
      if (raw) {
        const profile = JSON.parse(raw);
        if (profile.landUnit) setAreaUnit(profile.landUnit);
        if (profile.landSize) setFieldArea(String(profile.landSize));
      }
    } catch (e) {
      console.warn("Could not load preferred land size", e);
    }
  }, []);

  /**
   * Fetch sensor data from ESP32 via WebSocket (on-demand):
   * 1. User clicks "Get Data"
   * 2. Frontend → POST /api/request-data → Server
   * 3. Server → WebSocket → READ_SENSORS → ESP32
   * 4. ESP32 reads sensors → WebSocket → Server (mock NPK/pH/EC enriched)
   * 5. Frontend → GET /api/device-data-ws → Display
   * 
   * Benefits:
   * - Works from anywhere (no local IP issues!)
   * - Only reads sensors when needed (saves power)
   * - Real-time bidirectional communication
   * 
   * Device ID can be passed via URL (?device_id=ESP32_FIELD_UNIT_1)
   */
  const fetchDeviceData = async () => {
    // Check if device ID is available
    if (!deviceId) {
      setErrorPopup({
        show: true,
        message: language === 'hi' ? 'पहले डिवाइस ID डालें' : language === 'ta' ? 'முதலில் சாதன ஐடியை உள்ளிடவும்' : 'Please enter Device ID first',
        solution: language === 'hi' ? 'ऊपर बॉक्स में अपना डिवाइस ID टाइप करें' : language === 'ta' ? 'மேலே உள்ள பெட்டியில் உங்கள் சாதன ஐடியை தட்டச்சு செய்யவும்' : 'Type your Device ID in the box above'
      });
      setShowDeviceIdInput(true);
      return;
    }
    
    console.log('Using device ID:', deviceId);

    setLoading(true);
    setStatusMessage((language === 'hi' ? 'डिवाइस से डेटा मांग रहे हैं...' : language === 'ta' ? 'சாதனத்திலிருந்து தரவு கோருகிறது...' : 'Requesting data from device...'));

    try {
      console.log('Step 1: Sending READ_SENSORS command to device:', deviceId);
      
      // Step 1: Send command to device via WebSocket
      const requestResponse = await fetch(`/api/request-data?device=${deviceId}`, {
        method: 'POST'
      });
      
      if (!requestResponse.ok) {
        const errorData = await requestResponse.json();
        throw new Error(errorData.error || `HTTP ${requestResponse.status}`);
      }
      
      const requestResult = await requestResponse.json();
      console.log('Command sent successfully:', requestResult);
      
      setStatusMessage((language === 'hi' ? 'डिवाइस सेंसर पढ़ रहा है...' : language === 'ta' ? 'சாதனம் உணரிகளை படிக்கிறது...' : 'Device is reading sensors...'));
      
      // Step 2: Wait a moment for device to read sensors (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Step 2: Fetching sensor data from server');
      
      // Step 3: Fetch the sensor data
      const dataResponse = await fetch(`/api/device-data-ws?device=${deviceId}`);
      
      if (!dataResponse.ok) {
        const errorData = await dataResponse.json();
        throw new Error(errorData.error || `HTTP ${dataResponse.status}`);
      }

      const data = await dataResponse.json();
      console.log('Received sensor data:', data);
      
      // ESP32 sends real moisture; server enriches NPK / pH / EC via mock engine
      const newDevice = {
        id: data.device || data.deviceID || data.deviceId || deviceId,
        temperature: data.air_temperature ?? data.airTemperature ?? data.temperature ?? '-',
        humidity: data.humidity ?? '-',
        soil: data.soil_moisture ?? data.soilMoisture ?? data.moisture ?? '-',
        nitrogen: data.nitrogen ?? data.n ?? '-',
        phosphorus: data.phosphorus ?? data.p ?? '-',
        potassium: data.potassium ?? data.k ?? '-',
        phLevel: data.ph_level ?? data.pH ?? data.ph ?? '-',
        ec: data.electrical_conductivity ?? data.ec ?? '-',
        soilTemp: data.soilTemperature ?? data.soil_temperature ?? data.temperature ?? '-',
        timestamp: new Date().toLocaleString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        raw: data
      };

      // Add to devices array (newest first - prepend instead of append)
      setDevices(prev => [newDevice, ...prev]);

      // Persist lastDevice to the profile cache so Profile page can display it
      try {
        const profileKey = getProfileKey();
        const raw = localStorage.getItem(profileKey);
        const cached = raw ? JSON.parse(raw) : {};
        cached.lastDevice = newDevice.id;
        localStorage.setItem(profileKey, JSON.stringify(cached));
      } catch (e) {
        console.warn('Could not update lastDevice in profile cache:', e);
      }
      
      // Show success popup
      setErrorPopup({
        show: true,
        message: language === 'hi' ? 'डेटा मिल गया!' : language === 'ta' ? 'தரவு வெற்றிகரமாக பெறப்பட்டது!' : 'Data received successfully!',
        solution: language === 'hi' ? 'अब नीचे टेबल में देखें' : language === 'ta' ? 'கீழே அட்டவணையில் பார்க்கவும்' : 'Check the table below',
        type: 'success'
      });
      setStatusMessage('');
      
    } catch (error) {
      console.error('Device fetch error:', error);
      
      // Provide helpful error messages based on error type
      let errorMessage = '';
      let solution = '';
      
      if (error.message.includes('Device not connected')) {
        errorMessage = language === 'hi' ? 'डिवाइस कनेक्ट नहीं है' : language === 'ta' ? 'சாதனம் இணைக்கப்படவில்லை' : 'Device not connected';
        solution = language === 'hi' ? 'डिवाइस चालू करें और वाईफाई से जोड़ें' : language === 'ta' ? 'சாதனத்தை இயக்கி WiFi உடன் இணைக்கவும்' : 'Turn on device and connect to WiFi';
      } else if (error.message.includes('offline')) {
        errorMessage = language === 'hi' ? 'डिवाइस ऑफलाइन है' : language === 'ta' ? 'சாதனம் ஆஃப்லைனில் உள்ளது' : 'Device is offline';
        solution = language === 'hi' ? 'डिवाइस की पॉवर और इंटरनेट चेक करें' : language === 'ta' ? 'சாதன மின்சாரம் மற்றும் இணையத்தை சரிபார்க்கவும்' : 'Check device power and internet';
      } else if (error.message.includes('No data available')) {
        errorMessage = language === 'hi' ? 'डेटा नहीं मिला' : language === 'ta' ? 'தரவு கிடைக்கவில்லை' : 'No data available';
        solution = language === 'hi' ? '2-3 मिनट इंतजार करें और फिर कोशिश करें' : language === 'ta' ? '2-3 நிமிடங்கள் காத்திருந்து மீண்டும் முயற்சிக்கவும்' : 'Wait 2-3 minutes and try again';
      } else {
        errorMessage = language === 'hi' ? 'डेटा लेने में गड़बड़ी' : language === 'ta' ? 'தரவு பெறுவதில் பிழை' : 'Error getting data';
        solution = language === 'hi' ? 'डिवाइस ID चेक करें या दोबारा कोशिश करें' : language === 'ta' ? 'சாதன ஐடியை சரிபார்த்து மீண்டும் முயற்சிக்கவும்' : 'Check Device ID or try again';
      }
      
      setErrorPopup({
        show: true,
        message: errorMessage,
        solution: solution
      });
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  // Handler functions
  const handleGetData = () => {
    fetchDeviceData();
  };

  // Load mock/demo data for testing
  const handleLoadMockData = () => {
    const mockDevice = {
      id: 'DEMO-DEVICE',
      temperature: 32.1,
      humidity: 58.4,
      soil: 45.8,
      nitrogen: 40.2,
      phosphorus: 18.5,
      potassium: 145.0,
      phLevel: 7.2,
      ec: 1.15,
      soilTemp: 29.8,
      timestamp: new Date().toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      raw: {
        device: 'DEMO-DEVICE',
        temperature: 32.1,
        humidity: 58.4,
        soil_moisture: 45.8,
        soilMoisture: 45.8,
        nitrogen: 40.2,
        phosphorus: 18.5,
        potassium: 145.0,
        ph_level: 7.2,
        electrical_conductivity: 1.15,
        soilTemperature: 29.8,
        latitude: 21.3099,
        longitude: 77.1025,
        pH: 7.2,
        _mock_sensors_generated: true
      }
    };
    setDevices(prev => [mockDevice, ...prev]);
    // Persist lastDevice for mock data too
    try {
      const profileKey = getProfileKey();
      const raw = localStorage.getItem(profileKey);
      const cached = raw ? JSON.parse(raw) : {};
      cached.lastDevice = mockDevice.id;
      localStorage.setItem(profileKey, JSON.stringify(cached));
    } catch (e) {
      console.warn('Could not update lastDevice in profile cache:', e);
    }
    setErrorPopup({
      show: true,
      message: language === 'hi' ? 'डेमो डेटा लोड हो गया!' : language === 'ta' ? 'டெமோ தரவு சுமக்கப்பட்டது!' : 'Demo data loaded!',
      solution: null,
      type: 'success',
      isLarge: true
    });
    setStatusMessage('');
  };

  const handleManualDeviceIdSubmit = async (e) => {
    e.preventDefault();
    const trimmedId = manualDeviceId.trim();
    
    if (trimmedId.length < 5) {
      alert("Please enter a valid Device ID format.");
      return;
    }

    setStatusMessage(language === 'hi' ? 'प्रमाणीकरण हो रहा है...' : language === 'ta' ? 'அங்கீகரிக்கிறது...' : 'Authenticating...');

    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/auth-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: trimmedId })
      });
      
      const result = await response.json();
      
      if (response.ok && result.type === 'auth_success') {
        setDeviceId(trimmedId);
        localStorage.setItem('captured_device_id', trimmedId);
        console.log('✅ Manual device ID authenticated and saved:', trimmedId);
        setShowDeviceIdInput(false);
        setManualDeviceId('');
        setStatusMessage(`Device ID connected: ${trimmedId}`);
        setTimeout(() => setStatusMessage(''), 3000);
      } else {
        setErrorPopup({
          show: true,
          message: 'Connection Rejected: Invalid Device ID',
          solution: language === 'hi' ? 'कृपया अपनी डिवाइस आईडी की जांच करें और पुनः प्रयास करें।' : language === 'ta' ? 'உங்கள் சாதன ஐடியை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.' : 'Please check your device ID and try again.',
          type: 'error'
        });
        setStatusMessage('');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setErrorPopup({
        show: true,
        message: 'Connection Error',
        solution: language === 'hi' ? 'प्रमाणीकरण सर्वर से कनेक्ट नहीं हो सका।' : language === 'ta' ? 'அங்கீகார சேவையகத்துடன் இணைக்க முடியவில்லை.' : 'Could not connect to authentication server.',
        type: 'error'
      });
      setStatusMessage('');
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(devices, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'environmental-data.json';
    link.click();
  };

  const handleClearData = () => {
    setDevices([]);
    setStatusMessage('');
  };

  const handleAIAnalysis = async () => {
    if (!deviceId) {
      setErrorPopup({
        show: true,
        type: 'error',
        message: language === 'hi' ? 'पहले डिवाइस ID डालें' : language === 'ta' ? 'முதலில் சாதன ஐடியை உள்ளிடவும்' : 'Enter Device ID first',
        solution: language === 'hi' ? 'ऊपर डिवाइस ID बॉक्स में अपना ID टाइप करें' : language === 'ta' ? 'மேலே சாதன ஐடி பெட்டியில் உங்கள் ஐடியை தட்டச்சு செய்யவும்' : 'Type your ID in the Device ID box above'
      });
      setShowDeviceIdInput(true);
      setTimeout(() => setErrorPopup({ show: false, type: '', message: '', solution: '' }), 5000);
      return;
    }

    if (!devices.length || !devices[0]?.raw) {
      setErrorPopup({
        show: true,
        type: 'error',
        message: language === 'hi' ? 'पहले सेंसर डेटा लें' : language === 'ta' ? 'முதலில் உணரி தரவை பெறவும்' : 'Get sensor data first',
        solution: language === 'hi' ? '"Get Data" बटन दबाएं' : language === 'ta' ? '"தரவைப் பெறு" பொத்தானை கிளிக் செய்யவும்' : 'Click "Get Data" button'
      });
      setTimeout(() => setErrorPopup({ show: false, type: '', message: '', solution: '' }), 5000);
      return;
    }

    const latest = devices[0];
    const raw = latest.raw || {};
    const toNumberOrNull = (value) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    // Use live sensor pH value directly (no longer accept manual selection)
    const resolvedPh = raw.ph_level ?? raw.pH ?? latest.phLevel;

    const telemetryPayload = {
      device: raw.device || raw.deviceId || raw.deviceID || latest.id || deviceId,
      temperature: toNumberOrNull(raw.temperature ?? latest.temperature),
      humidity: toNumberOrNull(raw.humidity ?? latest.humidity),
      soil_moisture: toNumberOrNull(raw.soil_moisture ?? raw.soilMoisture ?? raw.moisture ?? latest.soil),
      soilMoisture: toNumberOrNull(raw.soil_moisture ?? raw.soilMoisture ?? raw.moisture ?? latest.soil),
      soilTemperature: toNumberOrNull(raw.soilTemperature ?? latest.soilTemp),
      soilMoistureRaw: toNumberOrNull(raw.soilMoistureRaw ?? raw.soil_moisture_raw),
      nitrogen: toNumberOrNull(raw.nitrogen ?? raw.n ?? latest.nitrogen),
      phosphorus: toNumberOrNull(raw.phosphorus ?? raw.p ?? latest.phosphorus),
      potassium: toNumberOrNull(raw.potassium ?? raw.k ?? latest.potassium),
      ph_level: toNumberOrNull(resolvedPh),
      electrical_conductivity: toNumberOrNull(raw.electrical_conductivity ?? raw.ec ?? latest.ec),
      lightLevel: toNumberOrNull(raw.lightLevel ?? latest.light),
      lightStatus: raw.lightStatus || (latest.light >= 500 ? 'Bright' : 'Dark'),
      latitude: toNumberOrNull(raw.latitude),
      longitude: toNumberOrNull(raw.longitude),
      timestamp: raw.timestamp || Date.now()
    };

    // Convert area to hectares based on selected unit
    const convertToHectares = (area, unit) => {
      if (!area || area === '') return null;
      const areaNum = parseFloat(area);
      if (isNaN(areaNum)) return null;
      
      switch(unit) {
        case 'bigha':
          return (areaNum * 0.25).toFixed(2); // 1 bigha ≈ 0.25 hectares
        case 'acre':
          return (areaNum * 0.4047).toFixed(2); // 1 acre ≈ 0.4047 hectares
        case 'hectare':
          return areaNum.toFixed(2);
        default:
          return areaNum.toFixed(2);
      }
    };

    const fieldAreaInHectares = convertToHectares(fieldArea, areaUnit);

    // Load farm history from localStorage
    let farmHistoryPayload = {};
    try {
      const savedProfile = localStorage.getItem('farmerProfile');
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        // Flatten the arrays into the old format that backend expects
        if (Array.isArray(profile.crops) && profile.crops.length > 0) {
          if (profile.crops[0]) {
            farmHistoryPayload.crop_1_name = profile.crops[0].name?.trim() || null;
            farmHistoryPayload.crop_1_date_grown = profile.crops[0].dateGrown || null;
          }
          if (profile.crops[1]) {
            farmHistoryPayload.crop_2_name = profile.crops[1].name?.trim() || null;
            farmHistoryPayload.crop_2_date_grown = profile.crops[1].dateGrown || null;
          }
        }
        if (Array.isArray(profile.fertilizers) && profile.fertilizers.length > 0) {
          const fert = profile.fertilizers[0];
          farmHistoryPayload.fertilizer_used_name = fert.name?.trim() || null;
          farmHistoryPayload.fertilizer_amount = fert.amount ? parseFloat(fert.amount) : null;
          farmHistoryPayload.fertilizer_unit = fert.unit || null;
        }
        if (profile.landSize) {
          farmHistoryPayload.land_size = profile.landSize;
          farmHistoryPayload.land_unit = profile.landUnit || 'bigha';
        }
      }
    } catch (err) {
      console.error('Error loading farm history from localStorage:', err);
    }

    const requestBody = {
      deviceId,
      telemetry: telemetryPayload,
      cropType: selectedCrop || 'unknown',
      cropStage: cropStage || 'unknown',
      fieldArea: fieldAreaInHectares || null,
      soilPH: telemetryPayload.ph_level || null,
      language: language || 'en',
      additionalQuery: query || 'None',
      farmHistory: farmHistoryPayload
    };

    // Reset UI for new analysis run
    setParsedResult(null);
    setShowCropResults(false);
    setShowMoreCrops(false);
    setCompanionMode(false);
    setLoadingStep(0);

    // Start terminal loading animation (one line every 220ms)
    let animStep = 0;
    const animInterval = setInterval(() => {
      animStep++;
      setLoadingStep(animStep);
      if (animStep >= LOADING_LINES.length) clearInterval(animInterval);
    }, 220);

    try {
      setAiLoading(true);
      setAiError('');
      setAiResult(null);
      
      setStatusMessage('Fetching weather data...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStatusMessage('Weather data received | Preparing prompt...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setStatusMessage('Sending to AI model...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setStatusMessage('Waiting for AI response...');

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `AI request failed (${response.status})`;
        try {
          const parsedErr = JSON.parse(errorText);
          if (parsedErr.error) errorMessage = parsedErr.error;
        } catch (parseErr) {
          console.warn('AI error response not JSON:', parseErr);
        }
        throw new Error(errorMessage);
      }

      setStatusMessage('Response received | Parsing data...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = await response.json();
      setAiResult(result.recommendation || null);

      // Parse structured JSON from the AI recommendation string
      let parsed = null;
      try {
        let text = result.recommendation || '';
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
          text = text.substring(jsonStart, jsonEnd + 1);
        }
        parsed = JSON.parse(text);
      } catch {
        // Fallback: wrap plain text as a soil summary with no crop cards
        parsed = { soil_score: null, soil_summary: result.recommendation, top_crops: [] };
      }
      setParsedResult(parsed);
      setStatusMessage('Analysis complete | Successfully parsed!');

    } catch (error) {
      console.error('AI analysis error:', error);
      setAiResult(null);
      
      let simpleError = language === 'hi' 
        ? 'AI से जवाब नहीं मिला। कृपया दोबारा कोशिश करें।'
        : language === 'ta'
        ? 'AI பதில் தோல்வியுற்றது. மீண்டும் முயற்சிக்கவும்.'
        : 'AI response failed. Please try again.';
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        simpleError = language === 'hi'
          ? 'इंटरनेट कनेक्शन जांचें और फिर से कोशिश करें।'
          : language === 'ta'
          ? 'இணைய இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'
          : 'Check internet connection and retry.';
      } else if (error.message.includes('timeout')) {
        simpleError = language === 'hi'
          ? 'समय समाप्त। कृपया फिर से कोशिश करें।'
          : language === 'ta'
          ? 'நேரம் முடிந்தது. மீண்டும் முயற்சிக்கவும்.'
          : 'Request timeout. Please try again.';
      } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('504')) {
        simpleError = language === 'hi'
          ? 'सर्वर में दिक्कत है। थोड़ी देर बाद कोशिश करें।'
          : language === 'ta'
          ? 'சேவையக பிரச்சனை. சிறிது நேரம் கழித்து முயற்சிக்கவும்.'
          : 'Server issue. Try again in a moment.';
      }
      
      setAiError(simpleError);
      setShowErrorPopup(true);
      setStatusMessage('');
      setTimeout(() => { setShowErrorPopup(false); setAiError(''); }, 5000);
    } finally {
      clearInterval(animInterval);
      setLoadingStep(LOADING_LINES.length); // snap animation to end
      setAiLoading(false);
    }
  };

  // pH scale colors
  const phColors = [
    { value: '4.0', color: 'bg-red-600' },
    { value: '5.0', color: 'bg-orange-500' },
    { value: '6.0', color: 'bg-yellow-400' },
    { value: '7.0', color: 'bg-blue-500' },
    { value: '8.0', color: 'bg-cyan-500' },
    { value: '9.0', color: 'bg-blue-600' },
    { value: '10.0', color: 'bg-indigo-700' }
  ];

  // Helper: Get live pH value from telemetry and find closest pH block
  const getLivePhValue = () => {
    const livePhLevel = devices.length > 0 
      ? (devices[0]?.phLevel || devices[0]?.raw?.ph_level || devices[0]?.raw?.pH)
      : null;
    
    if (!livePhLevel && livePhLevel !== 0) return null;
    
    const phNum = parseFloat(livePhLevel);
    if (!Number.isFinite(phNum)) return null;
    
    // Find closest pH block
    const phValues = phColors.map(ph => parseFloat(ph.value));
    const closest = phValues.reduce((prev, curr) => 
      Math.abs(curr - phNum) < Math.abs(prev - phNum) ? curr : prev
    );
    
    return closest.toFixed(1);
  };

  const livePhValue = getLivePhValue();

  // ── Display helpers ─────────────────────────────────────────────────────
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const updateGreeting = () => {
      const h = new Date().getHours();
      if (language === 'hi') {
        if (h >= 5 && h < 12) setGreeting('शुभ प्रभात');
        else if (h >= 12 && h < 17) setGreeting('शुभ दोपहर');
        else setGreeting('शुभ संध्या');
      } else if (language === 'ta') {
        if (h >= 5 && h < 12) setGreeting('காலை வணக்கம்');
        else if (h >= 12 && h < 17) setGreeting('மதிய வணக்கம்');
        else setGreeting('மாலை வணக்கம்');
      } else {
        if (h >= 5 && h < 12) setGreeting('GOOD MORNING');
        else if (h >= 12 && h < 17) setGreeting('GOOD AFTERNOON');
        else setGreeting('GOOD EVENING');
      }
    };
    updateGreeting();
    const timer = setInterval(updateGreeting, 60000); // update every minute
    return () => clearInterval(timer);
  }, [language]);

  // Reveal crop cards once animation is done AND AI has responded
  useEffect(() => {
    if (parsedResult !== null && loadingStep >= LOADING_LINES.length) {
      const t = setTimeout(() => setShowCropResults(true), 500);
      return () => clearTimeout(t);
    }
  }, [parsedResult, loadingStep]);

  useEffect(() => {
    const rawName = (() => {
      try {
        const session = getSession();
        const profileKey = getProfileKey();
        const p = JSON.parse(localStorage.getItem(profileKey) || '{}');
        if (p.farmerName) return p.farmerName;
        if (session && session.username) return session.username;
        return '';
      } catch { return ''; }
    })();

    if (!rawName) {
      setFarmerName(language === 'hi' ? 'किसान' : language === 'ta' ? 'விவசாயி' : 'FARMER');
      return;
    }

    if (language === 'en') {
      setFarmerName(rawName.toUpperCase());
      return;
    }

    const itc = language === 'hi' ? 'hi-t-i0-und' : 'ta-t-i0-und';
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(rawName)}&itc=${itc}&num=1`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
          setFarmerName(data[1][0][1][0]);
        } else {
          setFarmerName(rawName.toUpperCase());
        }
      })
      .catch(() => {
        setFarmerName(rawName.toUpperCase());
      });
  }, [language]);


  const latest = devices.length > 0 ? devices[0] : null;

  const getSoilStatus = (v) => {
    if (v === null || v === undefined || v === '-') return null;
    const n = parseFloat(v);
    if (n < 30) return { label: language === 'hi' ? 'कम' : 'LOW', color: 'text-red-400 bg-red-900/30 border-red-500' };
    if (n > 80) return { label: language === 'hi' ? 'अधिक' : 'HIGH', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-500' };
    return { label: language === 'hi' ? 'सामान्य' : 'OPTIMAL', color: 'text-neo-green-light bg-neo-green-dark/30 border-neo-green-dark' };
  };

  return (
    <div className="min-h-screen bg-transparent text-neo-cream">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 max-w-7xl">

        {/* ── HERO SECTION ─────────────────────────────────────────────── */}
        <div className="mb-8 border-b border-neo-cream/20 pb-6">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-neo-cream uppercase leading-none mb-2">
            {greeting}, {farmerName}
          </h1>
          {selectedCrop && (
            <p className="font-body text-neo-cream/50 text-sm mt-1">
              {t('selectedCrop')} {selectedCrop}
              {latest ? ` · ${latest.timestamp}` : ''}
            </p>
          )}
          <div className="flex items-center gap-3 mt-4">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${devices.length > 0 ? 'bg-neo-green-dark animate-pulse' : 'bg-red-500'}`}></span>
            <span className="font-subheading text-xs uppercase tracking-widest">
              {devices.length > 0 ? t('sensorOnline') : t('sensorOffline')}
            </span>
            {latest && (
              <span className="font-body text-neo-cream/40 text-xs">
                {t('lastSynced')} {latest.timestamp}
              </span>
            )}
          </div>
        </div>



        {/* ── SENSOR CARDS GRID ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">

          {/* SOIL MOISTURE — Full-width horizontal card, huge number + big cream arc */}
          <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-7 sm:col-span-2 lg:col-span-2 flex items-center justify-between min-h-[180px]">
            {/* Left: label, badge, huge number */}
            <div className="flex flex-col justify-between h-full">
              <div>
                <p className="font-subheading text-xs uppercase tracking-widest text-neo-cream/60 mb-2">
                  {t('soilMoistureTitle')}
                </p>
                {latest?.soil && latest.soil !== '-' && (() => {
                  const s = getSoilStatus(latest.soil);
                  return s ? <span className={`font-subheading text-[11px] font-bold uppercase px-3 py-1 rounded-full border ${s.color}`}>{s.label}</span> : null;
                })()}
              </div>
              <div className="mt-6">
                <p className="font-heading leading-none text-neo-cream" style={{fontSize: 'clamp(4rem, 10vw, 7rem)'}}>
                  {latest?.soil && latest.soil !== '-' ? latest.soil : '--'}<span className="text-neo-cream/50" style={{fontSize: 'clamp(2.5rem, 6vw, 4rem)'}}>%</span>
                </p>
                <p className="font-body text-neo-cream/25 text-[10px] uppercase tracking-widest mt-3">
                  ESP32 SENSOR{deviceId ? ` · ${deviceId.split('_').pop()}` : ''}
                </p>
              </div>
            </div>

            {/* Right: Large cream arc gauge */}
            {(() => {
              const val = latest?.soil && latest.soil !== '-' ? Math.min(100, Math.max(0, parseFloat(latest.soil))) : 0;
              const hasData = !!(latest?.soil && latest.soil !== '-');
              const SIZE = 160; const CX = 80; const CY = 80; const R = 65; const SW = 14;
              const START = -220; const ARC = 260;
              const toRad = d => d * Math.PI / 180;
              const pt = (deg, r) => ({ x: CX + r * Math.cos(toRad(deg)), y: CY + r * Math.sin(toRad(deg)) });
              const arc = (a1, a2) => {
                const s = pt(a1, R); const e = pt(a2, R);
                return `M${s.x.toFixed(2)} ${s.y.toFixed(2)} A${R} ${R} 0 ${Math.abs(a2-a1)>180?1:0} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
              };
              const endAngle = START + (hasData ? (val / 100) * ARC : 0);
              return (
                <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="flex-shrink-0">
                  {/* Track */}
                  <path d={arc(START, START+ARC)} fill="none" stroke="rgba(var(--color-neo-cream-rgb),0.12)" strokeWidth={SW} strokeLinecap="round"/>
                  {/* Fill — cream colored like the reference */}
                  {hasData && <path d={arc(START, endAngle)} fill="none" stroke="var(--color-neo-cream)" strokeWidth={SW} strokeLinecap="round"/>}
                </svg>
              );
            })()}
          </div>

          {/* pH — Supersaturated Full Rainbow Spectrum */}
          <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-6">
            <p className="font-subheading text-xs uppercase tracking-widest text-neo-cream/60 mb-4">{t('phLevelTitle')}</p>
            <p className="font-heading text-7xl text-neo-cream leading-none mb-2">
              {latest?.phLevel && latest.phLevel !== '-' ? latest.phLevel : '--'}
            </p>
            {(() => {
              const phVal = latest?.phLevel && latest.phLevel !== '-' ? parseFloat(latest.phLevel) : null;
              const pct = phVal !== null ? Math.min(97, Math.max(3, (phVal / 14) * 100)) : null;
              const label = phVal === null ? null
                : phVal < 6   ? t('acidic')
                : phVal > 7.5 ? t('alkaline')
                : t('idealPh');
              return (
                <div className="mt-4">
                  {label && <p className="font-subheading text-[10px] uppercase tracking-widest text-neo-cream/50 mb-4">{label}</p>}
                  {/* Triangle pointer above bar */}
                  <div className="relative mb-0" style={{height:'16px'}}>
                    {pct !== null && (
                      <div
                        className="absolute bottom-0 transition-all duration-500"
                        style={{left:`calc(${pct}% - 7px)`}}
                      >
                        <svg width="14" height="10" viewBox="0 0 14 10">
                          <polygon points="7,10 0,0 14,0" fill="var(--color-neo-cream)"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Bar with vertical line marker */}
                  <div
                    className="relative h-10 rounded-full overflow-hidden"
                    style={{
                      background: 'linear-gradient(to right,'
                        + 'hsl(0,100%,45%),'     /* vivid red */
                        + 'hsl(20,100%,50%),'    /* vivid orange-red */
                        + 'hsl(36,100%,50%),'    /* vivid orange */
                        + 'hsl(55,100%,48%),'    /* vivid yellow */
                        + 'hsl(90,100%,38%),'    /* vivid yellow-green */
                        + 'hsl(130,100%,38%),'   /* vivid green */
                        + 'hsl(175,100%,38%),'   /* vivid cyan-green */
                        + 'hsl(200,100%,45%),'   /* vivid cyan */
                        + 'hsl(240,100%,55%),'   /* vivid blue */
                        + 'hsl(270,100%,50%)'    /* vivid violet */
                      + ')'
                    }}
                  >
                    {pct !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/70 transition-all duration-500 z-10"
                        style={{left:`${pct}%`}}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="font-body text-[10px] text-neo-cream/50">0 (ACIDIC)</span>
                    <span className="font-body text-[10px] text-neo-cream/50">7 (NEUTRAL)</span>
                    <span className="font-body text-[10px] text-neo-cream/50">14 (ALKALINE)</span>
                  </div>
                </div>
              );
            })()}
          </div>


          {/* NPK LEVELS */}
          <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-6">
              <p className="font-subheading font-bold text-sm uppercase tracking-widest text-neo-cream">
                {t('npkLevels')}
              </p>

            </div>
            <div className="space-y-5">
              {[
                { label: 'N (Nitrogen)', key: 'nitrogen', max: 150 },
                { label: 'P (Phosphorus)', key: 'phosphorus', max: 80 },
                { label: 'K (Potassium)', key: 'potassium', max: 200 },
              ].map(({ label, key, max }) => {
                const raw = latest?.[key];
                const val = raw && raw !== '-' ? parseFloat(raw) : null;
                const pct = val !== null ? Math.min(100, (val / max) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="font-body text-neo-cream/80 text-sm">{label}</span>
                      <span className="font-subheading font-bold text-neo-cream text-sm">
                        {val !== null ? `${raw} mg/kg` : '-- mg/kg'}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-neo-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-neo-green-dark transition-all duration-700"
                        style={{width: `${pct}%`}}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WEATHER CARD */}
          <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-6 sm:col-span-2 lg:col-span-1">
            {(() => {
              // Weather icon SVGs keyed by WMO code range or description
              const WeatherIcon = ({ code, size = 48, className = '' }) => {
                const s = size;
                if (code === null || code === undefined) {
                  // No data — dashes
                  return <svg width={s} height={s} viewBox="0 0 48 48" className={className}><text x="50%" y="55%" textAnchor="middle" fill="currentColor" fontSize="22" fontWeight="bold">--</text></svg>;
                }
                const c = Number(code);
                // Sunny / clear
                if (c === 0) return (
                  <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className}>
                    <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="2.5"/>
                    {[0,45,90,135,180,225,270,315].map(a => { const r=Math.PI*a/180; return <line key={a} x1={24+13*Math.cos(r)} y1={24+13*Math.sin(r)} x2={24+17*Math.cos(r)} y2={24+17*Math.sin(r)} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>; })}
                  </svg>
                );
                // Partly cloudy
                if (c <= 2) return (
                  <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className}>
                    <circle cx="18" cy="18" r="6" stroke="currentColor" strokeWidth="2"/>
                    {[0,60,120,180,240,300].map(a => { const r=Math.PI*a/180; return <line key={a} x1={18+9*Math.cos(r)} y1={18+9*Math.sin(r)} x2={18+12*Math.cos(r)} y2={18+12*Math.sin(r)} stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>; })}
                    <rect x="16" y="24" width="20" height="10" rx="5" fill="currentColor" opacity="0.25"/>
                    <path d="M14 34 Q14 28 20 28 Q21 24 26 24 Q32 24 32 30 Q36 30 36 34 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                );
                // Overcast
                if (c === 3) return (
                  <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className}>
                    <path d="M10 32 Q10 24 18 24 Q20 18 28 18 Q38 18 38 28 Q44 28 44 34 Q44 38 10 38 Q8 38 8 34 Z" stroke="currentColor" strokeWidth="2.2" fill="none"/>
                  </svg>
                );
                // Rain (51-67, 80-82)
                if ((c>=51&&c<=67)||(c>=80&&c<=82)) return (
                  <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className}>
                    <path d="M10 26 Q10 18 18 18 Q20 12 28 12 Q38 12 38 22 Q44 22 44 28 Q44 32 38 32 H10 Q8 32 8 28 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    {[[16,36],[22,40],[28,36],[34,40]].map(([x,y],i)=><line key={i} x1={x} y1="34" x2={x-2} y2={y} stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>)}
                  </svg>
                );
                // Thunderstorm (95-99)
                if (c>=95) return (
                  <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className}>
                    <path d="M10 26 Q10 18 18 18 Q20 12 28 12 Q38 12 38 22 Q44 22 44 28 Q44 32 38 32 H10 Q8 32 8 28 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M26 32 L22 40 L26 40 L22 48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                );
                // Snow (71-77, 85-86)
                if ((c>=71&&c<=77)||(c>=85&&c<=86)) return (
                  <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className}>
                    <path d="M10 26 Q10 18 18 18 Q20 12 28 12 Q38 12 38 22 Q44 22 44 28 Q44 32 38 32 H10 Q8 32 8 28 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    {[[16,36],[22,39],[28,36],[34,39]].map(([x,y],i)=><text key={i} x={x-3} y={y} fontSize="8" fill="currentColor">*</text>)}
                  </svg>
                );
                // Foggy (45,48)
                if (c===45||c===48) return (
                  <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className}>
                    {[18,24,30].map(y=><line key={y} x1="8" y1={y} x2="40" y2={y} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>)}
                  </svg>
                );
                // Default: partly cloudy
                return (
                  <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className={className}>
                    <path d="M14 34 Q14 26 22 26 Q24 20 30 20 Q38 20 38 28 Q42 28 42 34 Q42 38 14 38 Q12 38 12 34 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                );
              };

              // Derive weather condition from browser location OR simulated if missing
              const temp = browserWeather ? browserWeather.temperature : (latest?.temperature && latest.temperature !== '-' ? parseFloat(latest.temperature) : null);
              const humid = browserWeather ? browserWeather.humidity : (latest?.humidity && latest.humidity !== '-' ? parseFloat(latest.humidity) : null);
              // Simulate weather code from sensor context
              let simCode = null;
              let conditionLabel = '--';
              let rainfallLabel = null;
              if (temp !== null) {
                if (humid !== null && humid > 85) { simCode = 61; conditionLabel = t('rainy'); rainfallLabel = 'High humidity'; }
                else if (humid !== null && humid > 70) { simCode = 2; conditionLabel = t('partlyCloudy'); }
                else if (humid !== null && humid > 50) { simCode = 3; conditionLabel = t('overcast'); }
                else { simCode = 0; conditionLabel = t('clear'); }
              }

              return (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <p className="font-subheading text-xs uppercase tracking-widest text-neo-cream/60">
                      {t('weather')}
                    </p>
                    {(latest?.raw || browserWeather) && (
                      <div className="flex items-center gap-1.5 text-neo-cream/50">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span className="font-subheading text-[10px] tracking-wider uppercase">
                          {browserWeather 
                            ? `${Number(browserWeather.lat).toFixed(2)}, ${Number(browserWeather.lon).toFixed(2)}`
                            : (latest?.raw?.latitude && latest?.raw?.longitude 
                              ? `${Number(latest.raw.latitude).toFixed(2)}, ${Number(latest.raw.longitude).toFixed(2)}` 
                              : 'Field Station 1')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Main weather display */}
                  <div className="flex items-center gap-4 mb-4">
                    <WeatherIcon code={simCode} size={64} className="text-neo-cream flex-shrink-0"/>
                    <div>
                      <p className="font-heading text-6xl text-neo-cream leading-none">
                        {temp !== null ? `${temp}` : '--'}<span className="text-2xl text-neo-cream/50">°C</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="font-body text-neo-cream/70 text-base">{conditionLabel}</p>
                        {humid !== null && (
                          <>
                            <span className="text-neo-cream/30 text-sm">•</span>
                            <div className="flex items-center gap-1 text-neo-cream/70 text-sm">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                              {humid}%
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {rainfallLabel && (
                    <div className="flex items-center gap-2 mb-4">
                      <svg width="16" height="16" viewBox="0 0 48 48" fill="none" className="text-neo-cream/50 flex-shrink-0">
                        <path d="M10 26 Q10 18 18 18 Q20 12 28 12 Q38 12 38 22 Q44 22 44 28 Q44 32 38 32 H10 Q8 32 8 28 Z" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                        {[[16,36],[22,40],[28,36]].map(([x,y],i)=><line key={i} x1={x} y1="34" x2={x-2} y2={y} stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>)}
                      </svg>
                      <span className="font-body text-neo-cream/50 text-xs">{rainfallLabel}</span>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-neo-cream/15 pt-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { day: t('today'), code: simCode, t: temp },
                        { day: t('tomorrow'), code: simCode !== null ? (simCode === 0 ? 2 : simCode) : null, t: temp !== null ? temp + 2 : null },
                        { day: new Date(Date.now()+172800000).toLocaleDateString('en',{weekday:'short'}).toUpperCase(), code: simCode !== null ? 61 : null, t: temp !== null ? temp - 3 : null },
                      ].map(({ day, code, t }, i) => (
                        <div key={i}>
                          <p className="font-subheading text-[10px] uppercase tracking-widest text-neo-cream/50 mb-2">{day}</p>
                          <WeatherIcon code={code} size={28} className="text-neo-cream mx-auto mb-2"/>
                          <p className="font-heading text-xl text-neo-cream">{t !== null ? `${Math.round(t)}` : '--'}<span className="text-xs text-neo-cream/50">°</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* SOIL TEMPERATURE */}
          <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-6">
            <p className="font-subheading text-xs uppercase tracking-widest text-neo-cream/60 mb-4">
              {t('soilTemperatureTitle')}
            </p>
            {/* Big number + unit */}
            <div className="flex items-baseline gap-3 mb-4">
              <p className="font-heading text-7xl text-neo-cream leading-none">
                {latest?.soilTemp && latest.soilTemp !== '-' ? latest.soilTemp : '--'}
              </p>
              {latest?.soilTemp && latest.soilTemp !== '-' && (
                <span className="font-heading text-2xl text-neo-cream/60">°C</span>
              )}
            </div>
            {/* Status badge */}
            {latest?.soilTemp && latest.soilTemp !== '-' && (() => {
              const v = parseFloat(latest.soilTemp);
              const status = v < 15 ? 'COLD' : v > 30 ? 'HOT' : 'OPTIMAL';
              const badgeColor = status === 'OPTIMAL'
                ? 'border-neo-green-dark text-neo-green-light'
                : 'border-red-500/60 text-red-400';
              return (
                <span className={`font-subheading font-bold text-[11px] uppercase tracking-widest px-3 py-1 rounded-full border inline-block mb-6 ${badgeColor}`}
                  style={{backgroundImage:'none', backgroundColor:'transparent'}}>
                  {status}
                </span>
              );
            })()}
            {/* Green gradient range bar */}
            {(() => {
              const TEMP_MAX = 50.0;
              const tempVal = latest?.soilTemp && latest.soilTemp !== '-' ? parseFloat(latest.soilTemp) : null;
              const pct = tempVal !== null ? Math.min(97, Math.max(3, (tempVal / TEMP_MAX) * 100)) : null;
              return (
                <div className="mt-auto">
                  {/* Oval marker pointer */}
                  <div className="relative mb-0" style={{height:'16px'}}>
                    {pct !== null && (
                      <div
                        className="absolute bottom-0 w-5 h-5 rounded-full border-2 border-[var(--color-neo-dark)] shadow-lg transition-all duration-500 z-10"
                        style={{
                          left: `calc(${pct}% - 10px)`,
                          background: 'var(--color-neo-cream)'
                        }}
                      />
                    )}
                  </div>
                  {/* Bar: bright green (left) → dark green (right) */}
                  <div
                    className="relative h-5 rounded-full overflow-hidden"
                    style={{
                      background: 'linear-gradient(to right, #22c55e, #16a34a, #15803d, #166534, #14532d)'
                    }}
                  />
                  {/* Range labels */}
                  <div className="flex justify-between mt-2">
                    <span className="font-body text-[10px] text-neo-cream/40">0°C</span>
                    <span className="font-body text-[10px] text-neo-cream/40">Optimal: 15°C – 30°C</span>
                    <span className="font-body text-[10px] text-neo-cream/40">50°C</span>
                  </div>
                </div>
              );
            })()}
          </div>

        </div>

        {/* ── STATUS LOG ───────────────────────────────────────────────── */}
        {statusMessage && (
          <div className="neo-card border-l-4 border-neo-green-dark rounded-2xl p-4 mb-6 font-body text-neo-cream/80 text-sm">
            {statusMessage}
          </div>

        )}

        {/* 2-column: [DEVICE (1/3)] [DEVICE INFO (2/3)] */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

          {/* Col 1 — Device card (with query textarea) */}
          <div className="neo-card lg:col-span-1" style={{backgroundImage:'none',backgroundColor:'rgba(21,122,38,0.12)',border:'2px solid var(--color-neo-green-dark)',borderRadius:'1rem',boxShadow:'4px 4px 0px var(--color-neo-green-dark)',padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1rem'}}>
            <p className="font-subheading text-xs uppercase tracking-widest text-neo-green-light">
              {t('deviceTitle')}
            </p>
            {deviceId ? (
              <>
                <p className="font-body text-sm text-neo-green-light font-bold break-all">{deviceId}</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleGetData}
                    disabled={loading}
                    className="w-full bg-neo-green-dark text-neo-cream border border-neo-green-light rounded-xl py-2.5 text-xs font-bold font-subheading uppercase tracking-widest transition-all hover:bg-neo-cream hover:text-neo-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? t('reading') : t('getData')}
                  </button>
                  <button
                    onClick={handleLoadMockData}
                    className="w-full bg-[var(--color-neo-surface)] text-neo-cream border border-neo-cream/40 rounded-xl py-2.5 text-xs font-bold font-subheading uppercase tracking-widest transition-all hover:bg-neo-cream hover:text-neo-dark"
                    style={{backgroundImage:'none'}}
                  >
                    {t('demoDataBtn')}
                  </button>
                  <button
                    onClick={() => {
                      setDeviceId('');
                      localStorage.removeItem('captured_device_id');
                      setManualDeviceId('');
                      setStatusMessage(language === 'hi' ? 'डिवाइस ID हटाया — नया ID डालें' : 'Device cleared — enter new ID');
                      setTimeout(() => setStatusMessage(''), 3000);
                    }}
                    className="w-full bg-transparent text-neo-cream/50 border border-neo-cream/20 rounded-xl py-2 text-[11px] font-subheading uppercase tracking-widest transition-all hover:border-neo-cream/60 hover:text-neo-cream/80"
                  >
                    {t('changeDevice')}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleManualDeviceIdSubmit} className="space-y-3">
                <p className="text-xs text-neo-cream/60 font-body">
                  {language === 'hi' ? 'डिवाइस ID डालें या चुनें' : 'Enter or Select Device ID'}
                </p>
                
                {availableDevices.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] uppercase tracking-widest text-neo-green-light/80 mb-2">
                      {language === 'hi' ? 'उपलब्ध डिवाइस:' : 'Available Devices:'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableDevices.map(d => (
                        <button
                          key={d.deviceId}
                          type="button"
                          onClick={() => setManualDeviceId(d.deviceId)}
                          className="px-2.5 py-1.5 bg-neo-green-dark/20 text-neo-cream border border-neo-green-dark rounded-lg text-xs hover:bg-neo-green-dark/40 transition-colors flex items-center gap-1.5"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${d.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {d.deviceId}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  value={manualDeviceId}
                  onChange={(e) => setManualDeviceId(e.target.value)}
                  placeholder="ESP32_FIELD_UNIT_1"
                  className="w-full border border-neo-cream/40 rounded-xl px-3 py-2.5 text-xs font-body text-neo-cream focus:outline-none focus:border-neo-green-light"
                  style={{backgroundColor:'var(--color-neo-surface)',backgroundImage:'none'}}
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-neo-green-dark text-neo-cream border border-neo-green-light rounded-xl py-2.5 text-xs font-bold uppercase font-subheading tracking-widest"
                >
                  {language === 'hi' ? 'जोड़ें' : 'CONNECT'}
                </button>
              </form>
            )}
            {/* Additional Query */}
            <div className="border-t border-neo-green-dark/40 pt-4 flex flex-col flex-1">
              <p className="font-subheading text-[10px] uppercase tracking-widest text-neo-green-light/60 mb-2">
                {t('additionalQuery')}
              </p>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('queryPlaceholder')}
                className="w-full flex-1 min-h-[160px] text-neo-cream border border-neo-cream/20 rounded-xl px-3 py-3 focus:outline-none focus:border-neo-green-light/60 resize-none font-body text-xs leading-relaxed"
                style={{backgroundColor:'rgba(21,122,38,0.08)', backgroundImage:'none'}}
              />
            </div>
          </div>

          {/* Col 2 — Device Info (Takes up remaining 2 columns) */}
          <div className="space-y-4 lg:col-span-2">
            {/* Sensor data table (collapsible) */}
            {devices.length > 0 && (
              <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] overflow-hidden">
                <div className="p-4 border-b border-neo-cream/20 flex items-center justify-between">
                  <h3 className="font-subheading font-bold text-sm uppercase tracking-widest text-neo-cream">
                    {t('deviceInformation')}
                  </h3>
                  <button
                    onClick={() => setShowAllRows(!showAllRows)}
                    className="text-xs font-body text-neo-cream/50 hover:text-neo-cream"
                  >
                    {showAllRows ? t('showLess') : `${t('allDevices')} (${devices.length})`}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-body">
                    <thead>
                      <tr style={{backgroundColor:'var(--color-table-1)'}} className="text-neo-cream/60 uppercase tracking-wide">
                        {[t('tableDevice'), t('tableTemp'), t('tableHumid'), t('tableSoil'), t('tableN'), t('tableP'), t('tableK'), t('tablePh'), t('tableTime')].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-left font-subheading whitespace-nowrap border-b border-neo-cream/10">{h}</th>
                        ))}
                      </tr>

                    </thead>
                    <tbody>
                      {(showAllRows ? devices : devices.slice(0, 4)).map((d, i) => (
                        <tr key={`${d.id}-${i}`} className="border-b border-neo-cream/10 transition-colors" style={{backgroundColor: i%2===0 ? 'var(--color-neo-surface)' : 'var(--color-table-1)'}}>
                          <td className="px-4 py-3 whitespace-nowrap text-neo-cream">{d.id}</td>
                          <td className="px-4 py-3 text-neo-cream">{d.temperature}</td>
                          <td className="px-4 py-3 text-neo-cream">{d.humidity}</td>
                          <td className="px-4 py-3 text-neo-cream">{d.soil}</td>
                          <td className="px-4 py-3 text-neo-green-light">{d.nitrogen}</td>
                          <td className="px-4 py-3 text-neo-green-light">{d.phosphorus}</td>
                          <td className="px-4 py-3 text-neo-green-light">{d.potassium}</td>
                          <td className="px-4 py-3 text-neo-green-light">{d.phLevel}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-neo-cream/50">{d.timestamp}</td>
                        </tr>

                      ))}
                      {/* Empty row padding so the table doesn't collapse and looks structured */}
                      {(!showAllRows && devices.length < 4) && Array.from({ length: 4 - devices.length }).map((_, i) => (
                        <tr key={`empty-${i}`} className="border-b border-neo-cream/10 transition-colors" style={{backgroundColor: (devices.length + i)%2===0 ? 'var(--color-neo-surface)' : 'var(--color-table-1)'}}>
                          <td className="px-4 py-3 whitespace-nowrap text-neo-cream/20">--</td>
                          <td className="px-4 py-3 text-neo-cream/20">--</td>
                          <td className="px-4 py-3 text-neo-cream/20">--</td>
                          <td className="px-4 py-3 text-neo-cream/20">--</td>
                          <td className="px-4 py-3 text-neo-green-light/20">--</td>
                          <td className="px-4 py-3 text-neo-green-light/20">--</td>
                          <td className="px-4 py-3 text-neo-green-light/20">--</td>
                          <td className="px-4 py-3 text-neo-green-light/20">--</td>
                          <td className="px-4 py-3 whitespace-nowrap text-neo-cream/20">--</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            )}

            {/* Export / Clear buttons */}
            {devices.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={handleExportJSON}
                  className="flex-1 neo-card border-2 border-neo-cream text-neo-cream rounded-xl py-3 text-xs font-bold font-subheading uppercase shadow-[4px_4px_0px_var(--color-neo-cream)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_var(--color-neo-cream)] transition-all"
                >
                  {language === 'hi' ? 'JSON निर्यात' : 'EXPORT JSON'}
                </button>
                <button
                  onClick={handleClearData}
                  className="flex-1 border-2 border-red-500/50 text-red-400 rounded-xl py-3 text-xs font-bold font-subheading uppercase hover:bg-red-900/20 transition-all" style={{backgroundImage:'none', backgroundColor:'transparent'}}
                >
                  {language === 'hi' ? 'साफ करें' : 'CLEAR'}
                </button>
              </div>

            )}
          </div>
        </div>

        {/* ── STAGE & AREA (Full Width Row) ────────────────────────────── */}
        <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-5 mb-6">
          <h3 className="font-subheading font-bold text-sm uppercase tracking-widest text-neo-cream mb-4">
            {language === 'hi' ? 'चरण और क्षेत्र' : 'STAGE & AREA'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neo-cream/50 font-subheading uppercase tracking-wide mb-2">
                {language === 'hi' ? 'फसल चरण' : 'Crop Stage'}
              </label>
              <select
                value={cropStage}
                onChange={(e) => setCropStage(e.target.value)}
                className="w-full text-neo-cream border-2 border-neo-cream/60 rounded-xl px-3 py-2.5 focus:outline-none focus:border-neo-cream font-body text-sm"
              >
                <option value="">{language === 'hi' ? 'चुनें' : 'Select'}</option>
                <option value="sowing">{language === 'hi' ? 'बुवाई' : 'Sowing'}</option>
                <option value="germination">{language === 'hi' ? 'अंकुरण' : 'Germination'}</option>
                <option value="tillering">{language === 'hi' ? 'कल्ले' : 'Tillering'}</option>
                <option value="vegetative">{language === 'hi' ? 'बढ़ोतरी' : 'Vegetative'}</option>
                <option value="flowering">{language === 'hi' ? 'फूल' : 'Flowering'}</option>
                <option value="grain-filling">{language === 'hi' ? 'दाना' : 'Grain Filling'}</option>
                <option value="ripening">{language === 'hi' ? 'पकना' : 'Ripening'}</option>
                <option value="harvesting">{language === 'hi' ? 'कटाई' : 'Harvesting'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neo-cream/50 font-subheading uppercase tracking-wide mb-2">
                {language === 'hi' ? 'खेत क्षेत्र' : 'Field Area'}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={fieldArea}
                  onChange={(e) => setFieldArea(e.target.value)}
                  placeholder="e.g. 5"
                  className="flex-1 text-neo-cream border-2 border-neo-cream/60 rounded-xl px-3 py-2.5 focus:outline-none focus:border-neo-cream font-body text-sm"
                />
                <select
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value)}
                  className="text-neo-cream border-2 border-neo-cream/60 rounded-xl px-3 py-2.5 focus:outline-none font-body text-sm"
                >
                  <option value="bigha">{language === 'hi' ? 'बीघा' : 'Bigha'}</option>
                  <option value="acre">{language === 'hi' ? 'एकड़' : 'Acre'}</option>
                  <option value="hectare">{language === 'hi' ? 'हेक्टेयर' : 'Hectare'}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── RUN AI ANALYSIS ─────────────────────────────────────────── */}
        <div className="mb-6">
          <button
            onClick={() => {
              // Validate device
              if (!deviceId) {
                setErrorPopup({
                  show: true, type: 'error',
                  message: language === 'hi' ? 'पहले डिवाइस ID डालें' : 'Enter Device ID first',
                  solution: language === 'hi' ? 'ऊपर डिवाइस ID बॉक्स में टाइप करें' : 'Type your Device ID in the box above',
                });
                setTimeout(() => setErrorPopup({ show: false, type: '', message: '', solution: '' }), 5000);
                return;
              }
              // Validate sensor data
              if (!devices.length || !devices[0]?.raw) {
                setErrorPopup({
                  show: true, type: 'error',
                  message: language === 'hi' ? 'पहले सेंसर डेटा लें' : 'Get sensor data first',
                  solution: language === 'hi' ? '"Get Data" बटन दबाएं' : 'Click the "Get Data" or "Demo Data" button',
                });
                setTimeout(() => setErrorPopup({ show: false, type: '', message: '', solution: '' }), 5000);
                return;
              }

              // Build telemetry payload
              const lat = devices[0];
              const raw = lat.raw || {};
              const _n = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
              const resolvedPh = raw.ph_level ?? raw.pH ?? lat.phLevel;

              const telemetryPayload = {
                device: raw.device || raw.deviceId || raw.deviceID || lat.id || deviceId,
                temperature: _n(raw.temperature ?? lat.temperature),
                humidity: _n(raw.humidity ?? lat.humidity),
                soil_moisture: _n(raw.soil_moisture ?? raw.soilMoisture ?? raw.moisture ?? lat.soil),
                soilMoisture: _n(raw.soil_moisture ?? raw.soilMoisture ?? raw.moisture ?? lat.soil),
                soilTemperature: _n(raw.soilTemperature ?? lat.soilTemp),
                nitrogen: _n(raw.nitrogen ?? raw.n ?? lat.nitrogen),
                phosphorus: _n(raw.phosphorus ?? raw.p ?? lat.phosphorus),
                potassium: _n(raw.potassium ?? raw.k ?? lat.potassium),
                ph_level: _n(resolvedPh),
                electrical_conductivity: _n(raw.electrical_conductivity ?? raw.ec ?? lat.ec),
                latitude: _n(raw.latitude),
                longitude: _n(raw.longitude),
                timestamp: raw.timestamp || Date.now(),
              };

              // Collect area
              const convertToHectares = (area, unit) => {
                if (!area) return null;
                const a = parseFloat(area);
                if (isNaN(a)) return null;
                return unit === 'bigha' ? (a * 0.25).toFixed(2) : unit === 'acre' ? (a * 0.4047).toFixed(2) : a.toFixed(2);
              };

              // Collect farm history
              let farmHistoryPayload = {};
              try {
                const p = JSON.parse(localStorage.getItem('farmerProfile') || '{}');
                if (Array.isArray(p.crops) && p.crops[0]) {
                  farmHistoryPayload.crop_1_name = p.crops[0].name?.trim() || null;
                  farmHistoryPayload.crop_1_date_grown = p.crops[0].dateGrown || null;
                }
                if (Array.isArray(p.crops) && p.crops[1]) {
                  farmHistoryPayload.crop_2_name = p.crops[1].name?.trim() || null;
                  farmHistoryPayload.crop_2_date_grown = p.crops[1].dateGrown || null;
                }
                if (Array.isArray(p.fertilizers) && p.fertilizers[0]) {
                  const f = p.fertilizers[0];
                  farmHistoryPayload.fertilizer_used_name = f.name?.trim() || null;
                  farmHistoryPayload.fertilizer_amount = f.amount ? parseFloat(f.amount) : null;
                  farmHistoryPayload.fertilizer_unit = f.unit || null;
                }
              } catch {}

              const requestBody = {
                deviceId,
                telemetry: telemetryPayload,
                cropType: selectedCrop || 'unknown',
                cropStage: cropStage || 'unknown',
                fieldArea: convertToHectares(fieldArea, areaUnit) || null,
                soilPH: telemetryPayload.ph_level || null,
                language: language || 'en',
                additionalQuery: query || 'None',
                farmHistory: farmHistoryPayload,
              };

              // Navigate to the dedicated results page, passing requestBody in router state
              navigate('/analysis-results', { state: { requestBody } });
            }}
            className="w-full font-body font-bold uppercase text-neo-cream text-xl sm:text-2xl py-5 rounded-2xl border-2 transition-all duration-200 bg-neo-green-dark border-neo-cream shadow-[6px_6px_0px_var(--color-neo-cream)] hover:translate-y-[3px] hover:translate-x-[3px] hover:shadow-[3px_3px_0px_var(--color-neo-cream)]"
          >
            {t('runAIAnalysis')}
          </button>
        </div>


        {/* ── TERMINAL LOADING ANIMATION ──────────────────────────────── */}
        {(aiLoading || (loadingStep > 0 && !showCropResults)) && (
          <div className="mb-6 rounded-2xl overflow-hidden border-2 border-neo-green-dark shadow-[4px_4px_0px_var(--color-neo-green-dark)]" style={{background:'var(--color-neo-dark)'}}>
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neo-green-dark/30" style={{background:'var(--color-table-2)'}}>
              <div className="w-3 h-3 rounded-full bg-red-500/60"/>
              <div className="w-3 h-3 rounded-full bg-yellow-500/60"/>
              <div className="w-3 h-3 rounded-full bg-green-500/60"/>
              <span className="font-mono text-[11px] text-neo-green-light/50 ml-3 tracking-widest">
                AGROMETRIX_AI — soil_analysis.sh
              </span>
              <span className="ml-auto font-mono text-[10px] text-neo-green-dark/70">{loadingStep}/{LOADING_LINES.length}</span>
            </div>
            {/* Body */}
            <div className="p-5 terminal-scanlines" style={{minHeight:'280px', position:'relative'}}>
              <p className="font-mono text-neo-green-dark/70 text-xs mb-4">
                $ ./run_analysis --device {deviceId || 'UNKNOWN'} --mode full-spectrum
              </p>
              {LOADING_LINES.slice(0, loadingStep).map((line, i) => {
                const isLast = i === loadingStep - 1;
                const isDone = i === LOADING_LINES.length - 1;
                return (
                  <div key={i} className={`flex items-center gap-2 mb-1.5 transition-all duration-200 ${isLast && !isDone ? 'text-neo-green-light' : 'text-neo-green-light/45'}`}>
                    <span className="text-neo-green-dark text-xs select-none">{'>'}</span>
                    <span className="font-mono text-xs tracking-wide">{line}</span>
                    {isLast && aiLoading && !isDone && (
                      <span className="animate-blink text-neo-green-light ml-1 text-sm">█</span>
                    )}
                    {isDone && !aiLoading && (
                      <span className="text-neo-green-light ml-2 text-xs font-bold">— DONE</span>
                    )}
                  </div>
                );
              })}
              {/* waiting line when animation finished but AI still thinking */}
              {!aiLoading && loadingStep >= LOADING_LINES.length && !showCropResults && (
                <p className="font-mono text-neo-green-dark/50 text-xs mt-3 animate-pulse">Building results...</p>
              )}
              {aiLoading && loadingStep < LOADING_LINES.length && (
                <div className="flex items-center gap-2 text-neo-green-light/30 mt-1">
                  <span className="text-xs select-none">{'>'}</span>
                  <span className="animate-blink text-sm text-neo-green-light">█</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CROP RECOMMENDATION CARDS ────────────────────────────────── */}
        {showCropResults && parsedResult?.top_crops?.length > 0 && (
          <div className="mb-6 animate-fadeIn">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-heading text-3xl text-neo-cream uppercase leading-none">
                  {language === 'hi' ? 'फसल सुझाव' : language === 'ta' ? 'பயிர் பரிந்துரைகள்' : 'CROP RECOMMENDATIONS'}
                </h2>
                <p className="font-body text-neo-cream/35 text-xs mt-1 uppercase tracking-widest">
                  {parsedResult.top_crops.length} crops ranked by soil match
                </p>
              </div>
              {/* Toggles */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 justify-end">
                <button
                  id="profit-toggle"
                  onClick={() => setProfitMode(m => !m)}
                  className="flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all duration-200"
                  style={{
                    borderColor: 'var(--color-neo-cream)',
                    backgroundColor: 'var(--color-neo-surface)',
                    boxShadow: profitMode ? '0 0 15px rgba(var(--color-neo-cream-rgb),0.2)' : 'none'
                  }}
                >
                  <div className={`w-12 h-6 rounded-full border-2 p-0.5 transition-all duration-200 ${profitMode ? 'border-neo-green-dark bg-neo-green-dark/20' : 'border-neo-cream/40 bg-transparent'}`}>
                    <div className={`w-4 h-4 rounded-full transition-all duration-200 ${profitMode ? 'translate-x-6 bg-neo-green-light' : 'translate-x-0 bg-neo-cream'}`} />
                  </div>
                  <span className="font-subheading text-[12px] uppercase tracking-widest text-neo-cream font-bold">
                    ESTIMATED PROFIT
                  </span>
                </button>

                {/* Companion planting toggle */}
                <button
                  id="companion-toggle"
                  onClick={() => setCompanionMode(m => !m)}
                  className="flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all duration-200"
                  style={{
                    borderColor: 'var(--color-neo-cream)',
                    backgroundColor: 'var(--color-neo-surface)',
                    boxShadow: companionMode ? '0 0 15px rgba(var(--color-neo-cream-rgb),0.2)' : 'none'
                  }}
                >
                  <div className={`w-12 h-6 rounded-full border-2 p-0.5 transition-all duration-200 ${companionMode ? 'border-neo-green-dark bg-neo-green-dark/20' : 'border-neo-cream/40 bg-transparent'}`}>
                    <div className={`w-4 h-4 rounded-full transition-all duration-200 ${companionMode ? 'translate-x-6 bg-neo-green-light' : 'translate-x-0 bg-neo-cream'}`} />
                  </div>
                  <span className="font-subheading text-[12px] uppercase tracking-widest text-neo-cream font-bold">
                    {language === 'hi' ? 'साथी पौधारोपण' : language === 'ta' ? 'துணை நடவு' : 'COMPANION PLANTING'}
                  </span>
                </button>
              </div>
            </div>

            {/* Cards grid — top 3 always visible */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {(showMoreCrops ? parsedResult.top_crops : parsedResult.top_crops.slice(0, 3)).map((crop, i) => {
                const rank = i + 1;
                const matchPct = Number(crop.match_percentage) || 0;
                const isTop = rank === 1;

                // Deterministic mock profit calculation based on crop name length
                let hash = 0;
                for (let j = 0; j < (crop.name || '').length; j++) {
                  hash = (crop.name.charCodeAt(j) + ((hash << 5) - hash)) || 0;
                }
                const baseProfit = 30000 + (Math.abs(hash) % 25000); // Between 30k and 55k INR
                
                let multiplier = 1;
                if (fieldArea && !isNaN(fieldArea)) {
                   const areaNum = parseFloat(fieldArea);
                   if (areaUnit === 'acre') multiplier = areaNum;
                   else if (areaUnit === 'hectare') multiplier = areaNum * 2.47105;
                   else if (areaUnit === 'bigha') multiplier = areaNum * 0.61776;
                   else multiplier = areaNum;
                }
                const totalProfit = baseProfit * (multiplier || 1);
                const formattedProfit = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalProfit);

                return (
                  <div
                    key={i}
                    className={`relative rounded-2xl border-2 p-5 flex flex-col transition-all duration-200 hover:-translate-y-0.5 ${
                      isTop
                        ? 'border-neo-green-dark shadow-[4px_4px_0px_var(--color-neo-green-dark)]'
                        : rank <= 3
                        ? 'border-neo-cream/25 shadow-[3px_3px_0px_rgba(var(--color-neo-cream-rgb),0.12)]'
                        : 'border-neo-cream/12 opacity-80'
                    }`}
                    style={{background:'var(--color-neo-surface)', backgroundImage:'none'}}
                  >
                    {/* Rank badge */}
                    <span className={`absolute top-4 right-4 font-mono text-xs font-bold px-2 py-1 rounded-lg ${
                      rank === 1 ? 'bg-neo-green-dark text-neo-cream' :
                      rank === 2 ? 'bg-neo-cream/10 text-neo-cream/60 border border-neo-cream/20' :
                                   'bg-transparent text-neo-cream/25 border border-neo-cream/10'
                    }`}>
                      #{String(rank).padStart(2,'0')}
                    </span>

                    {/* Crop name */}
                    <div className="pr-10 mb-4">
                      <p className={`font-heading text-2xl leading-none mb-0.5 ${isTop ? 'text-neo-green-light' : 'text-neo-cream'}`}>
                        {crop.name}
                      </p>
                      {isTop && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-neo-green-dark">
                          ★ BEST MATCH
                        </span>
                      )}
                      {rank > 3 && (
                        <span className="font-mono text-[9px] uppercase tracking-widest text-neo-cream/25">
                          LOWER MATCH
                        </span>
                      )}
                    </div>

                    {/* Match percentage + bar */}
                    <div className="mb-4">
                      {profitMode ? (
                        <div className="animate-fadeIn">
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="font-heading text-4xl text-neo-green-light leading-none">{formattedProfit}</span>
                          </div>
                          <p className="font-mono text-[9px] uppercase tracking-widest text-neo-cream/40 border-t border-neo-cream/10 pt-2">
                            Estimated Profit {fieldArea ? `for ${fieldArea} ${areaUnit}` : 'per acre'}
                          </p>
                        </div>
                      ) : (
                        <div className="animate-fadeIn">
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="font-heading text-5xl text-neo-cream leading-none">{matchPct}</span>
                            <span className="font-subheading text-lg text-neo-cream/40">%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(var(--color-neo-cream-rgb),0.08)'}}>
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{
                                width: `${matchPct}%`,
                                background: isTop ? 'var(--color-neo-green-dark)' : rank <= 3 ? 'rgba(var(--color-neo-cream-rgb),0.35)' : 'rgba(var(--color-neo-cream-rgb),0.15)'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reason */}
                    <p className="font-body text-neo-cream/55 text-xs leading-relaxed border-t border-neo-cream/8 pt-3 mb-4 flex-1">
                      {crop.reason}
                    </p>

                    {/* Companion chips — visible only when toggle is ON */}
                    {companionMode && crop.companions?.length > 0 && (
                      <div className="mb-4 animate-fadeIn">
                        <p className="font-subheading text-[9px] uppercase tracking-[0.18em] text-neo-green-light/50 mb-2">
                          COMPANION PLANTS
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {crop.companions.map((c, j) => (
                            <span
                              key={j}
                              className="font-body text-[11px] px-2.5 py-1 rounded-full border border-neo-green-dark/40 text-neo-green-light bg-neo-green-dark/10"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Plant Now CTA */}
                    <button
                      id={`plant-now-crop-${rank}`}
                      onClick={() => navigate('/multi-crop')}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold font-subheading uppercase tracking-widest transition-all duration-150 mt-auto ${
                        isTop
                          ? 'text-neo-cream border border-neo-green-dark hover:bg-neo-cream hover:text-black'
                          : 'border border-neo-cream/15 text-neo-cream/40 hover:border-neo-cream/40 hover:text-neo-cream/70'
                      }`}
                      style={{
                        backgroundImage: 'none',
                        backgroundColor: isTop ? 'var(--color-neo-green-dark)' : 'transparent'
                      }}
                    >
                      {language === 'hi' ? 'अभी लगाएं →' : language === 'ta' ? 'இப்போது நடவும் →' : 'PLANT NOW →'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Show More / Less toggle */}
            {parsedResult.top_crops.length > 3 && (
              <button
                id="show-more-crops-btn"
                onClick={() => setShowMoreCrops(m => !m)}
                className="w-full py-3 rounded-xl border border-neo-cream/12 text-neo-cream/35 font-subheading text-[11px] uppercase tracking-widest hover:border-neo-cream/25 hover:text-neo-cream/55 transition-all duration-150"
                style={{background:'transparent', backgroundImage:'none'}}
              >
                {showMoreCrops
                  ? '▲  SHOW LESS'
                  : `▼  SHOW ${parsedResult.top_crops.length - 3} MORE CROP${parsedResult.top_crops.length - 3 > 1 ? 'S' : ''} — LOWER MATCH`}
              </button>
            )}
          </div>
        )}

        {/* ── SOIL HEALTH SCORE ────────────────────────────────────────── */}
        {showCropResults && parsedResult?.soil_score != null && (
          <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-6 mb-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="font-heading text-2xl text-neo-cream uppercase leading-none mb-1">
                  {language === 'hi' ? 'मृदा स्वास्थ्य स्कोर' : language === 'ta' ? 'மண் ஆரோக்கிய மதிப்பெண்' : 'SOIL HEALTH SCORE'}
                </h3>
                <p className="font-subheading text-[10px] uppercase tracking-widest text-neo-cream/35">
                  Based on NPK · pH · Moisture
                </p>
              </div>
              {/* Score badge */}
              <div className="flex items-baseline gap-1 flex-shrink-0">
                <span className="font-heading leading-none text-neo-cream" style={{fontSize:'clamp(3rem,8vw,4.5rem)'}}>
                  {parsedResult.soil_score}
                </span>
                <span className="font-subheading text-2xl text-neo-cream/35">/100</span>
              </div>
            </div>
            {/* Score bar */}
            <div className="h-3 rounded-full overflow-hidden mb-5" style={{background:'rgba(var(--color-neo-cream-rgb),0.08)'}}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${parsedResult.soil_score}%`,
                  background: parsedResult.soil_score >= 75
                    ? 'linear-gradient(to right, var(--color-neo-green-dark), #22c55e)'
                    : parsedResult.soil_score >= 50
                    ? 'linear-gradient(to right, #a16207, #eab308)'
                    : 'linear-gradient(to right, #991b1b, #ef4444)'
                }}
              />
            </div>
            {/* Segment labels */}
            <div className="flex justify-between mb-5">
              <span className="font-mono text-[9px] text-neo-cream/25 uppercase">0</span>
              <span className="font-mono text-[9px] text-neo-cream/25 uppercase">Poor</span>
              <span className="font-mono text-[9px] text-neo-cream/25 uppercase">Fair</span>
              <span className="font-mono text-[9px] text-neo-cream/25 uppercase">Good</span>
              <span className="font-mono text-[9px] text-neo-cream/25 uppercase">100</span>
            </div>
            {/* AI soil summary */}
            {parsedResult.soil_summary && (
              <p className="font-body text-neo-cream/60 text-sm leading-relaxed border-t border-neo-cream/10 pt-4">
                {parsedResult.soil_summary}
              </p>
            )}
          </div>
        )}

        {/* ── ERROR/SUCCESS TOAST ─────────────────────────────────────── */}
        {((showErrorPopup && aiError) || errorPopup.show) && (
          <div className="fixed bottom-6 right-6 z-50 animate-slideUp max-w-sm w-full md:w-auto">
            <div className="neo-card border-2 border-neo-cream rounded-xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-4 flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {errorPopup.type === 'success' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                )}
              </div>
              <div className="flex-1 pr-2">
                <h3 className="font-subheading font-bold text-neo-cream text-sm">
                  {errorPopup.message || aiError}
                </h3>
                {errorPopup.solution && (
                  <p className="font-body text-neo-cream/70 text-xs mt-1">
                    {errorPopup.solution}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowErrorPopup(false);
                  setAiError('');
                  setErrorPopup({ show: false, message: '', solution: '' });
                }}
                className="flex-shrink-0 text-neo-cream/40 hover:text-neo-cream transition-colors text-lg"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <footer className="border-t border-neo-cream/20 py-6 mt-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-body text-neo-cream/40 text-sm">Powered by</span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neo-cream/30">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="11" height="11" fill="#F25022"/>
                  <rect x="13" width="11" height="11" fill="#7FBA00"/>
                  <rect y="13" width="11" height="11" fill="#00A4EF"/>
                  <rect x="13" y="13" width="11" height="11" fill="#FFB900"/>
                </svg>
                <span className="font-subheading font-semibold text-neo-cream text-sm">Microsoft Phi-4</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-body text-neo-cream/40 text-sm">{t('developedBy')}</span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neo-cream/30 hover:border-neo-cream transition-all">
                <img src="/cloud-balloon-logo.png" alt="Team Anna Mani" className="w-6 h-6 rounded-lg object-contain" />
                <span className="font-subheading font-semibold text-neo-cream text-sm">Team Anna Mani</span>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default AIAnalysis;
