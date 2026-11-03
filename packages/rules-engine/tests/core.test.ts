import { describe, expect, it } from "vitest";
import {
  abilityModifier, abilityModifiers, proficiencyBonus, validateAbilityScores,
  skillBonus, calculateSkillBonuses, calculateSavingThrows, savingThrowBonus,
  type AbilityScores,
} from "../src/index";

const scores: AbilityScores = {
  strength: 16, dexterity: 12, constitution: 14,
  intelligence: 10, wisdom: 10, charisma: 8,
};

describe("Características y competencia", () => {
  it("calcula modificadores incluidos puntuaciones negativas", () => {
    expect(abilityModifier(16)).toBe(3);
    expect(abilityModifier(15)).toBe(2);
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(1)).toBe(-5);
    expect(abilityModifier(30)).toBe(10);
  });
  it("rechaza puntuaciones inválidas", () => {
    for (const n of [0, 31, 1.5, NaN, Infinity]) expect(() => abilityModifier(n)).toThrow();
  });
  it("devuelve la competencia según tramos de nivel", () => {
    for (const [lvl, expected] of [[1,2],[4,2],[5,3],[8,3],[9,4],[13,5],[17,6],[20,6]]) {
      expect(proficiencyBonus(lvl)).toBe(expected);
    }
  });
  it("rechaza niveles inválidos", () => {
    for (const n of [0, 21, 2.1, NaN]) expect(() => proficiencyBonus(n)).toThrow();
  });
  it("comprueba las seis puntuaciones sin transformar el original", () => {
    const parsed = validateAbilityScores(scores);
    expect(parsed).toEqual(scores);
    expect(parsed).not.toBe(scores);
    expect(abilityModifiers(parsed).strength).toBe(3);
    expect(() => validateAbilityScores({ ...scores, luck: 15 })).toThrow();
    expect(() => validateAbilityScores({ ...scores, strength: 0 })).toThrow();
  });
});

describe("Habilidades y salvaciones", () => {
  it("calcula Atletismo con competencia de Guerrero nivel 1", () => {
    expect(skillBonus(scores, 1, "athletics", "proficient")).toBe(5);
    expect(skillBonus(scores, 1, "athletics")).toBe(3);
    expect(skillBonus(scores, 1, "athletics", "expertise")).toBe(7);
  });
  it("permite asociar una habilidad a otra característica por decisión del DM", () => {
    expect(skillBonus(scores, 1, "intimidation", "proficient", "strength")).toBe(5);
  });
  it("no duplica competencia concedida por dos fuentes", () => {
    const values = calculateSkillBonuses(scores, 1, { skills: ["athletics", "athletics"] });
    expect(values.athletics).toBe(5);
    expect(values.perception).toBe(0);
  });
  it("calcula salvación de Fuerza competente, Constitución competente y otras", () => {
    expect(savingThrowBonus(scores, 1, "strength", true)).toBe(5);
    const values = calculateSavingThrows(scores, 1, { savingThrows: ["strength", "constitution", "strength"] });
    expect(values.strength).toBe(5);
    expect(values.constitution).toBe(4);
    expect(values.dexterity).toBe(1);
  });
  it("rechaza pericia sin competencia", () => {
    expect(() => calculateSkillBonuses(scores, 1, { expertiseSkills: ["athletics"] })).toThrow();
  });
});
