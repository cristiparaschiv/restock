'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Family, FamilyMember } from '@/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Loader2,
  MoreVertical,
  RefreshCw,
  Shield,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';

const translations = {
  en: {
    back: 'Back to Families',
    members: 'Members',
    member: 'member',
    inviteCode: 'Invite Code',
    copyCode: 'Copy Code',
    copied: 'Copied!',
    regenerateCode: 'Regenerate Code',
    inviteMember: 'Invite Member',
    inviteByEmail: 'Invite by Email',
    emailPlaceholder: 'Enter email address',
    sendInvite: 'Send Invite',
    sending: 'Sending...',
    owner: 'Owner',
    admin: 'Admin',
    memberRole: 'Member',
    makeAdmin: 'Make Admin',
    removeAdmin: 'Remove Admin',
    removeMember: 'Remove from Family',
    leaveFamily: 'Leave Family',
    deleteFamily: 'Delete Family',
    confirmRemove: 'Remove Member',
    confirmRemoveDesc: 'Are you sure you want to remove this member from the family?',
    confirmLeave: 'Leave Family',
    confirmLeaveDesc: 'Are you sure you want to leave this family?',
    confirmDelete: 'Delete Family',
    confirmDeleteDesc: 'Are you sure you want to delete this family? This action cannot be undone.',
    cancel: 'Cancel',
    loading: 'Loading...',
    you: '(You)',
    settings: 'Family Settings',
    dangerZone: 'Danger Zone',
  },
  ro: {
    back: 'Înapoi la Familii',
    members: 'Membri',
    member: 'membru',
    inviteCode: 'Cod Invitație',
    copyCode: 'Copiază Codul',
    copied: 'Copiat!',
    regenerateCode: 'Regenerează Codul',
    inviteMember: 'Invită Membru',
    inviteByEmail: 'Invită prin Email',
    emailPlaceholder: 'Introdu adresa de email',
    sendInvite: 'Trimite Invitația',
    sending: 'Se trimite...',
    owner: 'Proprietar',
    admin: 'Admin',
    memberRole: 'Membru',
    makeAdmin: 'Fă Admin',
    removeAdmin: 'Elimină Admin',
    removeMember: 'Elimină din Familie',
    leaveFamily: 'Părăsește Familia',
    deleteFamily: 'Șterge Familia',
    confirmRemove: 'Elimină Membru',
    confirmRemoveDesc: 'Ești sigur că vrei să elimini acest membru din familie?',
    confirmLeave: 'Părăsește Familia',
    confirmLeaveDesc: 'Ești sigur că vrei să părăsești această familie?',
    confirmDelete: 'Șterge Familia',
    confirmDeleteDesc: 'Ești sigur că vrei să ștergi această familie? Această acțiune nu poate fi anulată.',
    cancel: 'Anulează',
    loading: 'Se încarcă...',
    you: '(Tu)',
    settings: 'Setări Familie',
    dangerZone: 'Zonă Periculoasă',
  },
};

export default function FamilyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<FamilyMember | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  const currentUserMember = family?.members.find(m => m.user_id === user?.id);
  const isOwner = currentUserMember?.role === 'owner';
  const isAdmin = currentUserMember?.role === 'admin' || isOwner;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && params.id) {
      loadFamily();
    }
  }, [isAuthenticated, params.id]);

  const loadFamily = async () => {
    try {
      setIsLoading(true);
      const data = await api.getFamily(params.id as string);
      setFamily(data);
    } catch (error) {
      console.error('Failed to load family:', error);
      toast.error('Failed to load family');
      router.push('/family');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (family) {
      navigator.clipboard.writeText(family.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (!family) return;
    setIsRegenerating(true);
    try {
      const updated = await api.regenerateFamilyInviteCode(family.id);
      setFamily(updated);
      toast.success('Invite code regenerated');
    } catch (error) {
      toast.error('Failed to regenerate code');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSendInvite = async () => {
    if (!family || !inviteEmail.trim()) return;
    setIsSendingInvite(true);
    try {
      await api.inviteToFamily(family.id, inviteEmail.trim());
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invite');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleUpdateRole = async (memberId: string, userId: string, newRole: 'admin' | 'member') => {
    if (!family) return;
    try {
      await api.updateMemberRole(family.id, userId, newRole);
      setFamily(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map(m =>
            m.id === memberId ? { ...m, role: newRole } : m
          ),
        };
      });
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async () => {
    if (!family || !memberToRemove) return;
    try {
      await api.removeFamilyMember(family.id, memberToRemove.user_id);
      setFamily(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.filter(m => m.id !== memberToRemove.id),
          member_count: prev.member_count - 1,
        };
      });
      toast.success('Member removed');
      setMemberToRemove(null);
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const handleLeaveFamily = async () => {
    if (!family || !user) return;
    try {
      await api.removeFamilyMember(family.id, user.id);
      toast.success('Left family');
      router.push('/family');
    } catch (error) {
      toast.error('Failed to leave family');
    }
  };

  const handleDeleteFamily = async () => {
    if (!family) return;
    try {
      await api.deleteFamily(family.id);
      toast.success('Family deleted');
      router.push('/family');
    } catch (error) {
      toast.error('Failed to delete family');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <Badge variant="default" className="gap-1">
            <Crown className="h-3 w-3" /> {t.owner}
          </Badge>
        );
      case 'admin':
        return (
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" /> {t.admin}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <User className="h-3 w-3" /> {t.memberRole}
          </Badge>
        );
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!family) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-8 px-6 md:px-8 max-w-3xl mx-auto">
        {/* Back Link */}
        <Link
          href="/family"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{family.name}</h1>
              <p className="text-muted-foreground">
                {family.member_count} {family.member_count === 1 ? t.member : t.members}
              </p>
            </div>
          </div>

          {isAdmin && (
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t.inviteMember}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.inviteByEmail}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t.inviteByEmail}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                    />
                  </div>
                  <Button
                    onClick={handleSendInvite}
                    className="w-full"
                    disabled={!inviteEmail.trim() || isSendingInvite}
                  >
                    {isSendingInvite ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.sending}
                      </>
                    ) : (
                      t.sendInvite
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Invite Code Card */}
        {isAdmin && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">{t.inviteCode}</CardTitle>
              <CardDescription>
                Share this code with family members to let them join
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-muted rounded-lg font-mono text-lg">
                  {family.invite_code}
                </code>
                <Button variant="outline" size="icon" onClick={copyInviteCode}>
                  {copiedCode ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRegenerateCode}
                  disabled={isRegenerating}
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members List */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t.members}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {family.members.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const canManage = isAdmin && !isCurrentUser && member.role !== 'owner';

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.email}
                          {isCurrentUser && (
                            <span className="text-muted-foreground ml-1">{t.you}</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(member.role)}
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role === 'member' ? (
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(member.id, member.user_id, 'admin')}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                {t.makeAdmin}
                              </DropdownMenuItem>
                            ) : member.role === 'admin' ? (
                              <DropdownMenuItem
                                onClick={() => handleUpdateRole(member.id, member.user_id, 'member')}
                              >
                                <User className="h-4 w-4 mr-2" />
                                {t.removeAdmin}
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setMemberToRemove(member)}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              {t.removeMember}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">{t.dangerZone}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isOwner && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setShowLeaveDialog(true)}
              >
                {t.leaveFamily}
              </Button>
            )}
            {isOwner && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t.deleteFamily}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Remove Member Dialog */}
        <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmRemove}</AlertDialogTitle>
              <AlertDialogDescription>{t.confirmRemoveDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveMember}>
                {t.confirmRemove}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Leave Family Dialog */}
        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmLeave}</AlertDialogTitle>
              <AlertDialogDescription>{t.confirmLeaveDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeaveFamily}>
                {t.confirmLeave}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Family Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
              <AlertDialogDescription>{t.confirmDeleteDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteFamily}
                className="bg-destructive hover:bg-destructive/90"
              >
                {t.deleteFamily}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
