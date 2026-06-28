// components/inventory/SessionDetailsModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { X, Calendar, User, Package, Clock, CheckCircle, AlertCircle } from 'lucide-react';

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
    EN_COURS: 'bg-blue-100 text-blue-700 border-blue-200',
    TERMINE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ANNULE: 'bg-red-100 text-red-700 border-red-200',
};

const LINE_STATUS_COLORS: Record<string, string> = {
    PRESENT: 'bg-emerald-100 text-emerald-700',
    ABSENT: 'bg-red-100 text-red-700',
    ENDOMMAGE: 'bg-amber-100 text-amber-700',
    TRANSFERE: 'bg-blue-100 text-blue-700',
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

    useEffect(() => {
        if (isOpen && sessionId) {
            fetchSessionDetails();
        }
    }, [isOpen, sessionId]);

    const fetchSessionDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/inventory/${sessionId}`);
            if (!res.ok) throw new Error('Erreur lors du chargement des details');
            const data = await res.json();
            setSession(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!session) return;
        try {
            setUpdating(true);
            const res = await fetch(`/api/inventory/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error('Erreur lors de la mise a jour');
            await fetchSessionDetails();
            if (onStatusChange) onStatusChange(newStatus);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la mise a jour');
        } finally {
            setUpdating(false);
        }
    };

    const getStatusColor = (status: string) => {
        return STATUS_COLORS[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const getLineStatusColor = (status: string) => {
        return LINE_STATUS_COLORS[status] || 'bg-slate-100 text-slate-700';
    };

    if (!isOpen) return null;

    const formatDate = (dateString: string) => {
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

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-900">
                            Details de la session
                        </h2>
                        {session && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}>
                                {STATUS_LABELS[session.status] || session.status}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        aria-label="Fermer"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                            <span className="ml-3 text-slate-500">Chargement...</span>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                <p>{error}</p>
                            </div>
                            <button
                                onClick={fetchSessionDetails}
                                className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                                Reessayer
                            </button>
                        </div>
                    ) : session ? (
                        <div className="space-y-6">
                            {/* Informations générales */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-500 mb-1">Titre</h3>
                                        <p className="text-lg font-semibold text-slate-900">{session.title}</p>
                                    </div>
                                    {session.description && (
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-500 mb-1">Description</h3>
                                            <p className="text-slate-700">{session.description}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-500">Date de creation</h3>
                                            <p className="text-slate-700">{formatDate(session.createdAt)}</p>
                                        </div>
                                    </div>
                                    {session.startedAt && (
                                        <div className="flex items-start gap-3">
                                            <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
                                            <div>
                                                <h3 className="text-sm font-medium text-slate-500">Debutee le</h3>
                                                <p className="text-slate-700">{formatDate(session.startedAt)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {session.endedAt && (
                                        <div className="flex items-start gap-3">
                                            <CheckCircle className="h-5 w-5 text-slate-400 mt-0.5" />
                                            <div>
                                                <h3 className="text-sm font-medium text-slate-500">Terminee le</h3>
                                                <p className="text-slate-700">{formatDate(session.endedAt)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {session.createdBy && (
                                        <div className="flex items-start gap-3">
                                            <User className="h-5 w-5 text-slate-400 mt-0.5" />
                                            <div>
                                                <h3 className="text-sm font-medium text-slate-500">Cree par</h3>
                                                <p className="text-slate-700">
                                                    {session.createdBy.firstName} {session.createdBy.lastName}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            {session.status !== 'TERMINE' && session.status !== 'ANNULE' && (
                                <div className="border-t border-slate-200 pt-4">
                                    <h3 className="text-sm font-medium text-slate-500 mb-3">Actions</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {session.status === 'BROUILLON' && (
                                            <button
                                                onClick={() => handleStatusChange('EN_COURS')}
                                                disabled={updating}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                            >
                                                Demarrer l'inventaire
                                            </button>
                                        )}
                                        {session.status === 'EN_COURS' && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusChange('TERMINE')}
                                                    disabled={updating}
                                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                                >
                                                    Terminer
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange('ANNULE')}
                                                    disabled={updating}
                                                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                                >
                                                    Annuler
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Matériels */}
                            <div className="border-t border-slate-200 pt-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        Materiels scannes ({session.lines.length})
                                    </h3>
                                    <div className="flex gap-2 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            Present
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                            Absent
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                            Endommage
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            Transfere
                                        </span>
                                    </div>
                                </div>

                                {session.lines.length === 0 ? (
                                    <p className="text-slate-500 text-sm">Aucun materiel scanne dans cette session.</p>
                                ) : (
                                    <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                <th className="px-4 py-3">Code</th>
                                                <th className="px-4 py-3">Nom</th>
                                                <th className="px-4 py-3">Categorie</th>
                                                <th className="px-4 py-3">Statut</th>
                                                <th className="px-4 py-3">Verifie par</th>
                                                <th className="px-4 py-3">Date</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                            {session.lines.map((line) => (
                                                <tr key={line.id} className="text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-slate-900">
                                                        {line.material.inventoryCode}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p>{line.material.name}</p>
                                                            {line.material.brand && (
                                                                <p className="text-xs text-slate-400">
                                                                    {line.material.brand} {line.material.model || ''}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">{line.material.category}</td>
                                                    <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getLineStatusColor(line.status)}`}>
                                                                {LINE_STATUS_LABELS[line.status] || line.status}
                                                            </span>
                                                        {line.note && (
                                                            <p className="text-xs text-slate-400 mt-1">{line.note}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-500">
                                                        {line.checkedBy
                                                            ? `${line.checkedBy.firstName} ${line.checkedBy.lastName}`
                                                            : '—'
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-500">
                                                        {line.checkedAt
                                                            ? new Date(line.checkedAt).toLocaleDateString('fr-FR', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })
                                                            : '—'
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-4 bg-slate-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}