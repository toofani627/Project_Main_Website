import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

// Helper to map Soil Health (0-100) to a Blue->Red spectrum
const getHealthColor = (score) => {
  const c = new THREE.Color();
  const h = 240 - (Math.max(0, Math.min(100, score)) / 100) * 240; 
  c.setHSL(h / 360, 1.0, 0.5);
  return c;
};

// Generates the Topographic Terrain based on Soil Scans
const TerrainMap = ({ scans }) => {
  const meshRef = useRef();
  
  // Grid parameters
  const segments = 60;
  const size = 30;
  
  // Normalize scan coordinates to the 3D local space (-size/2 to size/2)
  const normalizedScans = useMemo(() => {
    if (!scans || scans.length === 0) return [];
    
    // Find bounding box of lat/lng
    const lats = scans.map(s => s.lat);
    const lngs = scans.map(s => s.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Avoid division by zero if only one point
    const latRange = maxLat - minLat === 0 ? 1 : maxLat - minLat;
    const lngRange = maxLng - minLng === 0 ? 1 : maxLng - minLng;
    
    return scans.map(s => ({
      ...s,
      x: ((s.lng - minLng) / lngRange - 0.5) * (size * 0.8), // X maps to Longitude
      z: -((s.lat - minLat) / latRange - 0.5) * (size * 0.8) // Z maps to Latitude (inverted)
    }));
  }, [scans, size]);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2); // Lay flat
    
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      
      let height = 0;
      let score = 50; // Default middle
      
      if (normalizedScans.length > 0) {
        // Inverse Distance Weighting (IDW) interpolation
        let num = 0;
        let den = 0;
        
        normalizedScans.forEach(scan => {
          const dx = vx - scan.x;
          const dz = vz - scan.z;
          let dist = Math.sqrt(dx*dx + dz*dz);
          if (dist < 0.1) dist = 0.1; // prevent singularity
          const weight = 1 / Math.pow(dist, 2);
          
          num += scan.soilHealth * weight;
          den += weight;
        });
        
        score = den > 0 ? num / den : 50;
        // Map score 0-100 to height 0-5
        height = (score / 100) * 6;
      } else {
        // Gentle wavy default terrain if no data
        height = Math.sin(vx * 0.5) * Math.cos(vz * 0.5) * 2 + 2;
      }
      
      pos.setY(i, height);
      
      // Color
      const finalColor = getHealthColor(score);
      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;
    }
    
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [normalizedScans, size, segments]);

  // Subtle breathing animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group>
      {/* Terrain Mesh */}
      <mesh ref={meshRef} geometry={geometry}>
        {/* Glassmorphism/Wireframe hybrid material */}
        <meshPhysicalMaterial 
          vertexColors 
          wireframe={false}
          transparent={true}
          opacity={0.85}
          roughness={0.2}
          metalness={0.1}
          transmission={0.5} // Glass effect
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Wireframe overlay for tech aesthetic */}
      <mesh geometry={geometry} position={[0, 0.01, 0]}>
        <meshBasicMaterial 
          vertexColors 
          wireframe={true} 
          transparent={true} 
          opacity={0.15} 
        />
      </mesh>

      {/* Markers for actual scan points */}
      {normalizedScans.map((scan, i) => (
        <group key={i} position={[scan.x, (scan.soilHealth/100)*6 + 0.5, scan.z]}>
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color={getHealthColor(scan.soilHealth)} emissive={getHealthColor(scan.soilHealth)} emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, -((scan.soilHealth/100)*3), 0]}>
            <cylinderGeometry args={[0.02, 0.02, (scan.soilHealth/100)*6, 8]} />
            <meshBasicMaterial color={getHealthColor(scan.soilHealth)} transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
};


const MapPage = () => {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchScans = async () => {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`/api/soil-scans?username=${currentUser}`);
        const data = await res.json();
        if (data.success) {
          setScans(data.soilScans);
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

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-neo-dark overflow-hidden flex flex-col">
      {/* Glassmorphism Header Overlay */}
      <div className="absolute top-6 left-6 z-10 max-w-md p-6 rounded-2xl border border-neo-cream/20 backdrop-blur-md bg-neo-dark/40 shadow-2xl">
        <h1 className="font-heading text-3xl sm:text-4xl text-neo-cream uppercase tracking-widest mb-2">
          Terrain <span className="text-neo-green-light">Map</span>
        </h1>
        <p className="font-body text-neo-cream/70 text-sm mb-4">
          {language === 'hi' 
            ? 'आपके प्रोफाइल से जुड़ा लाइव मृदा स्वास्थ्य 3D नक्शा।' 
            : language === 'ta' 
            ? 'உங்கள் சுயவிவரத்துடன் ஒத்திசைக்கப்பட்ட நேரடி 3D மண் சுகாதார வரைபடம்.' 
            : 'Live 3D topographic soil health map synced with your profile.'}
        </p>
        
        <div className="flex items-center gap-4 text-xs font-subheading tracking-widest text-neo-cream/50 uppercase">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            <span>Poor (Cold)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span>Optimal (Warm)</span>
          </div>
        </div>

        {!localStorage.getItem('currentUser') && (
          <div className="mt-4 p-3 border border-red-500/50 rounded-xl bg-red-500/10 text-red-400 text-xs font-body">
            You must be logged in to sync and save map locations.
          </div>
        )}
      </div>

      {/* Stats Overlay */}
      {scans.length > 0 && (
        <div className="absolute bottom-6 left-6 z-10 flex gap-4">
          <div className="p-4 rounded-xl border border-neo-cream/10 backdrop-blur-md bg-neo-dark/40 flex flex-col items-center justify-center min-w-[100px]">
            <span className="font-heading text-3xl text-neo-green-light">{scans.length}</span>
            <span className="font-subheading text-[10px] uppercase tracking-widest text-neo-cream/50 mt-1">Total Scans</span>
          </div>
          <div className="p-4 rounded-xl border border-neo-cream/10 backdrop-blur-md bg-neo-dark/40 flex flex-col items-center justify-center min-w-[100px]">
            <span className="font-heading text-3xl text-neo-cream">
              {Math.round(scans.reduce((a,b) => a+b.soilHealth, 0) / scans.length)}%
            </span>
            <span className="font-subheading text-[10px] uppercase tracking-widest text-neo-cream/50 mt-1">Avg Health</span>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <div className="w-full flex-1">
        <Canvas camera={{ position: [0, 15, 25], fov: 45 }}>
          <color attach="background" args={['#0a0f0d']} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
          <pointLight position={[-10, 10, -10]} color="#4488ff" intensity={0.5} />
          
          <TerrainMap scans={scans} />
          
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true}
            maxPolarAngle={Math.PI / 2 - 0.05} // don't go below ground
            minDistance={5}
            maxDistance={50}
          />
        </Canvas>
      </div>
    </div>
  );
};

export default MapPage;
