import type { FoodItem, Nutrition } from './types';

// Produktdaten per Barcode von Open Food Facts (kostenlos, offene Datenbank).

export interface Product {
  code: string;
  name: string;
  brand: string;
  per100: Nutrition; // pro 100 g bzw. 100 ml
  unit: 'g' | 'ml';
  servingGrams: number | null;
}

export class ProductNotFound extends Error {}

const FIELDS = 'product_name,product_name_de,generic_name_de,brands,nutriments,serving_quantity,quantity';

export async function lookupBarcode(code: string): Promise<Product> {
  let res: Response;
  try {
    res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  } catch {
    throw new Error('Keine Verbindung zu Open Food Facts. Bist du online?');
  }
  if (res.status === 404) throw new ProductNotFound();
  if (!res.ok) throw new Error(`Open Food Facts antwortet nicht (${res.status}).`);

  const data = await res.json();
  const p = data?.product;
  if (data?.status !== 1 || !p) throw new ProductNotFound();

  const n = p.nutriments ?? {};
  const val = (k: string) => Number(n[k]) || 0;
  const kcal = n['energy-kcal_100g'] != null ? val('energy-kcal_100g') : val('energy_100g') / 4.184;

  return {
    code,
    name: (p.product_name_de || p.product_name || p.generic_name_de || 'Unbekanntes Produkt').trim(),
    brand: String(p.brands ?? '').split(',')[0].trim(),
    per100: { kcal, protein: val('proteins_100g'), carbs: val('carbohydrates_100g'), fat: val('fat_100g') },
    unit: /\bml\b|\bl\b/i.test(String(p.quantity ?? '')) ? 'ml' : 'g',
    servingGrams: Number(p.serving_quantity) > 0 ? Number(p.serving_quantity) : null,
  };
}

/** Rechnet ein Produkt auf eine bestimmte Menge (g/ml) um. */
export function productPortion(p: Product, amount: number): FoodItem {
  const f = amount / 100;
  return {
    name: p.brand ? `${p.name} (${p.brand})` : p.name,
    portion: `${amount} ${p.unit}`,
    kcal: Math.round(p.per100.kcal * f),
    protein: p.per100.protein * f,
    carbs: p.per100.carbs * f,
    fat: p.per100.fat * f,
  };
}
