import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import India from '@react-map/india';
import { stateAnalytics, defaultStateAnalytics } from '../lib/adminData';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState('Telangana');
  const [analytics, setAnalytics] = useState(stateAnalytics['Telangana'] || defaultStateAnalytics);

  useEffect(() => {
    const isAuth = localStorage.getItem('isAdminAuth');
    if (!isAuth) {
      navigate('/admin-login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuth');
    navigate('/admin-login');
  };

  const handleStateClick = (stateName) => {
    const name = typeof stateName === 'string' ? stateName : (stateName?.name || stateName?.id || 'Telangana');
    setSelectedState(name);
    setAnalytics(stateAnalytics[name] || defaultStateAnalytics);
  };

  return (
    <div className="min-h-screen bg-transparent text-neo-cream">
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
          <button
            onClick={handleLogout}
            className="font-subheading text-xs uppercase tracking-widest border border-neo-cream/40 rounded px-4 py-2 hover:bg-neo-cream hover:text-neo-dark transition-colors"
          >
            LOGOUT
          </button>
        </div>

        {/* ── MAIN CONTENT GRID ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Interactive Map */}
          <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-7 flex flex-col justify-center items-center h-full min-h-[500px]">
            <p className="font-subheading text-xs uppercase tracking-widest text-neo-cream/60 mb-6 self-start">
              SELECT A REGION
            </p>
            <div className="w-full max-w-lg aspect-square text-neo-cream/80 fill-current hover:text-neo-green-dark cursor-pointer transition-colors duration-300">
               <India
                 type="select-single"
                 onSelect={handleStateClick}
                 size="100%"
                 mapColor="var(--color-neo-surface-2)"
                 strokeColor="var(--color-neo-cream)"
                 strokeWidth="1"
                 hoverColor="var(--color-neo-green-dark)"
                 selectColor="var(--color-neo-green-dark)"
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
              <h2 className="font-heading text-4xl sm:text-5xl text-neo-green-dark uppercase leading-none">
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
    </div>
  );
};

export default AdminDashboard;
