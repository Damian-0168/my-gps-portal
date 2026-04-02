import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { traccarLogin } from '../lib/api';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Log into Supabase
      const { error: supabaseError } = await supabase.auth.signInWithPassword({ email, password });
      if (supabaseError) throw new Error(`Supabase login failed: ${supabaseError.message}`);

      // 2. Log into Traccar
      try {
        await traccarLogin(email, password);
      } catch (traccarError: any) {
        console.error('Traccar login failed:', traccarError);
        // We don't necessarily want to block the whole login if Traccar fails, 
        // but since the dashboard depends on it, we should inform the user.
        alert('Successfully logged into Portal, but Traccar connection failed. Check your credentials.');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert('Check your email for the confirmation link!');
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
        <h1 className="text-2xl font-bold text-center">Hybrid GPS Portal</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring focus:ring-blue-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring focus:ring-blue-200"
              required
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Log In
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
