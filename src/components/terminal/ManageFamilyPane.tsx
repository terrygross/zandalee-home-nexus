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
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Manage Family</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Invite new members and manage existing family accounts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Badge variant="outline" className="gap-2 text-xs sm:text-sm">
            <UserCog className="w-3 h-3 sm:w-4 sm:h-4" />
            {user?.displayName}
          </Badge>
          <Button variant="outline" size="sm" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>

      <Tabs defaultValue="invite" className="space-y-4">
        <div className="w-full">
          <TabsList className="flex flex-wrap gap-1 sm:gap-2 p-1 bg-transparent">
            <TabsTrigger value="invite" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 bg-lcars-blue text-black data-[state=active]:bg-lcars-orange">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Invite Member</span>
              <span className="xs:hidden">Invite</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 bg-lcars-purple text-black data-[state=active]:bg-lcars-pink">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Pending Invites</span>
              <span className="xs:hidden">Pending</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 bg-lcars-yellow text-black data-[state=active]:bg-lcars-cyan">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Family Members</span>
              <span className="xs:hidden">Members</span>
            </TabsTrigger>
          </TabsList>
        </div>

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
                    <TableRow className="text-xs sm:text-sm">
                      <TableHead>Family Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Created</TableHead>
                      <TableHead className="hidden md:table-cell">Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs sm:text-sm">
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
                          <TableCell className="hidden sm:table-cell break-all">{invite.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{invite.role}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell whitespace-nowrap">
                            {formatDistanceToNow(new Date(invite.createdAt))} ago
                          </TableCell>
                          <TableCell className="hidden md:table-cell whitespace-nowrap">
                            {formatDistanceToNow(new Date(invite.expiresAt))} from now
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => revokeInvite(invite.code)}
                              disabled={actionLoading === invite.code}
                              className="text-xs"
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
                    <TableRow className="text-xs sm:text-sm">
                      <TableHead>Family Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs sm:text-sm">
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
                          <TableCell className="hidden sm:table-cell break-all">{member.email}</TableCell>
                          <TableCell>
                            <Select
                              value={member.role}
                              onValueChange={(newRole: 'superadmin' | 'admin' | 'adult' | 'kid' | 'guest') => 
                                updateRole(member.familyName, newRole)
                              }
                              disabled={member.familyName === user?.familyName || member.role === 'superadmin'}
                            >
                              <SelectTrigger className="w-20 sm:w-24 text-xs sm:text-sm">
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
                          <TableCell className="hidden md:table-cell whitespace-nowrap">
                            {formatDistanceToNow(new Date(member.createdAt))} ago
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetPassword(member.familyName)}
                                disabled={actionLoading === `reset-${member.familyName}`}
                                className="text-xs w-full sm:w-auto"
                              >
                                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                                {actionLoading === `reset-${member.familyName}` ? 'Resetting...' : 'Reset'}
                              </Button>
                              {member.familyName !== user?.familyName && member.role !== 'superadmin' && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeUser(member.familyName)}
                                  disabled={actionLoading === `remove-${member.familyName}`}
                                  className="text-xs w-full sm:w-auto"
                                >
                                  <UserX className="w-3 h-3 sm:w-4 sm:h-4" />
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