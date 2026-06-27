'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, Plus, Trash2} from 'lucide-react';

type InventoryLine = {
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
    };
    checkedBy?: {
        firstName: string;
        lastName: string;
    } | null;
};

type InventorySession = {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    createdAt?: string;
    startedAt?: string | null;
    endedAt?: string | null;
    lines: InventoryLine[];
    createdBy?: {
        firstName: string;
        lastName: string;
    } | null;
};

type Material = {
    id: string;
    inventoryCode: string;
    name: string;
    category: string;
};

const STATUS_COLORS: Record<string, string> = {
    BROUILLON: 'bg-slate-100 text-slate-700',
    EN_COURS: 'bg-blue-100 text-blue-700',
    TERMINE: 'bg-emerald-100 text-emerald-700',
    ANNULE: 'bg-red-100 text-red-700',
};

const LINE_STATUS_COLORS: Record<string, string> = {
    PRESENT: 'bg-emerald-100 text-emerald-700',
    ABSENT: 'bg-red-100 text-red-700',
    ENDOMMAGE: 'bg-amber-100 text-amber-700',
    TRANSFERE: 'bg-blue-100 text-blue-700',
};

export default function InventorySessionPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const [session, setSession] = useState<InventorySession | null>(null);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
    const [updating, setUpdating] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [sessionRes, materialsRes] = await Promise.all([
                fetch(`/api/inventory/${params.id}`),
                fetch('/api/inventory/materials'),
            ]);

            if (sessionRes.status === 404) {
                // session not found — show UI message instead of throwing
                setSession(null);
                return;
            }
            if (!sessionRes.ok) throw new Error('Erreur serveur lors du chargement de la session');
            if (!materialsRes.ok) throw new Error('Impossible de charger les matériels');

            const sessionData = await sessionRes.json();
            const materialsData = await materialsRes.json();

            setSession(sessionData);
            const materialList = Array.isArray(materialsData)
                ? materialsData
                : materialsData?.materials ?? materialsData?.items ?? [];
            setMaterials(materialList);
        } catch (error) {
            console.error(error);
            setSession(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!params?.id) return; // don't fetch until we have the id
        (async () => await loadData())()

    }, [params?.id]);

    const availableMaterials = useMemo(() => {
        const used = new Set(session?.lines?.map((line) => line.materialId) ?? []);
        return materials.filter((m) => !used.has(m.id));
    }, [materials, session]);

    const handleDeleteSession = async () => {
        if (!confirm('Supprimer cette session ?')) return;

        try {
            const res = await fetch(`/api/inventory/${params.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Erreur de suppression');
            router.push('/inventory');
        } catch (error) {
            console.error(error);
            alert('Erreur lors de la suppression');
        }
    };

    const handleChangeSessionStatus = async (status: string) => {
        try {
            setUpdating(true);
            const res = await fetch(`/api/inventory/${params.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({status}),
            });

            if (!res.ok) throw new Error('Erreur de mise à jour');
            await loadData();
        } catch (error) {
            console.error(error);
            alert('Erreur lors de la mise à jour');
        } finally {
            setUpdating(false);
        }
    };

    const handleAddMaterials = async () => {
        if (selectedMaterials.length === 0) return;

        try {
            setUpdating(true);
            const res = await fetch(`/api/inventory/${params.id}/lines`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({materialIds: selectedMaterials}),
            });

            if (!res.ok) throw new Error('Erreur lors de l’ajout');
            setSelectedMaterials([]);
            setAdding(false);
            await loadData();
        } catch (error) {
            console.error(error);
            alert('Erreur lors de l’ajout');
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateLineStatus = async (lineId: string, status: string) => {
        try {
            setUpdating(true);
            const res = await fetch(`/api/inventory/${params.id}/lines`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({lineId, status}),
            });

            if (!res.ok) throw new Error('Erreur de mise à jour');
            await loadData();
        } catch (error) {
            console.error(error);
            alert('Erreur lors de la mise à jour de la ligne');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <p className="p-6">Chargement…</p>;
    if (!session) return <p className="p-6">Session introuvable</p>;

    const completedCount = session.lines.filter((l) => l.status === 'PRESENT').length;
    const progress = session.lines.length ? Math.round((completedCount / session.lines.length) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/inventory"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                        <ArrowLeft className="h-4 w-4"/>
                        Retour
                    </Link>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-slate-900">{session.title}</h1>
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[session.status] ?? 'bg-slate-100 text-slate-700'}`}>
                  {session.status}
                </span>
                            </div>
                            {session.description ? (
                                <p className="mt-1 text-sm text-slate-500">{session.description}</p>
                            ) : null}
                            {session.createdBy ? (
                                <p className="mt-2 text-xs text-slate-400">
                                    Créé par {session.createdBy.firstName} {session.createdBy.lastName}
                                </p>
                            ) : null}
                        </div>

                        <button
                            onClick={handleDeleteSession}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4"/>
                            Supprimer
                        </button>
                    </div>

                    <div className="mt-6">
                        <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700">Progression</span>
                            <span className="text-slate-500">
                {completedCount} / {session.lines.length}
              </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200">
                            <div
                                className="h-2 rounded-full bg-emerald-600"
                                style={{width: `${progress}%`}}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        {session.status === 'BROUILLON' && (
                            <button
                                onClick={() => handleChangeSessionStatus('EN_COURS')}
                                disabled={updating}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                Commencer
                            </button>
                        )}

                        {session.status === 'EN_COURS' && (
                            <>
                                <button
                                    onClick={() => handleChangeSessionStatus('TERMINE')}
                                    disabled={updating}
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    Terminer
                                </button>
                                <button
                                    onClick={() => handleChangeSessionStatus('ANNULE')}
                                    disabled={updating}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Annuler
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">Matériels</h2>
                        {session.status !== 'TERMINE' && (
                            <button
                                onClick={() => setAdding((v) => !v)}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                                <Plus className="h-4 w-4"/>
                                Ajouter
                            </button>
                        )}
                    </div>

                    {adding && (
                        <div className="mb-6 rounded-xl border border-slate-200 p-4">
                            <p className="mb-3 text-sm font-medium text-slate-700">
                                Sélectionnez les matériels à ajouter
                            </p>

                            {availableMaterials.length === 0 ? (
                                <p className="text-sm text-slate-500">Aucun matériel disponible.</p>
                            ) : (
                                <div className="max-h-64 space-y-2 overflow-y-auto">
                                    {availableMaterials.map((material) => (
                                        <label key={material.id} className="flex items-center gap-3 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={selectedMaterials.includes(material.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedMaterials((prev) => [...prev, material.id]);
                                                    } else {
                                                        setSelectedMaterials((prev) =>
                                                            prev.filter((id) => id !== material.id)
                                                        );
                                                    }
                                                }}
                                            />
                                            <span>
                        <strong>{material.inventoryCode}</strong> — {material.name} ({material.category})
                      </span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={handleAddMaterials}
                                    disabled={selectedMaterials.length === 0 || updating}
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    Ajouter
                                </button>
                                <button
                                    onClick={() => {
                                        setAdding(false);
                                        setSelectedMaterials([]);
                                    }}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    )}

                    {session.lines.length === 0 ? (
                        <p className="text-sm text-slate-500">Aucun matériel dans cette session.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    <th className="pb-3 pr-4">Code</th>
                                    <th className="pb-3 pr-4">Nom</th>
                                    <th className="pb-3 pr-4">Catégorie</th>
                                    <th className="pb-3 pr-4">Statut</th>
                                    <th className="pb-3 pr-4">Vérifié par</th>
                                    {session.status !== 'TERMINE' && <th className="pb-3 pr-4">Action</th>}
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                {session.lines.map((line) => (
                                    <tr key={line.id} className="text-sm text-slate-700">
                                        <td className="py-4 pr-4 font-medium text-slate-900">
                                            {line.material?.inventoryCode ?? '—'}
                                        </td>
                                        <td className="py-4 pr-4">{line.material?.name ?? '—'}</td>
                                        <td className="py-4 pr-4">{line.material?.category ?? '—'}</td>
                                        <td className="py-4 pr-4">
                        <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${LINE_STATUS_COLORS[line.status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {line.status}
                        </span>
                                        </td>
                                        <td className="py-4 pr-4 text-xs text-slate-500">
                                            {line.checkedBy ? `${line.checkedBy.firstName} ${line.checkedBy.lastName}` : '—'}
                                        </td>
                                        {session.status !== 'TERMINE' && (
                                            <td className="py-4 pr-4">
                                                <select
                                                    value={line.status}
                                                    onChange={(e) => handleUpdateLineStatus(line.id, e.target.value)}
                                                    disabled={updating}
                                                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                                                >
                                                    <option value="PRESENT">Présent</option>
                                                    <option value="ABSENT">Absent</option>
                                                    <option value="ENDOMMAGE">Endommagé</option>
                                                    <option value="TRANSFERE">Transféré</option>
                                                </select>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}