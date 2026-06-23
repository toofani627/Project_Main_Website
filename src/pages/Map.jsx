import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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

const getHealthColor = (score) => {
  if (score < 40) return '#ef4444'; // Red
  if (score < 70) return '#E0F5DC'; // Light Green
  return '#157A26'; // Dark Green
};

const getHealthLabel = (score) => {
  if (score < 40) return 'Poor';
  if (score < 70) return 'Moderate';
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

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#0a0a0a] overflow-hidden flex flex-col font-body">
      {/* Glassmorphism Header Overlay */}
      <div className="absolute top-6 left-6 z-[1000] max-w-md p-6 rounded-2xl border border-white/15 backdrop-blur-md bg-black/40 shadow-2xl pointer-events-none">
        <h1 className="font-heading text-3xl sm:text-4xl text-white uppercase tracking-widest mb-2">
          Soil <span className="text-neo-green-dark">Telemetry</span>
        </h1>
        <p className="font-body text-white/70 text-sm mb-4">
          {language === 'hi' 
            ? 'आपके प्रोफाइल से जुड़ा लाइव मृदा स्वास्थ्य 2D नक्शा।' 
            : language === 'ta' 
            ? 'உங்கள் சுயவிவரத்துடன் ஒத்திசைக்கப்பட்ட நேரடி 2D மண் சுகாதார வரைபடம்.' 
            : 'Live 2D soil telemetry map synced with your profile.'}
        </p>
        
        <div className="flex flex-col gap-2 text-xs font-mono tracking-widest text-white/80 uppercase">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span>0-39 (Poor)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#E0F5DC] shadow-[0_0_8px_rgba(224,245,220,0.8)]" />
            <span>40-69 (Moderate)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#157A26] shadow-[0_0_8px_rgba(21,122,38,0.8)]" />
            <span>70-100 (Prime)</span>
          </div>
        </div>

        {!session && (
          <div className="mt-4 p-3 border border-red-500/50 rounded-xl bg-red-500/10 text-red-400 text-xs">
            You must be logged in to sync and save map locations.
          </div>
        )}
      </div>

      {/* 2D Leaflet Map */}
      <div className="w-full flex-1 relative z-0">
        <MapContainer 
          center={center} 
          zoom={userLocation ? 10 : 4} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <MapController center={center} zoom={userLocation ? 10 : 4} />
          
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
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
