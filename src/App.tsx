
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { SessionProvider, useSession } from '@/contexts/SessionContext';
import { ZandaleeTerminal } from '@/components/ZandaleeTerminal';
import { AuthScreen } from '@/components/auth/AuthScreen';

const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated } = useSession();
  
  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated ? (
        <Routes>
          <Route path="/" element={<ZandaleeTerminal />} />
        </Routes>
      ) : (
        <AuthScreen />
      )}
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Router>
          <AppContent />
        </Router>
      </SessionProvider>
    </QueryClientProvider>
  );
}

export default App;
