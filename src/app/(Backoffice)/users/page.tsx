'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchJsonOrThrow } from '@/lib/fetch-json';
import { 
  ArrowLeft, 
  ArrowRight, 
  Ban, 
  Check, 
  CheckCircle2,
  Eye, 
  MoreHorizontal, 
  Pencil, 
  Plus, 
  Search, 
  Trash2, 
  UserCog, 
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  User,
  UserCheck,
  UserX,
  Mail,
  Building2,
  Briefcase,
  Calendar,
  Clock,
  AlertCircle,
  Circle,
  Loader2,
  Key,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISEUR', 'SECRETAIRE', 'EXECUTANT'] as const;
type UserRole = (typeof USER_ROLES)[number];

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  isActive: boolean;
  userRole: UserRole | null;
};

type ManagedUser = {
  id: string;
  employeeId: string;
  role: UserRole;
  isBlocked: boolean;
  hasAccount: boolean;
  employee: EmployeeOption;
  teams: Array<{ id: string; name: string; members: EmployeeOption[] }>;
};

type UsersResponse = { users: ManagedUser[] };
type EmployeesResponse = { employees: EmployeeOption[] };

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  SUPERVISEUR: 'Superviseur',
  SECRETAIRE: 'Secrétaire',
  EXECUTANT: 'Exécutant',
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Accès total au système avec tous les privilèges.',
  ADMIN: 'Gestion administrative avancée du système.',
  SUPERVISEUR: 'Supervision d\'équipe et gestion des rapports.',
  SECRETAIRE: 'Gestion des tâches de secrétariat et documentation.',
  EXECUTANT: 'Compte opérationnel standard avec accès limité.',
};

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  SUPER_ADMIN: <ShieldAlert className="h-4 w-4" />,
  ADMIN: <ShieldCheck className="h-4 w-4" />,
  SUPERVISEUR: <Shield className="h-4 w-4" />,
  SECRETAIRE: <UserCheck className="h-4 w-4" />,
  EXECUTANT: <User className="h-4 w-4" />,
};

const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  SUPER_ADMIN: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  ADMIN: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  SUPERVISEUR: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  SECRETAIRE: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  EXECUTANT: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

function employeeName(employee: EmployeeOption) {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

function employeeMatches(employee: EmployeeOption, search: string) {
  const value = search.trim().toLowerCase();
  if (!value) return true;
  return [employee.firstName, employee.lastName, employee.email, employee.position, employee.department]
    .join(' ')
    .toLowerCase()
    .includes(value);
}

// ─── Composant de sélection d'employé amélioré ──────────────────────────────

function EmployeePicker({ 
  employees, 
  selectedId, 
  onSelect, 
  disabledIds = [],
  label = "Choisir un employé"
}: { 
  employees: EmployeeOption[]; 
  selectedId: string; 
  onSelect: (employeeId: string) => void; 
  disabledIds?: string[];
  label?: string;
}) {
  const [search, setSearch] = useState('');
  const disabledSet = useMemo(() => new Set(disabledIds), [disabledIds]);
  const selected = employees.find((employee) => employee.id === selectedId) || null;
  const filtered = employees
    .filter((employee) => employee.isActive)
    .filter((employee) => employeeMatches(employee, search))
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input 
          value={search} 
          onChange={(event) => setSearch(event.target.value)} 
          placeholder="Rechercher un employé par nom, email, poste..." 
          className="pl-9 h-11 rounded-xl border-gray-200 focus:ring-emerald-500" 
        />
      </div>
      
      {selected && (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/70 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-900">{employeeName(selected)}</p>
              <p className="text-xs text-emerald-700">{selected.position} · {selected.department}</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <Check className="h-3 w-3 mr-1" /> Sélectionné
            </Badge>
          </div>
        </div>
      )}

      <div className="max-h-72 overflow-auto rounded-xl border border-gray-200">
        {filtered.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Aucun employé disponible</p>
          </div>
        ) : (
          filtered.map((employee) => {
            const disabled = disabledSet.has(employee.id);
            const isSelected = selectedId === employee.id;
            return (
              <button
                key={employee.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(employee.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left text-sm last:border-b-0 transition-colors",
                  isSelected ? "bg-emerald-50/80" : "hover:bg-gray-50",
                  disabled && "cursor-not-allowed opacity-40"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
                    isSelected ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                  )}>
                    {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{employeeName(employee)}</p>
                    <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">{employee.department}</Badge>
                  {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Composant de carte de statistiques ──────────────────────────────────────

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtitle,
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number | string; 
  subtitle?: string;
  color: string;
}) {
  return (
    <Card className={cn("border shadow-sm hover:shadow-md transition-all duration-200", color)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="rounded-lg p-2 bg-white/60">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<ManagedUser | null>(null);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [step, setStep] = useState(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('EXECUTANT');
  const [teamName, setTeamName] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  
  // État pour la modification du mot de passe
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Mode d'édition : "role" ou "password"
  const [editMode, setEditMode] = useState<'role' | 'password'>('role');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJsonOrThrow<UsersResponse>('/api/users'),
      fetchJsonOrThrow<EmployeesResponse>('/api/employees?limit=1000')
    ])
      .then(([usersData, employeesData]) => {
        if (cancelled) return;
        const employeeIdsWithAccounts = new Set(usersData.users.map(u => u.employeeId));
        setUsers(usersData.users || []);
        setEmployees(
          (employeesData.employees || [])
            .filter(employee => employee.isActive)
            .filter(employee => employeeIdsWithAccounts.has(employee.id) || !employee.userRole)
        );
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement des utilisateurs');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchData = async () => {
    try {
      const [usersData, employeesData] = await Promise.all([
        fetchJsonOrThrow<UsersResponse>('/api/users'),
        fetchJsonOrThrow<EmployeesResponse>('/api/employees?limit=1000')
      ]);
      const employeeIdsWithAccounts = new Set(usersData.users.map(u => u.employeeId));
      setUsers(usersData.users || []);
      setEmployees(
        (employeesData.employees || [])
          .filter(employee => employee.isActive)
          .filter(employee => employeeIdsWithAccounts.has(employee.id) || !employee.userRole)
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement des utilisateurs');
    }
  };

  const selectedEmployee = useMemo(() => 
    employees.find((employee) => employee.id === selectedEmployeeId) || null, 
    [employees, selectedEmployeeId]
  );
  
  const usedEmployeeIds = useMemo(() => 
    users
      .filter((user) => user.hasAccount && (!editUser || user.employeeId !== editUser.employeeId))
      .map((user) => user.employeeId), 
    [users, editUser]
  );

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !value || [
        employeeName(user.employee),
        user.employee.email,
        user.employee.position,
        user.employee.department,
        ROLE_LABELS[user.role],
        ...user.teams.map((team) => team.name)
      ].join(' ').toLowerCase().includes(value);
      
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      
      return matchesSearch && matchesRole;
    });
  }, [users, search, filterRole]);

  const availableMembers = useMemo(() => {
    const selectedSet = new Set(memberIds);
    return employees
      .filter((employee) => employee.id !== selectedEmployeeId)
      .filter((employee) => !selectedSet.has(employee.id))
      .filter((employee) => employeeMatches(employee, memberSearch));
  }, [employees, memberIds, memberSearch, selectedEmployeeId]);

  const teamMembers = useMemo(() => {
    const selectedSet = new Set(memberIds);
    return employees.filter((employee) => selectedSet.has(employee.id));
  }, [employees, memberIds]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => !u.isBlocked && u.hasAccount).length,
    blocked: users.filter(u => u.isBlocked).length,
    withoutAccount: users.filter(u => !u.hasAccount).length,
    superAdmin: users.filter(u => u.role === 'SUPER_ADMIN').length,
    admin: users.filter(u => u.role === 'ADMIN').length,
    superviseur: users.filter(u => u.role === 'SUPERVISEUR').length,
    secretaire: users.filter(u => u.role === 'SECRETAIRE').length,
    executant: users.filter(u => u.role === 'EXECUTANT').length,
  }), [users]);

  const openCreateDialog = () => {
    setEditUser(null);
    setStep(1);
    setSelectedEmployeeId('');
    setSelectedRole('EXECUTANT');
    setTeamName('');
    setMemberIds([]);
    setMemberSearch('');
    setCreateAccount(false);
    setAccountPassword('');
    setShowPasswordChange(false);
    setNewPassword('');
    setConfirmPassword('');
    setEditMode('role');
    setDialogOpen(true);
  };

  const openEditDialog = (user: ManagedUser) => {
    const team = user.teams[0];
    setEditUser(user);
    setStep(2);
    setSelectedEmployeeId(user.employeeId);
    setSelectedRole(user.role);
    setTeamName(team?.name || '');
    setMemberIds(team?.members.map((member) => member.id) || []);
    setMemberSearch('');
    setCreateAccount(user.hasAccount);
    setAccountPassword('');
    setShowPasswordChange(false);
    setNewPassword('');
    setConfirmPassword('');
    setEditMode('role');
    setDialogOpen(true);
  };

  const moveToTeam = (employeeId: string) => 
    setMemberIds((current) => Array.from(new Set([...current, employeeId])));
  
  const removeFromTeam = (employeeId: string) => 
    setMemberIds((current) => current.filter((id) => id !== employeeId));

  const goNext = () => {
    if (step === 1 && !selectedEmployeeId) {
      toast.error('Veuillez choisir un employé');
      return;
    }
    setStep((current) => Math.min(current + 1, 3));
  };

  const goBack = () => setStep((current) => Math.max(current - 1, 1));

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setSubmitting(true);
    try {
      await fetchJsonOrThrow(`/api/users/${editUser?.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      toast.success('Mot de passe modifié avec succès');
      setShowPasswordChange(false);
      setNewPassword('');
      setConfirmPassword('');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du changement de mot de passe');
    } finally {
      setSubmitting(false);
    }
  };

  const submitUser = async () => {
    if (!selectedEmployeeId) {
      toast.error('Veuillez choisir un employé');
      return;
    }
    if (!selectedRole) {
      toast.error('Veuillez choisir un rôle');
      return;
    }
    if (createAccount && accountPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (selectedRole === 'SUPERVISEUR' && !teamName.trim()) {
      toast.error("Veuillez renseigner le nom de l'équipe");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employeeId: selectedEmployeeId,
        role: selectedRole,
        createAccount,
        password: createAccount ? accountPassword : undefined,
        teamName: selectedRole === 'SUPERVISEUR' ? teamName : '',
        memberIds: selectedRole === 'SUPERVISEUR' ? memberIds : [],
      };

      if (editUser) {
        await fetchJsonOrThrow(`/api/users/${editUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast.success('Utilisateur modifié avec succès');
      } else {
        await fetchJsonOrThrow('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast.success(createAccount ? 'Utilisateur créé avec compte activé' : 'Utilisateur créé avec succès');
      }

      setDialogOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBlocked = async (user: ManagedUser) => {
    try {
      await fetchJsonOrThrow(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !user.isBlocked }),
      });
      toast.success(user.isBlocked ? 'Utilisateur débloqué' : 'Utilisateur bloqué');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du changement de statut');
    }
  };

  const deleteUser = async (user: ManagedUser) => {
    if (!confirm(`Supprimer l'utilisateur ${employeeName(user.employee)} ?`)) return;
    try {
      await fetchJsonOrThrow(`/api/users/${user.id}`, { method: 'DELETE' });
      toast.success('Utilisateur supprimé avec succès');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 shadow-lg shadow-emerald-200">
              <UserCog className="h-5 w-5 text-white" />
            </div>
            Gestion des Utilisateurs
          </h1>
          <p className="text-sm text-muted-foreground mt-1 ml-12">
            {users.length} utilisateur{users.length > 1 ? 's' : ''} configuré{users.length > 1 ? 's' : ''} dans le système
          </p>
        </div>
        <Button 
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-200 rounded-xl px-6 h-11"
          onClick={openCreateDialog}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          <StatCard icon={Users} label="Total" value={stats.total} color="border-gray-200" />
          <StatCard icon={UserCheck} label="Actifs" value={stats.active} color="border-emerald-200" />
          <StatCard icon={UserX} label="Bloqués" value={stats.blocked} color="border-red-200" />
          <StatCard icon={AlertCircle} label="Sans compte" value={stats.withoutAccount} color="border-amber-200" />
          <StatCard icon={Shield} label="Superviseurs" value={stats.superviseur} color="border-amber-200" />
          <StatCard icon={ShieldCheck} label="Admins" value={stats.admin} color="border-orange-200" />
        </div>
      )}

      {/* Filtres */}
      <Card className="border shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                value={search} 
                onChange={(event) => setSearch(event.target.value)} 
                placeholder="Rechercher un utilisateur, une équipe, un poste..." 
                className="pl-9 h-10 rounded-xl border-gray-200 focus:ring-emerald-500" 
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="all">Tous les rôles</option>
                {USER_ROLES.map(role => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card className="border shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 font-medium text-muted-foreground">Aucun utilisateur trouvé</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search || filterRole !== 'all' 
                  ? 'Ajustez vos filtres pour affiner la recherche.' 
                  : 'Commencez par créer votre premier utilisateur.'}
              </p>
              <Button 
                className="mt-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-200 rounded-xl"
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer un utilisateur
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="font-semibold">Utilisateur</TableHead>
                    <TableHead className="font-semibold">Rôle</TableHead>
                    <TableHead className="font-semibold">Équipe</TableHead>
                    <TableHead className="font-semibold">Statut du compte</TableHead>
                    <TableHead className="font-semibold w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const roleColors = ROLE_COLORS[user.role];
                    return (
                      <TableRow key={user.id} className="hover:bg-gray-50/60 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                              roleColors.bg,
                              roleColors.text
                            )}>
                              {user.employee.firstName.charAt(0)}{user.employee.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{employeeName(user.employee)}</p>
                              <p className="text-xs text-muted-foreground">{user.employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "border font-medium",
                            roleColors.bg,
                            roleColors.text,
                            roleColors.border
                          )}>
                            <span className="mr-1.5">{ROLE_ICONS[user.role]}</span>
                            {ROLE_LABELS[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.role === 'SUPERVISEUR' ? (
                            <div>
                              <p className="text-sm font-medium">{user.teams[0]?.name || 'Sans équipe'}</p>
                              <p className="text-xs text-muted-foreground">
                                {user.teams[0]?.members.length || 0} membre{user.teams[0]?.members.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <Badge className={cn(
                              "w-fit font-medium",
                              user.isBlocked 
                                ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-100" 
                                : user.hasAccount 
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"
                            )}>
                              {user.isBlocked ? (
                                <>
                                  <Ban className="h-3 w-3 mr-1" />
                                  Bloqué
                                </>
                              ) : user.hasAccount ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Actif
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  En attente
                                </>
                              )}
                            </Badge>
                            {!user.hasAccount && !user.isBlocked && (
                              <span className="text-[10px] text-amber-600 font-medium">
                                Compte non activé
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                              <DropdownMenuItem onClick={() => setDetailsUser(user)} className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" />Détails
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(user)} className="cursor-pointer">
                                <Pencil className="mr-2 h-4 w-4" />Modifier
                              </DropdownMenuItem>
                              {user.hasAccount && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setEditUser(user);
                                    setShowPasswordChange(true);
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    setDialogOpen(false);
                                  }} 
                                  className="cursor-pointer"
                                >
                                  <Key className="mr-2 h-4 w-4" />Changer mot de passe
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => toggleBlocked(user)} className="cursor-pointer">
                                <Ban className="mr-2 h-4 w-4" />{user.isBlocked ? 'Débloquer' : 'Bloquer'}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => deleteUser(user)}>
                                <Trash2 className="mr-2 h-4 w-4" />Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Dialog de changement de mot de passe ────────────────────────────── */}

      <Dialog open={showPasswordChange} onOpenChange={(open) => !open && setShowPasswordChange(false)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Key className="h-5 w-5 text-emerald-600" />
              Changer le mot de passe
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {editUser && `Pour ${employeeName(editUser.employee)}`}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 inline-block mr-2" />
              Le mot de passe doit contenir au moins 6 caractères
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nouveau mot de passe</Label>
                <Input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Entrez le nouveau mot de passe"
                  className="rounded-xl border-gray-200 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Confirmer le mot de passe</Label>
                <Input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez le nouveau mot de passe"
                  className="rounded-xl border-gray-200 focus:ring-emerald-500"
                />
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPasswordChange(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              onClick={handlePasswordChange}
              disabled={submitting || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Modification...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Modifier le mot de passe
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog de création / modification ──────────────────────────────── */}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-2xl p-0 gap-0">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCog className="h-5 w-5 text-emerald-600" />
              {editUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
            </DialogTitle>
            {editUser && editUser.hasAccount && (
              <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
                Compte déjà activé — vous pouvez modifier le rôle ou les informations de l'équipe
              </div>
            )}
          </DialogHeader>

          <div className="p-6">
            {/* Steps - only show for creation or if editing role */}
            {(!editUser || editMode === 'role') && (
              <div className="flex items-center gap-2 mb-6">
                {[
                  { num: 1, label: 'Employé' },
                  { num: 2, label: 'Rôle' },
                  { num: 3, label: 'Configuration' }
                ].map((s) => (
                  <div key={s.num} className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all",
                      step === s.num 
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
                        : step > s.num 
                          ? "bg-emerald-100 text-emerald-600" 
                          : "bg-gray-100 text-gray-400"
                    )}>
                      {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      step === s.num ? "text-emerald-600" : "text-muted-foreground"
                    )}>
                      {s.label}
                    </span>
                    {s.num < 3 && (
                      <div className={cn(
                        "w-8 h-0.5",
                        step > s.num ? "bg-emerald-400" : "bg-gray-200"
                      )} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Step 1: Employee selection */}
            {step === 1 && (!editUser || editMode === 'role') && (
              <div className="space-y-4 py-2">
                {!editUser && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4 inline-block mr-2" />
                    Seuls les employés actifs et sans compte utilisateur existant sont affichés.
                  </div>
                )}
                <EmployeePicker 
                  employees={employees} 
                  selectedId={selectedEmployeeId} 
                  onSelect={(employeeId) => { 
                    setSelectedEmployeeId(employeeId); 
                    setCreateAccount(false); 
                    setAccountPassword(''); 
                  }} 
                  disabledIds={editUser ? [] : usedEmployeeIds} 
                />
              </div>
            )}

            {/* Step 2: Role selection */}
            {step === 2 && (!editUser || editMode === 'role') && (
              <div className="space-y-4 py-2">
                <Label className="text-base font-semibold">Choisir un rôle</Label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {USER_ROLES.map((role) => {
                    const colors = ROLE_COLORS[role];
                    const isSelected = selectedRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={cn(
                          "rounded-xl border-2 p-4 text-left transition-all duration-200",
                          isSelected 
                            ? "border-emerald-500 bg-emerald-50/50 shadow-md shadow-emerald-100" 
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "rounded-lg p-2",
                            isSelected ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"
                          )}>
                            {ROLE_ICONS[role]}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{ROLE_LABELS[role]}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
                          </div>
                          {isSelected && (
                            <div className="rounded-full bg-emerald-500 p-0.5">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Configuration */}
            {step === 3 && (!editUser || editMode === 'role') && (
              <div className="space-y-6 py-2">
                {/* Employee summary */}
                <div className="rounded-xl border-2 border-gray-200 bg-gray-50/50 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Employé sélectionné</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{selectedEmployee ? employeeName(selectedEmployee) : 'Aucun employé'}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEmployee?.position || 'Position inconnue'} · {selectedEmployee?.department || 'Département inconnu'}
                      </p>
                    </div>
                    {selectedEmployee && (
                      <Badge variant="outline" className="bg-white">
                        <Mail className="h-3 w-3 mr-1" />
                        {selectedEmployee.email}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Account activation - only for new users */}
                {!editUser && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Label className="text-sm font-semibold">Activer le compte</Label>
                        <p className="text-sm text-muted-foreground">
                          {createAccount 
                            ? 'Un compte sera créé avec l\'email de l\'employé.' 
                            : 'Le compte pourra être activé ultérieurement.'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={createAccount ? 'default' : 'outline'}
                        className={cn(
                          "rounded-xl min-w-[100px]",
                          createAccount && "bg-emerald-600 hover:bg-emerald-700"
                        )}
                        onClick={() => setCreateAccount((current) => !current)}
                      >
                        {createAccount ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Activé
                          </>
                        ) : (
                          <>
                            <Circle className="h-4 w-4 mr-2" />
                            Désactivé
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Password - only for new users with account creation */}
                {!editUser && createAccount && (
                  <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Email du compte</Label>
                        <Input 
                          value={selectedEmployee?.email || ''} 
                          readOnly 
                          className="bg-gray-50 rounded-xl border-gray-200"
                        />
                        <p className="text-xs text-muted-foreground">L'email de l'employé sera utilisé comme identifiant</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Mot de passe</Label>
                        <Input 
                          type="password" 
                          value={accountPassword} 
                          onChange={(event) => setAccountPassword(event.target.value)} 
                          placeholder="Définir un mot de passe (min 6 caractères)" 
                          className="rounded-xl border-gray-200 focus:ring-emerald-500"
                        />
                        <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Supervisor team configuration */}
                {selectedRole === 'SUPERVISEUR' && (
                  <div className="space-y-5 rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4">
                    <div className="flex items-center gap-2 text-amber-700">
                      <Shield className="h-5 w-5" />
                      <h3 className="font-semibold">Configuration de l'équipe</h3>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Nom de l'équipe</Label>
                      <Input 
                        value={teamName} 
                        onChange={(event) => setTeamName(event.target.value)} 
                        placeholder="Ex: Équipe terrain Nord" 
                        className="rounded-xl border-gray-200 bg-white focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
                      {/* Available members */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Employés disponibles</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input 
                            value={memberSearch} 
                            onChange={(event) => setMemberSearch(event.target.value)} 
                            placeholder="Rechercher..." 
                            className="pl-9 rounded-xl border-gray-200 bg-white focus:ring-emerald-500"
                          />
                        </div>
                        <div className="h-72 overflow-auto rounded-xl border border-gray-200 bg-white">
                          {availableMembers.length === 0 ? (
                            <div className="p-6 text-center text-sm text-muted-foreground">
                              Aucun employé disponible
                            </div>
                          ) : (
                            availableMembers.map((employee) => (
                              <button
                                key={employee.id}
                                type="button"
                                onClick={() => moveToTeam(employee.id)}
                                className="flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left text-sm last:border-b-0 hover:bg-gray-50 transition-colors"
                              >
                                <span className="truncate">
                                  <span className="block font-medium">{employeeName(employee)}</span>
                                  <span className="text-xs text-muted-foreground">{employee.department}</span>
                                </span>
                                <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0" />
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="hidden items-center justify-center lg:flex">
                        <div className="rounded-full bg-gray-100 p-2">
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Team members */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Équipe associée ({teamMembers.length})</Label>
                        <div className="h-72 overflow-auto rounded-xl border border-gray-200 bg-white">
                          {teamMembers.length === 0 ? (
                            <div className="p-6 text-center text-sm text-muted-foreground">
                              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              Ajoutez des employés à l'équipe
                            </div>
                          ) : (
                            teamMembers.map((employee) => (
                              <button
                                key={employee.id}
                                type="button"
                                onClick={() => removeFromTeam(employee.id)}
                                className="flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left text-sm last:border-b-0 hover:bg-gray-50 transition-colors"
                              >
                                <ArrowLeft className="h-4 w-4 text-red-400 shrink-0" />
                                <span className="text-right truncate">
                                  <span className="block font-medium">{employeeName(employee)}</span>
                                  <span className="text-xs text-muted-foreground">{employee.position}</span>
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info message for existing account */}
                {editUser && editUser.hasAccount && (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
                    <Info className="h-4 w-4 inline-block mr-2" />
                    Le compte est déjà activé. Vous pouvez modifier le rôle et les informations de l'équipe.
                    Pour changer le mot de passe, utilisez l'option dédiée dans le menu des actions.
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-2 border-t flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              {step > 1 && (!editUser || editMode === 'role') && (
                <Button variant="outline" onClick={goBack} className="rounded-xl">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Annuler
              </Button>
              {step < 3 && (!editUser || editMode === 'role') ? (
                <Button 
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-200 rounded-xl px-6"
                  onClick={goNext}
                >
                  Suivant
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (step === 3 || editMode === 'role') && (
                <Button 
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-200 rounded-xl px-6"
                  onClick={submitUser} 
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {editUser ? 'Enregistrer' : 'Valider'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog de détails ────────────────────────────────────────────────── */}

      <Dialog open={Boolean(detailsUser)} onOpenChange={(open) => !open && setDetailsUser(null)}>
        <DialogContent className="max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-600" />
              Détails de l'utilisateur
            </DialogTitle>
          </DialogHeader>

          {detailsUser && (
            <div className="space-y-6 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Employee info */}
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Employé
                  </p>
                  <p className="mt-2 text-lg font-semibold">{employeeName(detailsUser.employee)}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {detailsUser.employee.email}
                  </p>
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="flex items-center gap-2">
                      <Briefcase className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Poste:</span> {detailsUser.employee.position}
                    </p>
                    <p className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Département:</span> {detailsUser.employee.department}
                    </p>
                  </div>
                </div>

                {/* Access info */}
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    Accès
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className={cn(
                      "border font-medium",
                      ROLE_COLORS[detailsUser.role].bg,
                      ROLE_COLORS[detailsUser.role].text,
                      ROLE_COLORS[detailsUser.role].border
                    )}>
                      {ROLE_ICONS[detailsUser.role]}
                      <span className="ml-1.5">{ROLE_LABELS[detailsUser.role]}</span>
                    </Badge>
                    <Badge className={cn(
                      "font-medium border",
                      detailsUser.isBlocked 
                        ? "bg-red-100 text-red-700 border-red-200" 
                        : "bg-emerald-100 text-emerald-700 border-emerald-200"
                    )}>
                      {detailsUser.isBlocked ? (
                        <><Ban className="h-3 w-3 mr-1" /> Bloqué</>
                      ) : (
                        <><CheckCircle2 className="h-3 w-3 mr-1" /> Actif</>
                      )}
                    </Badge>
                    <Badge className={cn(
                      "font-medium border",
                      detailsUser.hasAccount 
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                        : "bg-amber-100 text-amber-700 border-amber-200"
                    )}>
                      {detailsUser.hasAccount ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" /> Compte activé</>
                      ) : (
                        <><Clock className="h-3 w-3 mr-1" /> En attente</>
                      )}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {detailsUser.role === 'SUPERVISEUR' 
                      ? 'Cet utilisateur peut superviser une équipe.' 
                      : 'Compte standard configuré depuis le backoffice.'}
                  </p>
                  {detailsUser.hasAccount && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 rounded-lg text-xs"
                      onClick={() => {
                        const user = detailsUser;
                        setDetailsUser(null);
                        setEditUser(user);
                        setShowPasswordChange(true);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      <Key className="h-3 w-3 mr-1" />
                      Changer le mot de passe
                    </Button>
                  )}
                </div>
              </div>

              {/* Team details (for supervisors) */}
              {detailsUser.role === 'SUPERVISEUR' && detailsUser.teams[0] && (
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Équipe
                      </p>
                      <h3 className="mt-1 font-semibold text-lg">{detailsUser.teams[0].name}</h3>
                    </div>
                    <Badge variant="secondary" className="font-medium">
                      {detailsUser.teams[0].members.length} membre{detailsUser.teams[0].members.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="mt-4 max-h-60 overflow-auto rounded-xl border border-gray-200">
                    {detailsUser.teams[0].members.length > 0 ? (
                      detailsUser.teams[0].members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold">
                              {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{employeeName(member)}</p>
                              <p className="text-xs text-muted-foreground">{member.position}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">{member.department}</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        Aucun employé associé à cette équipe
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailsUser(null)} className="rounded-xl">
              Fermer
            </Button>
            {detailsUser && (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                onClick={() => { 
                  const user = detailsUser; 
                  setDetailsUser(null); 
                  openEditDialog(user); 
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Composant Info (ajouté pour le message d'information) ──────────────────

function Info({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}