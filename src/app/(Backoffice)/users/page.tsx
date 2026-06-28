'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchJsonOrThrow } from '@/lib/fetch-json';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Ban,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Eye,
  Key,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserCog,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

const USER_ROLES = [ 'ADMIN', 'SUPERVISEUR', 'SECRETAIRE', 'EXECUTANT'] as const;
type UserRole = (typeof USER_ROLES)[number];

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  poste: string;
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

// ─── Constantes ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const ROLE_LABELS: Record<UserRole, string> = {

  ADMIN: 'Admin',
  SUPERVISEUR: 'Superviseur',
  SECRETAIRE: 'Secrétaire',
  EXECUTANT: 'Exécutant',
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: 'Gestion administrative avancée du système.',
  SUPERVISEUR: "Supervision d'équipe et gestion des rapports.",
  SECRETAIRE: 'Gestion des tâches de secrétariat et documentation.',
  EXECUTANT: 'Compte opérationnel standard avec accès limité.',
};

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  ADMIN: <ShieldCheck className="h-4 w-4" />,
  SUPERVISEUR: <Shield className="h-4 w-4" />,
  SECRETAIRE: <UserCheck className="h-4 w-4" />,
  EXECUTANT: <User className="h-4 w-4" />,
};

const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
   ADMIN: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  SUPERVISEUR: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  SECRETAIRE: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  EXECUTANT: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function employeeName(e: EmployeeOption) {
  return `${e.firstName} ${e.lastName}`.trim();
}

function initials(e: EmployeeOption) {
  return `${e.firstName.charAt(0)}${e.lastName.charAt(0)}`.toUpperCase();
}

function matchSearch(e: EmployeeOption, q: string) {
  const v = q.trim().toLowerCase();
  if (!v) return true;
  return [e.firstName, e.lastName, e.email, e.poste, e.department]
    .join(' ')
    .toLowerCase()
    .includes(v);
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const c = ROLE_COLORS[role];
  return (
    <Badge className={cn('border font-medium gap-1.5 w-fit', c.bg, c.text, c.border)}>
      {ROLE_ICONS[role]}
      {ROLE_LABELS[role]}
    </Badge>
  );
}

function StatusBadge({ user }: { user: ManagedUser }) {
  if (user.isBlocked)
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 border font-medium gap-1">
        <Ban className="h-3 w-3" /> Bloqué
      </Badge>
    );
  if (user.hasAccount)
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border font-medium gap-1">
        <CheckCircle2 className="h-3 w-3" /> Actif
      </Badge>
    );
  return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200 border font-medium gap-1">
      <Clock className="h-3 w-3" /> Sans compte
    </Badge>
  );
}

function Avatar({
  employee,
  role,
  size = 'md',
}: {
  employee: EmployeeOption;
  role: UserRole;
  size?: 'sm' | 'md';
}) {
  const c = ROLE_COLORS[role];
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold shrink-0',
        size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-xs',
        c.bg,
        c.text,
      )}
    >
      {initials(employee)}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className={cn('border shadow-sm', color)}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">{value}</p>
          </div>
          <div className="rounded-lg p-1.5 bg-white/60 shrink-0">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sélecteur d'employé ─────────────────────────────────────────────────────

function EmployeePicker({
  employees,
  selectedId,
  onSelect,
  disabledIds = [],
}: {
  employees: EmployeeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabledIds?: string[];
}) {
  const [search, setSearch] = useState('');
  const disabledSet = useMemo(() => new Set(disabledIds), [disabledIds]);
  const selected = employees.find((e) => e.id === selectedId) || null;

  const filtered = useMemo(
    () =>
      employees
        .filter((e) => e.isActive)
        .filter((e) => matchSearch(e, search))
        .slice(0, 12),
    [employees, search],
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email, poste…"
          className="pl-9 rounded-xl border-gray-200"
        />
      </div>

      {selected && (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-900">{employeeName(selected)}</p>
            <p className="text-xs text-emerald-700">
              {selected.poste} · {selected.department}
            </p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
            <Check className="h-3 w-3 mr-1" /> Sélectionné
          </Badge>
        </div>
      )}

      <div className="max-h-64 overflow-auto rounded-xl border border-gray-200 divide-y">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Aucun employé disponible
          </div>
        ) : (
          filtered.map((emp) => {
            const disabled = disabledSet.has(emp.id);
            const isSelected = selectedId === emp.id;
            return (
              <button
                key={emp.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(emp.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors',
                  isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50',
                  disabled && 'opacity-40 cursor-not-allowed',
                )}
              >
                <div
                  className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold',
                    isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600',
                  )}
                >
                  {initials(emp)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{employeeName(emp)}</p>
                  <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {emp.department}
                </Badge>
                {isSelected && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <p className="text-xs text-muted-foreground">
        Page {page} / {totalPages} · {total} utilisateur{total > 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p: number;
          if (totalPages <= 5) p = i + 1;
          else if (page <= 3) p = i + 1;
          else if (page >= totalPages - 2) p = totalPages - 4 + i;
          else p = page - 2 + i;
          return (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'h-8 w-8 text-xs',
                p === page && 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
              )}
              onClick={() => onChange(p)}
            >
              {p}
            </Button>
          );
        })}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function UsersPage() {
  // ── Données
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Filtres & pagination
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);

  // ── Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [detailsUser, setDetailsUser] = useState<ManagedUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);

  // ── Formulaire de création (3 étapes)
  const [step, setStep] = useState(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('EXECUTANT');
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);

  // ── Formulaire d'édition (simple : juste le rôle + équipe)
  const [editRole, setEditRole] = useState<UserRole>('EXECUTANT');
  const [editTeamName, setEditTeamName] = useState('');
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);
  const [editMemberSearch, setEditMemberSearch] = useState('');

  // ── Mot de passe
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Soumission
  const [submitting, setSubmitting] = useState(false);

  // ── Chargement initial
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [usersData, empData] = await Promise.all([
        fetchJsonOrThrow<UsersResponse>('/api/users'),
        fetchJsonOrThrow<EmployeesResponse>('/api/employees?limit=1000'),
      ]);
      const withAccount = new Set(usersData.users.map((u) => u.employeeId));
      setUsers(usersData.users || []);
      setEmployees(
        (empData.employees || [])
          .filter((e) => e.isActive)
          .filter((e) => withAccount.has(e.id) || !e.userRole),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── IDs d'employés déjà utilisés (pour bloquer la sélection en création)
  const usedEmployeeIds = useMemo(
    () => users.filter((u) => u.hasAccount).map((u) => u.employeeId),
    [users],
  );

  // ── Filtre + pagination
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchQ =
        !q ||
        [
          employeeName(u.employee),
          u.employee.email,
          u.employee.poste,
          u.employee.department,
          ROLE_LABELS[u.role],
          ...u.teams.map((t) => t.name),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);

      const matchRole = filterRole === 'all' || u.role === filterRole;

      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && !u.isBlocked && u.hasAccount) ||
        (filterStatus === 'blocked' && u.isBlocked) ||
        (filterStatus === 'pending' && !u.hasAccount && !u.isBlocked);

      return matchQ && matchRole && matchStatus;
    });
  }, [users, search, filterRole, filterStatus]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const pagedUsers = useMemo(
    () => filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredUsers, page],
  );

  // Remettre à la page 1 quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [search, filterRole, filterStatus]);

  // ── Stats
  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => !u.isBlocked && u.hasAccount).length,
      blocked: users.filter((u) => u.isBlocked).length,
      pending: users.filter((u) => !u.hasAccount && !u.isBlocked).length,
      superviseur: users.filter((u) => u.role === 'SUPERVISEUR').length,
      admin: users.filter((u) => u.role === 'ADMIN').length,
    }),
    [users],
  );

  // ── Création : helpers équipe
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) || null;

  const availableForTeam = useMemo(
    () =>
      employees
        .filter((e) => e.id !== selectedEmployeeId && !memberIds.includes(e.id))
        .filter((e) => matchSearch(e, memberSearch)),
    [employees, selectedEmployeeId, memberIds, memberSearch],
  );

  const teamMembers = useMemo(
    () => employees.filter((e) => memberIds.includes(e.id)),
    [employees, memberIds],
  );

  // ── Édition : helpers équipe
  const editAvailableForTeam = useMemo(
    () =>
      employees
        .filter((e) => e.id !== editUser?.employeeId && !editMemberIds.includes(e.id))
        .filter((e) => matchSearch(e, editMemberSearch)),
    [employees, editUser, editMemberIds, editMemberSearch],
  );

  const editTeamMembers = useMemo(
    () => employees.filter((e) => editMemberIds.includes(e.id)),
    [employees, editMemberIds],
  );

  // ── Ouvrir création
  const openCreate = () => {
    setStep(1);
    setSelectedEmployeeId('');
    setSelectedRole('EXECUTANT');
    setCreateAccount(false);
    setAccountPassword('');
    setTeamName('');
    setMemberIds([]);
    setMemberSearch('');
    setCreateOpen(true);
  };

  // ── Ouvrir édition
  const openEdit = (user: ManagedUser) => {
    const team = user.teams[0];
    setEditUser(user);
    setEditRole(user.role);
    setEditTeamName(team?.name || '');
    setEditMemberIds(team?.members.map((m) => m.id) || []);
    setEditMemberSearch('');
  };

  // ── Soumission création
  const submitCreate = async () => {
    if (!selectedEmployeeId) return toast.error('Veuillez choisir un employé');
    if (!selectedRole) return toast.error('Veuillez choisir un rôle');
    if (selectedRole === 'SUPERVISEUR' && !teamName.trim())
      return toast.error("Veuillez renseigner le nom de l'équipe");
    if (createAccount && accountPassword.length < 6)
      return toast.error('Le mot de passe doit contenir au moins 6 caractères');

    setSubmitting(true);
    try {
      await fetchJsonOrThrow('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          role: selectedRole,
          createAccount,
          password: createAccount ? accountPassword : undefined,
          teamName: selectedRole === 'SUPERVISEUR' ? teamName : '',
          memberIds: selectedRole === 'SUPERVISEUR' ? memberIds : [],
        }),
      });
      toast.success(createAccount ? 'Utilisateur créé avec compte activé' : 'Utilisateur créé');
      setCreateOpen(false);
      await loadData(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Soumission édition
  const submitEdit = async () => {
    if (!editUser) return;
    if (editRole === 'SUPERVISEUR' && !editTeamName.trim())
      return toast.error("Veuillez renseigner le nom de l'équipe");

    setSubmitting(true);
    try {
      await fetchJsonOrThrow(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: editUser.employeeId,
          role: editRole,
          createAccount: editUser.hasAccount,
          teamName: editRole === 'SUPERVISEUR' ? editTeamName : '',
          memberIds: editRole === 'SUPERVISEUR' ? editMemberIds : [],
        }),
      });
      toast.success('Utilisateur modifié avec succès');
      setEditUser(null);
      await loadData(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Changer mot de passe
  const submitPassword = async () => {
    if (!passwordUser) return;
    if (newPassword.length < 6)
      return toast.error('Le mot de passe doit contenir au moins 6 caractères');
    if (newPassword !== confirmPassword) return toast.error('Les mots de passe ne correspondent pas');

    setSubmitting(true);
    try {
      await fetchJsonOrThrow(`/api/users/${passwordUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      toast.success('Mot de passe modifié');
      setPasswordUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Bloquer / débloquer
  const toggleBlocked = async (user: ManagedUser) => {
    try {
      await fetchJsonOrThrow(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !user.isBlocked }),
      });
      toast.success(user.isBlocked ? 'Utilisateur débloqué' : 'Utilisateur bloqué');
      await loadData(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de statut');
    }
  };

  // ── Supprimer
  const deleteUser = async (user: ManagedUser) => {
    if (!confirm(`Supprimer ${employeeName(user.employee)} ?`)) return;
    try {
      await fetchJsonOrThrow(`/api/users/${user.id}`, { method: 'DELETE' });
      toast.success('Utilisateur supprimé');
      await loadData(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  // ─── Rendu ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 p-4 md:p-6 bg-gray-50/50 min-h-screen">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl sm:text-2xl font-bold tracking-tight">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 shadow-lg shadow-emerald-200">
              <UserCog className="h-5 w-5 text-white" />
            </div>
            Gestion des Utilisateurs
          </h1>
          <p className="text-sm text-muted-foreground mt-1 ml-12">
            {loading ? '…' : `${users.length} utilisateur${users.length > 1 ? 's' : ''} configuré${users.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2 ml-12 sm:ml-0">
     
          <Button
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-200 rounded-xl px-5 h-10"
            onClick={openCreate}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvel utilisateur
          </Button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Users} label="Total" value={stats.total} color="border-gray-200" />
          <StatCard icon={UserCheck} label="Actifs" value={stats.active} color="border-emerald-200" />
          <StatCard icon={UserX} label="Bloqués" value={stats.blocked} color="border-red-200" />
          <StatCard icon={Clock} label="En attente" value={stats.pending} color="border-amber-200" />
          <StatCard icon={Shield} label="Superviseurs" value={stats.superviseur} color="border-amber-200" />
          <StatCard icon={ShieldCheck} label="Admins" value={stats.admin} color="border-orange-200" />
        </div>
      )}

      {/* Filtres */}
      <Card className="border shadow-sm rounded-xl">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un utilisateur, équipe, poste…"
                className="pl-9 h-10 rounded-xl border-gray-200"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              >
                <option value="all">Tous les rôles</option>
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="blocked">Bloqués</option>
                <option value="pending">Sans compte</option>
              </select>
            </div>
          </div>
          {(filterRole !== 'all' || filterStatus !== 'all' || search) && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{filteredUsers.length} résultat{filteredUsers.length > 1 ? 's' : ''}</span>
              <button
                onClick={() => { setSearch(''); setFilterRole('all'); setFilterStatus('all'); }}
                className="text-emerald-600 hover:underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card className="border shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/25" />
              <p className="mt-4 font-medium text-muted-foreground">Aucun utilisateur trouvé</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search || filterRole !== 'all' || filterStatus !== 'all'
                  ? 'Essayez de modifier vos filtres.'
                  : 'Créez votre premier utilisateur.'}
              </p>
              {!search && filterRole === 'all' && filterStatus === 'all' && (
                <Button
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  onClick={openCreate}
                >
                  <Plus className="mr-2 h-4 w-4" /> Créer un utilisateur
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                      <TableHead className="font-semibold min-w-[180px]">Utilisateur</TableHead>
                      <TableHead className="font-semibold">Rôle</TableHead>
                      <TableHead className="font-semibold hidden sm:table-cell">Équipe</TableHead>
                      <TableHead className="font-semibold">Statut</TableHead>
                      <TableHead className="font-semibold w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-gray-50/60 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar employee={user.employee} role={user.role} />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {employeeName(user.employee)}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.employee.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {user.role === 'SUPERVISEUR' ? (
                            <div>
                              <p className="text-sm font-medium">
                                {user.teams[0]?.name || '—'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {user.teams[0]?.members.length || 0} membre
                                {user.teams[0]?.members.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge user={user} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-gray-100 rounded-lg"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg">
                              <DropdownMenuItem
                                onClick={() => setDetailsUser(user)}
                                className="cursor-pointer"
                              >
                                <Eye className="mr-2 h-4 w-4" /> Détails
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEdit(user)}
                                className="cursor-pointer"
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Modifier le rôle
                              </DropdownMenuItem>
                              {user.hasAccount && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPasswordUser(user);
                                    setNewPassword('');
                                    setConfirmPassword('');
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Key className="mr-2 h-4 w-4" /> Mot de passe
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => toggleBlocked(user)}
                                className="cursor-pointer"
                              >
                                {user.isBlocked ? (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />{' '}
                                    Débloquer
                                  </>
                                ) : (
                                  <>
                                    <Ban className="mr-2 h-4 w-4 text-amber-600" /> Bloquer
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 cursor-pointer focus:text-red-600"
                                onClick={() => deleteUser(user)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={page}
                total={filteredUsers.length}
                pageSize={PAGE_SIZE}
                onChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG : CRÉER UN UTILISATEUR (3 étapes)
      ════════════════════════════════════════════════════════════════════════ */}

      <Dialog open={createOpen} onOpenChange={(o) => !submitting && setCreateOpen(o)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-2xl p-0 gap-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              Créer un utilisateur
            </DialogTitle>

            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-1 mt-4">
              {[
                { num: 1, label: 'Choisir l\'employé' },
                { num: 2, label: 'Définir le rôle' },
                { num: 3, label: 'Configuration' },
              ].map((s, idx) => (
                <div key={s.num} className="flex items-center gap-1 flex-1">
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={cn(
                        'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all',
                        step === s.num
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                          : step > s.num
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-gray-100 text-gray-400',
                      )}
                    >
                      {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium hidden sm:block',
                        step === s.num ? 'text-emerald-700' : 'text-muted-foreground',
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div
                      className={cn(
                        'h-0.5 flex-1 mx-1',
                        step > s.num ? 'bg-emerald-300' : 'bg-gray-200',
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </DialogHeader>

          <div className="p-6 min-h-[320px]">
            {/* Étape 1 : Choisir l'employé */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  Seuls les employés actifs sans compte existant sont affichés.
                </div>
                <EmployeePicker
                  employees={employees}
                  selectedId={selectedEmployeeId}
                  onSelect={(id) => {
                    setSelectedEmployeeId(id);
                    setCreateAccount(false);
                    setAccountPassword('');
                  }}
                  disabledIds={usedEmployeeIds}
                />
              </div>
            )}

            {/* Étape 2 : Choisir le rôle */}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">Choisissez un rôle</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {USER_ROLES.map((role) => {
                    const isSelected = selectedRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={cn(
                          'rounded-xl border-2 p-3 text-left transition-all',
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/60 shadow-md shadow-emerald-100'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              'rounded-lg p-1.5 mt-0.5',
                              isSelected
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-gray-100 text-gray-500',
                            )}
                          >
                            {ROLE_ICONS[role]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{ROLE_LABELS[role]}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {ROLE_DESCRIPTIONS[role]}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="rounded-full bg-emerald-500 p-0.5 shrink-0">
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

            {/* Étape 3 : Configuration */}
            {step === 3 && (
              <div className="space-y-5">
                {/* Résumé employé */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center gap-4">
                  {selectedEmployee && (
                    <Avatar employee={selectedEmployee} role={selectedRole} size="md" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {selectedEmployee ? employeeName(selectedEmployee) : '—'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {selectedEmployee?.poste} · {selectedEmployee?.department}
                    </p>
                  </div>
                  <RoleBadge role={selectedRole} />
                </div>

                {/* Activation du compte */}
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <Label className="text-sm font-semibold">Activer le compte maintenant</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {createAccount
                          ? "Un mot de passe sera défini pour cet utilisateur."
                          : "L'utilisateur pourra activer son compte plus tard."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={createAccount ? 'default' : 'outline'}
                      className={cn(
                        'rounded-xl shrink-0',
                        createAccount && 'bg-emerald-600 hover:bg-emerald-700',
                      )}
                      onClick={() => {
                        setCreateAccount((v) => !v);
                        setAccountPassword('');
                      }}
                    >
                      {createAccount ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Activé
                        </>
                      ) : (
                        <>
                          <Circle className="h-4 w-4 mr-2" /> Désactivé
                        </>
                      )}
                    </Button>
                  </div>

                  {createAccount && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 pt-4 border-t">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Identifiant (email)
                        </Label>
                        <Input
                          value={selectedEmployee?.email || ''}
                          readOnly
                          className="bg-gray-50 rounded-xl border-gray-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Mot de passe <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="password"
                          value={accountPassword}
                          onChange={(e) => setAccountPassword(e.target.value)}
                          placeholder="Minimum 6 caractères"
                          className="rounded-xl border-gray-200 focus:ring-emerald-500 text-sm"
                        />
                        {accountPassword && accountPassword.length < 6 && (
                          <p className="text-xs text-red-500">Trop court (min 6 caractères)</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Configuration équipe (superviseur) */}
                {selectedRole === 'SUPERVISEUR' && (
                  <div className="rounded-xl border-2 border-amber-200 bg-amber-50/40 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                      <Shield className="h-4 w-4" /> Configuration de l'équipe
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Nom de l'équipe <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Ex : Équipe terrain Nord"
                        className="rounded-xl border-gray-200 bg-white focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Employés disponibles
                        </Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            placeholder="Rechercher…"
                            className="pl-8 rounded-xl border-gray-200 bg-white h-9 text-sm"
                          />
                        </div>
                        <div className="h-48 overflow-auto rounded-xl border border-gray-200 bg-white divide-y text-sm">
                          {availableForTeam.length === 0 ? (
                            <p className="p-4 text-center text-xs text-muted-foreground">
                              Aucun employé disponible
                            </p>
                          ) : (
                            availableForTeam.map((emp) => (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() =>
                                  setMemberIds((cur) => [...new Set([...cur, emp.id])])
                                }
                                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                              >
                                <span className="truncate font-medium">{employeeName(emp)}</span>
                                <ArrowRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Membres de l'équipe ({teamMembers.length})
                        </Label>
                        <div className="h-[calc(48px+12rem)] overflow-auto rounded-xl border border-gray-200 bg-white divide-y text-sm">
                          {teamMembers.length === 0 ? (
                            <div className="p-6 text-center text-xs text-muted-foreground">
                              <Users className="h-6 w-6 mx-auto mb-1 opacity-30" />
                              Ajoutez des membres
                            </div>
                          ) : (
                            teamMembers.map((emp) => (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() =>
                                  setMemberIds((cur) => cur.filter((id) => id !== emp.id))
                                }
                                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-red-50 transition-colors group"
                              >
                                <span className="truncate font-medium">{employeeName(emp)}</span>
                                <X className="h-3.5 w-3.5 text-red-400 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-4 border-t flex flex-col-reverse sm:flex-row gap-2">
            <div className="flex-1 flex justify-start">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="rounded-xl"
              disabled={submitting}
            >
              Annuler
            </Button>
            {step < 3 ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6"
                onClick={() => {
                  if (step === 1 && !selectedEmployeeId) {
                    toast.error('Veuillez choisir un employé');
                    return;
                  }
                  setStep((s) => s + 1);
                }}
              >
                Suivant <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6"
                onClick={submitCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" /> Créer l'utilisateur
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG : MODIFIER LE RÔLE (simple, sans étapes)
      ════════════════════════════════════════════════════════════════════════ */}

      <Dialog open={Boolean(editUser)} onOpenChange={(o) => !submitting && !o && setEditUser(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl gap-0 p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-emerald-600" />
              Modifier l'utilisateur
            </DialogTitle>
            {editUser && (
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                <Avatar employee={editUser.employee} role={editUser.role} size="sm" />
                <div>
                  <p className="font-semibold text-sm">{employeeName(editUser.employee)}</p>
                  <p className="text-xs text-muted-foreground">{editUser.employee.email}</p>
                </div>
                <div className="ml-auto">
                  <StatusBadge user={editUser} />
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="p-6 space-y-5">
            {/* Sélection du rôle */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Rôle</Label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {USER_ROLES.map((role) => {
                  const isSelected = editRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setEditRole(role)}
                      className={cn(
                        'rounded-xl border-2 p-3 text-left transition-all',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60 shadow-md shadow-emerald-100'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            'rounded-lg p-1.5 mt-0.5 shrink-0',
                            isSelected
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-gray-100 text-gray-500',
                          )}
                        >
                          {ROLE_ICONS[role]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{ROLE_LABELS[role]}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {ROLE_DESCRIPTIONS[role]}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="rounded-full bg-emerald-500 p-0.5 shrink-0">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configuration équipe (superviseur) */}
            {editRole === 'SUPERVISEUR' && (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50/40 p-4 space-y-4">
                <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                  <Shield className="h-4 w-4" /> Configuration de l'équipe
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Nom de l'équipe <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    placeholder="Ex : Équipe terrain Nord"
                    className="rounded-xl border-gray-200 bg-white focus:ring-emerald-500"
                  />
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Employés disponibles
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={editMemberSearch}
                        onChange={(e) => setEditMemberSearch(e.target.value)}
                        placeholder="Rechercher…"
                        className="pl-8 rounded-xl border-gray-200 bg-white h-9 text-sm"
                      />
                    </div>
                    <div className="h-48 overflow-auto rounded-xl border border-gray-200 bg-white divide-y text-sm">
                      {editAvailableForTeam.length === 0 ? (
                        <p className="p-4 text-center text-xs text-muted-foreground">
                          Aucun employé disponible
                        </p>
                      ) : (
                        editAvailableForTeam.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() =>
                              setEditMemberIds((cur) => [...new Set([...cur, emp.id])])
                            }
                            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                          >
                            <span className="truncate font-medium">{employeeName(emp)}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Membres de l'équipe ({editTeamMembers.length})
                    </Label>
                    <div className="h-[calc(36px+12rem)] overflow-auto rounded-xl border border-gray-200 bg-white divide-y text-sm">
                      {editTeamMembers.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                          <Users className="h-6 w-6 mx-auto mb-1 opacity-30" />
                          Ajoutez des membres
                        </div>
                      ) : (
                        editTeamMembers.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() =>
                              setEditMemberIds((cur) => cur.filter((id) => id !== emp.id))
                            }
                            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-red-50 transition-colors group"
                          >
                            <span className="truncate font-medium">{employeeName(emp)}</span>
                            <X className="h-3.5 w-3.5 text-red-400 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-4 border-t gap-2">
            <Button
              variant="outline"
              onClick={() => setEditUser(null)}
              className="rounded-xl"
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6"
              onClick={submitEdit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" /> Enregistrer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG : CHANGER LE MOT DE PASSE
      ════════════════════════════════════════════════════════════════════════ */}

      <Dialog
        open={Boolean(passwordUser)}
        onOpenChange={(o) => !submitting && !o && setPasswordUser(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Key className="h-5 w-5 text-emerald-600" />
              Changer le mot de passe
            </DialogTitle>
            {passwordUser && (
              <p className="text-sm text-muted-foreground">
                Pour <span className="font-medium">{employeeName(passwordUser.employee)}</span>
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              Le mot de passe doit contenir au moins 6 caractères.
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Nouveau mot de passe</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  className="rounded-xl border-gray-200 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Confirmer le mot de passe</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmer le mot de passe"
                  className="rounded-xl border-gray-200 focus:ring-emerald-500"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Les mots de passe ne correspondent pas
                </p>
              )}
              {newPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Mots de passe identiques
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPasswordUser(null)}
              disabled={submitting}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              onClick={submitPassword}
              disabled={
                submitting ||
                !newPassword ||
                newPassword.length < 6 ||
                newPassword !== confirmPassword
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Modification…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" /> Modifier
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG : DÉTAILS
      ════════════════════════════════════════════════════════════════════════ */}

      <Dialog
        open={Boolean(detailsUser)}
        onOpenChange={(o) => !o && setDetailsUser(null)}
      >
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-600" />
              Détails de l'utilisateur
            </DialogTitle>
          </DialogHeader>

          {detailsUser && (
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Employé */}
                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Employé
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar employee={detailsUser.employee} role={detailsUser.role} />
                    <div>
                      <p className="font-semibold">{employeeName(detailsUser.employee)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {detailsUser.employee.email}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 shrink-0" />
                      {detailsUser.employee.poste}
                    </p>
                    <p className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      {detailsUser.employee.department}
                    </p>
                  </div>
                </div>

                {/* Accès */}
                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> Accès
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <RoleBadge role={detailsUser.role} />
                    <StatusBadge user={detailsUser} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {detailsUser.role === 'SUPERVISEUR'
                      ? 'Cet utilisateur supervise une équipe.'
                      : ROLE_DESCRIPTIONS[detailsUser.role]}
                  </p>
                  {detailsUser.hasAccount && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs"
                      onClick={() => {
                        const u = detailsUser;
                        setDetailsUser(null);
                        setPasswordUser(u);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      <Key className="h-3 w-3 mr-1" /> Changer le mot de passe
                    </Button>
                  )}
                </div>
              </div>

              {/* Équipe (superviseur) */}
              {detailsUser.role === 'SUPERVISEUR' && detailsUser.teams[0] && (
                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Équipe
                    </p>
                    <Badge variant="secondary">
                      {detailsUser.teams[0].members.length} membre
                      {detailsUser.teams[0].members.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <h3 className="font-semibold">{detailsUser.teams[0].name}</h3>
                  <div className="max-h-52 overflow-auto rounded-xl border border-gray-200 divide-y">
                    {detailsUser.teams[0].members.length === 0 ? (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        Aucun membre dans cette équipe
                      </p>
                    ) : (
                      detailsUser.teams[0].members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm"
                        >
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold shrink-0">
                            {initials(member)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{employeeName(member)}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.poste}</p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {member.department}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDetailsUser(null)}
              className="rounded-xl"
            >
              Fermer
            </Button>
            {detailsUser && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                onClick={() => {
                  const u = detailsUser;
                  setDetailsUser(null);
                  openEdit(u);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" /> Modifier
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}