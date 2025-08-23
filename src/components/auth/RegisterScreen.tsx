import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/contexts/SessionContext';
import { RegisterRequest, AuthResponse } from '@/types/auth';

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

export function RegisterScreen({ onSwitchToLogin }: RegisterScreenProps) {
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isPinMode, setIsPinMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login } = useSession();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim() || !username.trim() || !pin.trim() || !confirmPin.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (pin !== confirmPin) {
      toast({
        title: "Error",
        description: "PINs do not match",
        variant: "destructive"
      });
      return;
    }

    if (isPinMode && (pin.length !== 6 || !/^\d{6}$/.test(pin))) {
      toast({
        title: "Error",
        description: "PIN must be exactly 6 digits",
        variant: "destructive"
      });
      return;
    }

    if (!isPinMode && pin.length < 4) {
      toast({
        title: "Error",
        description: "Password must be at least 4 characters",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: code.trim(), 
          username: username.trim(), 
          pin 
        } as RegisterRequest),
      });

      const data: AuthResponse = await response.json();
      
      if (data.ok && data.user) {
        login(data.user, pin);
        toast({
          title: "Success",
          description: `Welcome to Zandalee, ${data.user.displayName}!`
        });
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : 'Please check your invite code',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-space-deep p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Register with your invite code</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Invite Code</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="INV-ABC123"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your display name"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pin">{isPinMode ? 'PIN' : 'Password'}</Label>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setIsPinMode(!isPinMode);
                    setPin('');
                    setConfirmPin('');
                  }}
                  disabled={loading}
                  className="text-xs"
                >
                  Use {isPinMode ? 'Password' : 'PIN'} instead
                </Button>
              </div>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => {
                  if (isPinMode) {
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                  } else {
                    setPin(e.target.value);
                  }
                }}
                placeholder={isPinMode ? "6-digit PIN" : "Password"}
                maxLength={isPinMode ? 6 : undefined}
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm {isPinMode ? 'PIN' : 'Password'}</Label>
              <Input
                id="confirmPin"
                type="password"
                value={confirmPin}
                onChange={(e) => {
                  if (isPinMode) {
                    setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                  } else {
                    setConfirmPin(e.target.value);
                  }
                }}
                placeholder={isPinMode ? "Confirm your PIN" : "Confirm your password"}
                maxLength={isPinMode ? 6 : undefined}
                disabled={loading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
            
            <div className="text-center">
              <Button 
                type="button"
                variant="link"
                onClick={onSwitchToLogin}
                disabled={loading}
              >
                Already have an account? Sign in
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}