'use client';

import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Input } from '../components/Input';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewInventoryPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError('Le titre est requis');
            return;
        }

        setSaving(true);

        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || null
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err?.error || 'Erreur serveur');
            }

            const session = await res.json();
            router.push(`/inventory/${session.id}`);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erreur réseau');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/inventory"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Retour
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Nouvel inventaire</h1>
                        <p className="text-sm text-slate-500">Créer une nouvelle session d'inventaire du matériel.</p>
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="grid gap-5">
                        <Input
                            label="Titre"
                            value={title}
                            onChange={setTitle}
                            required
                            placeholder="Ex: Inventaire général 2026"
                        />

                        <Input
                            label="Description"
                            type="textarea"
                            value={description}
                            onChange={setDescription}
                            placeholder="Précise le périmètre de l'inventaire..."
                        />

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={saving || !title.trim()}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? 'Création...' : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}