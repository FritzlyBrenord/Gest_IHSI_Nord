"use client";

// ============================================================
// USE CURRENT USER HOOK — extrait de documents.tsx
// ============================================================

import { useState, useEffect } from "react";
import { useAuth } from "@/hook/useAuth";
import { UserInfo } from "./types";

export function useCurrentUser() {
  const { user, isSuperAdmin, isSuperviseur, isLoading } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [posteFetched, setPosteFetched] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setUserInfo(null);
      setPosteFetched(false);
      return;
    }
    
    const isAdmin = isSuperAdmin || isSuperviseur;
    
    // Si admin, utiliser les valeurs fixes
    if (isAdmin) {
      setUserInfo({ 
        name: "Elson PROPHETE, Ing, Adm", 
        role: "Doctorant en génie des ressources hydriques (ISTEAH)", 
        poste: "Doctorant en génie des ressources hydriques (ISTEAH)", 
        isAdmin: true 
      });
      return;
    }
    
    // Si user.poste existe, l'utiliser
    if (user.poste) {
      setUserInfo({ 
        name: user.name || 'Utilisateur', 
        role: user.poste, 
        poste: user.poste, 
        isAdmin: false 
      });
      return;
    }
    
    // Sinon, récupérer le poste depuis l'API (fallback)
    if (!posteFetched) {
      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          const poste = data.profile?.employer?.poste || 'Employé';
          setUserInfo({ 
            name: user.name || 'Utilisateur', 
            role: poste, 
            poste: poste, 
            isAdmin: false 
          });
          setPosteFetched(true);
        })
        .catch(err => {
          console.error('Erreur récupération poste:', err);
          setUserInfo({ 
            name: user.name || 'Utilisateur', 
            role: 'Employé', 
            poste: 'Employé', 
            isAdmin: false 
          });
          setPosteFetched(true);
        });
    }
  }, [user, isSuperAdmin, isSuperviseur, isLoading, posteFetched]);

  return userInfo;
}
