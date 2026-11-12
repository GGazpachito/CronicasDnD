import { describe, expect, it } from 'vitest';
import { rollDie } from '../src/dice';

describe('Actualización 39: dados manuales genéricos', () => {
  it('permite comprobar el dado con una fuente determinista', () => {
    expect(rollDie(10, () => 1)).toBe(1);
    expect(rollDie(10, () => 10)).toBe(10);
    expect(rollDie(20, () => 17)).toBe(17);
  });
  it('rechaza resultados fuera de rango', () => {
    for (const value of [0, 11, -1, 1.5, Number.NaN]) {
      expect(() => rollDie(10, () => value)).toThrow();
    }
  });
  it('rechaza dados inválidos', () => {
    for (const sides of [0, 1, 2.5, 1001, Number.NaN]) {
      expect(() => rollDie(sides, () => 1)).toThrow();
    }
  });
  it('con Web Crypto obtiene un entero dentro del intervalo', () => {
    for (let i = 0; i < 30; i++) {
      const result = rollDie(10);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    }
  });
});
