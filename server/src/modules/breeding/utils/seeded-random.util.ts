import { createHash, randomBytes } from 'crypto';

export class SeededRandom {
  private state: number;

  constructor(public readonly seed: string) {
    this.state = this.hashSeed(seed);
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    this.state = t >>> 0;
    return value;
  }

  int(min: number, max: number): number {
    const low = Math.ceil(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    return low + Math.floor(this.next() * (high - low + 1));
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(rate: number): boolean {
    return this.next() < Math.max(0, Math.min(1, Number(rate || 0)));
  }

  pick<T>(items: readonly T[]): T | null {
    if (!items.length) return null;
    return items[Math.floor(this.next() * items.length)] || null;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(0, index);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  weighted<T extends { weight: number }>(items: readonly T[]): T | null {
    const valid = items.filter((item) => Number(item.weight || 0) > 0);
    if (!valid.length) return null;

    const total = valid.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    let roll = this.next() * total;

    for (const item of valid) {
      roll -= Number(item.weight || 0);
      if (roll <= 0) return item;
    }

    return valid[valid.length - 1] || null;
  }

  private hashSeed(seed: string): number {
    const digest = createHash('sha256').update(String(seed)).digest();
    return digest.readUInt32LE(0) || 0x12345678;
  }
}

export function createRandomSeed(prefix = 'petverse'): string {
  return `${prefix}-${Date.now()}-${randomBytes(8).toString('hex')}`;
}
