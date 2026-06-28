'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Save, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { normalizeHaitiPhone, validateEmployeeInput } from '@/lib/employee-validation';
import { buildOfficialHeaderHtml } from '@/components/documents/official-header';

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
  isAdmin?: boolean;
  attendances: Array<{ id: string; scannedAt: string; isValid: boolean; refusalReason: string | null }>;
  eventAttendances: Array<{
    id: string;
    meeting: {
      id: string;
      title: string;
      category: string;
      startAt: string;
      status: string;
      attendanceMode: 'PRESENTIEL' | 'EN_LIGNE' | null;
    };
  }>;
  reportStats: {
    objectiveReportsCount: number;
    assignedReportsCount: number;
    writtenReportsCount: number;
  };
  reportAssignments: Array<{
    id: string;
    title: string;
    category: string;
    startAt: string;
    status: string;
    hasWrittenReport: boolean;
    writtenAt: string | null;
  }>;
}

const departments = ['Administration', 'Informatique', 'RH', 'Finance', 'Commercial', 'Marketing'];
const TODAY_DATE = new Date().toISOString().split('T')[0];

function formatMeetingCategory(value: string) {
  return value === 'FORMATION' ? 'Formation' : 'Réunion';
}

function formatAttendanceMode(value: 'PRESENTIEL' | 'EN_LIGNE' | null) {
  if (value === 'EN_LIGNE') return 'En ligne';
  if (value === 'PRESENTIEL') return 'Présentiel';
  return 'Présent';
}

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

function formatDate(value?: string | null) {
  if (!value) return 'Non renseignée';
  return new Date(value).toLocaleDateString('fr-FR');
}

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ─── Composant d'impression caché ────────────────────────────────────────────

function PrintableEmployeeDossier({ 
  employee, 
  includeFullDossier 
}: { 
  employee: Employee; 
  includeFullDossier: boolean;
}) {
  const headerHtml = buildOfficialHeaderHtml({ showRule: true });
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeStr = now.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div id="print-employee-dossier" style={{ display: 'none' }}>
      <div style={{ 
        fontFamily: 'Arial, sans-serif', 
        padding: '20px', 
        maxWidth: '1000px', 
        margin: '0 auto',
        color: '#1a1a1a'
      }}>
        {/* En-tête officiel */}
        <div dangerouslySetInnerHTML={{ __html: headerHtml }} />

        {/* Titre principal */}
        <h2 style={{ 
          textAlign: 'center', 
          marginTop: 24, 
          fontSize: 18, 
          fontWeight: 700, 
          textTransform: 'uppercase',
          letterSpacing: 1,
          borderBottom: '2px solid #16a34a',
          paddingBottom: 12,
          marginBottom: 24
        }}>
          Dossier de l'Employé
        </h2>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#666', marginBottom: 24 }}>
          Imprimé le {dateStr} à {timeStr}
        </p>

        {/* Section: Informations personnelles */}
        <div style={{ 
          display: 'flex', 
          gap: 24, 
          marginBottom: 32,
          padding: 16,
          background: '#f9fafb',
          borderRadius: 8,
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ textAlign: 'center' }}>
            {employee.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={employee.photoUrl} 
                alt="" 
                style={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  border: '3px solid #16a34a' 
                }} 
              />
            ) : (
              <div style={{ 
                width: 100, 
                height: 100, 
                borderRadius: '50%', 
                background: '#dcfce7',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 700,
                color: '#15803d',
                border: '3px solid #16a34a'
              }}>
                {getInitials(employee.firstName, employee.lastName)}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {employee.firstName} {employee.lastName}
            </p>
            <p style={{ fontSize: 13, color: '#15803d', marginBottom: 12 }}>
              {employee.poste} — {employee.department}
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {[
                  ['Email', employee.email],
                  ['Téléphone', employee.phone || '—'],
                  ["Date d'embauche", formatDate(employee.hireDate)],
                  ['Statut', employee.isActive ? 'Actif' : 'Inactif'],
                  ['Accès', employee.isAdmin ? 'Administrateur' : 'Employé'],
                ].map(([key, val]) => (
                  <tr key={key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '4px 0', fontWeight: 600, color: '#6b7280', width: 140 }}>
                      {key}
                    </td>
                    <td style={{ padding: '4px 0' }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {includeFullDossier && (
          <>
            {/* Section: Présences */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ 
                fontSize: 14, 
                fontWeight: 700,
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: 8,
                marginBottom: 12
              }}>
                Présences aux événements
              </h3>
              {employee.eventAttendances?.length === 0 ? (
                <p style={{ fontSize: 12, color: '#6b7280' }}>Aucune présence confirmée</p>
              ) : (
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  fontSize: 11,
                  border: '1px solid #e5e7eb'
                }}>
                  <thead>
                    <tr style={{ background: '#f0fdf4', borderBottom: '1px solid #d1d5db' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Événement</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Catégorie</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.eventAttendances.map((attendance) => (
                      <tr key={attendance.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '6px 8px' }}>{attendance.meeting.title}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: 12, 
                            fontSize: 10, 
                            fontWeight: 600,
                            background: attendance.meeting.category === 'FORMATION' ? '#dbeafe' : '#fef3c7',
                            color: attendance.meeting.category === 'FORMATION' ? '#1e40af' : '#92400e'
                          }}>
                            {formatMeetingCategory(attendance.meeting.category)}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {new Date(attendance.meeting.startAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {formatAttendanceMode(attendance.meeting.attendanceMode)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Section: Rapports */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ 
                fontSize: 14, 
                fontWeight: 700,
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: 8,
                marginBottom: 12
              }}>
                Statistiques des rapports
              </h3>
              <div style={{ 
                display: 'flex', 
                gap: 16, 
                flexWrap: 'wrap',
                marginBottom: 16
              }}>
                <div style={{ 
                  padding: '8px 16px', 
                  background: '#f0fdf4', 
                  borderRadius: 8,
                  border: '1px solid #dcfce7'
                }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>
                    {employee.reportStats?.assignedReportsCount || 0}
                  </span>
                  <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>
                    Rapports confiés
                  </span>
                </div>
                <div style={{ 
                  padding: '8px 16px', 
                  background: '#eff6ff', 
                  borderRadius: 8,
                  border: '1px solid #dbeafe'
                }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#2563eb' }}>
                    {employee.reportStats?.writtenReportsCount || 0}
                  </span>
                  <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>
                    Rapports rédigés
                  </span>
                </div>
                <div style={{ 
                  padding: '8px 16px', 
                  background: '#fef3c7', 
                  borderRadius: 8,
                  border: '1px solid #fde68a'
                }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#92400e' }}>
                    {employee.reportStats?.objectiveReportsCount || 0}
                  </span>
                  <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>
                    Objectifs attribués
                  </span>
                </div>
              </div>

              <h4 style={{ 
                fontSize: 12, 
                fontWeight: 600,
                marginBottom: 8,
                color: '#6b7280'
              }}>
                Liste des rapports confiés
              </h4>
              {employee.reportAssignments?.length === 0 ? (
                <p style={{ fontSize: 12, color: '#6b7280' }}>Aucun rapport confié</p>
              ) : (
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  fontSize: 11,
                  border: '1px solid #e5e7eb'
                }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #d1d5db' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Rapport</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Catégorie</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.reportAssignments.map((report) => (
                      <tr key={report.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 500 }}>{report.title}</td>
                        <td style={{ padding: '6px 8px' }}>
                          {formatMeetingCategory(report.category)}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {new Date(report.startAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: 12, 
                            fontSize: 10, 
                            fontWeight: 600,
                            background: report.hasWrittenReport ? '#dcfce7' : '#fef3c7',
                            color: report.hasWrittenReport ? '#15803d' : '#92400e'
                          }}>
                            {report.hasWrittenReport ? 'Rédigé' : 'À rédiger'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        <p style={{ 
          marginTop: 40, 
          fontSize: 10, 
          color: '#9ca3af', 
          textAlign: 'right',
          borderTop: '1px solid #e5e7eb',
          paddingTop: 16
        }}>
          Document généré le {dateStr} à {timeStr} · Page 1/1
        </p>
      </div>
    </div>
  );
}

// ─── Fonction d'impression ────────────────────────────────────────────────────

function printEmployeeDossier(employee: Employee, includeFullDossier: boolean) {
  // Créer un élément temporaire pour le rendu
  const container = document.createElement('div');
  container.innerHTML = `
    <div id="print-temp-container" style="display:none;">
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto;">
        ${buildOfficialHeaderHtml({ showRule: true })}
        <h2 style="text-align:center;margin-top:24px;font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:1;border-bottom:2px solid #16a34a;padding-bottom:12px;margin-bottom:24px;">
          Dossier de l'Employé
        </h2>
        <p style="text-align:center;font-size:12px;color:#666;margin-bottom:24px;">
          Imprimé le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <div style="display:flex;gap:24px;margin-bottom:32px;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
          <div style="text-align:center;">
            ${employee.photoUrl 
              ? `<img src="${employee.photoUrl}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #16a34a;" />`
              : `<div style="width:100px;height:100px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:#15803d;border:3px solid #16a34a;">${getInitials(employee.firstName, employee.lastName)}</div>`
            }
          </div>
          <div style="flex:1;">
            <p style="font-size:20px;font-weight:700;margin-bottom:4px;">${employee.firstName} ${employee.lastName}</p>
            <p style="font-size:13px;color:#15803d;margin-bottom:12px;">${employee.poste} — ${employee.department}</p>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <tbody>
                ${[
                  ['Email', employee.email],
                  ['Téléphone', employee.phone || '—'],
                  ["Date d'embauche", formatDate(employee.hireDate)],
                  ['Statut', employee.isActive ? 'Actif' : 'Inactif'],
                  ['Accès', employee.isAdmin ? 'Administrateur' : 'Employé'],
                ].map(([key, val]) => `
                  <tr style="border-bottom:1px solid #f3f4f6;">
                    <td style="padding:4px 0;font-weight:600;color:#6b7280;width:140px;">${key}</td>
                    <td style="padding:4px 0;">${val}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ${includeFullDossier ? `
          <div style="margin-bottom:32px;">
            <h3 style="font-size:14px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:12px;">Présences aux événements</h3>
            ${employee.eventAttendances?.length === 0 
              ? '<p style="font-size:12px;color:#6b7280;">Aucune présence confirmée</p>'
              : `
                <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #e5e7eb;">
                  <thead>
                    <tr style="background:#f0fdf4;border-bottom:1px solid #d1d5db;">
                      <th style="padding:6px 8px;text-align:left;font-weight:600;">Événement</th>
                      <th style="padding:6px 8px;text-align:left;font-weight:600;">Catégorie</th>
                      <th style="padding:6px 8px;text-align:left;font-weight:600;">Date</th>
                      <th style="padding:6px 8px;text-align:left;font-weight:600;">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${employee.eventAttendances.map((attendance) => `
                      <tr style="border-bottom:1px solid #f3f4f6;">
                        <td style="padding:6px 8px;">${attendance.meeting.title}</td>
                        <td style="padding:6px 8px;">
                          <span style="padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;background:${attendance.meeting.category === 'FORMATION' ? '#dbeafe' : '#fef3c7'};color:${attendance.meeting.category === 'FORMATION' ? '#1e40af' : '#92400e'};">${formatMeetingCategory(attendance.meeting.category)}</span>
                        </td>
                        <td style="padding:6px 8px;">${new Date(attendance.meeting.startAt).toLocaleDateString('fr-FR')}</td>
                        <td style="padding:6px 8px;">${formatAttendanceMode(attendance.meeting.attendanceMode)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `
            }
          </div>
          <div style="margin-bottom:32px;">
            <h3 style="font-size:14px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:12px;">Statistiques des rapports</h3>
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
              <div style="padding:8px 16px;background:#f0fdf4;border-radius:8px;border:1px solid #dcfce7;">
                <span style="font-size:20px;font-weight:700;color:#15803d;">${employee.reportStats?.assignedReportsCount || 0}</span>
                <span style="font-size:11px;color:#6b7280;margin-left:6px;">Rapports confiés</span>
              </div>
              <div style="padding:8px 16px;background:#eff6ff;border-radius:8px;border:1px solid #dbeafe;">
                <span style="font-size:20px;font-weight:700;color:#2563eb;">${employee.reportStats?.writtenReportsCount || 0}</span>
                <span style="font-size:11px;color:#6b7280;margin-left:6px;">Rapports rédigés</span>
              </div>
              <div style="padding:8px 16px;background:#fef3c7;border-radius:8px;border:1px solid #fde68a;">
                <span style="font-size:20px;font-weight:700;color:#92400e;">${employee.reportStats?.objectiveReportsCount || 0}</span>
                <span style="font-size:11px;color:#6b7280;margin-left:6px;">Objectifs attribués</span>
              </div>
            </div>
            <h4 style="font-size:12px;font-weight:600;margin-bottom:8px;color:#6b7280;">Liste des rapports confiés</h4>
            ${employee.reportAssignments?.length === 0 
              ? '<p style="font-size:12px;color:#6b7280;">Aucun rapport confié</p>'
              : `
                <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #e5e7eb;">
                  <thead>
                    <tr style="background:#f9fafb;border-bottom:1px solid #d1d5db;">
                      <th style="padding:6px 8px;text-align:left;font-weight:600;">Rapport</th>
                      <th style="padding:6px 8px;text-align:left;font-weight:600;">Catégorie</th>
                      <th style="padding:6px 8px;text-align:left;font-weight:600;">Date</th>
                      <th style="padding:6px 8px;text-align:left;font-weight:600;">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${employee.reportAssignments.map((report) => `
                      <tr style="border-bottom:1px solid #f3f4f6;">
                        <td style="padding:6px 8px;font-weight:500;">${report.title}</td>
                        <td style="padding:6px 8px;">${formatMeetingCategory(report.category)}</td>
                        <td style="padding:6px 8px;">${new Date(report.startAt).toLocaleDateString('fr-FR')}</td>
                        <td style="padding:6px 8px;">
                          <span style="padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;background:${report.hasWrittenReport ? '#dcfce7' : '#fef3c7'};color:${report.hasWrittenReport ? '#15803d' : '#92400e'};">${report.hasWrittenReport ? 'Rédigé' : 'À rédiger'}</span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `
            }
          </div>
        ` : ''}
        <p style="margin-top:40px;font-size:10px;color:#9ca3af;text-align:right;border-top:1px solid #e5e7eb;padding-top:16px;">
          Document généré le ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · Page 1/1
        </p>
      </div>
    </div>
  `;

  // Ajouter au DOM
  document.body.appendChild(container);
  const element = document.getElementById('print-temp-container');
  
  if (element) {
    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) {
      toast.error('Autorisez les popups pour imprimer');
      document.body.removeChild(container);
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dossier de l'Employé - ${employee.firstName} ${employee.lastName}</title>
          <style>
            @page { 
              margin: 15mm 12mm; 
              size: A4;
            }
            body { 
              margin: 0; 
              font-family: Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          <\/script>
        </body>
      </html>
    `);
    win.document.close();

    // Nettoyer
    setTimeout(() => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }, 1000);
  } else {
    document.body.removeChild(container);
  }
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);
  const [includeFullDossier, setIncludeFullDossier] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+509',
    poste: '',
    department: '',
    hireDate: '',
    isActive: true,
  });
  const router = useRouter();
  const [empId, setEmpId] = useState('');

  useEffect(() => {
    params.then(p => setEmpId(p.id));
  }, [params]);

  useEffect(() => {
    if (!empId) return;
    async function fetchEmployee() {
      try {
        const res = await fetch(`/api/employees/${empId}`);
        if (!res.ok) throw new Error('Employé non trouvé');
        const data = await res.json();
        setEmployee(data.employee);
        setFormData({
          firstName: data.employee.firstName,
          lastName: data.employee.lastName,
          email: data.employee.email,
          phone: data.employee.phone || '+509',
          poste: data.employee.poste,
          department: data.employee.department,
          hireDate: toDateInputValue(data.employee.hireDate),
          isActive: data.employee.isActive,
        });
      } catch {
        toast.error('Employé non trouvé');
        router.push('/employees');
      } finally {
        setLoading(false);
      }
    }
    fetchEmployee();
  }, [empId, router]);

  const handleSave = async () => {
    const validation = validateEmployeeInput(formData);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${empId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, ...validation.data }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }
      const data = await res.json();
      setEmployee((current) => (current ? {
        ...current,
        ...data.employee,
        attendances: current.attendances,
        eventAttendances: current.eventAttendances,
        reportStats: current.reportStats,
        reportAssignments: current.reportAssignments,
      } : data.employee));
      toast.success('Employé modifié avec succès');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) return;

    try {
      const res = await fetch(`/api/employees/${empId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erreur lors de la suppression');
      }
      toast.success('Employé supprimé');
      router.push('/employees');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const handlePrint = () => {
    if (!employee) return;
    setPrintingPdf(true);
    try {
      printEmployeeDossier(employee, includeFullDossier);
    } catch (error) {
      toast.error('Erreur lors de l\'impression');
    } finally {
      setTimeout(() => setPrintingPdf(false), 500);
    }
  };

  const handleExportPdf = () => {
    if (!employee) return;
    setExportingPdf(true);
    try {
      // Utiliser la même fonction d'impression mais avec un timeout pour le download
      printEmployeeDossier(employee, includeFullDossier);
      toast.success('PDF généré avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export PDF');
    } finally {
      setTimeout(() => setExportingPdf(false), 500);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!employee) return null;

  const updatePhone = (value: string) => {
    const normalized = normalizeHaitiPhone(value);
    setFormData((current) => ({
      ...current,
      phone: normalized.formatted || '+509',
    }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/employees">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{employee.firstName} {employee.lastName}</h1>
            <p className="text-sm text-muted-foreground">{employee.poste} · {employee.department}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={handleDelete}>
            Supprimer
          </Button>
          <Button 
            variant="outline" 
            onClick={handlePrint} 
            disabled={printingPdf}
          >
            <Printer className="w-4 h-4 mr-2" /> {printingPdf ? 'Impression...' : 'Imprimer'}
          </Button>
         
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium">Contenu du document à imprimer / télécharger</p>
            <p className="text-sm text-muted-foreground">
              Cochez pour imprimer le dossier complet avec présences bureau, réunions, formations et compteur de rapports.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <Checkbox
              id="include-full-dossier"
              checked={includeFullDossier}
              onCheckedChange={(checked) => setIncludeFullDossier(checked === true)}
            />
            <Label htmlFor="include-full-dossier" className="cursor-pointer">
              Dossier complet
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-1">
        {/* Edit Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Informations de l&apos;employé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarImage src={employee.photoUrl || undefined} alt={`${employee.firstName} ${employee.lastName}`} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl">
                  {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{employee.firstName} {employee.lastName}</h3>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge className={employee.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                    {employee.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                  <Badge variant="outline">
                    {employee.isAdmin ? 'Accès administrateur' : 'Accès employé'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Ex: Fritzly" />
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Ex: Brenord" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="nom@exemple.com" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={formData.phone} onChange={(e) => updatePhone(e.target.value)} inputMode="numeric" placeholder="+509XXXXXXXX" />
                <p className="text-xs text-muted-foreground">Ajoutez un numero de telephone valable pour Haiti: +509 suivi de 8 chiffres.</p>
              </div>
              <div className="space-y-2">
                <Label>Poste *</Label>
                <Input value={formData.poste} onChange={(e) => setFormData({ ...formData, poste: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Département *</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date d&apos;embauche</Label>
                <Input type="date" max={TODAY_DATE} value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} />
                <p className="text-xs text-muted-foreground">Optionnel. Une date future n&apos;est pas autorisée.</p>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={formData.isActive ? 'active' : 'inactive'} onValueChange={(v) => setFormData({ ...formData, isActive: v === 'active' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar - Recent Activity
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Réunions, formations et rapports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 space-y-1 text-sm text-muted-foreground">
                <p>
                  Présences confirmées: <span className="font-semibold text-foreground">{employee.eventAttendances?.length || 0}</span>
                </p>
                <p>
                  Rapports confiés: <span className="font-semibold text-foreground">{employee.reportStats?.assignedReportsCount || 0}</span>
                </p>
                <p>
                  Rapports rédigés: <span className="font-semibold text-foreground">{employee.reportStats?.writtenReportsCount || 0}</span>
                </p>
              </div>
              {employee.eventAttendances?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune réunion ou formation avec présence confirmée</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {employee.eventAttendances?.slice(0, 10).map((eventAttendance) => (
                    <Link key={eventAttendance.id} href={`/meetings/${eventAttendance.meeting.id}`} className="block rounded-md border p-2 text-sm transition-colors hover:bg-muted">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium truncate">{eventAttendance.meeting.title}</p>
                        <Badge variant="outline">{formatMeetingCategory(eventAttendance.meeting.category)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(eventAttendance.meeting.startAt).toLocaleDateString('fr-FR')} · {formatAttendanceMode(eventAttendance.meeting.attendanceMode)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-5 border-t pt-4">
                <p className="mb-3 text-sm font-medium">Rapports de réunion / formation</p>
                {employee.reportAssignments?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun rapport confié pour le moment.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {employee.reportAssignments.slice(0, 10).map((reportAssignment) => (
                      <Link
                        key={reportAssignment.id}
                        href={`/meetings/${reportAssignment.id}`}
                        className="block rounded-md border p-2 text-sm transition-colors hover:bg-muted"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{reportAssignment.title}</p>
                          <Badge variant={reportAssignment.hasWrittenReport ? 'default' : 'outline'} className={reportAssignment.hasWrittenReport ? 'bg-emerald-600' : ''}>
                            {reportAssignment.hasWrittenReport ? 'Rédigé' : 'À rédiger'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatMeetingCategory(reportAssignment.category)} · {new Date(reportAssignment.startAt).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reportAssignment.hasWrittenReport && reportAssignment.writtenAt
                            ? `Rapport enregistré le ${new Date(reportAssignment.writtenAt).toLocaleDateString('fr-FR')}`
                            : 'Désigné comme responsable du rapport'}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div> */}
      </div>
    </div>
  );
}