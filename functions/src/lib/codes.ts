import { randomInt } from 'node:crypto';

/** Join-code / referral alphabet: A-Z and 2-9 without the look-alikes I, O, 0, 1. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type RandomInt = (maxExclusive: number) => number;
const cryptoRandom: RandomInt = (max) => randomInt(max);

export function generateCode(length = 6, rand: RandomInt = cryptoRandom): string {
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[rand(CODE_ALPHABET.length)];
  return out;
}

/** "Prince Driving School, Pune!" → "prince-driving-school-pune" */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return slug || 'school';
}

/** Candidate slugs tried in order until one is free. */
export function slugCandidates(name: string, city: string, rand: RandomInt = cryptoRandom): string[] {
  const base = slugify(name);
  const withCity = slugify(`${name} ${city}`);
  const list = [base];
  if (withCity !== base) list.push(withCity);
  for (let i = 0; i < 3; i++) list.push(`${base}-${generateCode(4, rand).toLowerCase()}`);
  return list;
}

/** "Prince Driving School" → "PDS". 2-4 letters; falls back to "STR". */
export function receiptPrefixFromName(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let prefix = words.map((w) => w[0]).join('').slice(0, 4);
  if (prefix.length < 2) prefix = (words[0] ?? '').slice(0, 3);
  return prefix.length >= 2 ? prefix : 'STR';
}
