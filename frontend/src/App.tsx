import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route 
          path="/auth" 
          element={!session ? <Auth /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/*" 
          element={session ? <Dashboard /> : <Navigate to="/auth" replace />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
