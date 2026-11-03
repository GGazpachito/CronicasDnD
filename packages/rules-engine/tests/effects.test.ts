import { describe, expect, it } from "vitest";
import { applyMechanicalEffects, parseMechanicalEffect, type AbilityScores } from "../src/index";

const scores: AbilityScores = {
  strength: 16, dexterity: 12, constitution: 14,
  intelligence: 10, wisdom: 10, charisma: 8,
};
const increase = (effectId: string, amount = 1, cap = 20) => ({
  effectId, sourceRevisionId: "feat:test@2024-r1", when: { type: "always" },
  type: "ability_increase", params: { ability: "strength", amount, cap },
});
const grant = (effectId: string, kind: string, id: string) => ({
  effectId, sourceRevisionId: "class:fighter@2024-r1", when: { type: "always" },
  type: "grant_proficiency", params: { kind, id },
});
const evaluate = (effects: unknown[], opts: Record<string, number> = {}) => applyMechanicalEffects({
  baseAbilities: scores, characterLevel: 1, effects, context: { classLevels: opts },
});

describe("Efectos declarativos 0.2", () => {
  it("aumenta característica y recalcula Atletismo sin mutar base", () => {
    const input = increase("feat-str", 2);
    const result = evaluate([input]);
    expect(result.abilityScores.strength).toBe(18);
    expect(result.skillBonuses.athletics).toBe(4);
    expect(scores.strength).toBe(16);
    expect(input.params.amount).toBe(2);
  });
  it("respeta límite y no duplica competencia desde distintas fuentes", () => {
    const result = evaluate([increase("one", 5, 18), grant("a", "skill", "athletics"), grant("b", "skill", "athletics")]);
    expect(result.abilityScores.strength).toBe(18);
    expect(result.skillBonuses.athletics).toBe(6);
    expect(result.proficiencies.skills).toEqual(["athletics"]);
  });
  it("concede competencia en salvación sin duplicarla", () => {
    const result = evaluate([grant("str-1", "saving_throw", "strength"), grant("str-2", "saving_throw", "strength")]);
    expect(result.savingThrowBonuses.strength).toBe(5);
  });
  it("aplica condición de nivel de clase", () => {
    const conditional = { ...increase("level-gate"), when: { type: "class_level_at_least", classId: "class:fighter", value: 3 } };
    expect(evaluate([conditional], { "class:fighter": 2 }).abilityScores.strength).toBe(16);
    expect(evaluate([conditional], { "class:fighter": 3 }).abilityScores.strength).toBe(17);
  });
  it("rechaza funciones, tipos desconocidos, campos extra y valores fuera de rango", () => {
    expect(() => parseMechanicalEffect({ ...increase("bad"), code: "eval(...)" })).toThrow();
    expect(() => parseMechanicalEffect({ ...increase("bad"), params: { ability: "strength", amount: -1, cap: 20 } })).toThrow();
    expect(() => parseMechanicalEffect({ ...increase("bad"), type: "run_javascript" })).toThrow();
    expect(() => parseMechanicalEffect(grant("bad", "skill", "unknown"))).toThrow();
    expect(() => parseMechanicalEffect({ ...increase("bad"), when: { type: "random" } })).toThrow();
  });
  it("rechaza efectos repetidos y listas excesivas", () => {
    expect(() => evaluate([increase("same"), increase("same")])).toThrow();
    expect(() => evaluate(Array.from({ length: 501 }, (_, i) => increase(`x${i}`)))).toThrow();
  });
  it("produce el mismo resultado en evaluaciones idénticas", () => {
    expect(evaluate([increase("same"), grant("skill", "skill", "athletics")]))
      .toEqual(evaluate([increase("same"), grant("skill", "skill", "athletics")]));
  });
});
