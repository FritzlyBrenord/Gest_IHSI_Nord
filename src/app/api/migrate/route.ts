import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Objective"
          ADD CONSTRAINT "Objective_employeeId_fkey"
          FOREIGN KEY ("employeeId") REFERENCES "Employer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      `);
    } catch {}

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Objective"
          ADD CONSTRAINT "Objective_equipeId_fkey"
          FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      `);
    } catch {}

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Objective"
          ADD CONSTRAINT "Objective_inheritedFromId_fkey"
          FOREIGN KEY ("inheritedFromId") REFERENCES "Objective"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      `);
    } catch {}

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
    } catch {}

    return NextResponse.json({ success: true, message: 'Table Objective prête !' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
