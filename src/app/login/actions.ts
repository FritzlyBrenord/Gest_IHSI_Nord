'use server';

import { signIn, auth } from '@/lib/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  let errorMsg = null;
  try {
    await signIn('credentials', { 
      ...Object.fromEntries(formData), 
      redirect: false 
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          errorMsg = 'Identifiants incorrects.';
          break;
        default:
          errorMsg = 'Une erreur est survenue lors de la connexion.';
          break;
      }
    } else {
      throw error;
    }
  }

  if (errorMsg) {
    return { error: errorMsg };
  }

  const session = await auth();
  const role = session?.user?.role || 'EXECUTANT';

  const redirects: Record<string, string> = {
    SUPER_ADMIN: '/pilotage-administratif',
    ADMIN: '/pilotage-administratif',
    SUPERVISEUR: '/superviseur/dashboard',
    SECRETAIRE: '/secretaire/dashboard',
    EXECUTANT: '/home',
  };

  return { redirectUrl: redirects[role] || '/home' };
}
