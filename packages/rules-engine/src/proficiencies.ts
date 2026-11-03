import { ABILITIES, abilityModifier, proficiencyBonus, type Ability, type AbilityScores } from "./abilities";

export const SKILL_ABILITIES = {
  acrobatics: "dexterity", animal_handling: "wisdom", arcana: "intelligence",
  athletics: "strength", deception: "charisma", history: "intelligence",
  insight: "wisdom", intimidation: "charisma", investigation: "intelligence",
  medicine: "wisdom", nature: "intelligence", perception: "wisdom",
  performance: "charisma", persuasion: "charisma", religion: "intelligence",
  sleight_of_hand: "dexterity", stealth: "dexterity", survival: "wisdom",
} as const satisfies Record<string, Ability>;
export type Skill = keyof typeof SKILL_ABILITIES;
export const SKILLS = Object.keys(SKILL_ABILITIES) as Skill[];
export type ProficiencyRank = "none" | "proficient" | "expertise";

/** La competencia se concede por fuentes; nunca se suma por número de fuentes. */
export type ProficiencyGrants = Readonly<{
  skills?: ReadonlyArray<Skill>;
  expertiseSkills?: ReadonlyArray<Skill>;
  savingThrows?: ReadonlyArray<Ability>;
}>;

export function proficiencyMultiplier(rank: ProficiencyRank): number {
  switch (rank) {
    case "none": return 0;
    case "proficient": return 1;
    case "expertise": return 2;
    default: throw new TypeError("Grado de competencia desconocido");
  }
}

export function skillBonus(
  scores: AbilityScores,
  characterLevel: number,
  skill: Skill,
  rank: ProficiencyRank = "none",
  abilityOverride?: Ability,
): number {
  if (!(skill in SKILL_ABILITIES)) throw new TypeError("Habilidad desconocida");
  const ability = abilityOverride ?? SKILL_ABILITIES[skill];
  if (!ABILITIES.includes(ability)) throw new TypeError("Característica desconocida");
  return abilityModifier(scores[ability]) + proficiencyBonus(characterLevel) * proficiencyMultiplier(rank);
}

export function savingThrowBonus(scores: AbilityScores, level: number, ability: Ability, proficient = false): number {
  if (!ABILITIES.includes(ability)) throw new TypeError("Característica desconocida");
  return abilityModifier(scores[ability]) + (proficient ? proficiencyBonus(level) : 0);
}

export function calculateSkillBonuses(scores: AbilityScores, level: number, grants: ProficiencyGrants = {}): Readonly<Record<Skill, number>> {
  const trained = new Set(grants.skills ?? []);
  const expert = new Set(grants.expertiseSkills ?? []);
  for (const skill of [...trained, ...expert]) {
    if (!(skill in SKILL_ABILITIES)) throw new TypeError(`Habilidad desconocida: ${skill}`);
  }
  // La pericia exige competencia. Más adelante los prerrequisitos se comprobarán contra las fuentes.
  for (const skill of expert) if (!trained.has(skill)) throw new Error(`Pericia sin competencia: ${skill}`);
  const result = {} as Record<Skill, number>;
  for (const skill of SKILLS) result[skill] = skillBonus(scores, level, skill, expert.has(skill) ? "expertise" : trained.has(skill) ? "proficient" : "none");
  return result;
}

export function calculateSavingThrows(scores: AbilityScores, level: number, grants: ProficiencyGrants = {}): Readonly<Record<Ability, number>> {
  const trained = new Set(grants.savingThrows ?? []);
  for (const ability of trained) if (!ABILITIES.includes(ability)) throw new TypeError(`Salvación desconocida: ${ability}`);
  const result = {} as Record<Ability, number>;
  for (const ability of ABILITIES) result[ability] = savingThrowBonus(scores, level, ability, trained.has(ability));
  return result;
}
