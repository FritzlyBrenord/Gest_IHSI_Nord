'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';

type Employee = {
    id: string;
    firstName: string;
    lastName: string;
};

export default function NewMaterialPage() {
    const [name, setName] = useState('');
    const [inventoryCode, setInventoryCode] = useState('');
    const [category, setCategory] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [condition, setCondition] = useState('BON_ETAT');
    const [location, setLocation] = useState('');
    const [assignedToId, setAssignedToId] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Fetch employees list
        fetch('/api/employees')
            .then((r) => r.json())
            .then((data) => {
                setEmployees(data.employees || []);
            })
            .catch((err) => {
                console.error('Error loading employees:', err);
            })
            .finally(() => setLoadingEmployees(false));
    }, []);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/inventory/materials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    inventoryCode,
                    category,
                    serialNumber,
                    brand,
                    model,
                    condition,
                    location,
                    assignedToId: assignedToId || null,
                    purchaseDate,
                    notes,
                }),
            });
            if (res.ok) {
                router.push('/inventory/materials');
            } else {
                const err = await res.json();
                alert(err?.error || 'Erreur serveur');
            }
        } catch (err) {
            console.error(err);
            alert('Erreur réseau');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-screen px-4 py-6">
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Ajouter un matériel</h1>
                    <p className="text-sm text-slate-500">Remplis les informations du matériel.</p>
                </div>

                <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow">
                    <div className="grid gap-4">
                        <Input label="Nom" value={name} onChange={setName} required />
                        <Input label="Code inventaire" value={inventoryCode} onChange={setInventoryCode} required />
                        <Input label="Catégorie" value={category} onChange={setCategory} required />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Input label="Marque" value={brand} onChange={setBrand} />
                            <Input label="Modèle" value={model} onChange={setModel} />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Input label="Numéro de série" value={serialNumber} onChange={setSerialNumber} />
                            <div>
                                <label className="block text-sm font-medium">État</label>
                                <select value={condition} onChange={(e) => setCondition(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2">
                                    <option value="BON_ETAT">Bon état</option>
                                    <option value="A_REPARER">À réparer</option>
                                    <option value="ENDOMMAGE">Endommagé</option>
                                    <option value="PERDU">Perdu</option>
                                </select>
                            </div>
                        </div>

                        <Input label="Localisation" value={location} onChange={setLocation} />

                        {!loadingEmployees && (
                            <Select
                                label="Affecté à"
                                value={assignedToId}
                                onChange={setAssignedToId}
                                placeholder="Aucune affectation"
                                options={employees.map((emp) => ({
                                    id: emp.id,
                                    label: `${emp.firstName} ${emp.lastName}`,
                                }))}
                            />
                        )}

                        <Input label="Date d'achat" type="date" value={purchaseDate} onChange={setPurchaseDate} />
                        <Input label="Notes" value={notes} onChange={setNotes} />

                        <div className="flex justify-end">
                            <button type="submit" disabled={saving || loadingEmployees} className="rounded-md bg-emerald-600 px-4 py-2 text-white">
                                {saving ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}