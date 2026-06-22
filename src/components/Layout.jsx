import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { logout } from '../lib/auth';


const Layout = () => {
  const { t, language, changeLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      // Hide when scrolling down past 60px, show when scrolling up
      if (currentY > lastScrollY.current && currentY > 60) {
        setNavHidden(true);
      } else {
        setNavHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };


  const navItems = [
    { path: '/ai-analysis', label: t('navDashboard') },
    { path: '/multi-crop',  label: t('navCompanion') },
    { path: '/profile',     label: t('navProfile') },
    { path: '/about',       label: 'About' },
  ];

  const langOptions = [
    { code: 'en', label: 'EN' },
    { code: 'hi', label: 'हि' },
    { code: 'ta', label: 'தமி' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-body text-neo-cream">

      {/* ── Top Navbar ─────────────────────────────────────────────────── */}
      <header
        style={{ backgroundColor: 'var(--color-neo-dark)', backgroundImage: 'none' }}
        className={`sticky top-0 z-50 transition-all duration-300 ease-in-out ${
          navHidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 max-w-7xl">

          {/* Logo + App Name */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => navigate('/ai-analysis')}
          >
            <img
              src="/anna-mani-logo.svg"
              alt="Team Anna Mani logo"
              className="w-6 h-6 object-contain"
            />
            <span className="font-heading text-lg sm:text-xl text-neo-cream tracking-widest uppercase">
              AgriIntelligence
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2 font-subheading font-bold text-xs uppercase tracking-widest transition-all duration-200 border-2 rounded-xl ${
                    isActive
                      ? 'bg-neo-green-dark text-neo-cream border-neo-cream shadow-[4px_4px_0px_var(--color-neo-cream)]'
                      : 'text-neo-cream border-neo-cream shadow-[2px_2px_0px_var(--color-neo-cream)] hover:bg-neo-green-dark/20 hover:shadow-[4px_4px_0px_var(--color-neo-cream)] hover:-translate-y-0.5'
                  }`}
                  style={{ backgroundImage: 'none' }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: floating panel toggle button */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="flex items-center gap-2 text-neo-cream border-2 border-neo-cream rounded-xl px-3 py-1.5 font-subheading font-bold text-xs uppercase tracking-widest shadow-[2px_2px_0px_var(--color-neo-cream)] hover:bg-neo-green-dark/20 transition-all"
            style={{ backgroundColor: 'var(--color-neo-dark)', backgroundImage: 'none' }}
            aria-label="Settings panel"
          >
            {/* Theme Toggle Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTheme();
              }}
              className="bg-neo-cream text-neo-dark rounded-lg p-1 transition-all hover:scale-110"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                // Sun Icon (for Dark Mode to switch to Light Mode)
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                // Moon Icon (for Light Mode to switch to Dark Mode)
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
            {/* Hamburger / X */}
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              {panelOpen ? (
                <>
                  <line x1="4" y1="4" x2="16" y2="16"/>
                  <line x1="16" y1="4" x2="4" y2="16"/>
                </>
              ) : (
                <>
                  <line x1="3" y1="6"  x2="17" y2="6"/>
                  <line x1="3" y1="10" x2="17" y2="10"/>
                  <line x1="3" y1="14" x2="17" y2="14"/>
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* ── Mobile Nav ─────────────────────────────────────────────────── */}
      <nav
        style={{ backgroundColor: 'var(--color-neo-dark)', backgroundImage: 'none' }}
        className={`md:hidden py-2 px-3 flex justify-around gap-2 sticky top-0 z-40 transition-all duration-300 ease-in-out ${
          navHidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 py-2 font-subheading font-bold text-[10px] uppercase text-center border-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-neo-green-dark text-neo-cream border-neo-cream shadow-[3px_3px_0px_var(--color-neo-cream)]'
                  : 'text-neo-cream border-neo-cream/60'
              }`}
              style={{ backgroundImage: 'none', backgroundColor: isActive ? undefined : 'var(--color-neo-dark)' }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* ── Page Content ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* ── Floating Side Panel ────────────────────────────────────────── */}
      {/* Backdrop */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ease-in-out ${
          panelOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}
        style={{ width: '220px' }}
      >
        {/* Trigger tab (always visible, sticks out left) */}
        <div
          className="absolute -left-10 top-1/2 -translate-y-1/2 cursor-pointer"
          onClick={() => setPanelOpen(!panelOpen)}
        >
          <div
            className="flex items-center justify-center w-10 h-20 border-2 border-r-0 border-neo-cream rounded-l-2xl shadow-[-4px_4px_0px_var(--color-neo-cream)] transition-colors hover:bg-neo-green-dark/20"
            style={{ backgroundColor: 'var(--color-neo-surface)', backgroundImage: 'none' }}
          >
            <svg viewBox="0 0 20 40" className="w-4 h-8 text-neo-cream" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="10" cy="10" r="4"/>
              <line x1="10" y1="14" x2="10" y2="20"/>
              <path d="M6 28 L10 24 L14 28"/>
              <path d="M6 32 L10 36 L14 32"/>
            </svg>
          </div>
        </div>

        {/* Panel card */}
        <div
          className="border-2 border-neo-cream rounded-l-3xl shadow-[-6px_6px_0px_var(--color-neo-cream)] overflow-hidden"
          style={{ backgroundColor: 'var(--color-neo-surface)', backgroundImage: 'none' }}
        >
          {/* Divider strip at top */}
          <div className="border-b border-neo-cream/20 mx-5 pt-5" />

          {/* Language section */}
          <div className="px-5 pt-5 pb-4">
            <p className="font-subheading text-[10px] uppercase tracking-widest text-neo-cream/40 mb-4 text-center">
              {t('languageLabel')}
            </p>
            <div className="flex items-center justify-center gap-3">
              {langOptions.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => { changeLanguage(code); }}
                  className={`font-subheading font-bold text-sm transition-all duration-200 px-3 py-1.5 rounded-xl ${
                    language === code
                      ? 'bg-neo-cream text-neo-dark shadow-[2px_2px_0px_rgba(var(--color-neo-cream-rgb),0.4)]'
                      : 'text-neo-cream/60 hover:text-neo-cream'
                  }`}
                  style={{ backgroundImage: 'none', backgroundColor: language === code ? 'var(--color-neo-cream)' : 'transparent' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Logout button */}
          <div className="px-4 pb-5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 border-2 border-neo-cream/50 text-neo-cream rounded-2xl py-3 font-subheading font-bold text-xs uppercase tracking-widest hover:border-neo-cream hover:bg-neo-cream/10 transition-all duration-200"
              style={{ backgroundImage: 'none', backgroundColor: 'transparent' }}
            >
              {/* Arrow-right-from-bracket icon */}
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {t('logout')}
            </button>
          </div>
        </div>
      </div>

      {/* Always-visible pull tab when panel is closed */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-8 h-20 border-2 border-r-0 border-neo-cream rounded-l-2xl shadow-[-4px_4px_0px_var(--color-neo-cream)] hover:bg-neo-green-dark/20 transition-all duration-200"
          style={{ backgroundColor: 'var(--color-neo-surface)', backgroundImage: 'none' }}
          aria-label="Open settings"
        >
          {/* Small lang indicator */}
          <div className="flex flex-col items-center gap-1">
            <span className="font-subheading font-bold text-[9px] text-neo-cream leading-none">
              {(language || 'EN').toUpperCase()}
            </span>
            <div className="w-3 h-0.5 bg-neo-cream/40 rounded"/>
            <svg viewBox="0 0 12 12" className="w-3 h-3 text-neo-cream/60" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="8 2 4 6 8 10"/>
            </svg>
          </div>
        </button>
      )}

    </div>
  );
};

export default Layout;
