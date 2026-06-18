import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

// First 11 lines play on a 220ms timer.
// Line 12 ("ANALYSIS COMPLETE ✓") fires only when the AI actually responds.
const ANIM_LINES = [
  'INITIALIZING SENSOR PIPELINE...',
  'READING SOIL MOISTURE DATA...',
  'PARSING NPK LEVELS...',
  'FETCHING GEOLOCATION...',
  'CROSS-REFERENCING WEATHER DATA...',
  'LOADING CROP DATABASE...',
  'RUNNING NEURAL INFERENCE...',
  'CALCULATING YIELD PROBABILITIES...',
  'EVALUATING COMPANION SYNERGIES...',
  'RANKING CROP RECOMMENDATIONS...',
  'COMPUTING SOIL HEALTH SCORE...',
];
const COMPLETE_LINE = 'ANALYSIS COMPLETE \u2713';

const AnalysisResults = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const requestBody = location.state?.requestBody || null;
  const deviceId = requestBody?.deviceId || 'UNKNOWN';

  const [animStep, setAnimStep] = useState(0);         // 0-11 (ANIM_LINES)
  const [aiDone, setAiDone] = useState(false);         // true when API responded
  const [parsedResult, setParsedResult] = useState(null);
  const [aiError, setAiError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showExtended, setShowExtended] = useState(false);
  const [profitMode, setProfitMode] = useState(false);
  const [companionMode, setCompanionMode] = useState(false);

  // Guard: no request data → back
  useEffect(() => {
    if (!requestBody) navigate('/ai-analysis', { replace: true });
  }, [requestBody, navigate]);

  // ── ANIMATION ────────────────────────────────────────────────────────
  // Runs at 280ms/line; holds at 11/11 until AI finishes.
  useEffect(() => {
    if (!requestBody) return;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setAnimStep(step);
      if (step >= ANIM_LINES.length) clearInterval(interval); // hold here
    }, 280);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── API CALL ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!requestBody) return;
    const run = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${baseUrl}/api/ai/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        if (!res.ok) {
          const et = await res.text();
          let msg = `AI request failed (${res.status})`;
          try { const p = JSON.parse(et); if (p.error) msg = p.error; } catch {}
          throw new Error(msg);
        }
        const result = await res.json();
        let parsed = null;
        try {
          let text = result.recommendation || '';
          if (text.includes('```'))
            text = text.replace(/^```(?:json)?\n?/im, '').replace(/\n?```$/im, '');
          const s = text.indexOf('{');
          if (s !== -1) text = text.slice(s);
          parsed = JSON.parse(text.trim());
        } catch {
          parsed = { soil_score: null, soil_summary: result.recommendation, top_crops: [] };
        }
        setParsedResult(parsed);
      } catch (err) {
        setAiError(
          language === 'hi'
            ? 'AI से जवाब नहीं मिला। वापस जाएं और दोबारा कोशिश करें।'
            : language === 'ta'
            ? 'AI பதில் தோல்வியுற்றது. திரும்பி மீண்டும் முயற்சிக்கவும்.'
            : 'AI response failed. Go back and try again.'
        );
      } finally {
        setAiDone(true);
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── SYNC: show results when BOTH animation done AND AI done ──────────
  useEffect(() => {
    if (aiDone && animStep >= ANIM_LINES.length) {
      const t = setTimeout(() => setShowResults(true), 600);
      return () => clearTimeout(t);
    }
  }, [aiDone, animStep]);

  // Build the displayed terminal lines
  const visibleLines = ANIM_LINES.slice(0, animStep);
  const animFinished = animStep >= ANIM_LINES.length;
  const showWaiting = animFinished && !aiDone;
  const showComplete = animFinished && aiDone;

  // PLANT NOW handler — passes exact crop name in URL
  const handlePlantNow = (cropName) => {
    navigate(`/multi-crop?crop=${encodeURIComponent(cropName)}`);
  };

  return (
    <div className="min-h-screen bg-transparent text-neo-cream">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 max-w-5xl">

        {/* ── BACK + HEADER ──────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-8 border-b border-neo-cream/20 pb-6">
          <button
            onClick={() => navigate('/ai-analysis')}
            className="flex items-center gap-2 text-neo-cream/50 hover:text-neo-cream transition-colors font-subheading text-xs uppercase tracking-widest"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            {language === 'hi' ? 'वापस' : language === 'ta' ? 'திரும்பு' : 'BACK'}
          </button>
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl text-neo-cream uppercase leading-none">
              {language === 'hi' ? 'AI विश्लेषण परिणाम' : language === 'ta' ? 'AI பகுப்பாய்வு முடிவுகள்' : 'AI ANALYSIS RESULTS'}
            </h1>
            <p className="font-body text-neo-cream/40 text-xs mt-1 uppercase tracking-widest">
              {language === 'hi' ? 'डिवाइस:' : 'DEVICE:'} {deviceId}
            </p>
          </div>
        </div>

        {/* ── TERMINAL ───────────────────────────────────────────────── */}
        {(!showResults || aiError) && (
          <div
            className="mb-8 rounded-2xl overflow-hidden border-2 border-neo-green-dark shadow-[4px_4px_0px_var(--color-neo-green-dark)]"
            style={{ background: 'var(--color-neo-dark)' }}
          >
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neo-green-dark/30" style={{ background: 'var(--color-table-2)' }}>
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="font-mono text-[11px] text-neo-green-light/50 ml-3 tracking-widest">
                AGROMETRIX_AI — soil_analysis.sh
              </span>
              <span className="ml-auto font-mono text-[10px] text-neo-green-dark/60">
                {Math.min(animStep, ANIM_LINES.length)}/{ANIM_LINES.length}
              </span>
            </div>

            {/* Body */}
            <div className="p-5 terminal-scanlines" style={{ minHeight: '300px', position: 'relative' }}>
              <p className="font-mono text-neo-green-dark/70 text-xs mb-4">
                $ ./run_analysis --device {deviceId} --mode full-spectrum
              </p>

              {/* Typed lines */}
              {visibleLines.map((line, i) => {
                const isActive = i === animStep - 1 && !animFinished;
                return (
                  <div key={i} className={`flex items-center gap-2 mb-1.5 ${isActive ? 'text-neo-green-light' : 'text-neo-green-light/40'}`}>
                    <span className="text-neo-green-dark text-xs select-none">{'>'}</span>
                    <span className="font-mono text-xs tracking-wide">{line}</span>
                    {isActive && <span className="animate-blink text-neo-green-light ml-1 text-sm">█</span>}
                  </div>
                );
              })}

              {/* Blinking cursor while lines still typing */}
              {!animFinished && (
                <div className="flex items-center gap-2 text-neo-green-light/25 mt-1">
                  <span className="text-xs select-none">{'>'}</span>
                  <span className="animate-blink text-sm text-neo-green-light">█</span>
                </div>
              )}

              {/* Hold state: animation done but AI still running */}
              {showWaiting && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-neo-green-dark text-xs select-none">{'>'}</span>
                  <span className="font-mono text-xs text-neo-green-light/60 animate-pulse tracking-wide">
                    AWAITING AI RESPONSE
                  </span>
                  <span className="animate-blink text-neo-green-light text-sm">█</span>
                </div>
              )}

              {/* Completion line fires only when AI responds */}
              {showComplete && !aiError && (
                <div className="flex items-center gap-2 mt-3 text-neo-green-light">
                  <span className="text-xs select-none">{'>'}</span>
                  <span className="font-mono text-xs tracking-wide font-bold">{COMPLETE_LINE}</span>
                  <span className="ml-1 text-xs">— DONE</span>
                </div>
              )}

              {/* Error line */}
              {aiError && (
                <div className="flex items-center gap-2 mt-3 text-red-400">
                  <span className="text-xs select-none">{'>'}</span>
                  <span className="font-mono text-xs tracking-wide">ERROR: {aiError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ERROR FALLBACK ─────────────────────────────────────────── */}
        {aiDone && aiError && (
          <div className="neo-card border-2 border-red-500/50 rounded-2xl p-6 mb-6 text-center">
            <p className="font-heading text-xl text-red-400 mb-4">{aiError}</p>
            <button
              onClick={() => navigate('/ai-analysis')}
              className="font-subheading text-xs uppercase tracking-widest px-6 py-2 rounded-xl border border-neo-cream/30 text-neo-cream/60 hover:text-neo-cream hover:border-neo-cream transition-all"
              style={{ background: 'transparent', backgroundImage: 'none' }}
            >
              ← GO BACK
            </button>
          </div>
        )}

        {/* ── TOP 3 CROP CARDS ───────────────────────────────────────── */}
        {showResults && parsedResult?.top_crops?.length > 0 && (
          <div className="mb-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-heading text-3xl text-neo-cream uppercase leading-none">
                  {language === 'hi' ? 'फसल सुझाव' : language === 'ta' ? 'பயிர் பரிந்துரைகள்' : 'CROP RECOMMENDATIONS'}
                </h2>
                <p className="font-body text-neo-cream/35 text-xs mt-1 uppercase tracking-widest">
                  {parsedResult.top_crops.length} {language === 'hi' ? 'फसलें — मिट्टी के अनुसार क्रमबद्ध' : language === 'ta' ? 'பயிர்கள் — மண் பொருத்தத்தின்படி' : 'crops ranked by soil match · click PLANT NOW to go to companion planting'}
                </p>
              </div>

              {/* Toggles */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 justify-end">
                <button
                  id="profit-toggle"
                  onClick={() => setProfitMode(m => !m)}
                  className="flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all duration-200"
                  style={{
                    borderColor: 'var(--color-neo-cream)',
                    backgroundColor: 'var(--color-neo-surface)',
                    boxShadow: profitMode ? '0 0 15px rgba(var(--color-neo-cream-rgb),0.2)' : 'none'
                  }}
                >
                  <div className={`w-12 h-6 rounded-full border-2 p-0.5 transition-all duration-200 ${profitMode ? 'border-neo-green-dark bg-neo-green-dark/20' : 'border-neo-cream/40 bg-transparent'}`}>
                    <div className={`w-4 h-4 rounded-full transition-all duration-200 ${profitMode ? 'translate-x-6 bg-neo-green-light' : 'translate-x-0 bg-neo-cream'}`} />
                  </div>
                  <span className="font-subheading text-[12px] uppercase tracking-widest text-neo-cream font-bold">
                    ESTIMATED PROFIT
                  </span>
                </button>

                {/* Companion planting toggle */}
                <button
                  id="companion-toggle"
                  onClick={() => setCompanionMode(m => !m)}
                  className="flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all duration-200"
                  style={{
                    borderColor: 'var(--color-neo-cream)',
                    backgroundColor: 'var(--color-neo-surface)',
                    boxShadow: companionMode ? '0 0 15px rgba(var(--color-neo-cream-rgb),0.2)' : 'none'
                  }}
                >
                  <div className={`w-12 h-6 rounded-full border-2 p-0.5 transition-all duration-200 ${companionMode ? 'border-neo-green-dark bg-neo-green-dark/20' : 'border-neo-cream/40 bg-transparent'}`}>
                    <div className={`w-4 h-4 rounded-full transition-all duration-200 ${companionMode ? 'translate-x-6 bg-neo-green-light' : 'translate-x-0 bg-neo-cream'}`} />
                  </div>
                  <span className="font-subheading text-[12px] uppercase tracking-widest text-neo-cream font-bold">
                    {language === 'hi' ? 'साथी पौधारोपण' : language === 'ta' ? 'துணை நடவு' : 'COMPANION PLANTING'}
                  </span>
                </button>
              </div>
            </div>

            {/* Top 3 cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {parsedResult.top_crops.slice(0, 3).map((crop, i) => {
                const rank = i + 1;
                const matchPct = Number(crop.match_percentage) || 0;
                const isTop = rank === 1;
                
                // Deterministic mock profit calculation
                let hash = 0;
                for (let j = 0; j < (crop.name || '').length; j++) {
                  hash = (crop.name.charCodeAt(j) + ((hash << 5) - hash)) || 0;
                }
                const baseProfit = 30000 + (Math.abs(hash) % 25000); // Between 30k and 55k INR per hectare
                const fieldAreaMultiplier = requestBody?.fieldArea || 1;
                const totalProfit = baseProfit * fieldAreaMultiplier;
                const formattedProfit = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalProfit);

                return (
                  <div
                    key={i}
                    className={`relative rounded-2xl border-2 p-5 flex flex-col transition-all duration-200 hover:-translate-y-0.5 ${
                      isTop
                        ? 'border-neo-green-dark shadow-[4px_4px_0px_var(--color-neo-green-dark)]'
                        : 'border-neo-cream/25 shadow-[3px_3px_0px_rgba(var(--color-neo-cream-rgb),0.12)]'
                    }`}
                    style={{ background: 'var(--color-neo-surface)', backgroundImage: 'none' }}
                  >
                    {/* Rank badge */}
                    <span className={`absolute top-4 right-4 font-mono text-xs font-bold px-2 py-1 rounded-lg ${
                      rank === 1
                        ? 'bg-neo-green-dark text-neo-cream'
                        : rank === 2
                        ? 'bg-neo-cream/10 text-neo-cream/60 border border-neo-cream/20'
                        : 'bg-transparent text-neo-cream/25 border border-neo-cream/10'
                    }`}>
                      #{String(rank).padStart(2, '0')}
                    </span>

                    {/* Crop name */}
                    <div className="pr-10 mb-4">
                      <p className={`font-heading text-2xl leading-none mb-0.5 ${isTop ? 'text-neo-green-light' : 'text-neo-cream'}`}>
                        {crop.name}
                      </p>
                      {isTop && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-neo-green-dark">★ BEST MATCH</span>
                      )}
                    </div>

                    {/* Match % + bar OR Profit */}
                    <div className="mb-4">
                      {profitMode ? (
                        <div className="animate-fadeIn">
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="font-heading text-4xl text-neo-green-light leading-none">{formattedProfit}</span>
                          </div>
                          <p className="font-mono text-[9px] uppercase tracking-widest text-neo-cream/40 border-t border-neo-cream/10 pt-2">
                            Estimated Profit {requestBody?.fieldArea ? `for ${requestBody.fieldArea} Hectares` : 'per Hectare'}
                          </p>
                        </div>
                      ) : (
                        <div className="animate-fadeIn">
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="font-heading text-5xl text-neo-cream leading-none">{matchPct}</span>
                            <span className="font-subheading text-lg text-neo-cream/40">%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--color-neo-cream-rgb),0.08)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{
                                width: `${matchPct}%`,
                                background: isTop ? 'var(--color-neo-green-dark)' : 'rgba(var(--color-neo-cream-rgb),0.35)',
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI reason */}
                    <p className="font-body text-neo-cream/55 text-xs leading-relaxed border-t border-neo-cream/8 pt-3 mb-4 flex-1">
                      {crop.reason}
                    </p>

                    {/* Companion chips — visible only when toggle is ON */}
                    {companionMode && crop.companions?.length > 0 && (
                      <div className="mb-4 animate-fadeIn">
                        <p className="font-subheading text-[9px] uppercase tracking-[0.18em] text-neo-green-light/50 mb-2">
                          COMPANION PLANTS
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {crop.companions.map((c, j) => (
                            <span
                              key={j}
                              className="px-3 py-1 rounded-full border border-neo-green-light/30 bg-neo-green-dark/20 text-neo-green-light text-[10px] font-subheading uppercase tracking-widest whitespace-nowrap"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                        <p className="font-body text-neo-cream/40 text-[10px] leading-relaxed mt-2 italic">
                          Symbiotic benefit: Improves soil nutrient retention and naturally repels common pests.
                        </p>
                      </div>
                    )}

                    {/* PLANT NOW */}
                    <button
                      id={`plant-now-${rank}`}
                      onClick={() => handlePlantNow(crop.name)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold font-subheading uppercase tracking-widest transition-all duration-150 mt-auto ${
                        isTop
                          ? 'text-neo-cream border border-neo-green-dark hover:bg-neo-cream hover:text-black'
                          : 'border border-neo-cream/20 text-neo-cream/50 hover:border-neo-cream/50 hover:text-neo-cream'
                      }`}
                      style={{
                        backgroundImage: 'none',
                        backgroundColor: isTop ? 'var(--color-neo-green-dark)' : 'transparent',
                      }}
                    >
                      {language === 'hi' ? 'अभी लगाएं →' : language === 'ta' ? 'இப்போது நடவும் →' : 'PLANT NOW →'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ── EXTENDED PRIORITY LIST ─────────────────────────────── */}
            {parsedResult.top_crops.length > 3 && (
              <div className="mt-2">
                <button
                  id="extended-list-btn"
                  onClick={() => setShowExtended(e => !e)}
                  className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl border border-neo-cream/15 text-neo-cream/45 font-subheading text-[11px] uppercase tracking-widest hover:border-neo-cream/30 hover:text-neo-cream/65 transition-all duration-150"
                  style={{ background: 'transparent', backgroundImage: 'none' }}
                >
                  <span>
                    {showExtended
                      ? '▲  HIDE EXTENDED PRIORITY LIST'
                      : `▼  VIEW EXTENDED PRIORITY LIST — ${parsedResult.top_crops.length - 3} MORE CROP${parsedResult.top_crops.length - 3 > 1 ? 'S' : ''}`}
                  </span>
                  <span className="font-mono text-[10px] text-neo-cream/25">LOWER MATCH</span>
                </button>

                {showExtended && (
                  <div className="mt-3 rounded-2xl border border-neo-cream/12 overflow-hidden animate-fadeIn" style={{ background: 'var(--color-table-1)', backgroundImage: 'none' }}>
                    {/* Header row */}
                    <div className="flex items-center gap-4 px-5 py-2.5 border-b border-neo-cream/8">
                      <span className="font-mono text-[9px] text-neo-cream/25 uppercase w-8">Rank</span>
                      <span className="font-mono text-[9px] text-neo-cream/25 uppercase flex-1">Crop</span>
                      <span className="font-mono text-[9px] text-neo-cream/25 uppercase w-12 text-right">Match</span>
                      <span className="font-mono text-[9px] text-neo-cream/25 uppercase w-24 text-right">Action</span>
                    </div>
                    {parsedResult.top_crops.slice(3).map((crop, i) => {
                      const rank = i + 4;
                      const matchPct = Number(crop.match_percentage) || 0;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-4 px-5 py-3.5 border-b border-neo-cream/5 last:border-0 hover:bg-neo-cream/3 transition-colors"
                        >
                          {/* Rank */}
                          <span className="font-mono text-[11px] text-neo-cream/30 w-8">
                            #{String(rank).padStart(2, '0')}
                          </span>

                          {/* Name + mini bar */}
                          <div className="flex-1 min-w-0">
                            <p className="font-heading text-base text-neo-cream/70 leading-none mb-1 truncate">{crop.name}</p>
                            <div className="h-1 rounded-full overflow-hidden w-full max-w-[120px]" style={{ background: 'rgba(var(--color-neo-cream-rgb),0.06)' }}>
                              <div className="h-full rounded-full" style={{ width: `${matchPct}%`, background: 'rgba(var(--color-neo-cream-rgb),0.2)' }} />
                            </div>
                          </div>

                          {/* % */}
                          <span className="font-heading text-xl text-neo-cream/40 w-12 text-right leading-none">{matchPct}<span className="text-xs text-neo-cream/20">%</span></span>

                          {/* Plant now */}
                          <button
                            id={`plant-extended-${rank}`}
                            onClick={() => handlePlantNow(crop.name)}
                            className="w-24 py-1.5 rounded-lg border border-neo-cream/12 text-neo-cream/35 font-subheading text-[10px] uppercase tracking-widest hover:border-neo-cream/35 hover:text-neo-cream/60 transition-all text-right"
                            style={{ background: 'transparent', backgroundImage: 'none' }}
                          >
                            PLANT →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fallback plain text */}
        {showResults && parsedResult && (!parsedResult.top_crops || parsedResult.top_crops.length === 0) && parsedResult.soil_summary && (
          <div className="neo-card border-2 border-neo-cream rounded-2xl p-6 mb-6 animate-fadeIn">
            <h3 className="font-heading text-xl text-neo-cream uppercase mb-3">AI RECOMMENDATION</h3>
            <p className="font-body text-neo-cream/70 text-sm leading-relaxed">{parsedResult.soil_summary}</p>
          </div>
        )}

        {/* ── SOIL HEALTH SCORE ──────────────────────────────────────── */}
        {showResults && parsedResult?.soil_score != null && (
          <div className="neo-card border-2 border-neo-cream rounded-2xl shadow-[4px_4px_0px_var(--color-neo-cream)] p-6 mb-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="font-heading text-2xl text-neo-cream uppercase leading-none mb-1">
                  {language === 'hi' ? 'मृदा स्वास्थ्य स्कोर' : language === 'ta' ? 'மண் ஆரோக்கிய மதிப்பெண்' : 'SOIL HEALTH SCORE'}
                </h3>
                <p className="font-subheading text-[10px] uppercase tracking-widest text-neo-cream/35">
                  Based on NPK · pH · Moisture
                </p>
              </div>
              <div className="flex items-baseline gap-1 flex-shrink-0">
                <span className="font-heading leading-none text-neo-cream" style={{ fontSize: 'clamp(3rem,8vw,4.5rem)' }}>
                  {parsedResult.soil_score}
                </span>
                <span className="font-subheading text-2xl text-neo-cream/35">/100</span>
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden mb-5" style={{ background: 'rgba(var(--color-neo-cream-rgb),0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${parsedResult.soil_score}%`,
                  background:
                    parsedResult.soil_score >= 75
                      ? 'linear-gradient(to right, var(--color-neo-green-dark), #22c55e)'
                      : parsedResult.soil_score >= 50
                      ? 'linear-gradient(to right, #a16207, #eab308)'
                      : 'linear-gradient(to right, #991b1b, #ef4444)',
                }}
              />
            </div>
            <div className="flex justify-between mb-5">
              <span className="font-mono text-[9px] text-neo-cream/20 uppercase">0</span>
              <span className="font-mono text-[9px] text-neo-cream/20 uppercase">Poor</span>
              <span className="font-mono text-[9px] text-neo-cream/20 uppercase">Fair</span>
              <span className="font-mono text-[9px] text-neo-cream/20 uppercase">Good</span>
              <span className="font-mono text-[9px] text-neo-cream/20 uppercase">100</span>
            </div>
            {parsedResult.soil_summary && (
              <p className="font-body text-neo-cream/60 text-sm leading-relaxed border-t border-neo-cream/10 pt-4">
                {parsedResult.soil_summary}
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AnalysisResults;
