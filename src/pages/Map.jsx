import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import { useLanguage } from '../context/LanguageContext';
import { getSession } from '../lib/auth';

// Helper component to smoothly re-center the map when userLocation is found
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
};

// Helper component for the Heatmap layer
const HeatmapLayer = ({ scans }) => {
  const map = useMap();
  useEffect(() => {
    if (!scans || scans.length === 0) return;
    
    // Map scans to [lat, lng, intensity]
    const points = scans.map(s => [s.lat, s.lng, s.soilHealth]);
    
    const heatLayer = L.heatLayer(points, {
      radius: 40,
      blur: 25,
      maxZoom: 12,
      max: 100, // Maximum score
      gradient: {
        0.2: '#000080', // Deep Blue
        0.4: '#00FFFF', // Cyan
        0.6: '#00FF00', // Green
        0.8: '#FFFF00', // Yellow
        1.0: '#FF0000', // Red
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, scans]);
  return null;
};

const getHealthColor = (score) => {
  if (score <= 20) return '#000080';
  if (score <= 40) return '#00FFFF';
  if (score <= 60) return '#00FF00';
  if (score <= 80) return '#FFFF00';
  return '#FF0000';
};

const getHealthLabel = (score) => {
  if (score <= 20) return 'Very Poor';
  if (score <= 40) return 'Poor';
  if (score <= 60) return 'Moderate';
  if (score <= 80) return 'Good';
  return 'Prime';
};

const MapPage = () => {
  const { language } = useLanguage();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState(null);

  const session = getSession();

  useEffect(() => {
    // Get live location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }

    const fetchScans = async () => {
      if (!session) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`/api/soil-scans?username=${session.username}`);
        const data = await res.json();
        if (data.success) {
          // Filter out invalid scans that don't have proper coordinates
          const validScans = (data.soilScans || []).filter(
            s => typeof s.lat === 'number' && typeof s.lng === 'number' && !isNaN(s.lat) && !isNaN(s.lng)
          );
          setScans(validScans);
        } else {
          setError(data.error);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load map data');
      } finally {
        setLoading(false);
      }
    };
    fetchScans();
  }, []);

  // Determine initial center. Default to user location, then latest scan, then center of India
  const center = userLocation 
    ? userLocation 
    : scans.length > 0 
    ? [scans[scans.length - 1].lat, scans[scans.length - 1].lng] 
    : [22.0, 78.0];

  const averageHealth = scans.length > 0 
    ? Math.round(scans.reduce((sum, scan) => sum + scan.soilHealth, 0) / scans.length) 
    : null;

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#0a0a0a] overflow-hidden flex flex-col font-body">
      {/* Glassmorphism Header Overlay */}
      <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-auto z-[1000] sm:max-w-md p-4 sm:p-6 rounded-2xl border border-white/15 backdrop-blur-md bg-black/70 shadow-2xl pointer-events-none">
        <h1 className="font-heading text-2xl sm:text-4xl text-white uppercase tracking-widest mb-1 sm:mb-2">
          Soil <span className="text-neo-green-dark">Telemetry</span>
        </h1>
        <p className="font-body text-white/70 text-xs sm:text-sm mb-3 sm:mb-4">
          {language === 'hi' 
            ? 'आपके प्रोफाइल से जुड़ा लाइव मृदा स्वास्थ्य 2D नक्शा।' 
            : language === 'ta' 
            ? 'உங்கள் சுயவிவரத்துடன் ஒத்திசைக்கப்பட்ட நேரடி 2D மண் சுகாதார வரைபடம்.' 
            : 'Live 2D soil telemetry map synced with your profile.'}
        </p>
        
        <div className="flex flex-col gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono tracking-widest text-white/80 uppercase">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#000080] shadow-[0_0_8px_rgba(0,0,128,0.8)]" />
            <span>0-20 (Very Poor)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#00FFFF] shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
            <span>21-40 (Poor)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.8)]" />
            <span>41-60 (Moderate)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#FFFF00] shadow-[0_0_8px_rgba(255,255,0,0.8)]" />
            <span>61-80 (Good)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#FF0000] shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
            <span>81-100 (Prime)</span>
          </div>
        </div>

        {session ? (
          <button 
            onClick={async () => {
              // Generate 50 points around IIIT Delhi
              const promises = [];
              for (let i = 0; i < 50; i++) {
                const lat = 28.5457 + (Math.random() - 0.5) * 0.01;
                const lng = 77.2732 + (Math.random() - 0.5) * 0.01;
                
                const distance = Math.sqrt(Math.pow(lat - 28.5457, 2) + Math.pow(lng - 77.2732, 2));
                let score = 90 - (distance / 0.005) * 60 + (Math.random() * 20 - 10);
                score = Math.max(10, Math.min(100, Math.round(score)));
                
                const scanData = {
                  lat, lng, soilHealth: score,
                  n: Math.round(40 + Math.random()*20), 
                  p: Math.round(20 + Math.random()*10), 
                  k: Math.round(140 + Math.random()*20), 
                  moisture: Math.round(50 + Math.random()*20), 
                  temp: 32,
                  timestamp: new Date().toISOString()
                };
                
                promises.push(
                  fetch('/api/soil-scans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: session.username, scan: scanData })
                  })
                );
              }
              await Promise.all(promises);
              window.location.reload();
            }}
            className="mt-4 w-full py-2 bg-neo-green-dark/20 hover:bg-neo-green-dark/40 border border-neo-green-dark/50 rounded-xl text-neo-green-light text-xs font-mono tracking-widest transition-colors pointer-events-auto"
          >
            Display IIITD Map
          </button>
        ) : (
          <div className="mt-4 p-3 border border-red-500/50 rounded-xl bg-red-500/10 text-red-400 text-xs pointer-events-auto">
            You must be logged in to sync and save map locations.
          </div>
        )}
      </div>

      {/* Overall Health Display */}
      {averageHealth !== null && (
        <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 z-[1000] pointer-events-none text-right flex flex-col items-end drop-shadow-2xl">
          <div className="text-white/90 font-mono tracking-[0.2em] text-xs sm:text-sm uppercase mb-1 drop-shadow-md">
            Overall Health
          </div>
          <div 
            className="font-heading text-6xl sm:text-8xl font-bold leading-none drop-shadow-lg"
            style={{ color: getHealthColor(averageHealth), textShadow: `0 0 40px ${getHealthColor(averageHealth)}60` }}
          >
            {averageHealth}
          </div>
        </div>
      )}

      {/* 2D Leaflet Map */}
      <div className="w-full flex-1 relative z-0">
        <MapContainer 
          center={center} 
          zoom={userLocation ? 10 : 4} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <ZoomControl position="bottomleft" />
          <MapController center={center} zoom={userLocation ? 10 : 4} />
          
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Add Heatmap rendering underneath the pinpoint markers */}
          <HeatmapLayer scans={scans} />
          
          {userLocation && (
            <>
              {/* Pulsing accuracy circle */}
              <Circle 
                center={userLocation} 
                radius={2000} 
                pathOptions={{ fillColor: '#3b82f6', fillOpacity: 0.1, color: 'transparent' }} 
              />
              {/* Core location dot */}
              <CircleMarker
                center={userLocation}
                radius={6}
                pathOptions={{
                  fillColor: '#3b82f6',
                  fillOpacity: 1,
                  color: '#ffffff',
                  weight: 2,
                }}
              >
                <Popup className="custom-dark-popup">
                  <div className="text-white font-mono text-xs uppercase tracking-widest">
                    You are here
                  </div>
                </Popup>
              </CircleMarker>
            </>
          )}
          
          {scans.map((scan, i) => (
            <CircleMarker
              key={i}
              center={[scan.lat, scan.lng]}
              radius={10}
              pathOptions={{
                fillColor: getHealthColor(scan.soilHealth),
                fillOpacity: 0.8,
                color: '#ffffff', // Stroke color
                weight: 2,        // Stroke weight
              }}
            >
              <Popup className="custom-dark-popup">
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] text-white/50 uppercase tracking-widest border-b border-white/10 pb-1">
                    {new Date(scan.timestamp || Date.now()).toLocaleString()}
                  </div>
                  <div className="text-xl font-bold font-heading">
                    <span style={{ color: getHealthColor(scan.soilHealth) }}>{scan.soilHealth}</span> / 100 <span className="text-sm font-normal text-white/70">{getHealthLabel(scan.soilHealth)}</span>
                  </div>
                  <div className="flex gap-4 mt-2 pt-2 border-t border-white/10 text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-white/50">Moisture</span>
                      <span className="text-white">{scan.moisture ?? '--'}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white/50">pH</span>
                      <span className="text-white">{scan.ph ?? '--'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white/50">NPK</span>
                      <span className="text-white">{scan.n ?? '--'}/{scan.p ?? '--'}/{scan.k ?? '--'}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPage;
