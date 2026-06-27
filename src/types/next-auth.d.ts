import { Role } from "@prisma/client";
import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: Role;
    employerId: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      employerId: string;
    } & DefaultSession["user"];
  }
}
