// Unambiguous alphabet (no 0/O, 1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 6, rng: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  return out;
}

export function isRoomCode(s: string): boolean {
  return new RegExp(`^[${ALPHABET}]{4,12}$`).test(s);
}
