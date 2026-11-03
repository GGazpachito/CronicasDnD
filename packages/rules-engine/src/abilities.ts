/** Reglas matemáticas básicas D&D 2024. No modifica el personaje. */
export const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
export type Ability = (typeof ABILITIES)[number];
export type AbilityScores = Readonly<Record<Ability, number>>;
export type Ruleset = "dnd-2024" | "dnd-2014";

export function isAbility(value: string): value is Ability {
  return (ABILITIES as readonly string[]).includes(value);
}

export function abilityModifier(score: number): number {
  if (!Number.isInteger(score) || score < 1 || score > 30) {
    throw new RangeError("La puntuación de característica debe ser un entero entre 1 y 30");
  }
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(characterLevel: number): number {
  if (!Number.isInteger(characterLevel) || characterLevel < 1 || characterLevel > 20) {
    throw new RangeError("El nivel total debe ser un entero entre 1 y 20");
  }
  return 2 + Math.floor((characterLevel - 1) / 4);
}

export function abilityModifiers(scores: AbilityScores): Readonly<Record<Ability, number>> {
  const result = {} as Record<Ability, number>;
  for (const ability of ABILITIES) result[ability] = abilityModifier(scores[ability]);
  return result;
}

export function validateAbilityScores(value: unknown): AbilityScores {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Las características deben ser un objeto");
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== ABILITIES.length || Object.keys(input).some(k => !isAbility(k))) {
    throw new TypeError("Debes proporcionar exactamente las seis características conocidas");
  }
  const result = {} as Record<Ability, number>;
  for (const ability of ABILITIES) {
    const score = input[ability];
    if (typeof score !== "number") throw new TypeError(`La característica ${ability} debe ser numérica`);
    abilityModifier(score);
    result[ability] = score;
  }
  return Object.freeze(result);
}
