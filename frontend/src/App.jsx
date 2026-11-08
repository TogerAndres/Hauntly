import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ServerProvider } from './context/ServerContext';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';

function AppContent() {
  const { user, loading, switchToDemoRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center font-mono text-gray-300">
        <div className="mc-card p-6 flex flex-col items-center gap-3">
          <div className="text-3xl animate-spin">⚙️</div>
          <p className="text-sm font-bold text-emerald-400">Cargando MC-Desk...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onEnterDemo={() => switchToDemoRole('ADMIN')} />;
  }

  return (
    <ServerProvider>
      <Dashboard />
    </ServerProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
export default App;
