'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { toast } from 'sonner';

export default function ClientLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

 async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setLoading(true);
  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error || !result?.ok) {
      toast.error('Email ou mot de passe incorrect');
      return;
    }

    // Récupérer la session pour lire le rôle
    const session = await getSession();

    switch (session?.user?.role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        router.replace('/pilotage-administratif');
        break;
      case 'SUPERVISEUR':
        router.replace('/superviseur/dashboard');
        break;
      default:
        router.replace('/home');
    }

  } catch {
    toast.error('Erreur de connexion');
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e8f0fe] px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-blue-100 bg-white px-9 py-10">

          {/* Logo */}
          <div className="mx-auto mb-6 flex items-center justify-center rounded-2xl border border-blue-100 bg-white" style={{ width: 64, height: 64 }}>
            <div className="relative" style={{ width: 48, height: 48 }}>
              <Image src="/logo.webp" alt="IHSI" fill className="object-contain p-1" />
            </div>
          </div>

          <h1 className="mb-1 text-center text-xl font-semibold text-[#1e3a8a]">
            Se connecter
          </h1>
          <p className="mb-7 text-center text-xs font-light text-[#93a3be]">
            Institut Haïtien de Statistique et d'Informatique
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[11px] font-medium tracking-wide text-gray-500">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
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

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[11px] font-medium tracking-wide text-gray-500">
                Mot de passe
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-blue-100 bg-[#f0f7ff] pl-9 pr-4 text-[13.5px] text-[#1e3a8a] placeholder-blue-200 outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-blue-500 hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-[#1d4ed8] text-sm font-medium text-white transition-colors hover:bg-[#1e40af] disabled:opacity-60"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-5 text-center text-[12.5px] text-gray-400">
            Pas encore de compte ?{' '}
            <Link href="/register" className="font-medium text-[#1d4ed8] hover:underline">
              Créer un compte
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