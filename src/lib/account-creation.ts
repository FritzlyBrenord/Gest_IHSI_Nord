import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export class AccountCreationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AccountCreationError';
    this.statusCode = statusCode;
  }
}

export type EmployerWithAccount = Prisma.EmployerGetPayload<{
  include: { utilisateur: true };
}>;

export async function createUtilisateurForEmployer(
  employer: EmployerWithAccount,
  password: string,
  role?: Role
) {
  if (!password || password.length < 6) {
    throw new AccountCreationError('Mot de passe invalide', 400);
  }

  if (!employer.isActive) {
    throw new AccountCreationError('Compte employé inactif, création impossible', 403);
  }

  if (employer.utilisateur) {
    throw new AccountCreationError('Un compte est déjà activé pour cet email', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.utilisateur.create({
    data: {
      email: employer.email,
      password: hashedPassword,
      employerId: employer.id,
      role: role ?? employer.role,
    },
  });
}
