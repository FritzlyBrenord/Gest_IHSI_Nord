'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Camera, Lock, Mail, User as UserIcon, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export type ProfileResponse = {
  profile: {
    id: string;
    email: string;
    name: string;
    role: string;
    photoUrl: string | null;
    canEdit: boolean;
    employer: null | {
      id: string;
      firstName: string;
      lastName: string;
      poste: string;
      department: string;
      email: string;
      isActive: boolean;
    };
  };
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase() || 'U';
}

export default function ProfilePage() {
  const router = useRouter();
  const { update } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse['profile'] | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', currentPassword: '', newPassword: '' });

  const canEditAccount = profile?.canEdit ?? false;
  const displayName = profile?.name || 'Profil utilisateur';
  const displayPhoto = photoPreview === null ? '' : photoPreview || profile?.photoUrl || '';

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        const data = (await res.json()) as ProfileResponse & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Erreur lors du chargement du profil');
        if (cancelled) return;
        setProfile(data.profile);
        setPhotoPreview(data.profile.photoUrl);
        setForm((current) => ({ ...current, email: data.profile.email }));
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Profil introuvable');
          router.push('/pilotage-administratif');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onPickPhoto = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez choisir une image');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!profile?.canEdit) {
      toast.error('Ce profil ne peut pas être modifié ici');
      return;
    }

    const emailChanged = form.email.trim() && form.email.trim().toLowerCase() !== profile.email.toLowerCase();
    const passwordChanged = form.newPassword.trim().length > 0;
    const photoChanged = photoPreview !== profile.photoUrl;

    if ((emailChanged || passwordChanged) && !form.currentPassword) {
      toast.error('Le mot de passe actuel est requis pour modifier l’email ou le mot de passe');
      return;
    }

    if (passwordChanged && form.newPassword.trim().length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailChanged ? form.email.trim().toLowerCase() : undefined,
          currentPassword: form.currentPassword || undefined,
          newPassword: passwordChanged ? form.newPassword : undefined,
          photoUrl: photoChanged ? (photoPreview || null) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      setProfile((current) => current ? { ...current, email: data.profile.email, name: data.profile.name, photoUrl: data.profile.photoUrl } : current);
      setPhotoPreview(data.profile.photoUrl);
      setForm({ email: data.profile.email, currentPassword: '', newPassword: '' });
      await update();
      router.refresh();
      toast.success('Profil mis à jour');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const employerInfo = useMemo(() => profile?.employer, [profile]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement du profil...</div>;
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="rounded-3xl border bg-gradient-to-br from-emerald-50 via-background to-white p-6 shadow-sm dark:from-emerald-950/30 dark:via-background dark:to-background">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
              <AvatarImage src={displayPhoto || undefined} alt={displayName} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-semibold">{initials(displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Profil utilisateur</p>
              <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">{profile.role}</Badge>
                <Badge className={profile.canEdit ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}>{profile.canEdit ? 'Compte modifiable' : 'Lecture seule'}</Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.back()}>Retour</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-emerald-600" />Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {employerInfo ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Prénom</Label><Input value={employerInfo.firstName} readOnly /></div>
                <div className="space-y-2"><Label>Nom</Label><Input value={employerInfo.lastName} readOnly /></div>
                <div className="space-y-2"><Label>Poste</Label><Input value={employerInfo.poste} readOnly /></div>
                <div className="space-y-2"><Label>Département</Label><Input value={employerInfo.department} readOnly /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Email employé</Label><Input value={employerInfo.email} readOnly /></div>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">Aucune donnée employé n’est associée à ce profil.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-emerald-600" />Photo et accès</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <Label>Photo de profil</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border">
                  <AvatarImage src={displayPhoto || undefined} alt={displayName} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">{initials(displayName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Input type="file" accept="image/*" onChange={(event) => void onPickPhoto(event.target.files?.[0] || null)} />
                  <p className="text-xs text-muted-foreground">La photo est stockée dans le compte utilisateur, pas dans la fiche employé.</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Mail className="h-4 w-4" />Email de connexion</Label>
              <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="nom@exemple.com" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Lock className="h-4 w-4" />Mot de passe actuel</Label>
              <Input type="password" value={form.currentPassword} onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))} placeholder="Requis pour changer email ou mot de passe" />
            </div>

            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input type="password" value={form.newPassword} onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))} placeholder="Laisser vide si inchangé" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setPhotoPreview(null)} disabled={photoPreview === null && !profile.photoUrl}>Supprimer la photo</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={saving || !canEditAccount}><Save className="mr-2 h-4 w-4" />{saving ? 'Mise à jour...' : 'Enregistrer'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserIcon className="h-5 w-5 text-emerald-600" />Rappel métier</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Ce formulaire modifie uniquement le compte utilisateur. Les champs de la table <code>Employer</code> restent inchangés.</CardContent>
      </Card>
    </div>
  );
}



