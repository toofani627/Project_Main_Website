import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useDeviceStore } from '../store/deviceStore';

/**
 * AIAnalysis Component
 * 
 * Full AI Analysis dashboard with:
 * - Device information table with REAL environmental data from ESP8266
 * - Control buttons (Get Data, Export JSON, Clear Data)
 * - Crop type selector dropdown
 * - pH scale visualization
 * - Additional query text area
 * - AI Analysis button
 * 
 * All UI elements automatically translate based on selected language.
 * Fetches real sensor data from ESP8266 via http://<deviceIP>/data endpoint
 */
const AIAnalysis = () => {
  const { t, changeLanguage, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Device store for fetching data from ESP8266
  const { deviceIP, getDeviceDataURL } = useDeviceStore();

  const handleLanguageSwitch = () => {
    // Clear language to show selection screen again
    localStorage.removeItem('language');
    changeLanguage(null);
  };
  
  // Device data state with example data
  const [devices, setDevices] = useState([
    {
      id: 'ESP_6853',
      temperature: 28.5,
      humidity: 65,
      soil: 42,
      soilTemp: 24.8,
      pH: 6.8,
      light: 750,
      gps: '23.5, 77.0',
      timestamp: new Date().toLocaleString(),
      raw: {
        device: 'ESP_6853',
        temperature: 28.5,
        humidity: 65,
        soilMoisture: 42,
        soilTemperature: 24.8,
        soilMoistureRaw: 850,
        pH: 6.8,
        lightLevel: 750,
        lightStatus: 'Bright',
        latitude: 23.5,
        longitude: 77.0,
        timestamp: new Date().toISOString()
      }
    }
  ]);

  const [selectedCrop, setSelectedCrop] = useState('');
  const [cropStage, setCropStage] = useState('');
  const [fieldArea, setFieldArea] = useState('');
  const [areaUnit, setAreaUnit] = useState('bigha'); // Default unit
  const [selectedPH, setSelectedPH] = useState(''); // Selected pH value
  const [query, setQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorPopup, setErrorPopup] = useState({ show: false, message: '', solution: '', type: 'error' });
  
  // Device ID state - captured from URL or manually entered
  const [deviceId, setDeviceId] = useState('');
  const [showDeviceIdInput, setShowDeviceIdInput] = useState(false);
  const [manualDeviceId, setManualDeviceId] = useState('');
  
  // Table display state - show only 4 rows by default
  const [showAllRows, setShowAllRows] = useState(false);
  
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

  /**
   * Fetch sensor data from ESP8266 via WebSocket
   * 
   * NEW FLOW (On-Demand):
   * 1. User clicks "Get Data"
   * 2. Frontend → POST /api/request-data → Azure Server
   * 3. Azure Server → WebSocket → "READ_SENSORS" command → ESP8266
   * 4. ESP8266 reads sensors → WebSocket → Sends data → Azure Server
   * 5. Frontend → GET /api/device-data-ws → Gets latest data → Display
   * 
   * Benefits:
   * - Works from anywhere (no local IP issues!)
   * - Only reads sensors when needed (saves power)
   * - Real-time bidirectional communication
   * 
   * Security: Device ID can be passed via URL parameter (?device_id=ESP1)
   * If not provided, defaults to 'ESP1'
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
    setStatusMessage('⏳ ' + (language === 'hi' ? 'डिवाइस से डेटा मांग रहे हैं...' : language === 'ta' ? 'சாதனத்திலிருந்து தரவு கோருகிறது...' : 'Requesting data from device...'));

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
      
      setStatusMessage('⏳ ' + (language === 'hi' ? 'डिवाइस सेंसर पढ़ रहा है...' : language === 'ta' ? 'சாதனம் உணரிகளை படிக்கிறது...' : 'Device is reading sensors...'));
      
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
      
      // Transform ESP8266 data format to our table format
      // ESP8266 sends: device, temperature, humidity, soilMoisture, lightLevel, latitude, longitude
      const newDevice = {
        id: data.device || data.deviceID || deviceIP,
        temperature: data.temperature || 0,
        humidity: data.humidity || 0,
        soil: data.soilMoisture || 0,
        soilTemp: data.soilTemperature || 0,
        light: data.lightLevel || 0,
        gps: `${data.latitude || 0}, ${data.longitude || 0}`,
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
      
      // Show success popup
      setErrorPopup({
        show: true,
        message: language === 'hi' ? '✓ डेटा मिल गया!' : language === 'ta' ? '✓ தரவு வெற்றிகரமாக பெறப்பட்டது!' : '✓ Data received successfully!',
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

  const handleManualDeviceIdSubmit = (e) => {
    e.preventDefault();
    if (manualDeviceId.trim()) {
      const trimmedId = manualDeviceId.trim();
      setDeviceId(trimmedId);
      localStorage.setItem('captured_device_id', trimmedId);
      console.log('✅ Manual device ID saved:', trimmedId);
      setShowDeviceIdInput(false);
      setManualDeviceId('');
      setStatusMessage(`✓ Device ID set: ${trimmedId}`);
      setTimeout(() => setStatusMessage(''), 3000);
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

    const telemetryPayload = {
      device: raw.device || raw.deviceId || raw.deviceID || latest.id || deviceId,
      temperature: toNumberOrNull(raw.temperature ?? latest.temperature),
      humidity: toNumberOrNull(raw.humidity ?? latest.humidity),
      soilMoisture: toNumberOrNull(raw.soilMoisture ?? latest.soil),
      soilTemperature: toNumberOrNull(raw.soilTemperature ?? latest.soilTemp),
      soilMoistureRaw: toNumberOrNull(raw.soilMoistureRaw),
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

    const requestBody = {
      deviceId,
      telemetry: telemetryPayload,
      cropType: selectedCrop || 'unknown',
      cropStage: cropStage || 'unknown',
      fieldArea: fieldAreaInHectares || null,
      soilPH: selectedPH || null,
      language: language || 'en',
      additionalQuery: query || 'None'
    };

    try {
      setAiLoading(true);
      setAiError('');
      setAiResult(null);
      
      setStatusMessage('🌦️ Fetching weather data...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStatusMessage('✅ Weather data received | 📝 Preparing prompt...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setStatusMessage('🤖 Sending to AI model...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setStatusMessage('⏳ Waiting for AI response...');

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `AI request failed (${response.status})`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error) {
            errorMessage = parsed.error;
          }
        } catch (parseErr) {
          console.warn('AI error response not JSON:', parseErr);
        }
        throw new Error(errorMessage);
      }

      setStatusMessage('📥 Response received | 🔄 Parsing data...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = await response.json();
      setAiResult(result.recommendation || null);
      
      setStatusMessage('✅ Analysis complete | ✓ Successfully parsed!');
    } catch (error) {
      console.error('AI analysis error:', error);
      setAiResult(null);
      
      // Create simple, actionable error message
      let simpleError = language === 'hi' 
        ? 'AI से जवाब नहीं मिला। कृपया दोबारा कोशिश करें।'
        : language === 'ta'
        ? 'AI பதில் தோல்வியுற்றது. மீண்டும் முயற்சிக்கவும்.'
        : 'AI response failed. Please try again.';
      
      // Check for specific errors
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
      } else if (error.message.includes('500') || error.message.includes('502')) {
        simpleError = language === 'hi'
          ? 'सर्वर में दिक्कत है। थोड़ी देर बाद कोशिश करें।'
          : language === 'ta'
          ? 'சேவையக பிரச்சனை. சிறிது நேரம் கழித்து முயற்சிக்கவும்.'
          : 'Server issue. Try again in a moment.';
      }
      
      setAiError(simpleError);
      setShowErrorPopup(true);
      setStatusMessage('');
      
      // Auto-hide popup after 5 seconds
      setTimeout(() => {
        setShowErrorPopup(false);
        setAiError('');
      }, 5000);
    } finally {
      setAiLoading(false);
    }
  };

  // pH scale colors
  const phColors = [
    { value: '4.0', color: 'bg-red-600' },
    { value: '5.0', color: 'bg-orange-500' },
    { value: '6.0', color: 'bg-yellow-400' },
    { value: '7.0', color: 'bg-green-500' },
    { value: '8.0', color: 'bg-cyan-500' },
    { value: '9.0', color: 'bg-blue-600' },
    { value: '10.0', color: 'bg-indigo-700' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm py-3 sm:py-4 px-4 sm:px-6">
        <div className="container mx-auto flex items-center justify-between gap-2">
          <div className="w-24 sm:w-32"></div> {/* Spacer for centering */}
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 text-center flex-1 px-2">
            {t('aiAnalysisDashboard')}
          </h1>
          <button
            onClick={handleLanguageSwitch}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-xs sm:text-sm whitespace-nowrap"
          >
            {language === 'en' ? 'हिं/த' : language === 'hi' ? 'En/த' : 'En/हिं'}
          </button>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Device ID Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              🔐 {language === 'en' ? 'Device Connection' : 'डिवाइस कनेक्शन'}
            </h2>
            {deviceId && (
              <button
                onClick={() => setShowDeviceIdInput(!showDeviceIdInput)}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                {showDeviceIdInput ? '✕ Cancel' : '✏️ Change'}
              </button>
            )}
          </div>

          {/* Current Device ID Display */}
          {deviceId && !showDeviceIdInput ? (
            <div className="bg-white rounded-lg p-4 border-2 border-green-300">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✓</span>
                <span className="font-semibold text-gray-700">
                  {language === 'en' ? 'Connected Device:' : 'कनेक्टेड डिवाइस:'}
                </span>
              </div>
              <div className="font-mono text-xl font-bold text-green-700 mb-1">{deviceId}</div>
              <p className="text-sm text-gray-600 mb-3">
                {language === 'en' 
                  ? 'Device ID is stored. You can now fetch sensor data.' 
                  : 'डिवाइस ID सेव है। अब डेटा ले सकते हैं।'}
              </p>
              
              {/* Get Data Button */}
              <button
                onClick={handleGetData}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors duration-200 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>{language === 'en' ? 'Fetching...' : language === 'hi' ? 'डेटा आ रहा है...' : 'தரவு வருகிறது...'}</span>
                  </>
                ) : (
                  <>
                    <span>📊</span>
                    <span>{t('getData')}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Manual Device ID Entry Form */
            <form onSubmit={handleManualDeviceIdSubmit} className="bg-white rounded-lg p-4 border-2 border-yellow-300">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-700 mb-1">
                    {language === 'en' 
                      ? 'No Device ID detected' 
                      : 'डिवाइस ID नहीं मिला'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {language === 'en'
                      ? 'Enter your device ID to connect. If you accessed via local network, it should be auto-detected.'
                      : 'डिवाइस जोड़ने के लिए ID लिखें। लोकल नेटवर्क से अपने आप मिल जाना चाहिए।'}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={manualDeviceId}
                  onChange={(e) => setManualDeviceId(e.target.value)}
                  placeholder={language === 'en' ? 'Enter Device ID (e.g., ESP1)' : 'डिवाइस ID लिखें (जैसे ESP1)'}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-mono"
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200 active:scale-95 whitespace-nowrap"
                >
                  {language === 'en' ? '🔗 Connect' : '🔗 जोड़ें'}
                </button>
              </div>

              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  💡 <strong>{language === 'en' ? 'Tip:' : 'टिप:'}</strong>{' '}
                  {language === 'en'
                    ? 'The device ID will be shown on the LCD/Screen of the tool. Check your device display.'
                    : 'डिवाइस ID टूल की स्क्रीन पर दिखेगी। अपने डिवाइस की स्क्रीन देखें।'}
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Device Information Section */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">{t('deviceInformation')}</h2>
          </div>

          {/* Environmental Data Table - Fixed height with scroll */}
          <div className="overflow-x-auto overflow-y-auto -mx-4 sm:mx-0 max-h-[400px] sm:max-h-[500px] border border-gray-300 rounded-lg">
            <table className="w-full border-collapse text-sm sm:text-base">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap bg-gray-100">
                    {t('device')}
                  </th>
                  <th className="border border-gray-300 px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap bg-gray-100">
                    {t('temperature')}
                  </th>
                  <th className="border border-gray-300 px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap bg-gray-100">
                    {t('humidity')}
                  </th>
                  <th className="border border-gray-300 px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap bg-gray-100">
                    {t('soil')}
                  </th>
                  <th className="border border-gray-300 px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap bg-gray-100">
                    {t('soilTemp')}
                  </th>
                  <th className="border border-gray-300 px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap bg-gray-100">
                    {t('light')}
                  </th>
                  <th className="border border-gray-300 px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap bg-gray-100">
                    {t('gps')}
                  </th>
                  <th className="border border-gray-300 px-2 sm:px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap bg-gray-100">
                    {t('timestamp')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="border border-gray-300 px-4 py-8 text-center text-gray-500 italic">
                      {t('noDataAvailable') || 'No data available. Click "Get Data" to fetch from device.'}
                    </td>
                  </tr>
                ) : (
                  (showAllRows ? devices : devices.slice(0, 4)).map((device, index) => (
                    <tr key={`${device.id}-${device.timestamp}-${index}`} className="hover:bg-gray-50 bg-white">
                      <td className="border border-gray-300 px-2 sm:px-4 py-2 whitespace-nowrap">{device.id}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2">{device.temperature}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2">{device.humidity}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2">{device.soil}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2">{device.soilTemp}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2">{device.light}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm">{device.gps}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm">{device.timestamp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Show More/Less Button */}
          {devices.length > 4 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAllRows(!showAllRows)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200 active:scale-95"
              >
                {showAllRows 
                  ? (language === 'en' ? '📋 Show Less' : '📋 कम दिखाएं')
                  : (language === 'en' ? `📋 See Complete Table (${devices.length} rows)` : `📋 पूरी टेबल देखें (${devices.length} पंक्तियाँ)`)}
              </button>
            </div>
          )}
        </div>

        {/* Status Log */}
        {statusMessage && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-gray-700">{statusMessage}</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {t('dataUpdated')} {new Date().toLocaleTimeString()}
            </p>
            <p className="text-xs sm:text-sm text-gray-600">{t('readyForAnalysis')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column - Crop Selection and Query */}
          <div className="space-y-4 sm:space-y-6">
            {/* Crop Type Selector */}
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">{t('selectCropType')}</h3>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              >
                <option value="">{t('chooseCrop')}</option>
                <option value="wheat">{language === 'hi' ? '🌾 गेहूं (Wheat)' : language === 'ta' ? '🌾 கோதுமை' : '🌾 Wheat'}</option>
                <option value="rice">{language === 'hi' ? '🍚 धान (Rice)' : language === 'ta' ? '🍚 நெல்' : '🍚 Rice'}</option>
                <option value="maize">{language === 'hi' ? '🌽 मक्का (Maize)' : language === 'ta' ? '🌽 சோளம்' : '🌽 Maize/Corn'}</option>
                <option value="sugarcane">{language === 'hi' ? '🎋 गन्ना (Sugarcane)' : language === 'ta' ? '🎋 கரும்பு' : '🎋 Sugarcane'}</option>
                <option value="cotton">{language === 'hi' ? '☁️ कपास (Cotton)' : language === 'ta' ? '☁️ பருத்தி' : '☁️ Cotton'}</option>
                <option value="soybean">{language === 'hi' ? '🫘 सोयाबीन (Soybean)' : language === 'ta' ? '🫘 சோயாபீன்' : '🫘 Soybean'}</option>
                <option value="chickpea">{language === 'hi' ? '🫛 चना (Chickpea)' : language === 'ta' ? '🫛 கொண்டைக்கடலை' : '🫛 Chickpea/Gram'}</option>
                <option value="pigeon-pea">{language === 'hi' ? '🫘 तूर/अरहर (Pigeon Pea)' : language === 'ta' ? '🫘 துவரை' : '🫘 Pigeon Pea/Arhar'}</option>
                <option value="lentil">{language === 'hi' ? '🫛 मसूर (Lentil)' : language === 'ta' ? '🫛 பருப்பு' : '🫛 Lentil'}</option>
                <option value="groundnut">{language === 'hi' ? '🥜 मूंगफली (Groundnut)' : language === 'ta' ? '🥜 நிலக்கடலை' : '🥜 Groundnut/Peanut'}</option>
                <option value="mustard">{language === 'hi' ? '🌼 सरसों (Mustard)' : language === 'ta' ? '🌼 கடுகு' : '🌼 Mustard'}</option>
                <option value="potato">{language === 'hi' ? '🥔 आलू (Potato)' : language === 'ta' ? '🥔 உருளைக்கிழங்கு' : '🥔 Potato'}</option>
                <option value="onion">{language === 'hi' ? '🧅 प्याज (Onion)' : language === 'ta' ? '🧅 வெங்காயம்' : '🧅 Onion'}</option>
                <option value="tomato">{language === 'hi' ? '🍅 टमाटर (Tomato)' : language === 'ta' ? '🍅 தக்காளி' : '🍅 Tomato'}</option>
                <option value="chili">{language === 'hi' ? '🌶️ मिर्च (Chili)' : language === 'ta' ? '🌶️ மிளகாய்' : '🌶️ Chili/Pepper'}</option>
                <option value="millet">{language === 'hi' ? '🌾 बाजरा (Millet)' : language === 'ta' ? '🌾 கம்பு' : '🌾 Pearl Millet/Bajra'}</option>
                <option value="sorghum">{language === 'hi' ? '🌾 ज्वार (Sorghum)' : language === 'ta' ? '🌾 சோளம்' : '🌾 Sorghum/Jowar'}</option>
                <option value="tea">{language === 'hi' ? '🍵 चाय (Tea)' : language === 'ta' ? '🍵 தேநீர்' : '🍵 Tea'}</option>
                <option value="coffee">{language === 'hi' ? '☕ कॉफी (Coffee)' : language === 'ta' ? '☕ காபி' : '☕ Coffee'}</option>
                <option value="banana">{language === 'hi' ? '🍌 केला (Banana)' : language === 'ta' ? '🍌 வாழை' : '🍌 Banana'}</option>
                <option value="mango">{language === 'hi' ? '🥭 आम (Mango)' : language === 'ta' ? '🥭 மாம்பழம்' : '🥭 Mango'}</option>
              </select>
            </div>

            {/* Crop Stage and Field Area */}
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                {language === 'hi' ? 'फसल का चरण और एरिया' : language === 'ta' ? 'பயிர் நிலை மற்றும் வயல் பரப்பு' : 'Crop Stage & Field Area'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm text-gray-600 mb-2">
                    {language === 'hi' ? 'फसल का चरण' : language === 'ta' ? 'பயிர் நிலை' : 'Crop Stage'}
                  </label>
                  <select
                    value={cropStage}
                    onChange={(e) => setCropStage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">{language === 'hi' ? 'चुनें' : language === 'ta' ? 'தேர்ந்தெடுக்கவும்' : 'Select'}</option>
                    <option value="sowing">{language === 'hi' ? '🌱 बुवाई (Sowing)' : language === 'ta' ? '🌱 விதைத்தல்' : '🌱 Sowing'}</option>
                    <option value="germination">{language === 'hi' ? '🌾 अंकुरण (Germination)' : language === 'ta' ? '🌾 முளைத்தல்' : '🌾 Germination'}</option>
                    <option value="tillering">{language === 'hi' ? '🌿 कल्ले फूटना (Tillering)' : language === 'ta' ? '🌿 கிளை பிரித்தல்' : '🌿 Tillering'}</option>
                    <option value="vegetative">{language === 'hi' ? '🍃 बढ़ोतरी (Growth)' : language === 'ta' ? '🍃 வளர்ச்சி' : '🍃 Vegetative Growth'}</option>
                    <option value="flowering">{language === 'hi' ? '🌸 फूल आना (Flowering)' : language === 'ta' ? '🌸 பூக்கும் நிலை' : '🌸 Flowering'}</option>
                    <option value="grain-filling">{language === 'hi' ? '🌾 दाना भरना (Grain Filling)' : language === 'ta' ? '🌾 தானியம் நிரம்புதல்' : '🌾 Grain Filling'}</option>
                    <option value="ripening">{language === 'hi' ? '🌾 पकना (Ripening)' : language === 'ta' ? '🌾 பழுத்தல்' : '🌾 Ripening'}</option>
                    <option value="harvesting">{language === 'hi' ? '🚜 कटाई (Harvesting)' : language === 'ta' ? '🚜 அறுவடை' : '🚜 Harvesting'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm text-gray-600 mb-2">
                    {language === 'hi' ? 'खेत का क्षेत्रफल' : 'Field Area'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fieldArea}
                      onChange={(e) => setFieldArea(e.target.value)}
                      placeholder={language === 'hi' ? 'जैसे: 5' : 'e.g., 5'}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <select
                      value={areaUnit}
                      onChange={(e) => setAreaUnit(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="bigha">{language === 'hi' ? 'बीघा' : 'Bigha'}</option>
                      <option value="acre">{language === 'hi' ? 'एकड़' : 'Acre'}</option>
                      <option value="hectare">{language === 'hi' ? 'हेक्टेयर' : 'Hectare'}</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'hi' 
                      ? `1 बीघा ≈ 0.25 हेक्टेयर, 1 एकड़ ≈ 0.4 हेक्टेयर` 
                      : `1 Bigha ≈ 0.25 ha, 1 Acre ≈ 0.4 ha`}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Query */}
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">{t('additionalQuery')}</h3>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('queryPlaceholder')}
                rows="5"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm sm:text-base"
              ></textarea>
            </div>
          </div>

          {/* Right Column - pH Scale */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">{t('soilPHScale')}</h3>
            <div className="flex justify-between gap-1 sm:gap-2 mb-3 sm:mb-4">
              {phColors.map((ph) => (
                <div key={ph.value} className="flex-1">
                  <div 
                    onClick={() => setSelectedPH(ph.value)}
                    className={`${ph.color} h-16 sm:h-20 md:h-24 rounded-lg flex items-center justify-center text-white font-bold shadow-md text-xs sm:text-sm md:text-base cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ${selectedPH === ph.value ? 'ring-4 ring-yellow-400 scale-105' : ''}`}
                  >
                    {ph.value}
                  </div>
                </div>
              ))}
            </div>
            {selectedPH && (
              <p className="text-xs sm:text-sm text-green-600 text-center font-semibold mb-2">
                ✓ {language === 'hi' ? `पीएच ${selectedPH} चुना गया` : language === 'ta' ? `pH ${selectedPH} தேர்ந்தெடுக்கப்பட்டது` : `pH ${selectedPH} selected`}
              </p>
            )}
            <p className="text-xs sm:text-sm text-blue-600 text-center font-semibold mb-2">
              📋 {t('phInstruction')}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 text-center italic">
              {t('phNote')}
            </p>
          </div>
        </div>

        {/* AI Analysis Button */}
        <div className="mt-4 sm:mt-6">
          <button
            onClick={handleAIAnalysis}
            disabled={aiLoading}
            className={`w-full text-white font-bold py-3 sm:py-4 rounded-xl text-base sm:text-lg transition-colors duration-200 shadow-lg active:scale-95 ${aiLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {aiLoading ? '⏳ Generating analysis...' : t('runAIAnalysis')}
          </button>
        </div>

        {(aiLoading || aiError || aiResult) && (
          <div className="mt-4 sm:mt-6 bg-white rounded-xl shadow-md p-4 sm:py-6 sm:px-6 border border-indigo-100">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                <span>🤖</span>
                <span>{language === 'hi' ? 'AI जांच' : 'AI Analysis'}</span>
              </h3>
              {Number.isFinite(Number(aiResult?.confidence)) && (
                <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  {`${Math.round(Math.max(0, Math.min(1, Number(aiResult.confidence))) * 100)}% ${language === 'hi' ? 'भरोसा' : 'confidence'}`}
                </span>
              )}
            </div>

            {aiLoading && (
              <p className="text-sm sm:text-base text-gray-600">
                {language === 'hi' ? 'रुकिए, AI सुझाव तैयार कर रहा है...' : 'Please wait while the AI prepares recommendations...'}
              </p>
            )}

            {!aiLoading && aiResult && (
              <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-xl shadow-lg p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🌾</span>
                  {language === 'hi' ? 'AI सुझाव' : 'AI Recommendation'}
                </h3>
                <div className="prose prose-sm sm:prose max-w-none">
                  <p className="text-sm sm:text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {aiResult}
                  </p>
                </div>
              </div>
            )}

            {/* Old complex format - keeping for reference, delete if not needed */}
            {false && aiResult && aiResult.status && (
              <div className="space-y-4 sm:space-y-6">
                {/* Status Badge */}
                {aiResult.status && (
                  <div className={`border px-4 py-3 rounded-lg text-sm sm:text-base font-bold text-center ${
                    aiResult.status === 'GOOD' ? 'bg-green-50 border-green-300 text-green-800' :
                    aiResult.status === 'CAUTION' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
                    'bg-red-50 border-red-300 text-red-800'
                  }`}>
                    {aiResult.status === 'GOOD' ? '✅ ' : aiResult.status === 'CAUTION' ? '⚠️ ' : '🚨 '}
                    {aiResult.status}
                  </div>
                )}

                {/* Query Answer */}
                {aiResult.query_answer && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm sm:text-base">
                    <strong>{language === 'hi' ? '💬 आपके सवाल का जवाब:' : '💬 Answer:'}</strong>
                    <p className="mt-1">{aiResult.query_answer}</p>
                  </div>
                )}

                {/* Immediate Actions */}
                {Array.isArray(aiResult.immediate_actions) && aiResult.immediate_actions.length > 0 && (
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">
                      {language === 'hi' ? '🎯 जल्दी करें' : '🎯 Immediate Actions'}
                    </h4>
                    <div className="space-y-2">
                      {aiResult.immediate_actions.map((item, idx) => (
                        <div key={idx} className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-indigo-900">{item.action}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              item.confidence === 'HIGH' ? 'bg-green-200 text-green-800' :
                              item.confidence === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-gray-200 text-gray-800'
                            }`}>{item.confidence}</span>
                          </div>
                          <p className="text-sm text-gray-700">{item.what}</p>
                          <p className="text-xs text-gray-500 mt-1">⏰ {item.when}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {Array.isArray(aiResult.warnings) && aiResult.warnings.length > 0 && (
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">
                      {language === 'hi' ? '⚠️ सावधानी' : '⚠️ Warnings'}
                    </h4>
                    <div className="space-y-2">
                      {aiResult.warnings.map((item, idx) => (
                        <div key={idx} className={`border rounded-lg p-3 ${
                          item.severity === 'HIGH' ? 'bg-red-50 border-red-300' :
                          item.severity === 'MEDIUM' ? 'bg-orange-50 border-orange-300' :
                          'bg-yellow-50 border-yellow-300'
                        }`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-gray-900">{item.warning}</span>
                            <span className="text-xs px-2 py-1 rounded bg-white">{item.risk}</span>
                          </div>
                          <p className="text-sm text-gray-700">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis */}
                {aiResult.analysis && (
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">
                      {language === 'hi' ? '📊 जांच' : '📊 Analysis'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {aiResult.analysis.crop_health && (
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs uppercase text-green-600 tracking-wide mb-1">{language === 'hi' ? 'फसल की सेहत' : 'Crop Health'}</p>
                          <p className="text-sm font-semibold text-green-800">{aiResult.analysis.crop_health}</p>
                        </div>
                      )}
                      {aiResult.analysis.moisture_status && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs uppercase text-blue-600 tracking-wide mb-1">{language === 'hi' ? 'नमी' : 'Moisture'}</p>
                          <p className="text-sm font-semibold text-blue-800">{aiResult.analysis.moisture_status}</p>
                        </div>
                      )}
                      {aiResult.analysis.nutrient_status && (
                        <div className="bg-amber-50 rounded-lg p-3">
                          <p className="text-xs uppercase text-amber-600 tracking-wide mb-1">{language === 'hi' ? 'खाद' : 'Nutrients'}</p>
                          <p className="text-sm font-semibold text-amber-800">{aiResult.analysis.nutrient_status}</p>
                        </div>
                      )}
                      {aiResult.analysis.disease_pest_risk && (
                        <div className="bg-rose-50 rounded-lg p-3">
                          <p className="text-xs uppercase text-rose-600 tracking-wide mb-1">{language === 'hi' ? 'रोग/कीट' : 'Disease/Pest'}</p>
                          <p className="text-sm font-semibold text-rose-800">{aiResult.analysis.disease_pest_risk}</p>
                        </div>
                      )}
                      {aiResult.analysis.weather_impact && (
                        <div className="bg-purple-50 rounded-lg p-3 sm:col-span-2">
                          <p className="text-xs uppercase text-purple-600 tracking-wide mb-1">{language === 'hi' ? 'मौसम प्रभाव' : 'Weather Impact'}</p>
                          <p className="text-sm font-semibold text-purple-800">{aiResult.analysis.weather_impact}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Midterm Plan */}
                {aiResult.midterm_plan && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-sm sm:text-base font-semibold text-purple-900 mb-2">
                      {language === 'hi' ? '📅 3-7 दिन की योजना' : '📅 3-7 Day Plan'}
                    </h4>
                    <p className="text-sm text-gray-700">{aiResult.midterm_plan}</p>
                  </div>
                )}

                {/* Key Metrics */}
                {aiResult.key_metrics && (
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">
                      {language === 'hi' ? '📈 प्रमुख मेट्रिक्स' : '📈 Key Metrics'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {aiResult.key_metrics.expected_action_days && (
                        <div className="bg-indigo-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-indigo-600 mb-1">{language === 'hi' ? 'कार्रवाई के दिन' : 'Action Days'}</p>
                          <p className="text-2xl font-bold text-indigo-800">{aiResult.key_metrics.expected_action_days}</p>
                        </div>
                      )}
                      {aiResult.key_metrics.yield_impact && (
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-green-600 mb-1">{language === 'hi' ? 'उपज प्रभाव' : 'Yield Impact'}</p>
                          <p className="text-lg font-bold text-green-800">{aiResult.key_metrics.yield_impact}</p>
                        </div>
                      )}
                      {aiResult.key_metrics.next_review && (
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-blue-600 mb-1">{language === 'hi' ? 'अगली समीक्षा' : 'Next Review'}</p>
                          <p className="text-lg font-bold text-blue-800">{aiResult.key_metrics.next_review}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {Array.isArray(aiResult.explanation) && aiResult.explanation.length > 0 && (
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">
                      {language === 'hi' ? 'कारण' : 'Explanation'}
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-gray-700">
                      {aiResult.explanation.map((reason, idx) => (
                        <li key={`reason-${idx}`}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiResult.additional_query && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm sm:text-base text-blue-800">
                    <p className="font-semibold mb-1">{language === 'hi' ? 'अगला प्रश्न' : 'Follow-up Question'}</p>
                    <p>{aiResult.additional_query}</p>
                  </div>
                )}

                <details className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs sm:text-sm">
                  <summary className="cursor-pointer font-semibold">
                    {language === 'hi' ? 'कच्चा JSON देखें' : 'View raw JSON'}
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words">
{JSON.stringify(aiResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error/Success Popup */}
      {(showErrorPopup && aiError) || errorPopup.show ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-slideUp">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {errorPopup.type === 'success' ? (
                  <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {errorPopup.message || aiError}
                </h3>
                {errorPopup.solution && (
                  <p className="text-gray-600 text-sm mt-1">
                    💡 {errorPopup.solution}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowErrorPopup(false);
                  setAiError('');
                  setErrorPopup({ show: false, message: '', solution: '' });
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  setShowErrorPopup(false);
                  setAiError('');
                  setErrorPopup({ show: false, message: '', solution: '' });
                }}
                className={`w-full ${errorPopup.type === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white font-medium py-2 px-4 rounded-lg transition-colors`}
              >
                {language === 'hi' ? 'ठीक है' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Powered by Microsoft Phi-4 */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm font-medium">Powered by</span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="11" height="11" fill="#F25022"/>
                  <rect x="13" width="11" height="11" fill="#7FBA00"/>
                  <rect y="13" width="11" height="11" fill="#00A4EF"/>
                  <rect x="13" y="13" width="11" height="11" fill="#FFB900"/>
                </svg>
                <span className="font-semibold text-gray-800">Microsoft Phi-4</span>
              </div>
            </div>

            {/* Developed by toofani627 */}
            <div className="flex items-center gap-3">
              <span className="text-gray-600 text-sm font-medium">Developed by</span>
              <a 
                href="https://github.com/toofani627" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
              >
                <img 
                  src="/toofani627-logo.png" 
                  alt="toofani627" 
                  className="w-8 h-8 rounded-full object-cover ring-2  "
                />
                <span className="font-semibold text-gray-800">toofani627</span>
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AIAnalysis;
