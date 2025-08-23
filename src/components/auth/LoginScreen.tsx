import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/contexts/SessionContext';
import { LoginRequest, AuthResponse } from '@/types/auth';

interface LoginScreenProps {
  onSwitchToRegister: () => void;
}

export function LoginScreen({ onSwitchToRegister }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isPinMode, setIsPinMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login } = useSession();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !pin.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
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
      // Temporary admin bypass for dev owner
      if (username.trim().toLowerCase() === 'terence gross' && pin === 'Tridam@5013') {
        const adminUser = {
          familyName: 'Terence Gross',
          displayName: 'Terry (SuperAdmin)',
          role: 'superadmin' as const
        };
        
        login(adminUser, pin);
        toast({
          title: "Success",
          description: `Welcome back, ${adminUser.displayName}!`
        });
        setLoading(false);
        return;
      }

      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ familyName: username.trim(), passwordOrPin: pin } as LoginRequest),
      });

      const data: AuthResponse = await response.json();
      
      if (data.ok && data.user) {
        const userData = {
          familyName: data.user.familyName,
          displayName: data.user.familyName, // Use familyName as displayName for now
          role: data.user.role
        };
        login(userData, pin);
        toast({
          title: "Success",
          description: `Welcome back, ${userData.displayName}!`
        });
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : 'Please check your credentials',
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
          <CardTitle className="text-2xl">Zandalee Login</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Family Name</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your family name"
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
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            
            <div className="text-center">
              <Button 
                type="button"
                variant="link"
                onClick={onSwitchToRegister}
                disabled={loading}
              >
                Have an invite code? Register here
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}