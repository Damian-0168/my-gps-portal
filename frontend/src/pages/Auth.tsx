import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { traccarSmartLogin, traccarRegisterAndLogin, parseTraccarError } from '../lib/api';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface AuthMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
}

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<AuthMessage | null>(null);

  const showMessage = (type: AuthMessage['type'], text: string) => {
    setMessage({ type, text });
    // Auto-clear non-error messages after 5 seconds
    if (type !== 'error') {
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // 1. Log into Supabase
      const { error: supabaseError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (supabaseError) {
        throw new Error(`Supabase login failed: ${supabaseError.message}`);
      }

      // 2. Log into Traccar with smart auto-registration
      try {
        const { user, wasRegistered } = await traccarSmartLogin(email, password, {
          autoRegister: true, // Enable auto-registration
        });
        
        console.log('[Auth] Traccar login successful:', { 
          email: user.email, 
          wasRegistered 
        });
        
        if (wasRegistered) {
          showMessage('info', 'Account synced with GPS tracking system');
        }
        
        // Success - the App component will redirect to dashboard
      } catch (traccarError: any) {
        const parsedError = parseTraccarError(traccarError);
        console.error('[Auth] Traccar login failed:', parsedError);
        
        // Show appropriate message based on error type
        switch (parsedError.type) {
          case 'cors':
            showMessage('warning', 
              'GPS tracking connection blocked. The Traccar server may need CORS configuration. ' +
              'You can still access basic features.'
            );
            break;
          case 'network':
            showMessage('warning', 
              'Cannot reach GPS tracking server. Make sure Traccar is running on localhost:8082.'
            );
            break;
          case 'unauthorized':
            showMessage('error', 
              'GPS tracking authentication failed. Please contact support.'
            );
            break;
          default:
            showMessage('warning', 
              `GPS tracking connection issue: ${parsedError.message}`
            );
        }
        
        // Don't block login - user can still access Supabase-only features
      }
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      showMessage('error', error.message);
      
      // Sign out from Supabase if we partially logged in
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // 1. Sign up with Supabase
      const { data, error: supabaseError } = await supabase.auth.signUp({ 
        email, 
        password 
      });
      
      if (supabaseError) {
        throw new Error(`Sign up failed: ${supabaseError.message}`);
      }

      // 2. Also create user in Traccar for seamless GPS access
      try {
        await traccarRegisterAndLogin(email, password);
        console.log('[Auth] Traccar user created successfully');
      } catch (traccarError: any) {
        const parsedError = parseTraccarError(traccarError);
        console.warn('[Auth] Traccar registration failed:', parsedError);
        // Don't block signup - Traccar user will be created on first login
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        showMessage('success', 'Check your email for the confirmation link!');
      } else {
        showMessage('success', 'Account created successfully!');
      }
    } catch (error: any) {
      console.error('[Auth] Sign up error:', error);
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg" data-testid="auth-card">
        {/* Logo/Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Hybrid GPS Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time vehicle tracking</p>
        </div>

        {/* Status Message */}
        {message && (
          <div 
            className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              message.type === 'error' 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : message.type === 'warning'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
            data-testid="auth-message"
          >
            {message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Form */}
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all placeholder:text-slate-400"
              placeholder="you@example.com"
              required
              disabled={loading}
              data-testid="email-input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all placeholder:text-slate-400"
              placeholder="••••••••"
              required
              disabled={loading}
              data-testid="password-input"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                         text-white bg-blue-600 rounded-lg font-medium
                         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              data-testid="login-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Log In'
              )}
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading || !email || !password}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                         text-blue-600 border-2 border-blue-600 rounded-lg font-medium
                         hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              data-testid="signup-btn"
            >
              Sign Up
            </button>
          </div>
        </form>

        {/* Debug Info (development only) */}
        {import.meta.env.DEV && (
          <div className="text-xs text-slate-400 text-center pt-4 border-t border-slate-100">
            <p>Traccar: {import.meta.env.VITE_TRACCAR_BASE_URL || 'http://localhost:8082'}</p>
            <p>Supabase: {import.meta.env.VITE_SUPABASE_URL?.split('.')[0]?.replace('https://', '')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
