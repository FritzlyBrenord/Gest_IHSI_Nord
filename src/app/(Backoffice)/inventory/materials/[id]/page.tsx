'use client';

import React, {useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Link from 'next/link';
import {Input} from '../../components/Input';
import {Select} from '../../components/Select';

type MaterialForm = {
    name: string;
    category: string;
    inventoryCode: string;
    serialNumber: string;
    brand: string;
    model: string;
    condition: string;
    location: string;
    assignedToId: string;
    purchaseDate: string;
    notes: string;
};

type Employee = {
    id: string;
    firstName: string;
    lastName: string;
};

export default function EditMaterialPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [form, setForm] = useState<MaterialForm>({
        name: '',
        category: '',
        inventoryCode: '',
        serialNumber: '',
        brand: '',
        model: '',
        condition: 'BON_ETAT',
        location: '',
        assignedToId: '',
        purchaseDate: '',
        notes: '',
    });

    useEffect(() => {
        Promise.all([
            fetch(`/api/inventory/materials/${params.id}`).then((r) => r.json()),
            fetch('/api/employees').then((r) => r.json()),
        ])
            .then(([materialData, employeesData]) => {
                setForm({
                    name: materialData.name ?? '',
                    category: materialData.category ?? '',
                    inventoryCode: materialData.inventoryCode ?? '',
                    serialNumber: materialData.serialNumber ?? '',
                    brand: materialData.brand ?? '',
                    model: materialData.model ?? '',
                    condition: materialData.condition ?? 'BON_ETAT',
                    location: materialData.location ?? '',
                    assignedToId: materialData.assignedToId ?? '',
                    purchaseDate: materialData.purchaseDate ? materialData.purchaseDate.slice(0, 10) : '',
                    notes: materialData.notes ?? '',
                });
                setEmployees(employeesData.employees || []);
            })
            .finally(() => setLoading(false));
    }, [params.id]);

    const onChange = (key: keyof MaterialForm, value: string) => {
        setForm((prev) => ({...prev, [key]: value}));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch(`/api/inventory/materials/${params.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({...form, assignedToId: form.assignedToId || null}),
            });

            if (!res.ok) throw new Error('Erreur de mise à jour');
            router.push('/inventory/materials');
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la mise à jour');
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async () => {
        if (!confirm('Supprimer ce matériel ?')) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/inventory/materials/${params.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Erreur de suppression');
            router.push('/inventory/materials');
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la suppression');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="p-6">Chargement…</p>;

    return (
        <div className="min-h-screen px-4 py-6">
            <div className="mx-auto max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Modifier le matériel</h1>
                        <p className="text-sm text-slate-500">Mettre à jour les informations du matériel.</p>
                    </div>
                    <Link href="/inventory/materials" className="rounded-xl border px-3 py-2 text-sm bg-white">
                        Retour
                    </Link>
                </div>

                <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow space-y-4">
                    <Input label="Nom" value={form.name} onChange={(v) => onChange('name', v)} required placeholder="Nom du matériel"/>
                    <Input label="Catégorie" value={form.category} onChange={(v) => onChange('category', v)} required placeholder="Ex: Ordinateur portable"/>
                    <Input label="Code inventaire" value={form.inventoryCode}
                           onChange={(v) => onChange('inventoryCode', v)} required placeholder="Ex: INV-001"/>
                    <Input label="Numéro de série" value={form.serialNumber}
                           onChange={(v) => onChange('serialNumber', v)} placeholder="Ex: SN123456789"/>
                    <Input label="Marque" value={form.brand} onChange={(v) => onChange('brand', v)} placeholder="Ex: Dell"/>
                    <Input label="Modèle" value={form.model} onChange={(v) => onChange('model', v)} placeholder="Ex: Latitude 7420"/>
                    <Input label="Localisation" value={form.location} onChange={(v) => onChange('location', v)} placeholder="Ex: Bureau 101"/>

                    <Select
                        label="Affecté à"
                        value={form.assignedToId}
                        onChange={(v) => onChange('assignedToId', v)}
                        placeholder="Aucune affectation"
                        options={employees.map((emp) => ({
                            id: emp.id,
                            label: `${emp.firstName} ${emp.lastName}`,
                        }))}
                    />

                    <Input label="Date d'achat" type="date" value={form.purchaseDate}
                           onChange={(v) => onChange('purchaseDate', v)}/>
                    <Input label="Notes" value={form.notes} onChange={(v) => onChange('notes', v)} placeholder="Informations supplémentaires"/>

                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onDelete}
                            className="rounded-xl bg-red-600 px-4 py-2 text-white"
                        >
                            Supprimer
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-white"
                        >
                            {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}