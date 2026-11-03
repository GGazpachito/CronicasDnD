import { ABILITIES, isAbility, validateAbilityScores, type Ability, type AbilityScores } from "./abilities";
import { SKILLS, calculateSavingThrows, calculateSkillBonuses, type Skill, type ProficiencyGrants } from "./proficiencies";

/** Paso 02: subconjunto cerrado de operaciones, no ejecuta código ni expresiones. */
export type EffectCondition =
  | Readonly<{ type: "always" }>
  | Readonly<{ type: "class_level_at_least"; classId: string; value: number }>;

export type MechanicalEffect = Readonly<
  { effectId: string; sourceRevisionId: string; when: EffectCondition } & (
    | { type: "ability_increase"; params: Readonly<{ ability: Ability; amount: number; cap: number }> }
    | { type: "grant_proficiency"; params: Readonly<{ kind: "skill"; id: Skill } | { kind: "saving_throw"; id: Ability }> }
  )
>;

export type EffectContext = Readonly<{
  classLevels: Readonly<Record<string, number>>;
}>;

export type EffectInput = Readonly<{
  baseAbilities: AbilityScores;
  characterLevel: number;
  effects: readonly unknown[];
  context: EffectContext;
  baseProficiencies?: ProficiencyGrants;
}>;

export type AppliedEffect = Readonly<{
  effectId: string;
  sourceRevisionId: string;
  description: string;
}>;

export type EffectResult = Readonly<{
  abilityScores: AbilityScores;
  proficiencies: Readonly<{ skills: readonly Skill[]; savingThrows: readonly Ability[] }>;
  skillBonuses: Readonly<Record<Skill, number>>;
  savingThrowBonuses: Readonly<Record<Ability, number>>;
  appliedEffects: readonly AppliedEffect[];
}>;

const hasOwn = (obj: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);
function record(v: unknown, label: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new TypeError(`${label}: objeto requerido`);
  return v as Record<string, unknown>;
}
function exactKeys(obj: Record<string, unknown>, keys: readonly string[], label: string): void {
  if (Object.keys(obj).length !== keys.length || Object.keys(obj).some(k => !keys.includes(k))) {
    throw new TypeError(`${label}: campos inesperados o ausentes`);
  }
  for (const k of keys) if (!hasOwn(obj, k)) throw new TypeError(`${label}: falta ${k}`);
}
function identifier(v: unknown, label: string): string {
  if (typeof v !== "string" || v.length < 1 || v.length > 160 || !/^[a-zA-Z0-9:_@.\/-]+$/.test(v)) {
    throw new TypeError(`${label}: identificador inválido`);
  }
  return v;
}
function integer(v: unknown, min: number, max: number, label: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new RangeError(`${label}: entero entre ${min} y ${max} requerido`);
  }
  return v;
}

/** Valida objetos JSON/unknown antes de pasarlos al evaluador. Rechaza campos desconocidos. */
export function parseMechanicalEffect(value: unknown): MechanicalEffect {
  const e = record(value, "efecto");
  exactKeys(e, ["effectId", "sourceRevisionId", "when", "type", "params"], "efecto");
  const effectId = identifier(e.effectId, "effectId");
  const sourceRevisionId = identifier(e.sourceRevisionId, "sourceRevisionId");
  const condition = record(e.when, "when");
  let when: EffectCondition;
  if (condition.type === "always") {
    exactKeys(condition, ["type"], "when");
    when = { type: "always" };
  } else if (condition.type === "class_level_at_least") {
    exactKeys(condition, ["type", "classId", "value"], "when");
    when = {
      type: "class_level_at_least",
      classId: identifier(condition.classId, "classId"),
      value: integer(condition.value, 1, 20, "nivel de clase"),
    };
  } else throw new TypeError("Tipo de condición no admitido");
  const params = record(e.params, "params");
  if (e.type === "ability_increase") {
    exactKeys(params, ["ability", "amount", "cap"], "params ability_increase");
    if (typeof params.ability !== "string" || !isAbility(params.ability)) throw new TypeError("Característica inválida");
    return { effectId, sourceRevisionId, when, type: "ability_increase", params: {
      ability: params.ability,
      amount: integer(params.amount, 1, 10, "amount"),
      cap: integer(params.cap, 1, 30, "cap"),
    } };
  }
  if (e.type === "grant_proficiency") {
    exactKeys(params, ["kind", "id"], "params grant_proficiency");
    if (params.kind === "skill" && typeof params.id === "string" && (SKILLS as string[]).includes(params.id)) {
      return { effectId, sourceRevisionId, when, type: "grant_proficiency", params: { kind: "skill", id: params.id as Skill } };
    }
    if (params.kind === "saving_throw" && typeof params.id === "string" && isAbility(params.id)) {
      return { effectId, sourceRevisionId, when, type: "grant_proficiency", params: { kind: "saving_throw", id: params.id } };
    }
    throw new TypeError("Tipo o identificador de competencia inválido");
  }
  throw new TypeError("Operación no admitida");
}

/** El motor no cambia ni el personaje ni el contexto; tampoco guarda recursos mutables. */
export function applyMechanicalEffects(input: EffectInput): EffectResult {
  const base = validateAbilityScores(input.baseAbilities);
  integer(input.characterLevel, 1, 20, "nivel total");
  if (!Array.isArray(input.effects) || input.effects.length > 500) throw new RangeError("Lista de efectos inválida o excesiva");
  const classLevels = record(input.context.classLevels, "classLevels");
  for (const [id, lvl] of Object.entries(classLevels)) {
    identifier(id, "classId");
    integer(lvl, 0, 20, "nivel de clase");
  }
  const effects = input.effects.map(parseMechanicalEffect);
  const seen = new Set<string>();
  const scores: Record<Ability, number> = { ...base };
  const skills = new Set<Skill>(input.baseProficiencies?.skills ?? []);
  const savingThrows = new Set<Ability>(input.baseProficiencies?.savingThrows ?? []);
  const expertise = [...(input.baseProficiencies?.expertiseSkills ?? [])];
  const appliedEffects: AppliedEffect[] = [];

  // Dos fases: primero se valida todo y después se calcula sobre copias privadas.
  for (const effect of effects) {
    const key = `${effect.sourceRevisionId}::${effect.effectId}`;
    if (seen.has(key)) throw new TypeError(`Efecto duplicado: ${key}`);
    seen.add(key);
  }
  for (const effect of effects) {
    const active = effect.when.type === "always" || Number(classLevels[effect.when.classId] ?? 0) >= effect.when.value;
    if (!active) continue;
    if (effect.type === "ability_increase") {
      const { ability, amount, cap } = effect.params;
      scores[ability] = Math.min(cap, scores[ability] + amount);
      appliedEffects.push({ effectId: effect.effectId, sourceRevisionId: effect.sourceRevisionId, description: `${ability}: +${amount}, límite ${cap}` });
    } else {
      const { kind, id } = effect.params;
      if (kind === "skill") skills.add(id);
      else savingThrows.add(id);
      appliedEffects.push({ effectId: effect.effectId, sourceRevisionId: effect.sourceRevisionId, description: `Competencia en ${kind}:${id}` });
    }
  }
  const abilityScores = validateAbilityScores(scores);
  const proficiencyGrants: ProficiencyGrants = { skills: [...skills], savingThrows: [...savingThrows], expertiseSkills: expertise };
  return {
    abilityScores,
    proficiencies: { skills: [...skills], savingThrows: [...savingThrows] },
    skillBonuses: calculateSkillBonuses(abilityScores, input.characterLevel, proficiencyGrants),
    savingThrowBonuses: calculateSavingThrows(abilityScores, input.characterLevel, proficiencyGrants),
    appliedEffects,
  };
}
