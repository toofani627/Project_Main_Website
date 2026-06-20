import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketData } from '../lib/marketData';
import { useTheme } from '../context/ThemeContext';

const MarketAnalytics = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [selectedCrop, setSelectedCrop] = useState(marketData[0]);

  useEffect(() => {
    const isAuth = localStorage.getItem('isAdminAuth');
    if (!isAuth) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuth');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-transparent text-neo-cream relative">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 max-w-7xl">
        
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div className="mb-8 border-b border-neo-cream/20 pb-6 flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-neo-cream uppercase leading-none mb-2">
              MARKET ANALYTICS
            </h1>
            <p className="font-subheading text-neo-cream/50 text-xs uppercase tracking-widest mt-3">
              National Crop Production & Yield Rankings
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin-dashboard')}
              className="font-subheading font-bold text-xs uppercase tracking-widest border border-neo-cream/40 rounded px-4 py-2 hover:bg-neo-cream hover:text-neo-dark transition-colors"
            >
              BACK TO DASHBOARD
            </button>
            <button
              onClick={toggleTheme}
              className="bg-neo-cream text-neo-dark rounded-lg p-2 transition-all hover:scale-110 shadow-[2px_2px_0px_var(--color-neo-green-dark)] border-2 border-neo-cream"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="font-subheading text-xs uppercase tracking-widest border border-neo-cream/40 rounded px-4 py-2 hover:bg-neo-cream hover:text-neo-dark transition-colors"
            >
              LOGOUT
            </button>
          </div>
        </div>

        {/* ── CROP SELECTOR ──────────────────────────────────────── */}
        <div className="mb-8 overflow-x-auto p-2 -m-2 hide-scrollbar">
          <div className="flex gap-4 min-w-max items-center">
            {marketData.slice(0, 4).map((data) => {
              const isActive = selectedCrop.crop === data.crop;
              return (
                <button
                  key={data.crop}
                  onClick={() => setSelectedCrop(data)}
                  className={`px-6 py-3 font-subheading font-bold text-sm uppercase tracking-widest transition-all duration-200 border-2 rounded-xl ${
                    isActive
                      ? 'bg-neo-green-dark text-neo-cream border-neo-cream shadow-[4px_4px_0px_var(--color-neo-cream)]'
                      : 'text-neo-cream border-neo-cream shadow-[2px_2px_0px_var(--color-neo-cream)] hover:bg-neo-green-dark/20 hover:shadow-[4px_4px_0px_var(--color-neo-cream)] hover:-translate-y-1'
                  }`}
                >
                  {data.crop}
                </button>
              );
            })}
            
            {/* "More" Dropdown */}
            <div className="relative">
              <select
                className={`appearance-none cursor-pointer px-6 py-3 font-subheading font-bold text-sm uppercase tracking-widest transition-all duration-200 border-2 rounded-xl border-neo-cream shadow-[2px_2px_0px_var(--color-neo-cream)] hover:shadow-[4px_4px_0px_var(--color-neo-cream)] hover:-translate-y-1 focus:outline-none ${
                  marketData.slice(4).some(d => d.crop === selectedCrop.crop)
                    ? 'bg-neo-green-dark text-neo-cream'
                    : 'bg-transparent text-neo-cream hover:bg-neo-green-dark/20'
                }`}
                style={{ backgroundColor: marketData.slice(4).some(d => d.crop === selectedCrop.crop) ? 'var(--color-neo-green-dark)' : 'var(--color-neo-dark)' }}
                value={marketData.slice(4).some(d => d.crop === selectedCrop.crop) ? selectedCrop.crop : ""}
                onChange={(e) => {
                  const selected = marketData.find(d => d.crop === e.target.value);
                  if (selected) setSelectedCrop(selected);
                }}
              >
                <option value="" disabled>More...</option>
                {marketData.slice(4).map(data => (
                  <option key={data.crop} value={data.crop}>
                    {data.crop}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neo-cream">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT GRID ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel: Selected Crop Highlight */}
          <div className="lg:col-span-4 neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-7 flex flex-col justify-center h-full min-h-[300px]">
            <p className="font-subheading text-xs uppercase tracking-widest text-neo-cream/60 mb-2">
              SELECTED COMMODITY
            </p>
            <h2 className={`font-heading text-4xl sm:text-5xl lg:text-5xl break-words uppercase leading-none mb-4 ${theme === 'light' ? 'text-neo-green-light' : 'text-neo-green-dark'}`}>
              {selectedCrop.crop}
            </h2>
            <div className="mt-auto pt-6 border-t border-neo-cream/20">
              <p className="font-subheading text-xs uppercase tracking-widest text-neo-cream/60 mb-1">
                MEASUREMENT UNIT
              </p>
              <p className="font-heading text-xl text-neo-cream">
                {selectedCrop.unit}
              </p>
            </div>
          </div>

          {/* Right Panel: Rankings List */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {selectedCrop.rankings.map((rankData, index) => (
              <div 
                key={rankData.state}
                className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-5 flex items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_var(--color-neo-cream)] duration-200"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 border-neo-cream font-heading text-2xl ${
                    index === 0 
                      ? 'bg-neo-cream text-neo-dark' 
                      : 'bg-transparent text-neo-cream'
                  }`}>
                    #{rankData.rank}
                  </div>
                  <div>
                    <h3 className="font-heading text-2xl text-neo-cream leading-none mb-1">
                      {rankData.state}
                    </h3>
                    <p className="font-subheading text-[10px] uppercase tracking-widest text-neo-cream/50">
                      STATE REGION
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`font-heading text-3xl sm:text-4xl leading-none ${theme === 'light' ? 'text-neo-green-light' : 'text-neo-green-dark'}`}>
                    {rankData.production}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default MarketAnalytics;
