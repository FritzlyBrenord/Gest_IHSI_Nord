// app/(Backoffice)/inventory/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    BadgeCheck,
    ClipboardCheck,
    Package,
    Plus,
    AlertTriangle,
} from 'lucide-react';
import { SessionDetailsModal } from '@/components/inventory/SessionDetailsModal';

type Material = {
    id: string;
    code?: string;
    name: string;
    category: string;
    condition?: string | null;
    location?: string | null;
    assignedTo?: { firstName: string; lastName: string } | null;
    inventoryCode?: string;
};

type Session = {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    lines?: { id: string }[];
};

type DashboardData = {
    stats: {
        totalMaterials: number;
        goodMaterials: number;
        toCheck: number;
        finishedSessions: number;
    };
    materials: Material[];
    sessions: Session[];
};

function StatusBadge({ status }: { status: string }) {
    const classes =
        status === 'Bon état' || status === 'Terminé' || status === 'BON_ETAT'
            ? 'bg-emerald-100 text-emerald-700'
            : status === 'À vérifier' || status === 'En cours' || status === 'A_REPARER' || status === 'ENDOMMAGE'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700';

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>
            {status}
        </span>
    );
}

export default function InventoryPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/inventory/dashboard');
            if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSessionClick = (sessionId: string) => {
        setSelectedSessionId(sessionId);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedSessionId(null);
    };

    const handleStatusChange = () => {
        // Rafraîchir les données après un changement de statut
        fetchData();
    };

    const stats = [
        {
            label: 'Total matériels',
            value: data?.stats.totalMaterials ?? 0,
            icon: Package,
            tone: 'text-slate-700 bg-slate-100',
        },
        {
            label: 'En bon état',
            value: data?.stats.goodMaterials ?? 0,
            icon: BadgeCheck,
            tone: 'text-emerald-700 bg-emerald-100',
        },
        {
            label: 'À vérifier',
            value: data?.stats.toCheck ?? 0,
            icon: AlertTriangle,
            tone: 'text-amber-700 bg-amber-100',
        },
        {
            label: 'Inventaires terminés',
            value: data?.stats.finishedSessions ?? 0,
            icon: ClipboardCheck,
            tone: 'text-blue-700 bg-blue-100',
        },
    ];

    return (
        <>
            <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Inventaire du bureau</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Suivi du matériel, des sessions d'inventaire et des écarts constatés.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/inventory/new"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            >
                                <Plus className="h-4 w-4" />
                                Nouvel inventaire
                            </Link>

                            <Link
                                href="/inventory/materials/new"
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                <Plus className="h-4 w-4" />
                                Ajouter un matériel
                            </Link>
                        </div>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl bg-white p-6 shadow-sm">
                            <p className="text-slate-500">Chargement...</p>
                        </div>
                    ) : error ? (
                        <div className="rounded-2xl bg-white p-6 shadow-sm">
                            <p className="text-red-600">Erreur : {error}</p>
                            <button
                                onClick={fetchData}
                                className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                                Réessayer
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                {stats.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.label} className="rounded-2xl bg-white p-5 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-slate-500">{item.label}</p>
                                                <div className={`rounded-xl p-2 ${item.tone}`}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                            </div>
                                            <p className="mt-4 text-3xl font-bold text-slate-900">{item.value}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="rounded-2xl bg-white p-6 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-slate-900">Matériels enregistrés</h2>
                                    <Link href="/inventory/materials" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                                        Voir tout
                                    </Link>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead>
                                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            <th className="pb-3 pr-4">Code</th>
                                            <th className="pb-3 pr-4">Nom</th>
                                            <th className="pb-3 pr-4">Catégorie</th>
                                            <th className="pb-3 pr-4">État</th>
                                            <th className="pb-3 pr-4">Localisation</th>
                                            <th className="pb-3 pr-4">Affecté à</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                        {(data?.materials ?? []).slice(0, 5).map((material) => (
                                            <tr key={material.id} className="text-sm text-slate-700">
                                                <td className="py-4 pr-4 font-medium text-slate-900">
                                                    {material.inventoryCode ?? material.code ?? '—'}
                                                </td>
                                                <td className="py-4 pr-4">{material.name}</td>
                                                <td className="py-4 pr-4">{material.category}</td>
                                                <td className="py-4 pr-4">
                                                    <StatusBadge status={material.condition ?? '—'} />
                                                </td>
                                                <td className="py-4 pr-4">{material.location ?? '—'}</td>
                                                <td className="py-4 pr-4">
                                                    {material.assignedTo
                                                        ? `${material.assignedTo.firstName} ${material.assignedTo.lastName}`
                                                        : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="grid gap-6 xl:grid-cols-2">
                                <div className="rounded-2xl bg-white p-6 shadow-sm">
                                    <h2 className="text-lg font-semibold text-slate-900">Sessions récentes</h2>
                                    <div className="mt-4 space-y-4">
                                        {(data?.sessions ?? []).slice(0, 5).map((session) => (
                                            <div
                                                key={session.id}
                                                className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:bg-slate-50 hover:border-emerald-200 transition-all cursor-pointer"
                                                onClick={() => handleSessionClick(session.id)}
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-900">{session.title}</p>
                                                    <p className="text-sm text-slate-500">
                                                        {new Date(session.createdAt).toLocaleDateString('fr-FR')}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <StatusBadge status={session.status} />
                                                    <p className="mt-2 text-sm text-slate-500">
                                                        {session.lines?.length ?? 0} ligne(s)
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
                                    <h2 className="text-lg font-semibold">Conseil rapide</h2>
                                    <p className="mt-2 text-sm text-slate-300">
                                        Commence par enregistrer tous les matériels, puis lance un inventaire par service ou par bureau.
                                    </p>
                                    <Link
                                        href="/inventory/new"
                                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                                    >
                                        Démarrer
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal */}
            {selectedSessionId && (
                <SessionDetailsModal
                    sessionId={selectedSessionId}
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    onStatusChange={handleStatusChange}
                />
            )}
        </>
    );
}