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
      pH: 6.8,
      light: 750,
      gps: '23.5, 77.0',
      timestamp: new Date().toLocaleString(),
      raw: {
        device: 'ESP_6853',
        temperature: 28.5,
        humidity: 65,
        soilMoisture: 42,
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
  const [query, setQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Device ID state - captured from URL or manually entered
  const [deviceId, setDeviceId] = useState('');
  const [showDeviceIdInput, setShowDeviceIdInput] = useState(false);
  const [manualDeviceId, setManualDeviceId] = useState('');
  
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
      setStatusMessage('⚠️ Please enter a Device ID first');
      setShowDeviceIdInput(true);
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }
    
    console.log('Using device ID:', deviceId);

    setLoading(true);
    setStatusMessage('⏳ Requesting data from device...');

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
      
      setStatusMessage('⏳ Device is reading sensors...');
      
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
      setStatusMessage('✓ Successfully fetched data from device!');
      
    } catch (error) {
      console.error('Device fetch error:', error);
      
      // Provide helpful error messages based on error type
      let errorMessage = '❌ Error: ';
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage += `Cannot reach device at ${deviceIP}. Check: (1) Device is powered on, (2) Connected to same WiFi, (3) IP address is correct.`;
      } else if (error.message.includes('CORS')) {
        errorMessage += `CORS issue. Device needs to send Access-Control-Allow-Origin header.`;
      } else {
        errorMessage += `${error.message}. Device: ${deviceIP}`;
      }
      
      setStatusMessage(errorMessage);
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(''), 8000); // Show error for 8 seconds
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
      setStatusMessage('⚠️ Please enter a Device ID first');
      setShowDeviceIdInput(true);
      setTimeout(() => setStatusMessage(''), 4000);
      return;
    }

    if (!devices.length || !devices[0]?.raw) {
      setStatusMessage('⚠️ Fetch the latest sensor data before running AI analysis');
      setTimeout(() => setStatusMessage(''), 4000);
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
      soilMoistureRaw: toNumberOrNull(raw.soilMoistureRaw),
      lightLevel: toNumberOrNull(raw.lightLevel ?? latest.light),
      lightStatus: raw.lightStatus || (latest.light >= 500 ? 'Bright' : 'Dark'),
      latitude: toNumberOrNull(raw.latitude),
      longitude: toNumberOrNull(raw.longitude),
      timestamp: raw.timestamp || Date.now()
    };

    const requestBody = {
      deviceId,
      telemetry: telemetryPayload,
      cropType: selectedCrop || 'unknown',
      cropStage: cropStage || 'unknown',
      fieldArea: fieldArea || null,
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
      setAiError(error.message || 'Failed to generate AI analysis.');
      setStatusMessage('❌ Failed to generate AI analysis');
    } finally {
      setAiLoading(false);
      setTimeout(() => setStatusMessage(''), 8000);
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
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 sm:gap-2 text-sm sm:text-base whitespace-nowrap"
          >
            <span>←</span>
            <span className="hidden xs:inline">{t('backToMenu')}</span>
          </button>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 text-center flex-1 px-2">
            {t('aiAnalysisDashboard')}
          </h1>
          <button
            onClick={handleLanguageSwitch}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-xs sm:text-sm whitespace-nowrap flex items-center gap-1"
          >
            <span className="hidden xs:inline">{language === 'en' ? '🌐 हिन्दी' : '🌐 English'}</span>
            <span className="xs:hidden">🌐</span>
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
              <p className="text-sm text-gray-600">
                {language === 'en' 
                  ? 'Device ID is stored. You can now fetch sensor data.' 
                  : 'डिवाइस ID संग्रहीत है। अब आप सेंसर डेटा प्राप्त कर सकते हैं।'}
              </p>
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
                      : 'कोई डिवाइस ID नहीं मिला'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {language === 'en'
                      ? 'Enter your device ID to connect. If you accessed via local network, it should be auto-detected.'
                      : 'कनेक्ट करने के लिए अपना डिवाइस ID दर्ज करें। यदि आपने स्थानीय नेटवर्क के माध्यम से एक्सेस किया है, तो यह स्वचालित रूप से पहचाना जाना चाहिए।'}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={manualDeviceId}
                  onChange={(e) => setManualDeviceId(e.target.value)}
                  placeholder={language === 'en' ? 'Enter Device ID (e.g., ESP1)' : 'डिवाइस ID दर्ज करें (जैसे ESP1)'}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-mono"
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200 active:scale-95 whitespace-nowrap"
                >
                  {language === 'en' ? '🔗 Connect' : '🔗 कनेक्ट करें'}
                </button>
              </div>

              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  💡 <strong>{language === 'en' ? 'Tip:' : 'सुझाव:'}</strong>{' '}
                  {language === 'en'
                    ? 'The device ID is printed on the Serial Monitor when the ESP8266 starts. Check your device documentation.'
                    : 'ESP8266 शुरू होने पर डिवाइस ID सीरियल मॉनिटर पर प्रिंट होती है। अपने डिवाइस दस्तावेज़ की जांच करें।'}
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Device Information Section */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">{t('deviceInformation')}</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGetData}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-sm sm:text-base active:scale-95"
              >
                {t('getData')}
              </button>
              <button
                onClick={handleExportJSON}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-sm sm:text-base active:scale-95"
              >
                {t('exportJSON')}
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-sm sm:text-base active:scale-95"
              >
                {t('clearData')}
              </button>
            </div>
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
                    <td colSpan="7" className="border border-gray-300 px-4 py-8 text-center text-gray-500 italic">
                      {t('noDataAvailable') || 'No data available. Click "Get Data" to fetch from device.'}
                    </td>
                  </tr>
                ) : (
                  devices.map((device, index) => (
                    <tr key={`${device.id}-${device.timestamp}-${index}`} className="hover:bg-gray-50 bg-white">
                      <td className="border border-gray-300 px-2 sm:px-4 py-2 whitespace-nowrap">{device.id}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2">{device.temperature}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2">{device.humidity}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2">{device.soil}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2">{device.light}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm">{device.gps}</td>
                      <td className="border border-gray-300 px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm">{device.timestamp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                <option value="wheat">{t('wheat')}</option>
                <option value="rice">{t('rice')}</option>
                <option value="maize">{t('maize')}</option>
                <option value="sugarcane">{t('sugarcane')}</option>
                <option value="cotton">{t('cotton')}</option>
              </select>
            </div>

            {/* Crop Stage and Field Area */}
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                {language === 'hi' ? 'फसल चरण और क्षेत्र' : 'Crop Stage & Field Area'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm text-gray-600 mb-2">
                    {language === 'hi' ? 'फसल चरण' : 'Crop Stage'}
                  </label>
                  <select
                    value={cropStage}
                    onChange={(e) => setCropStage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">{language === 'hi' ? 'चुनें' : 'Select'}</option>
                    <option value="seedling">{language === 'hi' ? 'अंकुरण' : 'Seedling'}</option>
                    <option value="vegetative">{language === 'hi' ? 'वृद्धि' : 'Vegetative'}</option>
                    <option value="flowering">{language === 'hi' ? 'फूल आना' : 'Flowering'}</option>
                    <option value="fruiting">{language === 'hi' ? 'फल लगना' : 'Fruiting'}</option>
                    <option value="maturity">{language === 'hi' ? 'परिपक्वता' : 'Maturity'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm text-gray-600 mb-2">
                    {language === 'hi' ? 'क्षेत्र (हेक्टेयर)' : 'Field Area (ha)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={fieldArea}
                    onChange={(e) => setFieldArea(e.target.value)}
                    placeholder={language === 'hi' ? 'जैसे: 2.5' : 'e.g., 2.5'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
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
                  <div className={`${ph.color} h-16 sm:h-20 md:h-24 rounded-lg flex items-center justify-center text-white font-bold shadow-md text-xs sm:text-sm md:text-base`}>
                    {ph.value}
                  </div>
                </div>
              ))}
            </div>
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
                <span>{language === 'hi' ? 'एआई विश्लेषण' : 'AI Analysis'}</span>
              </h3>
              {Number.isFinite(Number(aiResult?.confidence)) && (
                <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  {`${Math.round(Math.max(0, Math.min(1, Number(aiResult.confidence))) * 100)}% ${language === 'hi' ? 'विश्वास' : 'confidence'}`}
                </span>
              )}
            </div>

            {aiLoading && (
              <p className="text-sm sm:text-base text-gray-600">
                {language === 'hi' ? 'कृपया प्रतीक्षा करें, एआई सुझाव तैयार कर रहा है...' : 'Please wait while the AI prepares recommendations...'}
              </p>
            )}

            {!aiLoading && aiError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm sm:text-base">
                {aiError}
              </div>
            )}

            {!aiLoading && aiResult && (
              <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-xl shadow-lg p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🌾</span>
                  {language === 'hi' ? 'AI सिफारिश' : 'AI Recommendation'}
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
                    <strong>{language === 'hi' ? '💬 आपके प्रश्न का उत्तर:' : '💬 Answer:'}</strong>
                    <p className="mt-1">{aiResult.query_answer}</p>
                  </div>
                )}

                {/* Immediate Actions */}
                {Array.isArray(aiResult.immediate_actions) && aiResult.immediate_actions.length > 0 && (
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">
                      {language === 'hi' ? '🎯 तुरंत करें' : '🎯 Immediate Actions'}
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
                      {language === 'hi' ? '⚠️ चेतावनियाँ' : '⚠️ Warnings'}
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
                      {language === 'hi' ? '📊 विश्लेषण' : '📊 Analysis'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {aiResult.analysis.crop_health && (
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs uppercase text-green-600 tracking-wide mb-1">{language === 'hi' ? 'फसल स्वास्थ्य' : 'Crop Health'}</p>
                          <p className="text-sm font-semibold text-green-800">{aiResult.analysis.crop_health}</p>
                        </div>
                      )}
                      {aiResult.analysis.moisture_status && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs uppercase text-blue-600 tracking-wide mb-1">{language === 'hi' ? 'नमी स्थिति' : 'Moisture'}</p>
                          <p className="text-sm font-semibold text-blue-800">{aiResult.analysis.moisture_status}</p>
                        </div>
                      )}
                      {aiResult.analysis.nutrient_status && (
                        <div className="bg-amber-50 rounded-lg p-3">
                          <p className="text-xs uppercase text-amber-600 tracking-wide mb-1">{language === 'hi' ? 'पोषक तत्व' : 'Nutrients'}</p>
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

      {/* Help Button */}
      <button className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-gray-800 text-white rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors duration-200 active:scale-95">
        <span className="text-xl sm:text-2xl">{t('help')}</span>
      </button>
    </div>
  );
};

export default AIAnalysis;
