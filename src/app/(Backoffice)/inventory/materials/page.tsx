'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Material = {
    id: string;
    name: string;
    category: string;
    inventoryCode: string;
    condition?: string | null;
    location?: string | null;
    assignedTo?: { id: string; firstName: string; lastName: string } | null;
};

export default function MaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        fetch('/api/inventory/materials')
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => {
                if (cancelled) return;
                const list = Array.isArray(data) ? data : data?.materials ?? data?.data ?? [];
                setMaterials(list);
            })
            .catch((err) => {
                console.error(err);
                if (!cancelled) setError(err.message || 'Erreur de chargement');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="min-h-screen px-4 py-6">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Matériels</h1>
                        <p className="text-sm text-slate-500">Liste des matériels enregistrés</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/inventory" className="rounded-xl border px-3 py-2 text-sm bg-white">
                            Retour
                        </Link>
                        <Link
                            href="/inventory/materials/new"
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                            Ajouter un matériel
                        </Link>
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow">
                    {loading ? (
                        <p>Chargement…</p>
                    ) : error ? (
                        <div className="py-10 text-center text-red-600">
                            <p>Erreur : {error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-3 rounded-md bg-red-600 px-4 py-2 text-white"
                            >
                                Réessayer
                            </button>
                        </div>
                    ) : materials.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-sm text-slate-600">Aucun matériel enregistré.</p>
                            <button
                                onClick={() => router.push('/inventory/materials/new')}
                                className="mt-3 rounded-md bg-emerald-600 px-4 py-2 text-white"
                            >
                                Ajouter un matériel
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y">
                                <thead>
                                <tr className="text-left text-sm font-medium text-slate-500">
                                    <th className="p-3">Code</th>
                                    <th className="p-3">Nom</th>
                                    <th className="p-3">Catégorie</th>
                                    <th className="p-3">État</th>
                                    <th className="p-3">Localisation</th>
                                    <th className="p-3">Affecté à</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y">
                                {materials.map((m) => (
                                    <tr key={m.id} className="text-sm">
                                        <td className="p-3 font-medium">{m.inventoryCode}</td>
                                        <td className="p-3">{m.name}</td>
                                        <td className="p-3">{m.category}</td>
                                        <td className="p-3">{m.condition ?? '—'}</td>
                                        <td className="p-3">{m.location ?? '—'}</td>
                                        <td className="p-3">
                                            {m.assignedTo ? `${m.assignedTo.firstName} ${m.assignedTo.lastName}` : '—'}
                                        </td>
                                        <td className="p-3">
                                            <Link
                                                href={`/inventory/materials/${m.id}`}
                                                className="text-emerald-600 hover:underline"
                                            >
                                                Modifier
                                            </Link>
                                        </td>
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