import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, UserPlus, Mail, Shield, Users, Key, RefreshCw, AlertCircle } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { getApiBase } from "@/utils/apiConfig";

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface FamilyMember {
  familyName: string;
  email: string;
  role: string;
  isOnline: boolean;
  lastActive: string;
}

export function InviteManagerPane() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('adult');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useSession();

  const ENABLE_INVITES = import.meta.env.VITE_ENABLE_INVITES !== 'false';

  // Only show invite manager to admin/superadmin roles
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-400" />
        <h3 className="text-lg font-semibold text-space-lightest mb-2">Access Denied</h3>
        <p className="text-text-muted">You don't have permission to manage family invitations.</p>
      </div>
    );
  }

  if (!ENABLE_INVITES) {
    return (
      <div className="p-6 text-center">
        <Users className="w-8 h-8 mx-auto mb-4 text-text-muted" />
        <h3 className="text-lg font-semibold text-space-lightest mb-2">Invites Disabled</h3>
        <p className="text-text-muted">Family invitations are currently disabled in the configuration.</p>
      </div>
    );
  }

  // Fetch invites
  const fetchInvites = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${getApiBase()}/auth/invites`);

      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch family members
  const fetchFamilyMembers = async () => {
    try {
      const response = await fetch(`${getApiBase()}/auth/family/members`);

      if (response.ok) {
        const data = await response.json();
        setFamilyMembers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch family members:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsInitialLoading(true);
      await Promise.all([
        fetchInvites(),
        fetchFamilyMembers(),
      ]);
      setIsInitialLoading(false);
    };

    loadData();
  }, []);

  // Send invitation
  const sendInvitation = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${getApiBase()}/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyName: user.familyName,
          email: email.trim(),
          role,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Invitation sent to ${email}`,
        });
        setEmail('');
        fetchInvites(); // Refresh invites
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send invitation',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Revoke invitation
  const revokeInvitation = async (inviteCode: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${getApiBase()}/auth/revoke-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: inviteCode,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invitation revoked",
        });
        fetchInvites(); // Refresh invites
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revoke invitation');
      }
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to revoke invitation',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update member role
  const updateMemberRole = async (familyName: string, newRole: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${getApiBase()}/auth/update-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyName,
          role: newRole,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Member role updated",
        });
        fetchFamilyMembers(); // Refresh members
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update role');
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset member password
  const resetMemberPassword = async (familyName: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${getApiBase()}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: `Password reset. New password: ${data.tempPasswordOrPin}`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to reset password',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Remove member
  const removeMember = async (familyName: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${getApiBase()}/auth/remove-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyName,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Member removed from family",
        });
        fetchFamilyMembers(); // Refresh members
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to remove member',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="p-6 text-center">
        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-energy-cyan animate-spin" />
        <p className="text-text-muted">Loading family management...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-space-lightest">Family Management</h2>
          <p className="text-text-muted">Invite and manage family members</p>
        </div>
        <Badge variant="secondary" className="bg-energy-cyan/20 text-energy-cyan border-energy-cyan/30">
          <Users className="w-3 h-3 mr-1" />
          {familyMembers.length} member{familyMembers.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Send Invitation */}
      <Card className="bg-space-mid border-space-light">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-space-lightest">
            <UserPlus className="w-5 h-5" />
            Send Invitation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-space-darker border-space-light text-space-lightest"
                disabled={isLoading}
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2 bg-space-darker border border-space-light rounded-md text-space-lightest"
              disabled={isLoading}
            >
              <option value="adult">Adult</option>
              <option value="kid">Kid</option>
              <option value="guest">Guest</option>
              {user.role === 'superadmin' && <option value="admin">Admin</option>}
            </select>
            <Button
              onClick={sendInvitation}
              disabled={isLoading || !email.trim()}
              className="bg-energy-cyan hover:bg-energy-cyan/80 text-space-darker"
            >
              <Plus className="w-4 h-4 mr-2" />
              Invite
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card className="bg-space-mid border-space-light">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-space-lightest">
            <Mail className="w-5 h-5" />
            Pending Invitations ({invites.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-text-muted text-center py-4">No pending invitations</p>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 bg-space-darker rounded-lg border border-space-light"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-text-muted" />
                      <div>
                        <p className="text-space-lightest font-medium">{invite.email}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {invite.role}
                          </Badge>
                          <Badge
                            variant={invite.status === 'pending' ? 'secondary' : 'default'}
                            className="text-xs"
                          >
                            {invite.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeInvitation(invite.id)}
                      disabled={isLoading}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Family Members */}
      <Card className="bg-space-mid border-space-light">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-space-lightest">
            <Users className="w-5 h-5" />
            Family Members ({familyMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {familyMembers.length === 0 ? (
            <p className="text-text-muted text-center py-4">No family members</p>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {familyMembers.map((member) => (
                  <div
                    key={member.familyName}
                    className="flex items-center justify-between p-3 bg-space-darker rounded-lg border border-space-light"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${member.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                      <div>
                        <p className="text-space-lightest font-medium">{member.familyName}</p>
                        <p className="text-text-muted text-sm">{member.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                          {!member.isOnline && (
                            <span className="text-xs text-text-muted">
                              Last active: {new Date(member.lastActive).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.familyName, e.target.value)}
                        className="px-2 py-1 text-xs bg-space-light border border-space-light rounded text-space-lightest"
                        disabled={isLoading || member.familyName === user.familyName}
                      >
                        <option value="adult">Adult</option>
                        <option value="kid">Kid</option>
                        <option value="guest">Guest</option>
                        {user.role === 'superadmin' && <option value="admin">Admin</option>}
                        {user.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetMemberPassword(member.familyName)}
                        disabled={isLoading || member.familyName === user.familyName}
                        className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/20"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.familyName)}
                        disabled={isLoading || member.familyName === user.familyName}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/20"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}