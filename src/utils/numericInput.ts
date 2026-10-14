// A finite upper bound prevents pasted exponents/huge values from poisoning totals.
export const MAX_INPUT_VALUE = 1_000_000_000;

export function parseNumericInput(raw: string, max = MAX_INPUT_VALUE): { text: string; value: number } | null {
  const text = raw.replace(/\s/g, '').replace(',', '.');
  if (text === '') return { text: '', value: 0 };
  if (!/^-?\d*\.?\d*$/.test(text) || text === '-') return null;
  const normalized = text.replace(/^0+(?=\d)/, '').replace(/^\./, '0.');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value > max) return null;
  if (value < 0) return { text: '0', value: 0 };
  return { text: normalized, value };
}
