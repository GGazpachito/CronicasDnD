import { describe, expect, it } from "vitest";
import { abilityModifier } from "../src/index";
describe("abilityModifier", () => {
  it("calcula puntuaciones pares e impares", () => { expect(abilityModifier(16)).toBe(3); expect(abilityModifier(15)).toBe(2); expect(abilityModifier(8)).toBe(-1); });
  it("rechaza entradas inválidas", () => { expect(() => abilityModifier(NaN)).toThrow(); });
});
