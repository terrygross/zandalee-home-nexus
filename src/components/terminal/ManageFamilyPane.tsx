import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSession } from '@/contexts/SessionContext';
import { useToast } from '@/hooks/use-toast';
import { canInviteUsers } from '@/utils/roleGuards';
import { 
  InviteRequest, 
  InviteResponse, 
  PendingInvite, 
  InvitesResponse, 
  FamilyMember, 
  FamilyMembersResponse,
  RevokeInviteRequest,
  UpdateRoleRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RemoveUserRequest
} from '@/types/auth';
import { InviteManager } from '@/components/admin/InviteManager';
import { Users, Mail, UserCog, Shield, Trash2, RotateCcw, UserX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ManageFamilyPane() {
  const { user, logout } = useSession();
  const { toast } = useToast();
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (!canInviteUsers(user)) {
    return (
      <div className="p-6 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
        <p className="text-muted-foreground">
          Only administrators can access family management.
        </p>
      </div>
    );
  }

  const loadPendingInvites = async () => {
    if (!user?.pin) return;
    
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/users/invites`, {
        headers: {
          'X-User': user.familyName,
          'X-PIN': user.pin
        }
      });

      const data: InvitesResponse = await response.json();
      
      if (data.ok && data.invites) {
        setPendingInvites(data.invites);
      } else {
        throw new Error(data.error || 'Failed to load pending invites');
      }
    } catch (error) {
      console.error('Load invites error:', error);
      toast({
        title: "Error",
        description: "Failed to load pending invites",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFamilyMembers = async () => {
    if (!user?.pin) return;
    
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/users/list`, {
        headers: {
          'X-User': user.familyName,
          'X-PIN': user.pin
        }
      });

      const data: FamilyMembersResponse = await response.json();
      
      if (data.ok && data.users) {
        setFamilyMembers(data.users);
      } else {
        throw new Error(data.error || 'Failed to load family members');
      }
    } catch (error) {
      console.error('Load members error:', error);
      toast({
        title: "Error",
        description: "Failed to load family members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeInvite = async (code: string) => {
    if (!user?.pin) return;
    
    setActionLoading(code);
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/users/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user.familyName,
          'X-PIN': user.pin
        },
        body: JSON.stringify({ code } as RevokeInviteRequest)
      });

      const data = await response.json();
      
      if (data.ok) {
        toast({
          title: "Success",
          description: "Invite revoked successfully"
        });
        loadPendingInvites(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to revoke invite');
      }
    } catch (error) {
      console.error('Revoke invite error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to revoke invite',
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const updateRole = async (familyName: string, newRole: 'superadmin' | 'admin' | 'adult' | 'kid' | 'guest') => {
    if (!user?.pin) return;
    
    setActionLoading(`role-${familyName}`);
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/users/updateRole`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user.familyName,
          'X-PIN': user.pin
        },
        body: JSON.stringify({ familyName, role: newRole } as UpdateRoleRequest)
      });

      const data = await response.json();
      
      if (data.ok) {
        toast({
          title: "Success",
          description: `Role updated for ${familyName}`
        });
        loadFamilyMembers(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Update role error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const resetPassword = async (familyName: string) => {
    if (!user?.pin) return;
    
    setActionLoading(`reset-${familyName}`);
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/users/resetPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user.familyName,
          'X-PIN': user.pin
        },
        body: JSON.stringify({ familyName } as ResetPasswordRequest)
      });

      const data: ResetPasswordResponse = await response.json();
      
      if (data.ok && data.tempPasswordOrPin) {
        toast({
          title: "Password Reset",
          description: `Temporary password for ${familyName}: ${data.tempPasswordOrPin}`,
          duration: 10000
        });
      } else {
        throw new Error(data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to reset password',
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const removeUser = async (familyName: string) => {
    if (!user?.pin) return;
    
    if (!confirm(`Are you sure you want to remove ${familyName} from the family? This action cannot be undone.`)) {
      return;
    }
    
    setActionLoading(`remove-${familyName}`);
    try {
      const baseUrl = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';
      const response = await fetch(`${baseUrl}/users/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user.familyName,
          'X-PIN': user.pin
        },
        body: JSON.stringify({ familyName } as RemoveUserRequest)
      });

      const data = await response.json();
      
      if (data.ok) {
        toast({
          title: "Success",
          description: `${familyName} removed from family`
        });
        loadFamilyMembers(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Remove user error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to remove user',
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    loadPendingInvites();
    loadFamilyMembers();
  }, [user]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manage Family</h2>
          <p className="text-muted-foreground">
            Invite new members and manage existing family accounts
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-2">
            <UserCog className="w-4 h-4" />
            {user?.displayName}
          </Badge>
          <Button variant="outline" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>

      <Tabs defaultValue="invite" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invite" className="gap-2">
            <Mail className="w-4 h-4" />
            Invite Member
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Mail className="w-4 h-4" />
            Pending Invites
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            Family Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invite">
          <InviteManager />
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invites</CardTitle>
              <CardDescription>
                Manage outstanding invitations sent to new family members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Family Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading pending invites...
                        </TableCell>
                      </TableRow>
                    ) : pendingInvites.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No pending invites
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingInvites.map((invite) => (
                        <TableRow key={invite.code}>
                          <TableCell className="font-medium">{invite.familyName}</TableCell>
                          <TableCell>{invite.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{invite.role}</Badge>
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(invite.createdAt))} ago
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(invite.expiresAt))} from now
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => revokeInvite(invite.code)}
                              disabled={actionLoading === invite.code}
                            >
                              {actionLoading === invite.code ? 'Revoking...' : 'Revoke'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Family Members</CardTitle>
              <CardDescription>
                Manage roles and access for existing family members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Family Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Loading family members...
                        </TableCell>
                      </TableRow>
                    ) : familyMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No family members found
                        </TableCell>
                      </TableRow>
                    ) : (
                      familyMembers.map((member) => (
                        <TableRow key={member.familyName}>
                          <TableCell className="font-medium">{member.familyName}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            <Select
                              value={member.role}
                              onValueChange={(newRole: 'superadmin' | 'admin' | 'adult' | 'kid' | 'guest') => 
                                updateRole(member.familyName, newRole)
                              }
                              disabled={member.familyName === user?.familyName || member.role === 'superadmin'}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="superadmin">SuperAdmin</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="adult">Adult</SelectItem>
                                <SelectItem value="kid">Kid</SelectItem>
                                <SelectItem value="guest">Guest</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(member.createdAt))} ago
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetPassword(member.familyName)}
                                disabled={actionLoading === `reset-${member.familyName}`}
                              >
                                <RotateCcw className="w-4 h-4" />
                                {actionLoading === `reset-${member.familyName}` ? 'Resetting...' : 'Reset'}
                              </Button>
                              {member.familyName !== user?.familyName && member.role !== 'superadmin' && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeUser(member.familyName)}
                                  disabled={actionLoading === `remove-${member.familyName}`}
                                >
                                  <UserX className="w-4 h-4" />
                                  {actionLoading === `remove-${member.familyName}` ? 'Removing...' : 'Remove'}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}