import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

const About = () => {
  const { theme } = useTheme();

  const pmtRef = useRef(null);
  const text1Ref = useRef(null);
  const text2Ref = useRef(null);

  // Map theme variables based on the active mode to ensure extreme contrast
  const greenCanvas = theme === 'light' ? 'var(--color-neo-green-light)' : 'var(--color-neo-green-dark)';
  const blackText = theme === 'light' ? 'var(--color-neo-cream)' : 'var(--color-neo-dark)';
  const whiteText = theme === 'light' ? 'var(--color-neo-dark)' : 'var(--color-neo-cream)';

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;

          // Phase 3: Editorial Statement (1:1 scroll)
          if (text1Ref.current) {
            text1Ref.current.style.transform = `translateY(-${y}px)`;
          }

          // Phase 4: Core Ethos Stack (1:1 scroll)
          if (text2Ref.current) {
            text2Ref.current.style.transform = `translateY(-${y}px)`;
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Trigger immediately to set initial positions

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative w-full" style={{ backgroundColor: greenCanvas }}>
      
      {/* ── FIXED BACKGROUND VAULT ─────────────────────────────────────── */}
      <div 
        className="fixed top-16 left-0 w-full overflow-hidden pointer-events-none" 
        style={{ height: 'calc(100vh - 64px)', zIndex: 0 }}
      >
        {/* Massive Typographic Geometry */}
        <div ref={pmtRef} className="absolute inset-0 flex items-center justify-center">
          <span 
            className="font-heading leading-none tracking-tighter"
            style={{ 
              color: blackText, 
              fontSize: 'min(50vw, 600px)',
              textShadow: `8px 8px 0 ${whiteText}20` 
            }}
          >
            PMT
          </span>
        </div>

        {/* Phase 3: Editorial Statement */}
        {/* Starts at 100vh so it's initially off-screen, scrolls up naturally */}
        <div 
          ref={text1Ref} 
          className="absolute top-[90vh] right-[5vw] max-w-2xl px-6 text-right"
        >
          <p className="font-body text-3xl sm:text-5xl leading-tight" style={{ color: whiteText }}>
            We collaborate with farmers, agronomists, and experts to make work that's{' '}
            <span 
              className="inline-block px-4 py-1 sm:py-2 rounded-[2rem] mx-1 transform -rotate-2 border-2"
              style={{ 
                backgroundColor: whiteText, 
                color: blackText, 
                borderColor: blackText,
                fontFamily: "'Rozha One', 'Georgia', serif",
                fontStyle: 'italic'
              }}
            >
              smart, sharp, and human.
            </span>{' '}
            Crop predictions, IoT monitoring, we're up for anything that challenges us.
          </p>
        </div>

        {/* Phase 4: Core Ethos Stack */}
        <div 
          ref={text2Ref} 
          className="absolute top-[170vh] left-[5vw] max-w-3xl px-6"
        >
          <p className="font-heading text-2xl sm:text-4xl leading-tight mb-8" style={{ color: whiteText }}>
            People are at the core of everything we do.
          </p>
          <p className="font-heading text-2xl sm:text-4xl leading-tight mb-8" style={{ color: whiteText }}>
            No egos or chaos.
          </p>
          <p className="font-heading text-2xl sm:text-4xl leading-tight" style={{ color: whiteText }}>
            Just clear direction, straight talk, and the right mix of speed and precision to secure the harvest.
          </p>
        </div>
      </div>

      {/* ── SPACER FOR SCROLLING ───────────────────────────────────────── */}
      <div className="w-full pointer-events-none" style={{ height: '260vh' }} />

      {/* ── PHASE 5: THE FOUNDERS DRAWER SLIDE ─────────────────────────── */}
      <div 
        className="relative w-full min-h-screen py-24 sm:py-40 px-6 sm:px-12 border-t-[12px] shadow-[0_-30px_60px_rgba(0,0,0,0.6)]"
        style={{ 
          backgroundColor: whiteText, 
          borderColor: blackText,
          zIndex: 10 
        }}
      >
        <div className="container mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">
          
          {/* Left: Founders Typo & Duotone Portraits */}
          <div className="lg:col-span-6 flex flex-col gap-12">
            <h2 
              className="font-heading text-6xl sm:text-8xl lg:text-9xl uppercase tracking-tighter leading-none" 
              style={{ color: greenCanvas }}
            >
              Founders
            </h2>
            
            <div className="flex gap-4 sm:gap-8 flex-wrap">
              {/* Duotone Portrait 1 */}
              <div 
                className="w-40 h-56 sm:w-56 sm:h-72 relative overflow-hidden rounded-2xl border-4 shadow-[8px_8px_0px_rgba(0,0,0,1)]"
                style={{ borderColor: blackText, boxShadow: `8px 8px 0 ${blackText}` }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" 
                  alt="Founder" 
                  className="absolute inset-0 w-full h-full object-cover grayscale mix-blend-multiply opacity-90"
                />
                <div className="absolute inset-0 mix-blend-color opacity-80" style={{ backgroundColor: greenCanvas }} />
                <div className="absolute inset-0 mix-blend-overlay opacity-30" style={{ backgroundColor: greenCanvas }} />
              </div>

              {/* Duotone Portrait 2 */}
              <div 
                className="w-40 h-56 sm:w-56 sm:h-72 relative overflow-hidden rounded-2xl border-4 shadow-[8px_8px_0px_rgba(0,0,0,1)] mt-8 sm:mt-12"
                style={{ borderColor: blackText, boxShadow: `8px 8px 0 ${blackText}` }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" 
                  alt="Founder 2" 
                  className="absolute inset-0 w-full h-full object-cover grayscale mix-blend-multiply opacity-90"
                />
                <div className="absolute inset-0 mix-blend-color opacity-80" style={{ backgroundColor: greenCanvas }} />
                <div className="absolute inset-0 mix-blend-overlay opacity-30" style={{ backgroundColor: greenCanvas }} />
              </div>
            </div>
          </div>

          {/* Right: Bio Statement with Inverted Pills */}
          <div className="lg:col-span-6 lg:pl-12">
            <p className="font-body text-3xl sm:text-5xl leading-tight" style={{ color: blackText }}>
              Founded by veteran agricultural technologist{' '}
              <span 
                className="inline-block px-5 py-2 rounded-2xl mx-1 transform rotate-1 border-2"
                style={{ 
                  backgroundColor: greenCanvas, 
                  color: whiteText, 
                  borderColor: blackText,
                  fontFamily: "'Rozha One', 'Georgia', serif",
                  fontStyle: 'italic',
                  boxShadow: `4px 4px 0 ${blackText}`
                }}
              >
                Advanil Shukla
              </span>
              , together with lead IoT engineering collective{' '}
              <span 
                className="inline-block px-5 py-2 rounded-2xl mx-1 mt-3 sm:mt-0 transform -rotate-1 border-2"
                style={{ 
                  backgroundColor: greenCanvas, 
                  color: whiteText, 
                  borderColor: blackText,
                  fontFamily: "'Rozha One', 'Georgia', serif",
                  fontStyle: 'italic',
                  boxShadow: `4px 4px 0 ${blackText}`
                }}
              >
                Team Anna Mani
              </span>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default About;
