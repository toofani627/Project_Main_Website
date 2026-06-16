import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../lib/auth';
import { useLanguage } from '../context/LanguageContext';

const API_URL = "";

/**
 * Setup — shown once after first login.
 * Returning users (who already have profile data) are redirected immediately.
 */
const Setup = () => {
  const navigate = useNavigate();
  const session = getSession();
  const username = session?.username;
  const displayName = session?.displayName || session?.username || 'Farmer';
  const { t } = useLanguage();

  // Step: 'loading' | 'form' | 'saving'
  const [step, setStep] = useState('loading');

  const [crops, setCrops] = useState([
    { id: 1, name: '', dateGrown: '' },
    { id: 2, name: '', dateGrown: '' }
  ]);
  const [fertilizers, setFertilizers] = useState([
    { id: 1, name: '', amount: '', unit: 'kgs/bigha' }
  ]);
  const [nextCropId, setNextCropId] = useState(3);
  const [nextFertId, setNextFertId] = useState(2);
  const [error, setError] = useState('');

  // Check if this user already has profile data → skip setup
  useEffect(() => {
    if (!username) { navigate('/login', { replace: true }); return; }
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/profile/${encodeURIComponent(username)}`);
        if (res.ok) {
          const data = await res.json();
          const hasCrops = Array.isArray(data.crops) && data.crops.some(c => c.name?.trim());
          if (hasCrops) {
            navigate('/ai-analysis', { replace: true });
            return;
          }
        }
      } catch (_) {}
      setStep('form');
    };
    check();
  }, [username, navigate]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const updateCrop = (id, field, val) =>
    setCrops(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  const addCrop = () => {
    setCrops(prev => [...prev, { id: nextCropId, name: '', dateGrown: '' }]);
    setNextCropId(n => n + 1);
  };
  const removeCrop = id => setCrops(prev => prev.filter(c => c.id !== id));

  const updateFert = (id, field, val) =>
    setFertilizers(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  const addFert = () => {
    setFertilizers(prev => [...prev, { id: nextFertId, name: '', amount: '', unit: 'kgs/bigha' }]);
    setNextFertId(n => n + 1);
  };
  const removeFert = id => setFertilizers(prev => prev.filter(f => f.id !== id));

  const handleSubmit = async () => {
    setError('');
    const cleanCrops = crops.filter(c => c.name.trim());
    const cleanFerts = fertilizers.filter(f => f.name.trim());

    if (cleanCrops.length === 0) {
      setError(t('pleaseEnterCrop'));
      return;
    }

    setStep('saving');
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, crops: cleanCrops, fertilizers: cleanFerts })
      });
      if (!res.ok) throw new Error('Save failed');
      navigate('/ai-analysis', { replace: true });
    } catch (err) {
      setError(t('couldNotSave'));
      setStep('form');
    }
  };

  const handleSkip = () => navigate('/ai-analysis', { replace: true });

  // ─── Styles ──────────────────────────────────────────────────────────────────
  const cardStyle = {
    backgroundColor: '#111111', backgroundImage: 'none',
    border: '2px solid rgba(244,231,213,0.6)', borderRadius: '1rem',
    boxShadow: '4px 4px 0 rgba(244,231,213,0.3)', padding: '1.5rem',
    marginBottom: '1.25rem'
  };
  const inputStyle = {
    width: '100%', backgroundColor: '#010101', backgroundImage: 'none',
    color: '#F4E7D5', border: '1px solid rgba(244,231,213,0.35)',
    borderRadius: '0.65rem', padding: '0.7rem 0.875rem',
    fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.2s'
  };
  const labelStyle = {
    display: 'block', fontSize: '0.6rem', letterSpacing: '0.14em',
    textTransform: 'uppercase', color: 'rgba(244,231,213,0.45)',
    marginBottom: '0.35rem'
  };
  const addBtnStyle = {
    width: '100%', border: '2px dashed rgba(244,231,213,0.2)',
    borderRadius: '0.65rem', padding: '0.75rem',
    fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'rgba(244,231,213,0.4)', background: 'none', cursor: 'pointer',
    transition: 'all 0.2s'
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#010101', backgroundImage: 'linear-gradient(to right, rgba(244,231,213,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(244,231,213,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2rem', height: '2rem', border: '2px solid rgba(244,231,213,0.2)', borderTopColor: '#F4E7D5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#010101', backgroundImage: 'linear-gradient(to right, rgba(244,231,213,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(244,231,213,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px', color: '#F4E7D5' }}>
      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '2.5rem 1rem 4rem' }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.4)', marginBottom: '0.5rem' }}>
            {t('welcome')}, {displayName}
          </p>
          <h1 style={{ fontSize: '2.75rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', lineHeight: 1.05, marginBottom: '0.75rem' }}>
            {t('tellUsAboutFarm')}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(244,231,213,0.45)', lineHeight: 1.6 }}>
            {t('setupDesc')}
          </p>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
            {[t('stepLastCrops'), t('stepFertilizers'), t('stepDone')].map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', backgroundColor: i < 2 ? '#157a26' : 'rgba(244,231,213,0.1)', border: `1px solid ${i < 2 ? '#157a26' : 'rgba(244,231,213,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#F4E7D5' }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.4)' }}>{label}</span>
                {i < 2 && <span style={{ fontSize: '0.6rem', color: 'rgba(244,231,213,0.2)' }}>›</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 1: Last Crops ───────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', border: '2px solid #F4E7D5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.65rem', fontFamily: 'var(--font-heading)' }}>01</div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t('lastCropsGrown')}</p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(244,231,213,0.4)', marginTop: '0.1rem' }}>{t('enterRecentCrops')}</p>
            </div>
            <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(244,231,213,0.5)', background: 'rgba(244,231,213,0.07)', border: '1px solid rgba(244,231,213,0.15)', borderRadius: '999px', padding: '0.2rem 0.6rem' }}>
              {crops.length} {crops.length === 1 ? t('cropSingular') : t('cropPlural')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {crops.map((crop, idx) => (
              <div key={crop.id} style={{ backgroundColor: '#1a1a1a', backgroundImage: 'none', border: '1px solid rgba(244,231,213,0.12)', borderRadius: '0.75rem', overflow: 'hidden', animation: 'fadeIn 0.25s ease' }}>
                <div style={{ padding: '0.875rem 1rem' }}>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.3)', marginBottom: '0.6rem' }}>
                    {idx === 0 ? t('mostRecentCrop') : idx === 1 ? t('secondMostRecent') : `${t('cropNum')}${idx + 1}`}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={labelStyle}>{t('cropName')}</label>
                      <input
                        type="text"
                        value={crop.name}
                        onChange={e => updateCrop(crop.id, 'name', e.target.value)}
                        placeholder={t('cropNamePlaceholderNew')}
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(244,231,213,0.7)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(244,231,213,0.35)'}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('dateHarvested')}</label>
                      <input
                        type="date"
                        value={crop.dateGrown}
                        onChange={e => updateCrop(crop.id, 'dateGrown', e.target.value)}
                        style={{ ...inputStyle, colorScheme: 'dark' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(244,231,213,0.7)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(244,231,213,0.35)'}
                      />
                    </div>
                  </div>
                </div>
                {crops.length > 1 && (
                  <div style={{ borderTop: '1px solid rgba(244,231,213,0.07)', padding: '0.35rem 1rem', textAlign: 'right' }}>
                    <button onClick={() => removeCrop(crop.id)} style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => e.target.style.color = '#f87171'}
                      onMouseLeave={e => e.target.style.color = 'rgba(239,68,68,0.5)'}>
                      {t('remove')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addCrop}
            style={addBtnStyle}
            onMouseEnter={e => { e.target.style.borderColor = 'rgba(244,231,213,0.45)'; e.target.style.color = 'rgba(244,231,213,0.7)'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'rgba(244,231,213,0.2)'; e.target.style.color = 'rgba(244,231,213,0.4)'; }}
          >
            {t('addAnotherCrop')}
          </button>
        </div>

        {/* ── Section 2: Fertilizers ──────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', border: '2px solid #F4E7D5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.65rem', fontFamily: 'var(--font-heading)' }}>02</div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t('fertilizersUsedTitle')}</p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(244,231,213,0.4)', marginTop: '0.1rem' }}>{t('inputsLast12Months')}</p>
            </div>
            <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(244,231,213,0.5)', background: 'rgba(244,231,213,0.07)', border: '1px solid rgba(244,231,213,0.15)', borderRadius: '999px', padding: '0.2rem 0.6rem' }}>
              {fertilizers.length} {fertilizers.length === 1 ? t('recordSingular') : t('recordPlural')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {fertilizers.map((fert, fidx) => (
              <div key={fert.id} style={{ backgroundColor: '#1a1a1a', backgroundImage: 'none', border: '1px solid rgba(244,231,213,0.12)', borderRadius: '0.75rem', overflow: 'hidden', animation: 'fadeIn 0.25s ease' }}>
                <div style={{ padding: '0.875rem 1rem' }}>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(244,231,213,0.3)', marginBottom: '0.6rem' }}>
                    {t('entry')} {fidx + 1}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={labelStyle}>{t('fertilizerInput')}</label>
                      <input type="text" value={fert.name} onChange={e => updateFert(fert.id, 'name', e.target.value)} placeholder={t('fertPlaceholder')} style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(244,231,213,0.7)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(244,231,213,0.35)'} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('amountKg')}</label>
                      <input type="number" step="0.1" min="0" value={fert.amount} onChange={e => updateFert(fert.id, 'amount', e.target.value)} placeholder={t('amountPlaceholder')} style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(244,231,213,0.7)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(244,231,213,0.35)'} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('perArea')}</label>
                      <select value={fert.unit} onChange={e => updateFert(fert.id, 'unit', e.target.value)} style={{ ...inputStyle, colorScheme: 'dark', cursor: 'pointer' }}>
                        <option value="kgs/bigha">{t('perBigha')}</option>
                        <option value="kgs/hectare">{t('perHectare')}</option>
                        <option value="kgs/acre">{t('perAcre')}</option>
                      </select>
                    </div>
                  </div>
                </div>
                {fertilizers.length > 1 && (
                  <div style={{ borderTop: '1px solid rgba(244,231,213,0.07)', padding: '0.35rem 1rem', textAlign: 'right' }}>
                    <button onClick={() => removeFert(fert.id)} style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => e.target.style.color = '#f87171'}
                      onMouseLeave={e => e.target.style.color = 'rgba(239,68,68,0.5)'}>
                      {t('remove')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addFert}
            style={addBtnStyle}
            onMouseEnter={e => { e.target.style.borderColor = 'rgba(244,231,213,0.45)'; e.target.style.color = 'rgba(244,231,213,0.7)'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'rgba(244,231,213,0.2)'; e.target.style.color = 'rgba(244,231,213,0.4)'; }}
          >
            {t('addFertilizerBtn')}
          </button>
        </div>

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && (
          <div style={{ border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.65rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(239,68,68,0.07)', backgroundImage: 'none', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.7rem', color: '#f87171', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{error}</p>
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <button
          onClick={handleSubmit}
          disabled={step === 'saving'}
          style={{
            width: '100%', backgroundColor: '#157a26', backgroundImage: 'none',
            color: '#F4E7D5', border: '2px solid #F4E7D5', borderRadius: '1rem',
            padding: '1.1rem', fontSize: '1.1rem', fontFamily: 'inherit',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            boxShadow: step === 'saving' ? '2px 2px 0 #F4E7D5' : '5px 5px 0 #F4E7D5',
            transform: step === 'saving' ? 'translate(3px,3px)' : 'translate(0,0)',
            cursor: step === 'saving' ? 'not-allowed' : 'pointer',
            opacity: step === 'saving' ? 0.7 : 1, transition: 'all 0.2s',
            marginBottom: '0.75rem'
          }}
        >
          {step === 'saving' ? t('saving') : t('saveStartAnalysis')}
        </button>

        <button
          onClick={handleSkip}
          style={{ width: '100%', background: 'none', border: 'none', color: 'rgba(244,231,213,0.3)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '0.5rem', transition: 'color 0.2s' }}
          onMouseEnter={e => e.target.style.color = 'rgba(244,231,213,0.6)'}
          onMouseLeave={e => e.target.style.color = 'rgba(244,231,213,0.3)'}
        >
          {t('skipForNow')}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder { color: rgba(244,231,213,0.2); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); cursor: pointer; }
      `}</style>
    </div>
  );
};

export default Setup;
