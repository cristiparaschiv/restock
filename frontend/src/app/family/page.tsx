'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Family, FamilyInvite } from '@/types';
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
import { toast } from 'sonner';
import {
  Check,
  Copy,
  Loader2,
  Plus,
  Users,
  UserPlus,
  X,
  Crown,
  Shield,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const translations = {
  en: {
    title: 'Family Sharing',
    subtitle: 'Share recipes, meal plans, and shopping lists with your family',
    createFamily: 'Create Family',
    joinFamily: 'Join Family',
    noFamilies: 'No families yet',
    noFamiliesDesc: 'Create a family or join one using an invite code',
    members: 'members',
    member: 'member',
    familyName: 'Family Name',
    familyNamePlaceholder: 'e.g., The Smiths',
    create: 'Create',
    creating: 'Creating...',
    inviteCode: 'Invite Code',
    inviteCodePlaceholder: 'Enter invite code',
    join: 'Join',
    joining: 'Joining...',
    copyCode: 'Copy Invite Code',
    copied: 'Copied!',
    pendingInvites: 'Pending Invites',
    accept: 'Accept',
    decline: 'Decline',
    invitedBy: 'Invited by',
    owner: 'Owner',
    admin: 'Admin',
    loading: 'Loading...',
  },
  ro: {
    title: 'Partajare Familie',
    subtitle: 'Partajează rețete, planuri de masă și liste de cumpărături cu familia',
    createFamily: 'Creează Familie',
    joinFamily: 'Alătură-te Familiei',
    noFamilies: 'Nicio familie încă',
    noFamiliesDesc: 'Creează o familie sau alătură-te folosind un cod de invitație',
    members: 'membri',
    member: 'membru',
    familyName: 'Nume Familie',
    familyNamePlaceholder: 'ex. Familia Ionescu',
    create: 'Creează',
    creating: 'Se creează...',
    inviteCode: 'Cod Invitație',
    inviteCodePlaceholder: 'Introdu codul de invitație',
    join: 'Alătură-te',
    joining: 'Se alătură...',
    copyCode: 'Copiază Codul',
    copied: 'Copiat!',
    pendingInvites: 'Invitații în Așteptare',
    accept: 'Acceptă',
    decline: 'Refuză',
    invitedBy: 'Invitat de',
    owner: 'Proprietar',
    admin: 'Admin',
    loading: 'Se încarcă...',
  },
};

export default function FamilyPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [families, setFamilies] = useState<Family[]>([]);
  const [pendingInvites, setPendingInvites] = useState<FamilyInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const lang = (user?.preferred_language || 'en') as 'en' | 'ro';
  const t = translations[lang];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [familiesData, invitesData] = await Promise.all([
        api.getFamilies(),
        api.getPendingInvites(),
      ]);
      setFamilies(familiesData);
      setPendingInvites(invitesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) return;

    setIsCreating(true);
    try {
      const family = await api.createFamily({ name: newFamilyName.trim() });
      setFamilies([...families, family]);
      setNewFamilyName('');
      setShowCreateDialog(false);
      toast.success('Family created!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create family');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!joinCode.trim()) return;

    setIsJoining(true);
    try {
      const result = await api.joinFamily(joinCode.trim());
      setFamilies([...families, result.family]);
      setJoinCode('');
      setShowJoinDialog(false);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join family');
    } finally {
      setIsJoining(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      const result = await api.acceptInvite(inviteId);
      setFamilies([...families, result.family]);
      setPendingInvites(pendingInvites.filter((i) => i.id !== inviteId));
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept invite');
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await api.declineInvite(inviteId);
      setPendingInvites(pendingInvites.filter((i) => i.id !== inviteId));
      toast.success('Invite declined');
    } catch (error) {
      toast.error('Failed to decline invite');
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-8 px-6 md:px-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <p className="text-muted-foreground text-sm">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t.joinFamily}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t.joinFamily}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="joinCode">{t.inviteCode}</Label>
                      <Input
                        id="joinCode"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder={t.inviteCodePlaceholder}
                      />
                    </div>
                    <Button
                      onClick={handleJoinFamily}
                      className="w-full"
                      disabled={!joinCode.trim() || isJoining}
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t.joining}
                        </>
                      ) : (
                        t.join
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.createFamily}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t.createFamily}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="familyName">{t.familyName}</Label>
                      <Input
                        id="familyName"
                        value={newFamilyName}
                        onChange={(e) => setNewFamilyName(e.target.value)}
                        placeholder={t.familyNamePlaceholder}
                      />
                    </div>
                    <Button
                      onClick={handleCreateFamily}
                      className="w-full"
                      disabled={!newFamilyName.trim() || isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t.creating}
                        </>
                      ) : (
                        t.create
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.pendingInvites}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{invite.family_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t.invitedBy} {invite.inviter_email}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAcceptInvite(invite.id)}>
                        <Check className="h-4 w-4 mr-1" />
                        {t.accept}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineInvite(invite.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t.decline}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Families List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t.loading}</p>
            </div>
          ) : families.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Users className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{t.noFamilies}</h2>
              <p className="text-muted-foreground mb-6 max-w-md">{t.noFamiliesDesc}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {families.map((family) => (
                <Link key={family.id} href={`/family/${family.id}`}>
                  <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
                    <CardHeader>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {family.name}
                      </CardTitle>
                      <CardDescription>
                        {family.member_count} {family.member_count === 1 ? t.member : t.members}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {family.members.slice(0, 3).map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 px-2 py-1 bg-muted rounded-full text-sm"
                          >
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{member.email}</span>
                            {getRoleBadge(member.role)}
                          </div>
                        ))}
                        {family.members.length > 3 && (
                          <div className="px-2 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                            +{family.members.length - 3}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.preventDefault();
                          copyInviteCode(family.invite_code);
                        }}
                      >
                        {copiedCode === family.invite_code ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            {t.copied}
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            {t.copyCode}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
