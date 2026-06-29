// components/inventory/PrintSessionContent.tsx
'use client';

type SessionLine = {
    id: string;
    materialId: string;
    status: string;
    note?: string | null;
    checkedAt?: string;
    material: {
        id: string;
        name: string;
        inventoryCode: string;
        category: string;
        brand?: string | null;
        model?: string | null;
    };
    checkedBy?: {
        firstName: string;
        lastName: string;
    } | null;
};

type SessionDetails = {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    createdAt: string;
    startedAt?: string | null;
    endedAt?: string | null;
    createdBy?: {
        firstName: string;
        lastName: string;
        email?: string;
    } | null;
    lines: SessionLine[];
};

const STATUS_LABELS: Record<string, string> = {
    BROUILLON: 'Brouillon',
    EN_COURS: 'En cours',
    TERMINE: 'Termine',
    ANNULE: 'Annule',
};

const LINE_STATUS_LABELS: Record<string, string> = {
    PRESENT: 'Present',
    ABSENT: 'Absent',
    ENDOMMAGE: 'Endommage',
    TRANSFERE: 'Transfere',
};

export function generatePrintHTML(session: SessionDetails): string {
    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '—';
        try {
            return new Date(dateString).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'PRESENT': return 'status-present';
            case 'ABSENT': return 'status-absent';
            case 'ENDOMMAGE': return 'status-endommage';
            case 'TRANSFERE': return 'status-transfere';
            default: return '';
        }
    };

    const stats = {
        present: session.lines.filter(l => l.status === 'PRESENT').length,
        absent: session.lines.filter(l => l.status === 'ABSENT').length,
        dommage: session.lines.filter(l => l.status === 'ENDOMMAGE').length,
        transfere: session.lines.filter(l => l.status === 'TRANSFERE').length,
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Rapport d'inventaire - ${session.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 40px;
            color: #1e293b;
            background: white;
            font-size: 14px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            border-bottom: 3px double #1e293b;
            padding-bottom: 20px;
            margin-bottom: 25px;
        }
        .header h1 { font-size: 26px; font-weight: bold; color: #0f172a; }
        .header .subtitle { color: #64748b; font-size: 14px; }
        .header .date { color: #94a3b8; font-size: 12px; margin-top: 3px; }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #0f172a;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
            margin: 20px 0 15px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px 30px;
            background: #f8fafc;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .info-item .label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            color: #94a3b8;
        }
        .info-item .value {
            font-size: 14px;
            color: #0f172a;
            font-weight: 500;
            margin-top: 2px;
        }
        .stats {
            display: flex;
            gap: 30px;
            justify-content: center;
            margin: 15px 0 20px 0;
            padding: 12px;
            background: #f8fafc;
            border-radius: 8px;
        }
        .stats-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .dot {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        .dot-emerald { background: #10b981; }
        .dot-red { background: #ef4444; }
        .dot-amber { background: #f59e0b; }
        .dot-blue { background: #3b82f6; }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 12px;
        }
        .table th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            padding: 10px 12px;
            text-align: left;
            border-bottom: 2px solid #e2e8f0;
        }
        .table td {
            padding: 8px 12px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
        }
        .table tr:last-child td { border-bottom: none; }
        .badge {
            display: inline-block;
            padding: 2px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        .status-present { background: #d1fae5; color: #065f46; }
        .status-absent { background: #fee2e2; color: #991b1b; }
        .status-endommage { background: #fef3c7; color: #92400e; }
        .status-transfere { background: #dbeafe; color: #1e40af; }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
        }
        .empty { text-align: center; color: #94a3b8; padding: 30px 0; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>Rapport d'inventaire</h1>
        <div class="subtitle">${session.title}</div>
        <div class="date">Genere le ${new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}</div>
    </div>

    <div class="section-title">Informations generales</div>
    <div class="info-grid">
        <div class="info-item">
            <div class="label">Statut</div>
            <div class="value">${STATUS_LABELS[session.status] || session.status}</div>
        </div>
        <div class="info-item">
            <div class="label">Responsable</div>
            <div class="value">${session.createdBy ? `${session.createdBy.firstName} ${session.createdBy.lastName}` : 'Non specifie'}</div>
        </div>
        <div class="info-item">
            <div class="label">Date de creation</div>
            <div class="value">${formatDate(session.createdAt)}</div>
        </div>
        <div class="info-item">
            <div class="label">Debut / Fin</div>
            <div class="value">${formatDate(session.startedAt)} / ${formatDate(session.endedAt)}</div>
        </div>
        ${session.description ? `
        <div class="info-item" style="grid-column: 1 / -1;">
            <div class="label">Description</div>
            <div class="value">${session.description}</div>
        </div>
        ` : ''}
    </div>

    <div class="section-title">Resume des verifications</div>
    <div class="stats">
        <div class="stats-item">
            <span class="dot dot-emerald"></span> Present: ${stats.present}
        </div>
        <div class="stats-item">
            <span class="dot dot-red"></span> Absent: ${stats.absent}
        </div>
        <div class="stats-item">
            <span class="dot dot-amber"></span> Endommage: ${stats.dommage}
        </div>
        <div class="stats-item">
            <span class="dot dot-blue"></span> Transfere: ${stats.transfere}
        </div>
    </div>

    <div class="section-title">Liste des materiels (${session.lines.length})</div>
    ${session.lines.length > 0 ? `
    <table class="table">
        <thead>
            <tr>
                <th>Code</th>
                <th>Designation</th>
                <th>Categorie</th>
                <th>Statut</th>
                <th>Verifie par</th>
            </tr>
        </thead>
        <tbody>
            ${session.lines.map(line => `
            <tr>
                <td><strong>${line.material.inventoryCode}</strong></td>
                <td>
                    ${line.material.name}
                    ${line.material.brand ? `<br><span style="color:#94a3b8;font-size:11px;">${line.material.brand} ${line.material.model || ''}</span>` : ''}
                </td>
                <td>${line.material.category}</td>
                <td>
                    <span class="badge ${getStatusClass(line.status)}">${LINE_STATUS_LABELS[line.status] || line.status}</span>
                    ${line.note ? `<br><span style="color:#92400e;font-size:10px;">${line.note}</span>` : ''}
                </td>
                <td>${line.checkedBy ? `${line.checkedBy.firstName} ${line.checkedBy.lastName}` : '—'}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    ` : `
    <div class="empty">Aucun materiel scanne dans cette session.</div>
    `}

    <div class="footer">
        Document genere automatiquement - Institut Haitien de Statistique et d'Informatique (IHSI)
    </div>
</body>
</html>
    `;
}