const FRENCH_MONTHS: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
  décembre: 11,
};

function normalizeFrenchMonthName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function parseDocumentDate(input?: string | null): Date | null {
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const cleaned = trimmed
    .replace(/^.*?\b(?:le|du)\b\s+/i, '')
    .replace(/^[A-Za-zÀ-ÿ\-\s]+,\s*/u, '')
    .trim();

  const frenchMatch = cleaned.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ\-]+)\s+(\d{4})$/u);
  if (frenchMatch) {
    const day = Number(frenchMatch[1]);
    const monthName = normalizeFrenchMonthName(frenchMatch[2]);
    const year = Number(frenchMatch[3]);
    const month = FRENCH_MONTHS[monthName];
    if (month !== undefined) {
      const parsed = new Date(year, month, day);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  const fallback = new Date(cleaned);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
