'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface EmployeePreview {
  email: string;
  firstName: string;
  lastName: string;
  poste: string;
  department: string;
}

export default function ClientRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employee, setEmployee] = useState<EmployeePreview | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/compte-employer/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok || !data.found) {
        toast.error(data.error || 'Email non reconnu par le système IHSI');
        return;
      }
      setEmployee(data.employee);
      setStep('password');
    } catch {
      toast.error('Erreur de vérification');
    } finally {
      setLoading(false);
    }
  }

  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/compte-employer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: employee?.email || email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Création impossible');
        return;
      }
      router.replace(data.redirectTo || '/home');
    } catch {
      toast.error('Erreur de création');
    } finally {
      setLoading(false);
    }
  }

  const initials = employee
    ? `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`
    : '';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e8f0fe] px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-blue-100 bg-white px-9 py-10">

          {/* Logo */}
          <div
            className="mx-auto mb-6 flex items-center justify-center rounded-2xl border border-blue-100 bg-white"
            style={{ width: 64, height: 64 }}
          >
            <div className="relative" style={{ width: 48, height: 48 }}>
              <Image src="/logo.webp" alt="IHSI" fill className="object-contain p-1" />
            </div>
          </div>

          <h1 className="mb-1 text-center text-xl font-semibold text-[#1e3a8a]">
            Créer un compte
          </h1>
          <p className="mb-6 text-center text-xs font-light text-[#93a3be]">
            Vérifiez votre email professionnel pour activer votre accès
          </p>

          {/* Step indicator */}
          <div className="mb-7 flex items-center justify-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-600 transition-all ${
                step === 'email' ? 'bg-[#1d4ed8] text-white' : 'bg-green-500 text-white'
              }`}
            >
              {step === 'email' ? '1' : '✓'}
            </div>
            <div
              className={`h-0.5 w-8 rounded-full transition-all ${
                step === 'password' ? 'bg-green-500' : 'bg-blue-100'
              }`}
            />
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-600 transition-all ${
                step === 'password' ? 'bg-[#1d4ed8] text-white' : 'bg-blue-100 text-[#93a3be]'
              }`}
            >
              2
            </div>
          </div>

          {step === 'email' ? (
            <form onSubmit={checkEmail} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[11px] font-medium tracking-wide text-gray-500">
                  Email professionnel
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="nom@ihsi.ht"
                    className="h-11 w-full rounded-xl border border-blue-100 bg-[#f0f7ff] pl-9 pr-4 text-[13.5px] text-[#1e3a8a] placeholder-blue-200 outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-[#1d4ed8] text-sm font-medium text-white transition-colors hover:bg-[#1e40af] disabled:opacity-60"
              >
                {loading ? 'Vérification…' : 'Continuer'}
              </button>
            </form>
          ) : (
            <form onSubmit={register} className="space-y-4">
              {/* Employee card */}
              <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-[#f0f7ff] px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-xs font-semibold text-white">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1e3a8a]">
                    {employee?.firstName} {employee?.lastName}
                  </p>
                  <p className="text-xs font-light text-[#7aadde]">
                    {employee?.poste} — {employee?.department}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-[11px] font-medium tracking-wide text-gray-500">
                  Mot de passe
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="password"
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Minimum 6 caractères"
                    className="h-11 w-full rounded-xl border border-blue-100 bg-[#f0f7ff] pl-9 pr-4 text-[13.5px] text-[#1e3a8a] placeholder-blue-200 outline-none focus:border-blue-400 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-[#1d4ed8] text-sm font-medium text-white transition-colors hover:bg-[#1e40af] disabled:opacity-60"
              >
                {loading ? 'Création…' : 'Créer mon compte'}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-100 text-xs text-gray-400 transition-colors hover:bg-[#f0f7ff] hover:text-[#1d4ed8]"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                Changer d'email
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-[12.5px] text-gray-400">
            Déjà un compte ?{' '}
            <Link href="/login" className="font-medium text-[#1d4ed8] hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-[#93a3be]">
          IHSI © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}