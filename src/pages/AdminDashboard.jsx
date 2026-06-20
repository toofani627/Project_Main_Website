import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import India from '@react-map/india';
import { stateAnalytics, defaultStateAnalytics } from '../lib/adminData';
import { useTheme } from '../context/ThemeContext';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [selectedState, setSelectedState] = useState('Telangana');
  const [analytics, setAnalytics] = useState(stateAnalytics['Telangana'] || defaultStateAnalytics);

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

  const handleStateClick = (stateName) => {
    const name = typeof stateName === 'string' ? stateName : (stateName?.name || stateName?.id || 'Telangana');
    setSelectedState(name);
    setAnalytics(stateAnalytics[name] || defaultStateAnalytics);
  };

  return (
    <div className="min-h-screen bg-transparent text-neo-cream relative">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 max-w-7xl">
        
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div className="mb-8 border-b border-neo-cream/20 pb-6 flex justify-between items-end">
          <div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-neo-cream uppercase leading-none mb-2">
              ADMIN DASHBOARD
            </h1>
            <p className="font-subheading text-neo-cream/50 text-xs uppercase tracking-widest mt-3">
              GeoAnalytics · State Statistics
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={() => navigate('/admin-market')}
              className="font-subheading font-bold text-xs uppercase tracking-widest border border-neo-cream/40 rounded px-4 py-2 hover:bg-neo-cream hover:text-neo-dark transition-colors"
            >
              MARKET ANALYTICS
            </button>

            <button
              onClick={toggleTheme}
              className="bg-neo-cream text-neo-dark rounded-lg p-2 transition-all hover:scale-110 shadow-[2px_2px_0px_var(--color-neo-green-dark)] border-2 border-neo-cream"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                // Sun Icon for Dark Mode
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
                // Moon Icon for Light Mode
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

        {/* ── MAIN CONTENT GRID ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Interactive Map */}
          <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-7 flex flex-col justify-center items-center h-full min-h-[500px]">
            <p className="font-subheading text-xs uppercase tracking-widest text-neo-cream/60 mb-6 self-start">
              SELECT A REGION
            </p>
            <div className="admin-map w-full max-w-lg aspect-square text-neo-cream/80 fill-current cursor-pointer transition-colors duration-300">
               <India
                 type="select-single"
                 onSelect={handleStateClick}
                 size="100%"
                 mapColor="var(--color-neo-surface-2)"
                 strokeColor="var(--color-neo-cream)"
                 strokeWidth="1"
                 hoverColor={theme === 'light' ? 'var(--color-neo-green-light)' : 'var(--color-neo-green-dark)'}
                 selectColor={theme === 'light' ? 'var(--color-neo-green-light)' : 'var(--color-neo-green-dark)'}
               />
            </div>
          </div>

          {/* Right Column: Analytics Data */}
          <div className="flex flex-col gap-6">
            
            {/* Selected State Header */}
            <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-7">
              <p className="font-subheading text-xs uppercase tracking-widest text-neo-cream/60 mb-2">
                ACTIVE REGION
              </p>
              <h2 className={`font-heading text-4xl sm:text-5xl uppercase leading-none ${theme === 'light' ? 'text-neo-green-light' : 'text-neo-green-dark'}`}>
                {selectedState}
              </h2>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Stat 1 */}
              <div className="neo-card border-2 border-neo-cream rounded-2xl p-6">
                <p className="font-subheading text-[11px] uppercase tracking-widest text-neo-cream/60 mb-3">
                  Most Grown Crop
                </p>
                <div className="font-heading text-3xl sm:text-4xl text-neo-cream">
                  {analytics.mostGrownCrop}
                </div>
              </div>

              {/* Stat 2 */}
              <div className="neo-card border-2 border-neo-cream rounded-2xl p-6">
                <p className="font-subheading text-[11px] uppercase tracking-widest text-neo-cream/60 mb-3">
                  Active Farmers
                </p>
                <div className="font-heading text-3xl sm:text-4xl text-neo-cream">
                  {analytics.farmersUsingApp.toLocaleString()}
                </div>
              </div>

              {/* Stat 3 */}
              <div className="neo-card border-2 border-neo-cream rounded-2xl p-6">
                <p className="font-subheading text-[11px] uppercase tracking-widest text-neo-cream/60 mb-3">
                  Water Efficiency
                </p>
                <div className="font-heading text-3xl sm:text-4xl text-neo-cream">
                  {analytics.waterEfficiency}
                </div>
              </div>

              {/* Stat 4 */}
              <div className="neo-card border-2 border-neo-cream rounded-2xl p-6">
                <p className="font-subheading text-[11px] uppercase tracking-widest text-neo-cream/60 mb-3">
                  IoT Alerts Triggered
                </p>
                <div className="font-heading text-3xl sm:text-4xl text-neo-cream">
                  {analytics.alerts.toLocaleString()}
                </div>
              </div>
              
            </div>
            
            <p className="font-body text-neo-cream/25 text-[10px] uppercase tracking-widest text-center mt-4">
              DATA IS PERIODICALLY SYNCED WITH REGIONAL AGRICULTURAL CENTERS.
            </p>

          </div>
        </div>
      </div>

      <style>{`
        /* Make the states pop out like neo-brutalist buttons! */
        .admin-map svg path {
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease !important;
        }
        
        /* Apply transform when hovered or when selected (fill equals the selectColor) */
        .admin-map svg path:hover,
        .admin-map svg path[fill="var(--color-neo-green-dark)"],
        .admin-map svg path[fill="var(--color-neo-green-light)"] {
          transform: translate(-3px, -3px) !important;
          filter: drop-shadow(4px 4px 0px var(--color-neo-cream)) !important;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
