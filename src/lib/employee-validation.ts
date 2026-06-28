const NAME_PATTERN = /^\p{L}[\p{L}\s'-]*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HAITI_PHONE_PREFIX = '+509';
const HAITI_PHONE_DIGIT_COUNT = 8;

export type EmployeeValidationInput = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  poste?: string | null;
  department?: string | null;
  hireDate?: string | null;
};

export type EmployeeValidationResult = {
  ok: true;
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    poste: string;
    department: string;
    hireDate: string | null;
  };
} | {
  ok: false;
  error: string;
  code:
    | 'INVALID_FIRST_NAME'
    | 'INVALID_LAST_NAME'
    | 'INVALID_EMAIL'
    | 'INVALID_PHONE'
    | 'MISSING_poste'
    | 'MISSING_DEPARTMENT'
    | 'INVALID_HIRE_DATE';
};

function normalizeName(value: string | null | undefined) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeEmail(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeHaitiPhone(value: string | null | undefined) {
  const digits = String(value || '').replace(/\D/g, '');
  const withoutCountryCode = digits.startsWith('509') ? digits.slice(3) : digits;
  const limitedDigits = withoutCountryCode.slice(0, HAITI_PHONE_DIGIT_COUNT);

  return {
    formatted: limitedDigits ? `${HAITI_PHONE_PREFIX}${limitedDigits}` : '',
    digits: limitedDigits,
    complete: limitedDigits.length === HAITI_PHONE_DIGIT_COUNT,
  };
}

function parseHireDate(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const isoDateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnlyMatch) {
    const [, year, month, day] = isoDateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function validateEmployeeInput(input: EmployeeValidationInput): EmployeeValidationResult {
  const firstName = normalizeName(input.firstName);
  if (!firstName || !NAME_PATTERN.test(firstName)) {
    return { ok: false, error: 'Prénom invalide', code: 'INVALID_FIRST_NAME' };
  }

  const lastName = normalizeName(input.lastName);
  if (!lastName || !NAME_PATTERN.test(lastName)) {
    return { ok: false, error: 'Nom invalide', code: 'INVALID_LAST_NAME' };
  }

  const email = normalizeEmail(input.email);
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Email incorrect', code: 'INVALID_EMAIL' };
  }

  const normalizedPhone = normalizeHaitiPhone(input.phone);
  if (String(input.phone || '').trim() && !normalizedPhone.complete) {
    return {
      ok: false,
      error: 'Ajoutez un numero de telephone valable pour Haiti',
      code: 'INVALID_PHONE',
    };
  }

  const poste = String(input.poste || '').trim();
  if (!poste) {
    return { ok: false, error: 'Poste obligatoire', code: 'MISSING_poste' };
  }

  const department = String(input.department || '').trim();
  if (!department) {
    return { ok: false, error: 'Departement obligatoire', code: 'MISSING_DEPARTMENT' };
  }

  const rawHireDate = String(input.hireDate || '').trim();
  let hireDate: string | null = null;
  if (rawHireDate) {
    const parsedDate = parseHireDate(rawHireDate);
    if (!parsedDate) {
      return { ok: false, error: "Date d'embauche invalide", code: 'INVALID_HIRE_DATE' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate.getTime() > today.getTime()) {
      return {
        ok: false,
        error: "La date d'embauche ne peut pas etre dans le futur",
        code: 'INVALID_HIRE_DATE',
      };
    }

    hireDate = parsedDate.toISOString();
  }

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      email,
      phone: normalizedPhone.complete ? normalizedPhone.formatted : null,
      poste,
      department,
      hireDate,
    },
  };
}
