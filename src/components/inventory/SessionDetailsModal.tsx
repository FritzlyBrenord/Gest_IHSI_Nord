// components/inventory/SessionDetailsModal.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Calendar, User, Package, Clock, AlertCircle, Printer, FileText } from 'lucide-react';
import { generatePrintHTML } from './PrintSessionContent';

// Types (à exporter dans un fichier types partagé)
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

interface SessionDetailsModalProps {
    sessionId: string;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange?: (status: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
    BROUILLON: 'bg-slate-100 text-slate-700 border-slate-200',
    EN_COURS: 'bg-blue-50 text-blue-700 border-blue-200',
    TERMINE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ANNULE: 'bg-red-50 text-red-700 border-red-200',
};

const LINE_STATUS_COLORS: Record<string, string> = {
    PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    ABSENT: 'bg-red-50 text-red-700 border-red-100',
    ENDOMMAGE: 'bg-amber-50 text-amber-700 border-amber-100',
    TRANSFERE: 'bg-blue-50 text-blue-700 border-blue-100',
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

export function SessionDetailsModal({
                                        sessionId,
                                        isOpen,
                                        onClose,
                                        onStatusChange
                                    }: SessionDetailsModalProps) {
    const [session, setSession] = useState<SessionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);
    const [printing, setPrinting] = useState(false);

    const fetchSessionDetails = useCallback(async (showLoading = true) => {
        if (!sessionId) return;
        if (showLoading) setLoading(true);
        try {
            const res = await fetch(`/api/inventory/${sessionId}`);
            if (!res.ok) throw new Error('Erreur lors du chargement des details.');
            const data = await res.json();
            setSession(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [sessionId]);

    const handleStatusChange = async (newStatus: string) => {
        if (!session) return;
        try {
            setUpdating(true);
            const res = await fetch(`/api/inventory/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error('Erreur lors de la mise a jour du statut.');
            await fetchSessionDetails(false);
            if (onStatusChange) onStatusChange(newStatus);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la mise a jour.');
        } finally {
            setUpdating(false);
        }
    };

    useEffect(() => {
        if (isOpen && sessionId) {
            fetchSessionDetails(true);
        }
    }, [isOpen, sessionId, fetchSessionDetails]);

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

    const handlePrint = () => {
        if (!session) return;
        setPrinting(true);

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            alert('Veuillez autoriser les pop-ups pour imprimer.');
            setPrinting(false);
            return;
        }

        printWindow.document.write(generatePrintHTML(session));
        printWindow.document.close();

        setTimeout(() => {
            try {
                printWindow.focus();
                printWindow.print();
            } catch (err) {
                console.error('Erreur d\'impression:', err);
                alert('Erreur lors de l\'impression. Veuillez réessayer.');
            } finally {
                setPrinting(false);
                setTimeout(() => {
                    try { printWindow.close(); } catch (e) {}
                }, 1000);
            }
        }, 500);
    };

    if (!isOpen) return null;

    const stats = session ? {
        present: session.lines.filter(l => l.status === 'PRESENT').length,
        absent: session.lines.filter(l => l.status === 'ABSENT').length,
        dommage: session.lines.filter(l => l.status === 'ENDOMMAGE').length,
        transfere: session.lines.filter(l => l.status === 'TRANSFERE').length,
    } : { present: 0, absent: 0, dommage: 0, transfere: 0 };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {session?.title || "Details de la session"}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                ID: {session?.id?.slice(0, 8) || '...'}
                            </p>
                        </div>
                        {session && (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[session.status]}`}>
                                {STATUS_LABELS[session.status] || session.status}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            disabled={loading || !session || printing}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            <Printer className="h-4 w-4" />
                            {printing ? 'Impression...' : 'Imprimer'}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="Fermer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-emerald-600"></div>
                            <span className="text-sm text-slate-500 font-medium">Chargement...</span>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-700 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-2">
                                <p className="text-sm font-medium">{error}</p>
                                <button
                                    onClick={() => fetchSessionDetails(true)}
                                    className="text-xs bg-white border border-red-200 px-3 py-1 rounded-lg text-red-700 hover:bg-red-100 transition-colors font-semibold"
                                >
                                    Reessayer
                                </button>
                            </div>
                        </div>
                    ) : session ? (
                        <>
                            {/* Infos */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="space-y-1">
                                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                                        <User className="h-3 w-3" /> Responsable
                                    </span>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {session.createdBy ? `${session.createdBy.firstName} ${session.createdBy.lastName}` : 'Non specifie'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3" /> Creation
                                    </span>
                                    <p className="text-sm font-medium text-slate-700">{formatDate(session.createdAt)}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                                        <Clock className="h-3 w-3" /> Execution
                                    </span>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Debut : {formatDate(session.startedAt)} <br />
                                        Fin : {formatDate(session.endedAt)}
                                    </p>
                                </div>
                                {session.description && (
                                    <div className="col-span-3 border-t border-slate-200/60 pt-3 mt-1">
                                        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Description</span>
                                        <p className="text-sm text-slate-600 mt-0.5">{session.description}</p>
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-center">
                                    <span className="text-2xl font-bold text-emerald-700">{stats.present}</span>
                                    <p className="text-xs font-medium text-emerald-600 mt-0.5">Present</p>
                                </div>
                                <div className="p-3 bg-red-50/40 border border-red-100 rounded-xl text-center">
                                    <span className="text-2xl font-bold text-red-700">{stats.absent}</span>
                                    <p className="text-xs font-medium text-red-600 mt-0.5">Absent</p>
                                </div>
                                <div className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl text-center">
                                    <span className="text-2xl font-bold text-amber-700">{stats.dommage}</span>
                                    <p className="text-xs font-medium text-amber-600 mt-0.5">Endommage</p>
                                </div>
                                <div className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl text-center">
                                    <span className="text-2xl font-bold text-blue-700">{stats.transfere}</span>
                                    <p className="text-xs font-medium text-blue-600 mt-0.5">Transfere</p>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <Package className="h-4 w-4 text-slate-500" /> Materiels ({session.lines.length})
                                </h3>

                                {session.lines.length > 0 ? (
                                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-sm">
                                                <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                                                    <th className="p-3">Code</th>
                                                    <th className="p-3">Designation</th>
                                                    <th className="p-3">Categorie</th>
                                                    <th className="p-3">Statut</th>
                                                    <th className="p-3">Verifie par</th>
                                                </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                                {session.lines.map((line) => (
                                                    <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-3 font-mono font-bold text-slate-900 text-xs">
                                                            {line.material.inventoryCode}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="font-semibold text-slate-800">{line.material.name}</div>
                                                            {(line.material.brand || line.material.model) && (
                                                                <span className="text-xs text-slate-400 block mt-0.5">
                                                                        {line.material.brand} {line.material.model}
                                                                    </span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-slate-500">{line.material.category}</td>
                                                        <td className="p-3">
                                                                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${LINE_STATUS_COLORS[line.status] || 'bg-slate-100'}`}>
                                                                    {LINE_STATUS_LABELS[line.status] || line.status}
                                                                </span>
                                                            {line.note && (
                                                                <p className="text-xs text-amber-600 mt-1 max-w-[200px] break-words italic">
                                                                    {line.note}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-xs text-slate-500">
                                                            {line.checkedBy ? (
                                                                <div className="space-y-0.5">
                                                                    <p className="font-medium text-slate-700">
                                                                        {line.checkedBy.firstName} {line.checkedBy.lastName}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-400">
                                                                        {line.checkedAt ? new Date(line.checkedAt).toLocaleDateString('fr-FR') : ''}
                                                                    </p>
                                                                </div>
                                                            ) : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                        <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-500">Aucun materiel scanne.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 p-4 bg-slate-50/70 flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">
                        Total : {session?.lines?.length || 0} materiel(s)
                    </span>
                    <div className="flex items-center gap-2">
                        {session && session.status === 'EN_COURS' && (
                            <>
                                <button
                                    onClick={() => handleStatusChange('ANNULE')}
                                    disabled={updating}
                                    className="px-3 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => handleStatusChange('TERMINE')}
                                    disabled={updating}
                                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/10 transition-colors disabled:opacity-50"
                                >
                                    Cloturer
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}