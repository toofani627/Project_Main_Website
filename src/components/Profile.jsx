import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getSession, getProfileKey } from '../lib/auth';
import { transliterate } from '../lib/transliterate';

const API_URL = "";

const Profile = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Profile data
  const [lastDevice, setLastDevice] = useState(null);
  const [farmerName, setFarmerName] = useState('');
  const [crops, setCrops] = useState([{ id: 1, name: '', dateGrown: '' }]);
  const [fertilizers, setFertilizers] = useState([{ id: 1, name: '', amount: '', unit: 'kgs/bigha' }]);
  const [nextCropId, setNextCropId] = useState(2);
  const [nextFertilizerId, setNextFertilizerId] = useState(2);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // ─── Load profile on mount ───────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const session = getSession();
      const username = session?.username;

      if (username) {
        try {
          const res = await fetch(`${API_URL}/api/profile/${encodeURIComponent(username)}`);
          if (res.ok) {
            const data = await res.json();
            setLastDevice(data.lastDevice || null);
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
            return;
          }
        } catch (err) {
          console.warn('API load failed, falling back to localStorage:', err.message);
        }
      }

      // Fallback: localStorage cache
      try {
        const profileKey = getProfileKey();
        const raw = localStorage.getItem(profileKey);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached.lastDevice) setLastDevice(cached.lastDevice);
          if (cached.farmerName) setFarmerName(cached.farmerName);
          if (Array.isArray(cached.crops) && cached.crops.length > 0) {
            setCrops(cached.crops);
            setNextCropId(Math.max(...cached.crops.map(c => c.id || 0)) + 1);
          }
          if (Array.isArray(cached.fertilizers) && cached.fertilizers.length > 0) {
            setFertilizers(cached.fertilizers);
            setNextFertilizerId(Math.max(...cached.fertilizers.map(f => f.id || 0)) + 1);
          }
        }
      } catch (err) {
        console.error('localStorage load error:', err);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  // ─── Save profile ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const session = getSession();
    const username = session?.username;

    const payload = {
      farmerName,
      crops: crops.filter(c => c.name.trim() !== ''),
      fertilizers: fertilizers.filter(f => f.name.trim() !== '')
    };

    // Write localStorage cache
    localStorage.setItem(getProfileKey(), JSON.stringify({ ...payload, lastDevice }));

    if (!username) return;

    setIsSaving(true);
    setSaveError(false);
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, ...payload })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveError(false);
    } catch (err) {
      console.error('Save failed:', err.message);
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }

    // Reuse existing translation or fallback to English if not present
    setSaveMessage(t('saveChanges')); 
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 3000);
  };

  // ─── Crop handlers ───────────────────────────────────────────────────────────
  const addCrop = () => {
    setCrops([...crops, { id: nextCropId, name: '', dateGrown: '' }]);
    setNextCropId(n => n + 1);
  };
  const removeCrop = id => setCrops(crops.filter(c => c.id !== id));
  const updateCrop = (id, field, value) =>
    setCrops(crops.map(c => c.id === id ? { ...c, [field]: value } : c));

  // ─── Fertilizer handlers ─────────────────────────────────────────────────────
  const addFertilizer = () => {
    setFertilizers([...fertilizers, { id: nextFertilizerId, name: '', amount: '', unit: 'kgs/bigha' }]);
    setNextFertilizerId(n => n + 1);
  };
  const removeFertilizer = id => setFertilizers(fertilizers.filter(f => f.id !== id));
  const updateFertilizer = (id, field, value) =>
    setFertilizers(fertilizers.map(f => f.id === id ? { ...f, [field]: value } : f));

  const session = getSession();
  const displayName = farmerName || session?.displayName || session?.username || 'Farmer';
  const [displayTransliterated, setDisplayTransliterated] = useState(displayName);

  useEffect(() => {
    transliterate(displayName, language).then(res => setDisplayTransliterated(res));
  }, [displayName, language]);

  // ─── Shared card style ───────────────────────────────────────────────────────
  const cardStyle = {
    backgroundColor: '#111111',
    backgroundImage: 'none',
    border: '2px solid #F4E7D5',
    borderRadius: '1rem',
    boxShadow: '4px 4px 0px #F4E7D5',
    padding: '1.5rem',
    marginBottom: '1.25rem'
  };

  const inputStyle = {
    backgroundColor: '#010101',
    backgroundImage: 'none',
    color: '#F4E7D5',
    border: '1px solid rgba(244,231,213,0.4)',
    borderRadius: '0.75rem',
    padding: '0.75rem 1rem',
    width: '100%',
    fontFamily: 'inherit',
    fontSize: '0.875rem'
  };

  return (
    <div style={{ minHeight: '100vh', color: '#F4E7D5' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem' }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(244,231,213,0.2)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.5)', marginBottom: '0.25rem', fontFamily: 'inherit' }}>
            {t('farmerAccount')}
          </p>
          <h1 style={{ fontSize: '3rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.5rem' }}>
            {displayTransliterated}
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'rgba(244,231,213,0.4)' }}>
            {t('updateCropRecords')}
          </p>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', gap: '0.75rem' }}>
            <div style={{ width: '2rem', height: '2rem', border: '2px solid rgba(244,231,213,0.2)', borderTopColor: '#F4E7D5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.4)' }}>
              {t('loading')}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* ── Section 1: Farmer Name ────────────────────────────────── */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: '2px solid #F4E7D5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.7rem' }}>01</span>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.1rem' }}>
                    {t('farmerNameLabel')}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(244,231,213,0.4)' }}>
                    {t('enterNameDesc')}
                  </p>
                </div>
              </div>
              <input
                type="text"
                value={farmerName}
                onChange={e => setFarmerName(e.target.value)}
                style={{ ...inputStyle, fontSize: '0.875rem' }}
                placeholder={t('namePlaceholder')}
              />
            </div>

            {/* ── Section 2: Last Device ────────────────────────────────── */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: '2px solid #F4E7D5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.7rem' }}>02</span>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.1rem' }}>
                    {t('lastDeviceConnected')}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(244,231,213,0.4)' }}>
                    {t('setAutomatically')}
                  </p>
                </div>
              </div>
              <div style={{ backgroundColor: '#1a1a1a', backgroundImage: 'none', border: '1px solid rgba(244,231,213,0.15)', borderRadius: '0.75rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgba(244,231,213,0.4)', flexShrink: 0 }}>
                  <rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 3H8M12 3v4"/>
                </svg>
                <span style={{ fontSize: '0.875rem', color: lastDevice ? '#F4E7D5' : 'rgba(244,231,213,0.3)', fontFamily: 'monospace' }}>
                  {lastDevice || t('noDeviceRecorded')}
                </span>
              </div>
            </div>

            {/* ── Section 3: Last Crops ─────────────────────────────────── */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: '2px solid #F4E7D5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.7rem' }}>03</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.1rem' }}>
                      {t('lastCropsTitle')}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(244,231,213,0.4)' }}>
                      {t('mostRecentFirst')}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(244,231,213,0.5)', background: 'rgba(244,231,213,0.07)', border: '1px solid rgba(244,231,213,0.2)', borderRadius: '999px', padding: '0.2rem 0.6rem', flexShrink: 0 }}>
                  {crops.length} {crops.length === 1 ? t('cropSingular') : t('cropPlural')}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {crops.map((crop, idx) => (
                  <div key={crop.id} style={{ backgroundColor: '#1a1a1a', backgroundImage: 'none', border: '1px solid rgba(244,231,213,0.15)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem' }}>
                      <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.35)', marginBottom: '0.5rem' }}>
                        {idx === 0 ? t('lastCropLabel') :
                         idx === 1 ? t('secondLastLabel') : `#${idx + 1}`}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.45)', marginBottom: '0.35rem' }}>
                            {t('cropNameLabel')}
                          </label>
                          <input
                            type="text"
                            value={crop.name}
                            onChange={e => updateCrop(crop.id, 'name', e.target.value)}
                            placeholder={t('cropNamePlaceholderNew')}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.45)', marginBottom: '0.35rem' }}>
                            {t('dateHarvestedLabel')}
                          </label>
                          <input
                            type="date"
                            value={crop.dateGrown}
                            onChange={e => updateCrop(crop.id, 'dateGrown', e.target.value)}
                            style={{ ...inputStyle, colorScheme: 'dark' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(244,231,213,0.08)', padding: '0.4rem 1rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => removeCrop(crop.id)}
                        style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.target.style.color = 'rgb(239,68,68)'}
                        onMouseLeave={e => e.target.style.color = 'rgba(239,68,68,0.6)'}
                      >
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addCrop}
                style={{ width: '100%', border: '2px dashed rgba(244,231,213,0.25)', borderRadius: '0.75rem', padding: '0.875rem', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.5)', background: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.target.style.borderColor = 'rgba(244,231,213,0.5)'; e.target.style.color = '#F4E7D5'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'rgba(244,231,213,0.25)'; e.target.style.color = 'rgba(244,231,213,0.5)'; }}
              >
                {t('addNewCropBtn')}
              </button>
            </div>

            {/* ── Section 4: Fertilizers ────────────────────────────────── */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: '2px solid #F4E7D5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.7rem' }}>04</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.1rem' }}>
                      {t('fertilizersUsedTitle')}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(244,231,213,0.4)' }}>
                      {t('inputsLast12Months')}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(244,231,213,0.5)', background: 'rgba(244,231,213,0.07)', border: '1px solid rgba(244,231,213,0.2)', borderRadius: '999px', padding: '0.2rem 0.6rem', flexShrink: 0 }}>
                  {fertilizers.length} {fertilizers.length === 1 ? t('recordSingular') : t('recordPlural')}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {fertilizers.map((fert, fidx) => (
                  <div key={fert.id} style={{ backgroundColor: '#1a1a1a', backgroundImage: 'none', border: '1px solid rgba(244,231,213,0.15)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem' }}>
                      <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.35)', marginBottom: '0.5rem' }}>
                        {t('entry')} {fidx + 1}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.45)', marginBottom: '0.35rem' }}>
                            {t('fertilizerNameLabel')}
                          </label>
                          <input type="text" value={fert.name} onChange={e => updateFertilizer(fert.id, 'name', e.target.value)} placeholder={t('fertPlaceholder')} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.45)', marginBottom: '0.35rem' }}>
                            {t('amountLabel')}
                          </label>
                          <input type="number" step="0.1" min="0" value={fert.amount} onChange={e => updateFertilizer(fert.id, 'amount', e.target.value)} placeholder={t('amountPlaceholder')} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.45)', marginBottom: '0.35rem' }}>
                            {t('perArea')}
                          </label>
                          <select value={fert.unit} onChange={e => updateFertilizer(fert.id, 'unit', e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }}>
                            <option value="kgs/bigha">{t('perBigha')}</option>
                            <option value="kgs/hectare">{t('perHectare')}</option>
                            <option value="kgs/acre">{t('perAcre')}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(244,231,213,0.08)', padding: '0.4rem 1rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => removeFertilizer(fert.id)}
                        style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.target.style.color = 'rgb(239,68,68)'}
                        onMouseLeave={e => e.target.style.color = 'rgba(239,68,68,0.6)'}
                      >
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addFertilizer}
                style={{ width: '100%', border: '2px dashed rgba(244,231,213,0.25)', borderRadius: '0.75rem', padding: '0.875rem', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.5)', background: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.target.style.borderColor = 'rgba(244,231,213,0.5)'; e.target.style.color = '#F4E7D5'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'rgba(244,231,213,0.25)'; e.target.style.color = 'rgba(244,231,213,0.5)'; }}
              >
                {t('addNewFertilizerBtn')}
              </button>
            </div>

            {/* ── Save Button ───────────────────────────────────────────── */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                width: '100%',
                backgroundColor: '#157a26',
                backgroundImage: 'none',
                color: '#F4E7D5',
                border: '2px solid #F4E7D5',
                borderRadius: '1rem',
                padding: '1.25rem',
                fontSize: '1.25rem',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                boxShadow: isSaving ? '2px 2px 0px #F4E7D5' : '6px 6px 0px #F4E7D5',
                transform: isSaving ? 'translate(4px,4px)' : 'translate(0,0)',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              {isSaving ? t('saving') : t('saveChanges')}
            </button>

            {showSaveMessage && (
              <div style={{
                marginTop: '1rem',
                border: `2px solid ${saveError ? 'rgba(239,68,68,0.6)' : '#157a26'}`,
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                textAlign: 'center',
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: saveError ? '#f87171' : '#4ade80',
                backgroundColor: saveError ? 'rgba(239,68,68,0.08)' : 'rgba(21,122,38,0.12)',
                backgroundImage: 'none',
                animation: 'fadeIn 0.3s ease'
              }}>
                {saveError ? t('couldNotSave') : saveMessage}
              </div>
            )}

            <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'rgba(244,231,213,0.2)', marginTop: '1.5rem', letterSpacing: '0.05em' }}>
              {t('dataSyncCloud')}
            </p>

            <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }`}</style>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
