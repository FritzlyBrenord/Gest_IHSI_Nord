import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const employee = await prisma.employer.findUnique({
      where: { id },
      include: { utilisateur: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
    }

    const formattedEmployee = {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      position: employee.poste,
      department: employee.department,
      hireDate: employee.dateEmbauche?.toISOString() || null,
      photoUrl: employee.utilisateur?.photoUrl || null,
      isActive: employee.isActive,
      isAdmin: employee.utilisateur?.role === 'ADMIN' || employee.utilisateur?.role === 'SUPER_ADMIN',
      userRole: employee.utilisateur?.role || null,
      attendances: [],
      eventAttendances: [],
      reportStats: {
        objectiveReportsCount: 0,
        assignedReportsCount: 0,
        writtenReportsCount: 0,
      },
      reportAssignments: [],
    };

    return NextResponse.json({ employee: formattedEmployee });
  } catch (error) {
    console.error('Erreur GET /api/employees/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { firstName, lastName, email, phone, position, department, hireDate, isActive } = body;

    const existingEmployer = await prisma.employer.findUnique({
      where: { id },
      include: { utilisateur: true },
    });

    if (!existingEmployer) {
      return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
    }

    if (email && email !== existingEmployer.email) {
      const emailTaken = await prisma.employer.findUnique({ where: { email } });
      if (emailTaken) {
        return NextResponse.json({ error: 'Cet email est déjà utilisé par un autre employé' }, { status: 400 });
      }
    }

    const updatedEmployer = await prisma.employer.update({
      where: { id },
      data: {
        firstName: firstName !== undefined ? firstName : existingEmployer.firstName,
        lastName: lastName !== undefined ? lastName : existingEmployer.lastName,
        email: email !== undefined ? email : existingEmployer.email,
        phone: phone !== undefined ? phone : existingEmployer.phone,
        poste: position !== undefined ? position : existingEmployer.poste,
        department: department !== undefined ? department : existingEmployer.department,
        dateEmbauche: hireDate !== undefined ? (hireDate ? new Date(hireDate) : null) : existingEmployer.dateEmbauche,
        isActive: isActive !== undefined ? isActive : existingEmployer.isActive,
      },
    });

    const updatedUtilisateur = existingEmployer.utilisateur
      ? await prisma.utilisateur.findUnique({ where: { employerId: updatedEmployer.id } })
      : null;

    const formattedUpdatedEmployee = {
      id: updatedEmployer.id,
      firstName: updatedEmployer.firstName,
      lastName: updatedEmployer.lastName,
      email: updatedEmployer.email,
      phone: updatedEmployer.phone,
      position: updatedEmployer.poste,
      department: updatedEmployer.department,
      hireDate: updatedEmployer.dateEmbauche?.toISOString() || null,
      photoUrl: updatedUtilisateur?.photoUrl || null,
      isActive: updatedEmployer.isActive,
    };

    return NextResponse.json({ employee: formattedUpdatedEmployee });
  } catch (error) {
    console.error('Erreur PUT /api/employees/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    await prisma.employer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE /api/employees/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
