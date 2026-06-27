// src/app/(backoffice)/inventory/components/Select.tsx
import React from 'react';

export function Select({
                           label,
                           value,
                           onChange,
                           required,
                           placeholder,
                           options,
                       }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    placeholder?: string;
    options: Array<{ id: string; label: string }>;
}) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium">{label}</label>
            <select
                required={required}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
            >
                <option value="">{placeholder || 'Sélectionner...'}</option>
                {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}