import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

/**
 * AIAnalysis Component
 * 
 * Full AI Analysis dashboard with:
 * - Device information table with mock environmental data
 * - Control buttons (Get Data, Export JSON, Clear Data)
 * - Crop type selector dropdown
 * - pH scale visualization
 * - Additional query text area
 * - AI Analysis button
 * 
 * All UI elements automatically translate based on selected language.
 */
const AIAnalysis = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Mock device data
  const [devices, setDevices] = useState([
    {
      id: 'Device_001',
      temperature: 28.5,
      humidity: 65,
      soil: 45,
      light: 850,
      gps: '28.6139, 77.2090',
      timestamp: '2025-11-01 10:23:45'
    },
    {
      id: 'Device_002',
      temperature: 29.2,
      humidity: 62,
      soil: 48,
      light: 820,
      gps: '28.6140, 77.2091',
      timestamp: '2025-11-01 10:24:12'
    },
    {
      id: 'Device_003',
      temperature: 27.8,
      humidity: 68,
      soil: 42,
      light: 880,
      gps: '28.6138, 77.2089',
      timestamp: '2025-11-01 10:24:45'
    }
  ]);

  const [selectedCrop, setSelectedCrop] = useState('');
  const [query, setQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Handler functions
  const handleGetData = () => {
    setStatusMessage(t('successfullyFetched'));
    setTimeout(() => setStatusMessage(''), 3000);
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

  const handleAIAnalysis = () => {
    setStatusMessage(t('readyForAnalysis'));
    // UI-only action for now
    setTimeout(() => setStatusMessage(''), 3000);
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
      <div className="bg-white shadow-sm py-4 px-6">
        <div className="container mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
          >
            {t('backToMenu')}
          </button>
          <h1 className="text-3xl font-bold text-gray-800">
            {t('aiAnalysisDashboard')}
          </h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Device Information Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">{t('deviceInformation')}</h2>
            <div className="flex gap-2">
              <button
                onClick={handleGetData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
              >
                {t('getData')}
              </button>
              <button
                onClick={handleExportJSON}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
              >
                {t('exportJSON')}
              </button>
              <button
                onClick={handleClearData}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
              >
                {t('clearData')}
              </button>
            </div>
          </div>

          {/* Environmental Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                    {t('device')}
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                    {t('temperature')}
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                    {t('humidity')}
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                    {t('soil')}
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                    {t('light')}
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                    {t('gps')}
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                    {t('timestamp')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{device.id}</td>
                    <td className="border border-gray-300 px-4 py-2">{device.temperature}</td>
                    <td className="border border-gray-300 px-4 py-2">{device.humidity}</td>
                    <td className="border border-gray-300 px-4 py-2">{device.soil}</td>
                    <td className="border border-gray-300 px-4 py-2">{device.light}</td>
                    <td className="border border-gray-300 px-4 py-2">{device.gps}</td>
                    <td className="border border-gray-300 px-4 py-2">{device.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Log */}
        {statusMessage && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
            <p className="text-gray-700">{statusMessage}</p>
            <p className="text-sm text-gray-600 mt-1">
              {t('dataUpdated')} {new Date().toLocaleTimeString()}
            </p>
            <p className="text-sm text-gray-600">{t('readyForAnalysis')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Crop Selection and Query */}
          <div className="space-y-6">
            {/* Crop Type Selector */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">{t('selectCropType')}</h3>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('chooseCrop')}</option>
                <option value="wheat">{t('wheat')}</option>
                <option value="rice">{t('rice')}</option>
                <option value="maize">{t('maize')}</option>
                <option value="sugarcane">{t('sugarcane')}</option>
                <option value="cotton">{t('cotton')}</option>
              </select>
            </div>

            {/* Additional Query */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">{t('additionalQuery')}</h3>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('queryPlaceholder')}
                rows="6"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              ></textarea>
            </div>
          </div>

          {/* Right Column - pH Scale */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('soilPHScale')}</h3>
            <div className="flex justify-between gap-2 mb-4">
              {phColors.map((ph) => (
                <div key={ph.value} className="flex-1">
                  <div className={`${ph.color} h-24 rounded-lg flex items-center justify-center text-white font-bold shadow-md`}>
                    {ph.value}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 text-center italic">
              {t('phNote')}
            </p>
          </div>
        </div>

        {/* AI Analysis Button */}
        <div className="mt-6">
          <button
            onClick={handleAIAnalysis}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl text-lg transition-colors duration-200 shadow-lg"
          >
            {t('runAIAnalysis')}
          </button>
        </div>
      </div>

      {/* Help Button */}
      <button className="fixed bottom-6 right-6 bg-gray-800 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors duration-200">
        <span className="text-2xl">{t('help')}</span>
      </button>
    </div>
  );
};

export default AIAnalysis;
