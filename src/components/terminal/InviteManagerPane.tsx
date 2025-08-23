import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Users, Mail, Clock, Shield, Trash2, Key, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/contexts/SessionContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

interface PendingInvite {
  code: string;
  familyName: string;
  email: string;
  role: 'superadmin' | 'admin' | 'adult' | 'kid' | 'guest';
  createdAt: string;
  expiresAt: string;
}

interface FamilyMember {
  familyName: string;
  email: string;
  role: 'superadmin' | 'admin' | 'adult' | 'kid' | 'guest';
  createdAt: string;
}

export const InviteManagerPane = () => {
  const [inviteForm, setInviteForm] = useState({
    familyName: '',
    email: '',
    role: 'adult' as 'superadmin' | 'admin' | 'adult' | 'kid' | 'guest'
  });
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const { toast } = useToast();
  const { user } = useSession();

  const API_BASE = import.meta.env.VITE_ZANDALEE_API_BASE || 'http://127.0.0.1:11500';

  useEffect(() => {
    loadPendingInvites();
    loadFamilyMembers();
  }, []);

  const loadPendingInvites = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/invites`, {
        headers: { 'X-User': user?.familyName || '' }
      });
      const data = await response.json();
      if (data.ok) {
        setPendingInvites(data.invites || []);
      }
    } catch (error) {
      console.error('Failed to load pending invites:', error);
    }
  };

  const loadFamilyMembers = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/family/members`, {
        headers: { 'X-User': user?.familyName || '' }
      });
      const data = await response.json();
      if (data.ok) {
        setFamilyMembers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load family members:', error);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteForm.familyName || !inviteForm.email) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user?.familyName || ''
        },
        body: JSON.stringify(inviteForm)
      });

      const data = await response.json();
      if (data.ok) {
        setInviteCode(data.code);
        setInviteForm({ familyName: '', email: '', role: 'adult' });
        loadPendingInvites();
        toast({
          title: "Invite Sent",
          description: `Invitation sent to ${inviteForm.email}`,
        });
      } else {
        throw new Error(data.error || 'Failed to send invite');
      }
    } catch (error) {
      console.error('Failed to send invite:', error);
      toast({
        title: "Invite Failed",
        description: error instanceof Error ? error.message : "Could not send invitation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvite = async (code: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/revoke-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user?.familyName || ''
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
      if (data.ok) {
        loadPendingInvites();
        toast({
          title: "Invite Revoked",
          description: "Invitation has been revoked",
        });
      } else {
        throw new Error(data.error || 'Failed to revoke invite');
      }
    } catch (error) {
      console.error('Failed to revoke invite:', error);
      toast({
        title: "Revoke Failed",
        description: error instanceof Error ? error.message : "Could not revoke invitation",
        variant: "destructive"
      });
    }
  };

  const handleUpdateRole = async (familyName: string, newRole: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/update-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user?.familyName || ''
        },
        body: JSON.stringify({ familyName, role: newRole })
      });

      const data = await response.json();
      if (data.ok) {
        loadFamilyMembers();
        toast({
          title: "Role Updated",
          description: `${familyName}'s role updated to ${newRole}`,
        });
      } else {
        throw new Error(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Could not update role",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async (familyName: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user?.familyName || ''
        },
        body: JSON.stringify({ familyName })
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Password Reset",
          description: `New temporary password: ${data.tempPasswordOrPin}`,
        });
      } else {
        throw new Error(data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Could not reset password",
        variant: "destructive"
      });
    }
  };

  const handleRemoveUser = async (familyName: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/remove-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': user?.familyName || ''
        },
        body: JSON.stringify({ familyName })
      });

      const data = await response.json();
      if (data.ok) {
        loadFamilyMembers();
        toast({
          title: "User Removed",
          description: `${familyName} has been removed from the family`,
        });
      } else {
        throw new Error(data.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Failed to remove user:', error);
      toast({
        title: "Remove Failed",
        description: error instanceof Error ? error.message : "Could not remove user",
        variant: "destructive"
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'superadmin': return 'destructive';
      case 'admin': return 'default';
      case 'adult': return 'secondary';
      case 'kid': return 'outline';
      case 'guest': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Family Management</h2>
        <Badge variant="secondary" className="text-xs">
          Admin Only
        </Badge>
      </div>

      <Tabs defaultValue="invite" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invite">
            <UserPlus className="w-4 h-4 mr-2" />
            Send Invite
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="w-4 h-4 mr-2" />
            Pending Invites ({pendingInvites.length})
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            Family Members ({familyMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invite">
          <Card>
            <CardHeader>
              <CardTitle>Send Family Invitation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="familyName">Family Name *</Label>
                  <Input
                    id="familyName"
                    placeholder="Enter family member name"
                    value={inviteForm.familyName}
                    onChange={(e) => setInviteForm({ ...inviteForm, familyName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value: any) => setInviteForm({ ...inviteForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="kid">Kid</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                    {user?.role === 'superadmin' && (
                      <>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleSendInvite} 
                disabled={loading}
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : 'Send Invitation'}
              </Button>

              {inviteCode && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="font-medium mb-2">Invitation Code Generated:</div>
                  <div className="font-mono text-sm bg-background p-2 rounded border">
                    {inviteCode}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Share this code with the invitee for registration.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingInvites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No pending invitations</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Family Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvites.map((invite) => (
                        <TableRow key={invite.code}>
                          <TableCell className="font-medium">{invite.familyName}</TableCell>
                          <TableCell>{invite.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(invite.role)}>
                              {invite.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(invite.expiresAt))} left
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to revoke the invitation for {invite.familyName}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRevokeInvite(invite.code)}>
                                    Revoke
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Family Members</CardTitle>
            </CardHeader>
            <CardContent>
              {familyMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No family members found</p>
                </div>
              ) : (
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
                      {familyMembers.map((member) => (
                        <TableRow key={member.familyName}>
                          <TableCell className="font-medium">
                            {member.familyName}
                            {member.familyName === user?.familyName && (
                              <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                            )}
                          </TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            <Select
                              value={member.role}
                              onValueChange={(newRole) => handleUpdateRole(member.familyName, newRole)}
                              disabled={member.familyName === user?.familyName}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="adult">Adult</SelectItem>
                                <SelectItem value="kid">Kid</SelectItem>
                                <SelectItem value="guest">Guest</SelectItem>
                                {user?.role === 'superadmin' && (
                                  <>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="superadmin">Super Admin</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(member.createdAt))} ago
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleResetPassword(member.familyName)}
                                disabled={member.familyName === user?.familyName}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                              
                              {member.familyName !== user?.familyName && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Family Member</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove {member.familyName} from the family?
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleRemoveUser(member.familyName)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};