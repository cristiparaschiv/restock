/**
 * Utility functions for parsing, scaling, and formatting ingredient amounts
 */

// Keywords that indicate an amount should NOT be scaled
const NON_SCALABLE_KEYWORDS = [
  // English
  'to taste', 'pinch', 'as needed', 'optional', 'for garnish', 'for serving',
  'some', 'few', 'handful',
  // Romanian
  'la gust', 'după gust', 'un praf', 'după nevoie', 'opțional', 'pentru decor',
  'pentru servire', 'puțin', 'câteva',
];

// Units/ingredients that are count-based and should be rounded to whole numbers
const COUNT_BASED_UNITS = [
  // English
  'clove', 'cloves', 'egg', 'eggs', 'can', 'cans', 'slice', 'slices',
  'piece', 'pieces', 'sheet', 'sheets', 'stalk', 'stalks', 'sprig', 'sprigs',
  'leaf', 'leaves', 'head', 'heads', 'bunch', 'bunches', 'package', 'packages',
  'strip', 'strips', 'cube', 'cubes', 'fillet', 'fillets', 'breast', 'breasts',
  'thigh', 'thighs', 'wing', 'wings', 'drumstick', 'drumsticks', 'link', 'links',
  'patty', 'patties', 'stick', 'sticks', 'bag', 'bags', 'box', 'boxes',
  'tortilla', 'tortillas', 'noodle', 'noodles',
  // Romanian
  'cățel', 'căței', 'ou', 'ouă', 'conservă', 'conserve', 'felie', 'felii',
  'bucată', 'bucăți', 'foaie', 'foi', 'tulpină', 'tulpini', 'fir', 'fire',
  'frunză', 'frunze', 'căpățână', 'căpățâni', 'legătură', 'legături',
  'pachet', 'pachete',
];

/**
 * Check if an amount string can be scaled
 */
export function isScalable(amount: string | null | undefined): boolean {
  if (!amount) return false;
  const lower = amount.toLowerCase().trim();
  return !NON_SCALABLE_KEYWORDS.some(keyword => lower.includes(keyword));
}

/**
 * Check if a unit or ingredient name is count-based (should be rounded to whole numbers)
 */
export function isCountBased(unit: string | null | undefined, name: string | null | undefined): boolean {
  const checkStr = `${unit || ''} ${name || ''}`.toLowerCase();
  return COUNT_BASED_UNITS.some(countUnit => checkStr.includes(countUnit));
}

/**
 * Parse a string amount into a number
 * Handles: "1.5", "2 1/2", "1/4", "3", "0.75"
 * Returns null if unparseable
 */
export function parseAmount(amountStr: string | null | undefined): number | null {
  if (!amountStr) return null;

  const str = amountStr.trim();
  if (!str) return null;

  // Mixed number: "1 1/2", "2 3/4"
  const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const numerator = parseInt(mixedMatch[2], 10);
    const denominator = parseInt(mixedMatch[3], 10);
    if (denominator === 0) return null;
    return whole + (numerator / denominator);
  }

  // Simple fraction: "1/2", "3/4"
  const fracMatch = str.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const numerator = parseInt(fracMatch[1], 10);
    const denominator = parseInt(fracMatch[2], 10);
    if (denominator === 0) return null;
    return numerator / denominator;
  }

  // Range: "2-3" - take the first number
  const rangeMatch = str.match(/^(\d+(?:[.,]\d+)?)\s*-\s*\d+/);
  if (rangeMatch) {
    return parseFloat(rangeMatch[1].replace(',', '.'));
  }

  // Simple decimal or integer: "1.5", "2", "0.75"
  // Also handle comma as decimal separator
  const cleanStr = str.replace(',', '.');
  const num = parseFloat(cleanStr);

  if (!isNaN(num) && isFinite(num)) {
    return num;
  }

  return null;
}

/**
 * Common fractions for nice display
 */
const FRACTION_MAP: [number, string][] = [
  [0.125, '1/8'],
  [0.25, '1/4'],
  [0.333, '1/3'],
  [0.375, '3/8'],
  [0.5, '1/2'],
  [0.625, '5/8'],
  [0.666, '2/3'],
  [0.75, '3/4'],
  [0.875, '7/8'],
];

/**
 * Format a number as a nice string
 * Converts to fractions where applicable
 * @param value - the numeric value
 * @param roundToWhole - if true, rounds to nearest whole number (for count-based items)
 */
export function formatAmount(value: number, roundToWhole: boolean = false): string {
  if (value <= 0) return '0';

  // For count-based items, round to nearest whole number
  if (roundToWhole) {
    return String(Math.round(value));
  }

  const whole = Math.floor(value);
  const decimal = value - whole;

  // Check if decimal is close to a common fraction
  for (const [frac, str] of FRACTION_MAP) {
    if (Math.abs(decimal - frac) < 0.04) {
      if (whole > 0) {
        return `${whole} ${str}`;
      }
      return str;
    }
  }

  // If decimal is very close to 0, just return whole number
  if (decimal < 0.04) {
    return String(whole);
  }

  // If decimal is very close to 1, round up
  if (decimal > 0.96) {
    return String(whole + 1);
  }

  // Otherwise, return decimal with up to 2 decimal places
  // Remove trailing zeros
  const formatted = value.toFixed(2).replace(/\.?0+$/, '');
  return formatted;
}

/**
 * Scale an amount string by a factor
 * Returns the original string if not scalable or unparseable
 * @param amount - the amount string to scale
 * @param scaleFactor - the multiplier
 * @param unit - optional unit (used to detect count-based items)
 * @param name - optional ingredient name (used to detect count-based items)
 */
export function scaleAmount(
  amount: string | null | undefined,
  scaleFactor: number,
  unit?: string | null,
  name?: string | null
): string | null {
  if (!amount) return null;
  if (!isScalable(amount)) return amount;

  const parsed = parseAmount(amount);
  if (parsed === null) return amount;

  const scaled = parsed * scaleFactor;
  const shouldRound = isCountBased(unit, name);
  return formatAmount(scaled, shouldRound);
}

/**
 * Calculate scale factor from original and target servings
 */
export function getScaleFactor(
  originalServings: number | null | undefined,
  targetServings: number
): number {
  if (!originalServings || originalServings <= 0) return 1;
  if (targetServings <= 0) return 1;
  return targetServings / originalServings;
}
