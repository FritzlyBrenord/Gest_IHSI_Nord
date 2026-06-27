import React from 'react';

export function Input({
    label,
    value,
    onChange,
    required,
    type = 'text',
    rows = 4, // Add rows prop for textarea
    placeholder, // Add placeholder prop
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    type?: string;
    rows?: number;
    placeholder?: string; // Define placeholder prop
}) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium">{label}</label>
            {type === 'textarea' ? (
                <textarea
                    rows={rows}
                    required={required}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder={placeholder} // Apply placeholder to textarea
                />
            ) : (
                <input
                    type={type}
                    required={required}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder={placeholder} // Apply placeholder to input
                />
            )}
        </div>
    );
}
