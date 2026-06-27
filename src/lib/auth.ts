// auth.ts (à la racine)
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";

// Extension des types
declare module "next-auth" {
  interface User {
    role: Role;
    employerId: string;
    photoUrl?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      employerId: string;
      photoUrl?: string | null;
    }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("❌ Email ou mot de passe manquant");
            return null;
          }

          const email = credentials.email.toString().toLowerCase();
          const password = credentials.password.toString();

          console.log("🔍 Tentative de connexion pour:", email);

          // ✅ Vérification super admin
          const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
          const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

          if (superAdminEmail && superAdminPassword && email === superAdminEmail) {
            if (password === superAdminPassword) {
              console.log("✅ Connexion super admin réussie");
              return {
                id: "super-admin",
                email,
                name: "Super Administrateur",
                role: "SUPER_ADMIN" as Role,
                employerId: "super-admin-id",
                photoUrl: null,
              };
            }
            console.log("❌ Mot de passe super admin incorrect");
            return null;
          }

          // ✅ Recherche utilisateur
          const utilisateur = await prisma.utilisateur.findUnique({
            where: { email },
            include: { employer: true },
          });

          if (!utilisateur) {
            console.log("❌ Utilisateur non trouvé:", email);
            return null;
          }

          console.log("✅ Utilisateur trouvé:", utilisateur.email);

          // ✅ Vérification mot de passe
          const isValid = await bcrypt.compare(password, utilisateur.password);
          if (!isValid) {
            console.log("❌ Mot de passe incorrect pour:", email);
            return null;
          }

          console.log("✅ Connexion réussie pour:", email);

          return {
            id: utilisateur.id,
            email: utilisateur.email,
            name: `${utilisateur.employer.firstName} ${utilisateur.employer.lastName}`,
            role: utilisateur.role,
            employerId: utilisateur.employerId,
            photoUrl: utilisateur.photoUrl,
          };
        } catch (error) {
          console.error("❌ Erreur dans authorize:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.employerId = user.employerId;
       
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.employerId = token.employerId as string;
   
        session.user.photoUrl = null;
      }
      return session;
    },
  },
});
