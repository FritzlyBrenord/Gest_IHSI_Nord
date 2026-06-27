/**
 * Script de migration manuel — crée la table Objective en base
 * Utilise le client Prisma (qui passe par le pool HTTPS de Neon)
 * Usage : npx tsx src/scripts/migrate-objective.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Création de la table Objective...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Objective" (
      "id"              TEXT NOT NULL,
      "title"           TEXT NOT NULL,
      "description"     TEXT,
      "assigneeType"    TEXT NOT NULL,
      "employeeId"      TEXT,
      "equipeId"        TEXT,
      "objectivePlans"  JSONB NOT NULL DEFAULT '[]',
      "isEvaluated"     BOOLEAN NOT NULL DEFAULT false,
      "evaluatedAt"     TIMESTAMP(3),
      "inheritedFromId" TEXT,
      "notifyAssignees" BOOLEAN NOT NULL DEFAULT true,
      "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
    );
  `);

  // Clés étrangères (ignorées si déjà existantes)
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Objective"
        ADD CONSTRAINT "Objective_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `);
    console.log('✅ FK employeeId ajoutée');
  } catch { console.log('ℹ️  FK employeeId déjà existante'); }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Objective"
        ADD CONSTRAINT "Objective_equipeId_fkey"
        FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `);
    console.log('✅ FK equipeId ajoutée');
  } catch { console.log('ℹ️  FK equipeId déjà existante'); }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Objective"
        ADD CONSTRAINT "Objective_inheritedFromId_fkey"
        FOREIGN KEY ("inheritedFromId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `);
    console.log('✅ FK inheritedFromId ajoutée');
  } catch { console.log('ℹ️  FK inheritedFromId déjà existante'); }

  // Trigger pour mettre à jour updatedAt automatiquement
  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION update_objective_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW."updatedAt" = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS objective_updated_at ON "Objective";
      CREATE TRIGGER objective_updated_at
        BEFORE UPDATE ON "Objective"
        FOR EACH ROW EXECUTE PROCEDURE update_objective_updated_at();
    `);
    console.log('✅ Trigger updatedAt créé');
  } catch (e) { console.log('ℹ️  Trigger:', e); }

  console.log('✅ Table Objective prête !');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Erreur migration:', e);
  process.exit(1);
});
