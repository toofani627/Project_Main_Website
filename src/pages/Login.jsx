import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/auth';

const Login = () => {
  const navigate = useNavigate();
  // modes: 'signin', 'signup', 'admin'
  const [mode, setMode] = useState('signin');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      triggerShake();
      return;
    }

    if (mode === 'admin') {
      if (username === 'admin' && password === 'adminkapassword') {
        localStorage.setItem('isAdminAuth', 'true');
        navigate('/admin-dashboard');
      } else {
        setError('Invalid admin credentials.');
        triggerShake();
      }
      return;
    }

    setLoading(true);
    // login function handles both signin and auto-signup on backend
    const result = await login(username, password);
    if (result.success) {
      navigate('/setup');
    } else {
      setError(result.error);
      setLoading(false);
      triggerShake();
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const renderTabs = () => (
    <div className="flex bg-neo-dark border-2 border-neo-cream rounded-xl mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => { setMode('signin'); setError(''); }}
        className={`flex-1 py-2 font-subheading font-bold text-[10px] uppercase tracking-widest transition-colors ${mode === 'signin' ? 'bg-neo-green-dark text-neo-cream' : 'text-neo-cream/50 hover:text-neo-cream'}`}
      >
        Sign In
      </button>
      <div className="w-px bg-neo-cream border-l border-neo-cream"></div>
      <button
        type="button"
        onClick={() => { setMode('signup'); setError(''); }}
        className={`flex-1 py-2 font-subheading font-bold text-[10px] uppercase tracking-widest transition-colors ${mode === 'signup' ? 'bg-neo-green-dark text-neo-cream' : 'text-neo-cream/50 hover:text-neo-cream'}`}
      >
        Sign Up
      </button>
      <div className="w-px bg-neo-cream border-l border-neo-cream"></div>
      <button
        type="button"
        onClick={() => { setMode('admin'); setError(''); }}
        className={`flex-1 py-2 font-subheading font-bold text-[10px] uppercase tracking-widest transition-colors ${mode === 'admin' ? 'bg-neo-cream text-neo-dark' : 'text-neo-cream/50 hover:text-neo-cream'}`}
      >
        Admin
      </button>
    </div>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: 'var(--color-neo-dark)',
        backgroundImage: 'linear-gradient(to right, rgba(var(--color-neo-cream-rgb),0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(var(--color-neo-cream-rgb),0.05) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }}
    >
      <div
        className={`w-full max-w-sm border-2 border-neo-cream rounded-3xl shadow-[8px_8px_0px_var(--color-neo-cream)] p-8 transition-transform ${shake ? 'animate-shake' : ''}`}
        style={{ backgroundColor: 'var(--color-neo-surface)', backgroundImage: 'none' }}
      >
        {/* Logo + title */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-neo-green-dark" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" strokeOpacity="0.3"/>
              <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4z"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeOpacity="0.5"/>
            </svg>
          </div>
          <h1 className="font-heading text-4xl text-neo-cream uppercase leading-none mb-2">
            {mode === 'admin' ? 'ADMIN LOGIN' : 'FARMER LOGIN'}
          </h1>
          <p className="font-body text-neo-cream/40 text-xs uppercase tracking-widest">
            {mode === 'admin' ? 'Restricted Access' : 'AgriIntelligence · Field Monitor'}
          </p>
        </div>

        {renderTabs()}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Username */}
          <div>
            <label className="block font-subheading text-[11px] uppercase tracking-widest text-neo-cream/50 mb-2">
              {mode === 'admin' ? 'Admin ID' : 'Username'}
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'admin' ? 'e.g. admin' : 'e.g. Rajesh Kumar'}
              className="w-full border-2 border-neo-cream/50 rounded-xl px-4 py-3 font-body text-sm text-neo-cream focus:outline-none focus:border-neo-cream transition-colors"
              style={{ backgroundColor: 'var(--color-neo-dark)', backgroundImage: 'none' }}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block font-subheading text-[11px] uppercase tracking-widest text-neo-cream/50 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full border-2 border-neo-cream/50 rounded-xl px-4 py-3 pr-12 font-body text-sm text-neo-cream focus:outline-none focus:border-neo-cream transition-colors"
                style={{ backgroundColor: 'var(--color-neo-dark)', backgroundImage: 'none' }}
                required
              />
              {/* Show/hide toggle */}
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neo-cream/40 hover:text-neo-cream transition-colors"
                tabIndex={-1}
              >
                {showPass ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block font-subheading text-[11px] uppercase tracking-widest text-neo-cream/50 mb-2">
                Confirm Password
              </label>
              <input
                id="login-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                className="w-full border-2 border-neo-cream/50 rounded-xl px-4 py-3 font-body text-sm text-neo-cream focus:outline-none focus:border-neo-cream transition-colors"
                style={{ backgroundColor: 'var(--color-neo-dark)', backgroundImage: 'none' }}
                required
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              className="border border-red-500/50 rounded-xl px-4 py-3"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', backgroundImage: 'none' }}
            >
              <p className="font-subheading text-xs text-red-400 uppercase tracking-widest">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className={`w-full ${mode === 'admin' ? 'bg-neo-cream text-neo-dark' : 'bg-neo-green-dark text-neo-cream'} border-2 border-neo-cream rounded-xl py-4 font-heading text-xl uppercase shadow-[4px_4px_0px_var(--color-neo-cream)] hover:translate-y-[3px] hover:translate-x-[3px] hover:shadow-[1px_1px_0px_var(--color-neo-cream)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2`}
            style={{ backgroundImage: 'none' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                  <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                PLEASE WAIT...
              </span>
            ) : (
              mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'
            )}
          </button>
        </form>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.45s ease-out; }
      `}</style>
    </div>
  );
};

export default Login;
