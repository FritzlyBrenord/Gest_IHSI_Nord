import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  // Cast user to bypass strict next-auth typings
  const user = session?.user as any;

  return {
    user,
    role: user?.role,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    isAdmin: user?.role === "SUPER_ADMIN" || user?.role === "ADMIN",
    isSuperAdmin: user?.role === "SUPER_ADMIN",
    isSuperviseur: user?.role === "SUPERVISEUR",
    isSecretaire: user?.role === "SECRETAIRE",
    isExecutant: user?.role === "EXECUTANT",
  };
}