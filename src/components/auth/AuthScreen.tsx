import { useState } from 'react';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';

type AuthMode = 'login' | 'register';

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <>
      {mode === 'login' ? (
        <LoginScreen onSwitchToRegister={() => setMode('register')} />
      ) : (
        <RegisterScreen onSwitchToLogin={() => setMode('login')} />
      )}
    </>
  );
}