import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getSession, getProfileKey } from '../lib/auth';


/**
 * Profile Component
 *
 * Dedicated page for managing farmer profile data:
 * - Farmer name
 * - Crop history (dynamic array with add/remove)
 * - Fertilizer history (dynamic array with add/remove)
 *
 * All data persists to localStorage under 'farmerProfile' key
 */
const Profile = () => {
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();

  // Form state
  const [farmerName, setFarmerName] = useState('');
  const [crops, setCrops] = useState([
    { id: 1, name: '', dateGrown: '' },
    { id: 2, name: '', dateGrown: '' }
  ]);
  const [fertilizers, setFertilizers] = useState([
    { id: 1, name: '', amount: '', unit: 'kgs/bigha' }
  ]);

  // Next IDs for new entries
  const [nextCropId, setNextCropId] = useState(3);
  const [nextFertilizerId, setNextFertilizerId] = useState(2);

  // UI state
  const [saveMessage, setSaveMessage] = useState('');
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLanguageSwitch = () => {
    changeLanguage(null);
    localStorage.removeItem('language');
  };

  // Load profile: try MongoDB first, fall back to localStorage
  useEffect(() => {
    const session = getSession();
    if (session?.username) {
      setFarmerName(session.username);
    }

    const loadProfile = async () => {
      setIsLoading(true);
      const session = getSession();
      const username = session?.username;

      // Try API first
      if (username) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          const res = await fetch(`${apiUrl}/api/profile/${encodeURIComponent(username.toLowerCase())}`);
          if (res.ok) {
            const data = await res.json();
            if (data.farmerName) setFarmerName(data.farmerName);
            if (Array.isArray(data.crops) && data.crops.length > 0) {
              setCrops(data.crops);
              setNextCropId(Math.max(...data.crops.map(c => c.id || 0)) + 1);
            }
            if (Array.isArray(data.fertilizers) && data.fertilizers.length > 0) {
              setFertilizers(data.fertilizers);
              setNextFertilizerId(Math.max(...data.fertilizers.map(f => f.id || 0)) + 1);
            }
            setIsLoading(false);
            return; // MongoDB load succeeded — skip localStorage
          }
        } catch (err) {
          console.warn('Could not load profile from API, falling back to localStorage:', err.message);
        }
      }

      // Fallback: localStorage
      const profileKey = getProfileKey();
      const savedProfile = localStorage.getItem(profileKey);
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          if (profile.farmerName) setFarmerName(profile.farmerName);
          if (Array.isArray(profile.crops) && profile.crops.length > 0) {
            setCrops(profile.crops);
            setNextCropId(Math.max(...profile.crops.map(c => c.id || 0)) + 1);
          }
          if (Array.isArray(profile.fertilizers) && profile.fertilizers.length > 0) {
            setFertilizers(profile.fertilizers);
            setNextFertilizerId(Math.max(...profile.fertilizers.map(f => f.id || 0)) + 1);
          }
        } catch (err) {
          console.error('Error loading profile from localStorage:', err);
        }
      }
      setIsLoading(false);
    };

    loadProfile();
  }, []);

  // Save profile: POST to MongoDB, also write localStorage as cache
  const handleSaveProfile = async () => {
    const session = getSession();
    const username = session?.username;

    const profile = {
      farmerName: farmerName.trim(),
      crops: crops.filter(c => c.name.trim() !== ''),
      fertilizers: fertilizers.filter(f => f.name.trim() !== '')
    };

    // Always write localStorage cache
    const profileKey = getProfileKey();
    localStorage.setItem(profileKey, JSON.stringify(profile));

    // Try saving to MongoDB
    if (username) {
      setIsSaving(true);
      setSaveError(false);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/api/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, ...profile })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSaveError(false);
      } catch (err) {
        console.error('Failed to save profile to MongoDB:', err.message);
        setSaveError(true);
      } finally {
        setIsSaving(false);
      }
    }

    setSaveMessage(
      language === 'hi'
        ? 'प्रोफाइल सेव हो गया!'
        : language === 'ta'
        ? 'விவசாயி விவரம் சேமிக்கப்பட்டது!'
        : 'Profile saved successfully!'
    );
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 3000);
  };

  // Crop handlers
  const handleAddCrop = () => {
    setCrops([...crops, { id: nextCropId, name: '', dateGrown: '' }]);
    setNextCropId(nextCropId + 1);
  };

  const handleRemoveCrop = (id) => {
    setCrops(crops.filter(c => c.id !== id));
  };

  const handleCropChange = (id, field, value) => {
    setCrops(
      crops.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Fertilizer handlers
  const handleAddFertilizer = () => {
    setFertilizers([
      ...fertilizers,
      { id: nextFertilizerId, name: '', amount: '', unit: 'kgs/bigha' }
    ]);
    setNextFertilizerId(nextFertilizerId + 1);
  };

  const handleRemoveFertilizer = (id) => {
    setFertilizers(fertilizers.filter(f => f.id !== id));
  };

  const handleFertilizerChange = (id, field, value) => {
    setFertilizers(
      fertilizers.map(f => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  return (
    <div className="min-h-screen bg-transparent text-neo-cream">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-2xl">

        {/* Loading overlay */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-neo-cream/30 border-t-neo-cream rounded-full animate-spin" />
              <p className="font-subheading text-xs uppercase tracking-widest text-neo-cream/50">
                {language === 'hi' ? 'प्रोफाइल लोड हो रहा है...' : 'Loading profile...'}
              </p>
            </div>
          </div>
        )}

        {!isLoading && (<>

        {/* Page Header */}
        <div className="mb-10 border-b border-neo-cream/20 pb-6">
          <p className="font-subheading text-neo-cream/50 text-xs uppercase tracking-widest mb-1">
            {language === 'hi' ? 'किसान खाता' : 'FARMER ACCOUNT'}
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl text-neo-cream uppercase leading-none">
            {language === 'hi' ? 'प्रोफाइल' : language === 'ta' ? 'விவரம்' : 'MY PROFILE'}
          </h1>
          <p className="font-body text-neo-cream/40 text-sm mt-3">
            {language === 'en' ? 'Your answers are saved to your profile and never deleted. You can update them at any time.' : language === 'hi' ? 'आपके उत्तर आपकी प्रोफाइल में सेव हैं और कभी नहीं हटाए जाते।' : 'உங்கள் பதில்கள் உங்கள் சுயவிவரத்தில் சேமிக்கப்படும்.'}
          </p>
        </div>

        {/* Section 01 — Farmer Name */}
        <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_#F4E7D5] p-6 mb-5">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-neo-cream flex items-center justify-center">
              <span className="font-heading text-neo-cream text-sm">01</span>
            </div>
            <div>
              <h2 className="font-subheading font-bold text-sm uppercase tracking-widest text-neo-cream">
                {language === 'en' ? 'Farmer Name' : language === 'hi' ? 'किसान का नाम' : 'விவசாயியின் பெயர்'}
              </h2>
              <p className="font-body text-neo-cream/40 text-xs mt-0.5">
                {language === 'en' ? 'Enter your full name' : language === 'hi' ? 'अपना पूरा नाम दर्ज करें' : 'உங்கள் முழு பெயரை உள்ளிடவும்'}
              </p>
            </div>
          </div>
          <input
            type="text"
            value={farmerName}
            onChange={(e) => setFarmerName(e.target.value)}
            placeholder={language === 'en' ? 'e.g., Rajan Patel' : language === 'hi' ? 'जैसे रमेश पटेल' : 'எ.கா., ராஜன் பட்டேல்'}
            className="w-full text-neo-cream border-2 border-neo-cream/60 rounded-2xl px-5 py-4 focus:outline-none focus:border-neo-cream font-body text-base placeholder:text-neo-cream/25 transition-colors"
            style={{backgroundColor: '#111111', backgroundImage: 'none'}}
          />
        </div>

        {/* Section 02 — Crop History */}
        <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_#F4E7D5] p-6 mb-5">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-neo-cream flex items-center justify-center">
                <span className="font-heading text-neo-cream text-sm">02</span>
              </div>
              <div>
                <h2 className="font-subheading font-bold text-sm uppercase tracking-widest text-neo-cream">
                  {language === 'en' ? 'Crop History' : language === 'hi' ? 'फसल का इतिहास' : 'பயிர் வரலாறு'}
                </h2>
                <p className="font-body text-neo-cream/40 text-xs mt-0.5">
                  {language === 'en' ? 'List all crops grown, starting from the most recent.' : language === 'hi' ? 'सबसे हाल की फसल से शुरू करते हुए सभी फसलें लिखें।' : 'சமீபத்திய பயிரில் இருந்து தொடங்கி அனைத்தையும் பட்டியலிடுங்கள்.'}
                </p>
              </div>
            </div>
            <span className="font-subheading text-xs font-bold uppercase text-neo-green-light bg-neo-green-dark/30 border border-neo-green-dark px-3 py-1 rounded-full flex-shrink-0 ml-2">
              {crops.length} {language === 'en' ? 'crop(s)' : language === 'hi' ? 'फसल' : 'பயிர்'}
            </span>
          </div>

          <div className="space-y-4 mb-4">
            {crops.map((crop, idx) => {
              const cropLabel = idx === 0
                ? (language === 'en' ? 'LAST CROP' : language === 'hi' ? 'पिछली फसल' : 'கடைசி பயிர்')
                : idx === 1
                ? (language === 'en' ? '2ND LAST CROP' : language === 'hi' ? 'दूसरी पिछली फसल' : '2வது கடைசி பயிர்')
                : `#${idx + 1}`;
              return (
                <div key={crop.id} className="rounded-xl border border-neo-cream/20 overflow-hidden" style={{backgroundColor:'#1a1a1a', backgroundImage:'none'}}>
                  <div className="px-4 pt-3 pb-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-7 h-7 rounded-full bg-neo-green-dark flex items-center justify-center flex-shrink-0">
                        <span className="font-subheading font-bold text-neo-cream text-xs">{idx + 1}</span>
                      </div>
                      <span className="font-subheading text-[10px] uppercase tracking-widest text-neo-cream/50">{cropLabel}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3">
                      <div>
                        <label className="block font-subheading text-[10px] uppercase tracking-widest text-neo-cream/50 mb-2">
                          {language === 'en' ? 'CROP NAME' : language === 'hi' ? 'फसल का नाम' : 'பயிரின் பெயர்'}
                        </label>
                        <input
                          type="text"
                          value={crop.name}
                          onChange={(e) => handleCropChange(crop.id, 'name', e.target.value)}
                          placeholder={language === 'en' ? 'e.g., Wheat, Rice' : language === 'hi' ? 'जैसे गेहूं, धान' : 'எ.கா., கோதுமை'}
                          className="w-full text-neo-cream border border-neo-cream/40 rounded-xl px-4 py-3 font-body text-sm placeholder:text-neo-cream/20 focus:outline-none focus:border-neo-cream/80 transition-colors"
                          style={{backgroundColor:'#111111', backgroundImage:'none'}}
                        />
                      </div>
                      <div>
                        <label className="block font-subheading text-[10px] uppercase tracking-widest text-neo-cream/50 mb-2">
                          {language === 'en' ? 'DATE PLANTED / HARVESTED' : language === 'hi' ? 'बोई / काटी गई तारीख' : 'விதைத்த / அறுவடை தேதி'}
                        </label>
                        <input
                          type="date"
                          value={crop.dateGrown}
                          onChange={(e) => handleCropChange(crop.id, 'dateGrown', e.target.value)}
                          className="w-full text-neo-cream border border-neo-cream/40 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-neo-cream/80 transition-colors"
                          style={{backgroundColor:'#111111', backgroundImage:'none', colorScheme:'dark'}}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-neo-cream/10 px-4 py-2 flex justify-end">
                    <button
                      onClick={() => handleRemoveCrop(crop.id)}
                      className="font-subheading text-[10px] uppercase tracking-widest text-red-400/70 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleAddCrop}
            className="w-full border-2 border-dashed border-neo-cream/30 hover:border-neo-cream/60 text-neo-cream/60 hover:text-neo-cream py-4 rounded-xl font-subheading font-bold text-xs uppercase tracking-widest transition-all"
            style={{backgroundColor:'transparent', backgroundImage:'none'}}
          >
            + {language === 'en' ? 'ADD ANOTHER CROP' : language === 'hi' ? '+ नई फसल जोड़ें' : '+ புதிய பயிர் சேர்க்கவும்'}
          </button>
        </div>

        {/* Section 03 — Fertilizer History */}
        <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_#F4E7D5] p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-neo-cream flex items-center justify-center">
                <span className="font-heading text-neo-cream text-sm">03</span>
              </div>
              <div>
                <h2 className="font-subheading font-bold text-sm uppercase tracking-widest text-neo-cream">
                  {language === 'en' ? 'Fertilizers Used (Last 12 Months)' : language === 'hi' ? 'खाद का इतिहास (पिछले 12 माह)' : 'உரமான வரலாறு'}
                </h2>
                <p className="font-body text-neo-cream/40 text-xs mt-0.5">
                  {language === 'en' ? 'Record all fertilizers, pesticides, and soil amendments applied.' : language === 'hi' ? 'पिछले वर्ष उपयोग की गई सभी खाद दर्ज करें।' : 'பயன்படுத்திய அனைத்து உரங்களையும் பதிவு செய்யவும்.'}
                </p>
              </div>
            </div>
            <span className="font-subheading text-xs font-bold uppercase text-neo-cream/50 bg-[#1a1a1a] border border-neo-cream/20 px-3 py-1 rounded-full flex-shrink-0 ml-2" style={{backgroundImage:'none'}}>
              {fertilizers.length} {language === 'en' ? 'record(s)' : language === 'hi' ? 'रिकॉर्ड' : 'பதிவு'}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            {fertilizers.map((fert, fidx) => (
              <div key={fert.id} className="rounded-xl border border-neo-cream/20 overflow-hidden" style={{backgroundColor:'#1a1a1a', backgroundImage:'none'}}>
                <div className="px-4 pt-3 pb-3">
                  <p className="font-subheading text-[10px] uppercase tracking-widest text-neo-cream/40 mb-3">
                    {language === 'en' ? `Entry ${fidx + 1}` : language === 'hi' ? `प्रविष्टि ${fidx + 1}` : `பதிவு ${fidx + 1}`}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block font-subheading text-[10px] uppercase tracking-widest text-neo-cream/50 mb-2">
                        {language === 'en' ? 'FERTILIZER / INPUT' : language === 'hi' ? 'खाद का नाम' : 'உரத்தின் பெயர்'}
                      </label>
                      <input
                        type="text"
                        value={fert.name}
                        onChange={(e) => handleFertilizerChange(fert.id, 'name', e.target.value)}
                        placeholder={language === 'en' ? 'e.g., Urea, DAP' : 'यूरिया, DAP'}
                        className="w-full text-neo-cream border border-neo-cream/40 rounded-xl px-3 py-3 font-body text-sm placeholder:text-neo-cream/20 focus:outline-none focus:border-neo-cream/80 transition-colors"
                        style={{backgroundColor:'#111111', backgroundImage:'none'}}
                      />
                    </div>
                    <div>
                      <label className="block font-subheading text-[10px] uppercase tracking-widest text-neo-cream/50 mb-2">
                        {language === 'en' ? 'AMOUNT (KG)' : language === 'hi' ? 'मात्रा (KG)' : 'அளவு (KG)'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={fert.amount}
                        onChange={(e) => handleFertilizerChange(fert.id, 'amount', e.target.value)}
                        placeholder="e.g., 34.5"
                        className="w-full text-neo-cream border border-neo-cream/40 rounded-xl px-3 py-3 font-body text-sm focus:outline-none focus:border-neo-cream/80 transition-colors"
                        style={{backgroundColor:'#111111', backgroundImage:'none'}}
                      />
                    </div>
                    <div>
                      <label className="block font-subheading text-[10px] uppercase tracking-widest text-neo-cream/50 mb-2">
                        {language === 'en' ? 'PER AREA' : language === 'hi' ? 'प्रति क्षेत्र' : 'ஒரு பகுதி'}
                      </label>
                      <select
                        value={fert.unit}
                        onChange={(e) => handleFertilizerChange(fert.id, 'unit', e.target.value)}
                        className="w-full text-neo-cream border border-neo-cream/40 rounded-xl px-3 py-3 font-body text-sm focus:outline-none transition-colors"
                        style={{backgroundColor:'#111111', backgroundImage:'none', colorScheme:'dark'}}
                      >
                        <option value="kgs/bigha">Bigha</option>
                        <option value="kgs/hectare">Hectare</option>
                        <option value="kgs/acre">Acre</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="border-t border-neo-cream/10 px-4 py-2 flex justify-end">
                  <button
                    onClick={() => handleRemoveFertilizer(fert.id)}
                    className="font-subheading text-[10px] uppercase tracking-widest text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddFertilizer}
            className="w-full border-2 border-dashed border-neo-cream/30 hover:border-neo-cream/60 text-neo-cream/60 hover:text-neo-cream py-4 rounded-xl font-subheading font-bold text-xs uppercase tracking-widest transition-all"
            style={{backgroundColor:'transparent', backgroundImage:'none'}}
          >
            + {language === 'en' ? 'ADD FERTILIZER' : language === 'hi' ? '+ नई खाद जोड़ें' : '+ புதிய உரம் சேர்க்கவும்'}
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="w-full font-heading uppercase text-neo-cream text-xl py-5 rounded-2xl border-2 bg-neo-green-dark border-neo-cream shadow-[6px_6px_0px_#F4E7D5] hover:translate-y-[3px] hover:translate-x-[3px] hover:shadow-[3px_3px_0px_#F4E7D5] transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0"
          style={{backgroundImage:'none'}}
        >
          {isSaving
            ? (language === 'hi' ? 'सेव हो रहा है...' : 'Saving...')
            : (language === 'en' ? 'SAVE PROFILE & CONTINUE' : language === 'hi' ? 'प्रोफाइल सेव करें' : 'விவரம் சேமிக்கவும்')}
        </button>

        {showSaveMessage && (
          <div
            className={`mt-4 border-2 px-4 py-3 rounded-xl text-center font-subheading font-bold text-sm uppercase tracking-widest animate-pulse ${saveError ? 'border-red-500 text-red-400' : 'border-neo-green-dark text-neo-green-light'}`}
            style={{backgroundColor: saveError ? 'rgba(239,68,68,0.1)' : 'rgba(21,122,38,0.15)', backgroundImage:'none'}}
          >
            {saveError
              ? (language === 'hi' ? 'सर्वर से कनेक्ट नहीं हो सका — स्थानीय रूप से सेव किया गया' : 'Server unavailable — saved locally')
              : saveMessage}
          </div>
        )}

        <p className="text-center font-body text-neo-cream/25 text-xs mt-6">
          {language === 'en' ? 'Your data is synced to the cloud and stored locally as backup.' : language === 'hi' ? 'आपका डेटा क्लाउड में सिंक होता है और स्थानीय रूप से बैकअप रहता है।' : 'உங்கள் தரவு கிளவுட்டில் ஒத்திசைக்கப்படுகிறது.'}
        </p>

      </>) }
      </div>
    </div>
  );
};

export default Profile;
