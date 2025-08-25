
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { SessionProvider, useSession } from '@/contexts/SessionContext';
import { ZandaleeTerminal } from '@/components/ZandaleeTerminal';
import { AuthScreen } from '@/components/auth/AuthScreen';

const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated } = useSession();
  
  return (
    <div className="min-h-[100dvh] bg-background">
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
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <SessionProvider>
          <Router>
            <AppContent />
          </Router>
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
