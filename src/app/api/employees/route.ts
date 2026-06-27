import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const where: Prisma.EmployerWhereInput = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { poste: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) {
      where.department = { equals: department, mode: 'insensitive' };
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const [employees, total] = await Promise.all([
      prisma.employer.findMany({
        where,
        include: { utilisateur: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employer.count({ where }),
    ]);

    const formattedEmployees = employees.map((emp) => ({
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      position: emp.poste,
      department: emp.department,
      hireDate: emp.dateEmbauche?.toISOString() || null,
      photoUrl: emp.utilisateur?.photoUrl || null,
      isActive: emp.isActive,
      isAdmin: emp.utilisateur?.role === 'ADMIN' || emp.utilisateur?.role === 'SUPER_ADMIN',
      userRole: emp.utilisateur?.role || null,
    }));

    return NextResponse.json({
      employees: formattedEmployees,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur GET /api/employees:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, position, department, hireDate } = body;

    if (!firstName || !lastName || !email || !position || !department) {
      return NextResponse.json({ error: 'Tous les champs obligatoires ne sont pas remplis' }, { status: 400 });
    }

    const existingEmployer = await prisma.employer.findUnique({
      where: { email },
    });

    if (existingEmployer) {
      return NextResponse.json({ error: 'Un employé avec cet email existe déjà' }, { status: 400 });
    }

    const employer = await prisma.employer.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        poste: position,
        department,
        dateEmbauche: hireDate ? new Date(hireDate) : null,
        isActive: true,
      },
    });

    return NextResponse.json(employer, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/employees:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
