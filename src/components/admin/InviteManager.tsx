import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/contexts/SessionContext';
import { InviteRequest, InviteResponse } from '@/types/auth';
import { Copy, Mail } from 'lucide-react';

export function InviteManager() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'superadmin' | 'admin' | 'adult' | 'kid' | 'guest'>('adult');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const { user } = useSession();
  const { toast } = useToast();

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !displayName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!user?.pin) {
      toast({
        title: "Error",
        description: "Admin PIN required for invite creation",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/users/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user.familyName,
          'X-PIN': user.pin
        },
        body: JSON.stringify({ 
          familyName: displayName.trim(),
          email: email.trim(), 
          role 
        } as InviteRequest),
      });

      const data: InviteResponse = await response.json();
      
      if (data.ok && data.code) {
        setGeneratedCode(data.code);
        toast({
          title: "Success",
          description: `Invite code generated for ${displayName}`
        });
        
        // Reset form
        setEmail('');
        setDisplayName('');
        setRole('adult');
      } else {
        throw new Error(data.error || 'Failed to create invite');
      }
    } catch (error) {
      console.error('Invite creation error:', error);
      toast({
        title: "Invite Creation Failed",
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode);
      toast({
        title: "Copied",
        description: "Invite code copied to clipboard"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Create Family Invite
          </CardTitle>
          <CardDescription>
            Generate an invite code for a new family member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Smith"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value: 'superadmin' | 'admin' | 'adult' | 'kid' | 'guest') => setRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">SuperAdmin - Full system control</SelectItem>
                  <SelectItem value="admin">Admin - Family management access</SelectItem>
                  <SelectItem value="adult">Adult - Full access with rate limits</SelectItem>
                  <SelectItem value="kid">Kid - Reduced access with allowlists</SelectItem>
                  <SelectItem value="guest">Guest - Chat and mic wizard only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating Invite...' : 'Create Invite Code'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {generatedCode && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Code Generated</CardTitle>
            <CardDescription>
              Share this code with the new member to complete registration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input 
                value={generatedCode} 
                readOnly 
                className="font-mono text-lg"
              />
              <Button onClick={copyToClipboard} size="icon" variant="outline">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Send this code to {displayName} at {email} to complete their registration.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}