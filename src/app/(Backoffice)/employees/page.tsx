'use client';

import { useEffect, useState, useRef, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  Users,
  Eye,
  Phone,
  Printer,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { fetchJsonOrThrow } from '@/lib/fetch-json';
import { validateEmployeeInput } from '@/lib/employee-validation';
import { allpostes, departments, postesByDepartment } from '@/components/data/data';
import { buildOfficialHeaderHtml } from '@/components/documents/official-header';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  poste: string;
  department: string;
  hireDate: string | null;
  photoUrl: string | null;
  isActive: boolean;
  isAdmin: boolean;
  userRole: 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISEUR' | 'SECRETAIRE' | 'EXECUTANT' | null;
}

interface EmployeesResponse {
  employees: Employee[];
  pagination?: {
    totalPages?: number;
    total?: number;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TODAY_DATE = new Date().toISOString().split('T')[0];

const DEPT_COLORS: Record<string, string> = {
  Administration: 'bg-blue-50 text-blue-700 border-blue-200',
  Informatique:   'bg-violet-50 text-violet-700 border-violet-200',
  Statistique:    'bg-amber-50 text-amber-700 border-amber-200',
  Logistique:     'bg-orange-50 text-orange-700 border-orange-200',
  Menagere:       'bg-pink-50 text-pink-700 border-pink-200',
};

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
];

const ROLE_BADGE_CONFIG: Record<string, { label: string; classes: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', classes: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50' },
  ADMIN:       { label: 'Admin',       classes: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50' },
  SUPERVISEUR: { label: 'Superviseur', classes: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50' },
  SECRETAIRE:  { label: 'Secrétaire',  classes: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50' },
  EXECUTANT:   { label: 'Exécutant',   classes: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-50' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return 'Non renseignée';
  return new Date(value).toLocaleDateString('fr-FR');
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = value.replace(/^\+509/, '');
  return (
    <div className="flex rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1 transition-shadow">
      <span className="flex items-center gap-1.5 px-3 bg-muted border-r border-input text-sm text-muted-foreground select-none shrink-0">
        <Phone className="w-3.5 h-3.5" />
        +509
      </span>
      <input
        type="tel"
        inputMode="numeric"
        placeholder="XX XX XXXX"
        maxLength={8}
        value={digits}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
          onChange('+509' + raw);
        }}
        className="flex-1 px-3 py-2 text-sm bg-background outline-none placeholder:text-muted-foreground"
      />
      <span className="flex items-center pr-3 text-xs text-muted-foreground select-none">
        {digits.length}/8
      </span>
    </div>
  );
}

/** Stat card shown at the top of the page */
function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${color} bg-opacity-40`}>
      <div className="rounded-lg p-2 bg-white/60">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-xs mt-0.5 opacity-70">{label}</p>
      </div>
    </div>
  );
}

// ─── Print: Employee List ─────────────────────────────────────────────────────

/** Hidden div rendered for list printing — cloned into a popup */
function PrintableEmployeeList({ employees }: { employees: Employee[] }) {
  // Générer le HTML de l'en-tête officiel
  const headerHtml = buildOfficialHeaderHtml({ showRule: true });
  
  return (
    <div id="print-employee-list" style={{ display: 'none' }}>
      <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        {/* En-tête officiel généré en HTML statique */}
        <div dangerouslySetInnerHTML={{ __html: headerHtml }} />

        <h2 style={{ textAlign: 'center', marginTop: 16, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
          Liste du Personnel
        </h2>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#666', marginBottom: 16 }}>
          Imprimé le {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #16a34a' }}>
              {['#', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Poste', 'Département', "Date d'embauche", 'Statut'].map(h => (
                <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', color: '#15803d' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, i) => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                <td style={{ padding: '6px 8px', color: '#9ca3af', fontSize: 10 }}>{i + 1}</td>
                <td style={{ padding: '6px 8px' }}>{emp.firstName}</td>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{emp.lastName}</td>
                <td style={{ padding: '6px 8px', color: '#6b7280' }}>{emp.email}</td>
                <td style={{ padding: '6px 8px', color: '#6b7280' }}>{emp.phone || '—'}</td>
                <td style={{ padding: '6px 8px' }}>{emp.poste}</td>
                <td style={{ padding: '6px 8px' }}>{emp.department}</td>
                <td style={{ padding: '6px 8px', color: '#6b7280' }}>{formatDate(emp.hireDate)}</td>
                <td style={{ padding: '6px 8px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: emp.isActive ? '#dcfce7' : '#fee2e2', color: emp.isActive ? '#15803d' : '#b91c1c' }}>
                    {emp.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={9} style={{ paddingTop: 10, fontSize: 10, color: '#9ca3af', borderTop: '1px solid #e5e7eb' }}>
                Total : {employees.length} employé{employees.length > 1 ? 's' : ''}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/** Hidden div rendered for single employee dossier printing */
function PrintableEmployeeDossier({ employee }: { employee: Employee }) {
  // Générer le HTML de l'en-tête officiel
  const headerHtml = buildOfficialHeaderHtml({ showRule: false });
  
  return (
    <div id="print-employee-dossier" style={{ display: 'none' }}>
      <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: 700, margin: '0 auto' }}>
        {/* En-tête officiel généré en HTML statique */}
        <div dangerouslySetInnerHTML={{ __html: headerHtml }} />

        <h2 style={{ textAlign: 'center', marginTop: 20, fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '2px solid #16a34a', paddingBottom: 8 }}>
          Dossier de l'Employé
        </h2>

        <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
          {/* Avatar / photo */}
          <div style={{ textAlign: 'center' }}>
            {employee.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={employee.photoUrl} alt="" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid #16a34a' }} />
            ) : (
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#15803d', border: '3px solid #16a34a' }}>
                {getInitials(employee.firstName, employee.lastName)}
              </div>
            )}
          </div>

          {/* Info grid */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{employee.firstName} {employee.lastName}</p>
            <p style={{ fontSize: 12, color: '#15803d', marginBottom: 12 }}>{employee.poste} — {employee.department}</p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              {[
                ['Email', employee.email],
                ['Téléphone', employee.phone || '—'],
                ["Date d'embauche", formatDate(employee.hireDate)],
                ['Statut', employee.isActive ? 'Actif' : 'Inactif'],
                ['Rôle système', employee.userRole ? (ROLE_BADGE_CONFIG[employee.userRole]?.label ?? employee.userRole) : '—'],
                ['Administrateur', employee.isAdmin ? 'Oui' : 'Non'],
              ].map(([key, val]) => (
                <tr key={key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '5px 0', fontWeight: 600, color: '#6b7280', width: 160 }}>{key}</td>
                  <td style={{ padding: '5px 0' }}>{val}</td>
                </tr>
              ))}
            </table>
          </div>
        </div>

        <p style={{ marginTop: 40, fontSize: 10, color: '#9ca3af', textAlign: 'right' }}>
          Document généré le {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

// ─── Print helpers ────────────────────────────────────────────────────────────

function printElement(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { toast.error('Autorisez les popups pour imprimer'); return; }
  w.document.write(`
    <html><head><title>Impression</title>
    <style>
      @page { margin: 15mm 12mm; }
      body { margin: 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
    </head><body>${el.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 400);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmployeesPage() {
  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '+509',
    poste: '', department: '', hireDate: '', isAdmin: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // For optimistic status toggle
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // For print dossier
  const [printEmployee, setPrintEmployee] = useState<Employee | null>(null);
  const printDossierRef = useRef(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  // Fonction fetch simple (pas useCallback) appelée dans handleSubmit
  async function fetchEmployees(silent = false) {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(), limit: '10',
        search, department: departmentFilter, status: statusFilter,
      });
      const data = await fetchJsonOrThrow<EmployeesResponse>(`/api/employees?${params}`);
      setEmployees(data.employees || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  // Un seul useEffect pour le fetch avec cancelled flag
  useEffect(() => {
    let cancelled = false;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(), limit: '10',
          search, department: departmentFilter, status: statusFilter,
        });
        const data = await fetchJsonOrThrow<EmployeesResponse>(`/api/employees?${params}`);
        if (!cancelled) {
          setEmployees(data.employees || []);
          setTotalPages(data.pagination?.totalPages || 1);
          setTotal(data.pagination?.total || 0);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Erreur de chargement des employés');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [page, search, departmentFilter, statusFilter]);

  // Debounce: searchInput → search avec 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Print dossier — trigger after state update
  useEffect(() => {
    if (printEmployee && printDossierRef.current) {
      setTimeout(() => {
        printElement('print-employee-dossier');
        printDossierRef.current = false;
      }, 100);
    }
  }, [printEmployee]);

  // ── Dialog helpers ─────────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditEmployee(null);
    setFormData({ firstName: '', lastName: '', email: '', phone: '+509', poste: '', department: '', hireDate: '', isAdmin: false });
    setDialogOpen(true);
  };

  const openEditDialog = (emp: Employee) => {
    setEditEmployee(emp);
    setFormData({
      firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email, phone: emp.phone || '+509',
      poste: emp.poste, department: emp.department,
      hireDate: toDateInput(emp.hireDate), isAdmin: Boolean(emp.isAdmin),
    });
    setDialogOpen(true);
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const validation = validateEmployeeInput(formData);
    if (!validation.ok) { toast.error(validation.error); return; }

    // Optimistic: add a placeholder immediately for creates
    const isCreate = !editEmployee;
    const tempId = `temp-${Date.now()}`;
    if (isCreate) {
      const optimistic: Employee = {
        id: tempId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        poste: formData.poste,
        department: formData.department,
        hireDate: formData.hireDate || null,
        photoUrl: null,
        isActive: true,
        isAdmin: formData.isAdmin,
        userRole: null,
      };
      setEmployees(prev => [optimistic, ...prev]);
      setTotal(t => t + 1);
      setDialogOpen(false);
    }

    setSubmitting(true);
    try {
      if (editEmployee) {
        await fetchJsonOrThrow(`/api/employees/${editEmployee.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, ...validation.data }),
        });
        toast.success('Employé modifié avec succès');
        setDialogOpen(false);
      } else {
        await fetchJsonOrThrow('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, ...validation.data }),
        });
        toast.success('Employé créé avec succès');
      }
      // Refresh silently to get real ID and server data
      fetchEmployees(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
      // Rollback optimistic add
      if (isCreate) {
        setEmployees(prev => prev.filter(e => e.id !== tempId));
        setTotal(t => t - 1);
        setDialogOpen(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) return;
    // Optimistic remove
    const removed = employees.find(e => e.id === id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    setTotal(t => t - 1);
    try {
      await fetchJsonOrThrow(`/api/employees/${id}`, { method: 'DELETE' });
      toast.success('Employé supprimé');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
      // Rollback
      if (removed) setEmployees(prev => [...prev, removed]);
      setTotal(t => t + 1);
    }
  };

  const toggleEmployeeStatus = async (employee: Employee, isActive: boolean) => {
    // Optimistic update immediately
    setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, isActive } : e));
    setStatusUpdatingId(employee.id);
    try {
      await fetchJsonOrThrow(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: employee.firstName, lastName: employee.lastName,
          email: employee.email, phone: employee.phone,
          poste: employee.poste, department: employee.department,
          hireDate: toDateInput(employee.hireDate),
          isAdmin: employee.isAdmin, isActive,
        }),
      });
      toast.success(`Employé ${isActive ? 'activé' : 'désactivé'}`);
    } catch (error) {
      // Rollback
      setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, isActive: !isActive } : e));
      toast.error(error instanceof Error ? error.message : 'Erreur lors du changement de statut');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = 'Prénom,Nom,Email,Poste,Département,Statut,Date embauche\n';
    const rows = employees.map(e =>
      `${e.firstName},${e.lastName},${e.email},${e.poste},${e.department},${e.isActive ? 'Actif' : 'Inactif'},${formatDate(e.hireDate)}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'employes.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeCount = employees.filter(e => e.isActive).length;
  const inactiveCount = employees.filter(e => !e.isActive).length;
  const availablepostes = formData.department
    ? (postesByDepartment[formData.department] ?? allpostes)
    : allpostes;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Print-only hidden elements ── */}
      <PrintableEmployeeList employees={employees} />
      {printEmployee && <PrintableEmployeeDossier employee={printEmployee} />}

      {/* ── Page styles ── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.3s ease both; }
        .row-in  { animation: fadeUp 0.25s ease both; }
        .row-in:nth-child(1)  { animation-delay: 0.03s; }
        .row-in:nth-child(2)  { animation-delay: 0.06s; }
        .row-in:nth-child(3)  { animation-delay: 0.09s; }
        .row-in:nth-child(4)  { animation-delay: 0.12s; }
        .row-in:nth-child(5)  { animation-delay: 0.15s; }
        .row-in:nth-child(6)  { animation-delay: 0.18s; }
        .row-in:nth-child(7)  { animation-delay: 0.21s; }
        .row-in:nth-child(8)  { animation-delay: 0.24s; }
        .row-in:nth-child(9)  { animation-delay: 0.27s; }
        .row-in:nth-child(10) { animation-delay: 0.30s; }
        .tr-hover { transition: background 0.12s; }
        .tr-hover:hover { background: rgb(240 253 244 / 0.7); }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div className="p-4 md:p-6 space-y-5 fade-up">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 text-white shadow-sm">
                <Users className="w-5 h-5" />
              </span>
              Employés
            </h1>
            <p className="text-sm text-muted-foreground pl-11 mt-0.5">
              Gestion du personnel — {total} enregistré{total > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 hover:border-emerald-400 hover:text-emerald-700 transition-colors">
              <Download className="w-4 h-4" /> CSV
            </Button>
            <Button
              variant="outline" size="sm"
              className="gap-1.5 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
              onClick={() => printElement('print-employee-list')}
            >
              <Printer className="w-4 h-4" /> Imprimer la liste
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all hover:shadow-md active:scale-95"
              onClick={openCreateDialog}
            >
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 fade-up" style={{ animationDelay: '0.05s' }}>
            <StatCard label="Total employés" value={total} icon={Users} color="border-emerald-200 text-emerald-800" />
            <StatCard label="Actifs" value={activeCount} icon={UserCheck} color="border-green-200 text-green-800" />
            <StatCard label="Inactifs" value={inactiveCount} icon={UserX} color="border-rose-200 text-rose-800" />
          </div>
        )}

        {/* ── Filters ── */}
        <Card className="border shadow-sm fade-up" style={{ animationDelay: '0.07s' }}>
          <CardContent className="p-3.5">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Rechercher par nom, poste…"
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); }}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={departmentFilter || 'all'} onValueChange={(v) => { setDepartmentFilter(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-9 w-full sm:w-48 text-sm">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les départements</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-9 w-full sm:w-36 text-sm">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Table ── */}
        <Card className="border shadow-sm overflow-hidden fade-up" style={{ animationDelay: '0.10s' }}>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
                    <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                  </div>
                ))}
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-16 fade-up">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-3">
                  <Users className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="font-medium text-muted-foreground mb-1">Aucun employé trouvé</p>
                <p className="text-sm text-muted-foreground/60 mb-5">
                  {search || departmentFilter || statusFilter
                    ? 'Modifiez vos filtres pour affiner la recherche.'
                    : 'Commencez par ajouter votre premier employé.'}
                </p>
                <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all" onClick={openCreateDialog}>
                  <Plus className="w-4 h-4" /> Ajouter un employé
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employé</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Email</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Poste</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Département</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statut</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Rôle</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow
                        key={emp.id}
                        className="row-in tr-hover border-b border-border/40 last:border-0"
                        style={emp.id.startsWith('temp-') ? { opacity: 0.6 } : {}}
                      >
                        {/* Employé */}
                        <TableCell className="pl-4 py-3">
                          <Link href={`/employees/${emp.id}`} className="flex items-center gap-3 group">
                            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white shadow-sm transition-transform group-hover:scale-105">
                              <AvatarImage src={emp.photoUrl || undefined} alt={`${emp.firstName} ${emp.lastName}`} />
                              <AvatarFallback className={`text-xs font-semibold ${getAvatarColor(emp.firstName)}`}>
                                {getInitials(emp.firstName, emp.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm leading-tight group-hover:text-emerald-700 transition-colors">
                                {emp.firstName} {emp.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 md:hidden">{emp.poste}</p>
                            </div>
                          </Link>
                        </TableCell>

                        {/* Email */}
                        <TableCell className="text-sm text-muted-foreground py-3 hidden lg:table-cell">{emp.email}</TableCell>

                        {/* Poste */}
                        <TableCell className="hidden md:table-cell text-sm py-3">{emp.poste}</TableCell>

                        {/* Département */}
                        <TableCell className="hidden sm:table-cell py-3">
                          <Badge variant="outline" className={`text-xs font-medium border ${DEPT_COLORS[emp.department] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {emp.department}
                          </Badge>
                        </TableCell>

                        {/* Statut */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={emp.isActive}
                              disabled={statusUpdatingId === emp.id || emp.id.startsWith('temp-')}
                              onClick={(e) => e.stopPropagation()}
                              onCheckedChange={(checked) => toggleEmployeeStatus(emp, checked)}
                              className="data-[state=checked]:bg-emerald-600"
                            />
                            <span className={`text-xs font-medium hidden sm:inline ${emp.isActive ? 'text-emerald-700' : 'text-gray-400'}`}>
                              {emp.isActive ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Rôle */}
                        <TableCell className="hidden md:table-cell py-3">
                          {emp.userRole && ROLE_BADGE_CONFIG[emp.userRole] ? (
                            <Badge className={`border ${ROLE_BADGE_CONFIG[emp.userRole].classes}`}>
                              {ROLE_BADGE_CONFIG[emp.userRole].label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3 pr-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link href={`/employees/${emp.id}`} className="gap-2">
                                  <Eye className="w-4 h-4" /> Voir le profil
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(emp)}>
                                <Pencil className="w-4 h-4" /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => {
                                  setPrintEmployee(emp);
                                  printDossierRef.current = true;
                                  // Force re-render if same employee
                                  setTimeout(() => printElement('print-employee-dossier'), 150);
                                }}
                              >
                                <Printer className="w-4 h-4" /> Imprimer le dossier
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" onClick={() => toggleEmployeeStatus(emp, !emp.isActive)}>
                                <Users className="w-4 h-4" /> {emp.isActive ? 'Désactiver' : 'Activer'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-destructive focus:text-destructive"
                                onClick={() => handleDelete(emp.id)}
                              >
                                <Trash2 className="w-4 h-4" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between fade-up">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> / <span className="font-semibold text-foreground">{totalPages}</span>
              {' '}· {total} résultat{total > 1 ? 's' : ''}
            </p>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="gap-1 hover:border-emerald-400 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" /> Précédent
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="gap-1 hover:border-emerald-400 disabled:opacity-40">
                Suivant <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-lg font-semibold">
              {editEmployee ? 'Modifier l\'employé' : 'Nouvel employé'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Prénom <span className="text-destructive">*</span></Label>
                <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="ex : Jean" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nom <span className="text-destructive">*</span></Label>
                <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="ex : Pierre" className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="nom@exemple.com" className="h-9" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Téléphone</Label>
              <PhoneInput value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} />
              <p className="text-xs text-muted-foreground">Numéro haïtien — 8 chiffres après +509</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Département <span className="text-destructive">*</span></Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v, poste: '' })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Poste <span className="text-destructive">*</span></Label>
                <Select value={formData.poste} onValueChange={(v) => setFormData({ ...formData, poste: v })} disabled={!formData.department}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={formData.department ? 'Choisir…' : 'Dept. d\'abord'} /></SelectTrigger>
                  <SelectContent>
                    {availablepostes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date d&apos;embauche</Label>
              <Input type="date" max={TODAY_DATE} value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} className="h-9" />
              <p className="text-xs text-muted-foreground">Optionnel — les dates futures ne sont pas autorisées.</p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all min-w-24"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement…
                </span>
              ) : editEmployee ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}