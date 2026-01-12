/**
 * Unit conversion utilities for ingredients
 * Converts between metric and imperial units
 */

import { Ingredient } from '@/types';
import { parseAmount, formatAmount } from './amount-utils';

export type UnitSystem = 'metric' | 'imperial';

interface ConversionRule {
  from: string;
  to: string;
  factor: number;
  type: 'volume' | 'weight';
}

// Conversion rules: multiply 'from' amount by 'factor' to get 'to' amount
// e.g., 1 cup * 236.588 = 236.588 ml
const CONVERSIONS: ConversionRule[] = [
  // Volume: Imperial to Metric
  { from: 'tsp', to: 'ml', factor: 4.929, type: 'volume' },
  { from: 'teaspoon', to: 'ml', factor: 4.929, type: 'volume' },
  { from: 'tbsp', to: 'ml', factor: 14.787, type: 'volume' },
  { from: 'tablespoon', to: 'ml', factor: 14.787, type: 'volume' },
  { from: 'cup', to: 'ml', factor: 236.588, type: 'volume' },
  { from: 'cups', to: 'ml', factor: 236.588, type: 'volume' },
  { from: 'fl oz', to: 'ml', factor: 29.574, type: 'volume' },
  { from: 'pint', to: 'ml', factor: 473.176, type: 'volume' },
  { from: 'quart', to: 'ml', factor: 946.353, type: 'volume' },
  { from: 'gallon', to: 'l', factor: 3.785, type: 'volume' },

  // Volume: Metric to Imperial
  { from: 'ml', to: 'tbsp', factor: 0.0676, type: 'volume' },
  { from: 'l', to: 'cup', factor: 4.227, type: 'volume' },
  { from: 'liter', to: 'cup', factor: 4.227, type: 'volume' },
  { from: 'litre', to: 'cup', factor: 4.227, type: 'volume' },

  // Weight: Imperial to Metric
  { from: 'oz', to: 'g', factor: 28.35, type: 'weight' },
  { from: 'ounce', to: 'g', factor: 28.35, type: 'weight' },
  { from: 'ounces', to: 'g', factor: 28.35, type: 'weight' },
  { from: 'lb', to: 'kg', factor: 0.454, type: 'weight' },
  { from: 'lbs', to: 'kg', factor: 0.454, type: 'weight' },
  { from: 'pound', to: 'kg', factor: 0.454, type: 'weight' },
  { from: 'pounds', to: 'kg', factor: 0.454, type: 'weight' },

  // Weight: Metric to Imperial
  { from: 'g', to: 'oz', factor: 0.0353, type: 'weight' },
  { from: 'gram', to: 'oz', factor: 0.0353, type: 'weight' },
  { from: 'grams', to: 'oz', factor: 0.0353, type: 'weight' },
  { from: 'kg', to: 'lb', factor: 2.205, type: 'weight' },
  { from: 'kilogram', to: 'lb', factor: 2.205, type: 'weight' },
  { from: 'kilograms', to: 'lb', factor: 2.205, type: 'weight' },
];

// Units that are metric
const METRIC_UNITS = ['ml', 'l', 'liter', 'litre', 'g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms'];

// Units that are imperial (sorted by length descending for matching)
const IMPERIAL_UNITS = ['tablespoon', 'teaspoon', 'kilograms', 'kilogram', 'ounces', 'ounce', 'pounds', 'pound', 'gallon', 'quart', 'pint', 'tbsp', 'cups', 'cup', 'tsp', 'lbs', 'fl oz', 'oz', 'lb'];

/**
 * Extract the base unit from a unit string that may contain extra words
 * e.g., "tbsp dry" → "tbsp", "cups packed" → "cups"
 */
function extractBaseUnit(unit: string): string | null {
  const lower = unit.toLowerCase().trim();

  // Check metric units first
  for (const metricUnit of METRIC_UNITS) {
    if (lower === metricUnit || lower.startsWith(metricUnit + ' ')) {
      return metricUnit;
    }
  }

  // Check imperial units (sorted by length to match longer ones first)
  for (const imperialUnit of IMPERIAL_UNITS) {
    if (lower === imperialUnit || lower.startsWith(imperialUnit + ' ')) {
      return imperialUnit;
    }
  }

  return null;
}

/**
 * Determine if a unit is metric, imperial, or neither
 */
export function getUnitSystem(unit: string | null | undefined): UnitSystem | null {
  if (!unit) return null;
  const baseUnit = extractBaseUnit(unit);
  if (!baseUnit) return null;
  if (METRIC_UNITS.includes(baseUnit)) return 'metric';
  if (IMPERIAL_UNITS.includes(baseUnit)) return 'imperial';
  return null;
}

/**
 * Find a conversion rule for a unit
 */
function findConversion(unit: string, targetSystem: UnitSystem): ConversionRule | null {
  const baseUnit = extractBaseUnit(unit);
  if (!baseUnit) return null;

  const currentSystem = getUnitSystem(unit);

  // If already in target system or unknown, no conversion needed
  if (currentSystem === null || currentSystem === targetSystem) return null;

  // Find a conversion rule using the base unit
  return CONVERSIONS.find(c => c.from.toLowerCase() === baseUnit) || null;
}

/**
 * Round to a sensible cooking measurement
 */
function roundForCooking(amount: number, unit: string): number {
  // For metric volume (ml, l)
  if (unit === 'ml') {
    if (amount >= 100) return Math.round(amount / 10) * 10; // Round to nearest 10
    if (amount >= 15) return Math.round(amount / 5) * 5;    // Round to nearest 5
    return Math.round(amount);                               // Round to nearest 1
  }
  if (unit === 'l') {
    if (amount >= 1) return Math.round(amount * 10) / 10;   // Round to 0.1
    return Math.round(amount * 100) / 100;                   // Round to 0.01
  }

  // For metric weight (g, kg)
  if (unit === 'g') {
    if (amount >= 100) return Math.round(amount / 10) * 10; // Round to nearest 10
    if (amount >= 10) return Math.round(amount / 5) * 5;    // Round to nearest 5
    return Math.round(amount);                               // Round to nearest 1
  }
  if (unit === 'kg') {
    if (amount >= 1) return Math.round(amount * 10) / 10;   // Round to 0.1
    return Math.round(amount * 100) / 100;                   // Round to 0.01
  }

  // For imperial, round to reasonable precision
  if (unit === 'oz' || unit === 'lb') {
    return Math.round(amount * 4) / 4; // Round to nearest 0.25
  }

  return Math.round(amount * 100) / 100; // Default: 2 decimal places
}

/**
 * Convert an amount from one unit to another
 */
export function convertUnit(
  amount: number,
  fromUnit: string,
  targetSystem: UnitSystem
): { amount: number; unit: string } | null {
  const conversion = findConversion(fromUnit, targetSystem);
  if (!conversion) return null;

  const convertedAmount = amount * conversion.factor;

  // Simplify large/small metric amounts
  let finalAmount = convertedAmount;
  let finalUnit = conversion.to;

  if (targetSystem === 'metric') {
    // Convert ml to l if >= 1000
    if (finalUnit === 'ml' && finalAmount >= 1000) {
      finalAmount = finalAmount / 1000;
      finalUnit = 'l';
    }
    // Convert g to kg if >= 1000
    if (finalUnit === 'g' && finalAmount >= 1000) {
      finalAmount = finalAmount / 1000;
      finalUnit = 'kg';
    }
  }

  if (targetSystem === 'imperial') {
    // Convert tbsp to cups if >= 16
    if (finalUnit === 'tbsp' && finalAmount >= 16) {
      finalAmount = finalAmount / 16;
      finalUnit = 'cups';
    }
    // Convert oz to lb if >= 16
    if (finalUnit === 'oz' && finalAmount >= 16) {
      finalAmount = finalAmount / 16;
      finalUnit = 'lb';
    }
  }

  // Round to practical cooking measurements
  finalAmount = roundForCooking(finalAmount, finalUnit);

  return { amount: finalAmount, unit: finalUnit };
}

/**
 * Convert an ingredient to the target unit system
 * Returns null if conversion not applicable (e.g., "pieces", "cloves")
 */
export function convertIngredient(
  ingredient: Ingredient,
  targetSystem: UnitSystem
): Ingredient {
  const { amount, unit, name } = ingredient;

  // If no unit or amount, return as-is
  if (!unit || !amount) return ingredient;

  // Extract base unit and any extra words (e.g., "tbsp dry" → "tbsp", "dry")
  const baseUnit = extractBaseUnit(unit);
  if (!baseUnit) return ingredient;

  // Check if unit is convertible
  const currentSystem = getUnitSystem(unit);
  if (currentSystem === null || currentSystem === targetSystem) {
    // Not a convertible unit or already in target system
    return ingredient;
  }

  // Parse the amount
  const parsedAmount = parseAmount(amount);
  if (parsedAmount === null) return ingredient;

  // Convert
  const converted = convertUnit(parsedAmount, unit, targetSystem);
  if (!converted) return ingredient;

  // Preserve any extra words from the original unit by prepending to name
  const extraWords = unit.toLowerCase().trim().slice(baseUnit.length).trim();
  const newName = extraWords ? `${extraWords} ${name}` : name;

  return {
    ...ingredient,
    amount: formatAmount(converted.amount),
    unit: converted.unit,
    name: newName,
  };
}

/**
 * Check if an ingredient can be converted
 */
export function canConvert(unit: string | null | undefined): boolean {
  if (!unit) return false;
  return getUnitSystem(unit) !== null;
}
