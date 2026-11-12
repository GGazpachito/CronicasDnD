/** Paso 06: proyección pura de una hoja de Guerrero D&D 2024 (niveles 1-17).
 * Los datos persistidos y las elecciones son de entrada; nunca se modifican.
 */
import { abilityModifiers, proficiencyBonus, validateAbilityScores, type Ability, type AbilityScores } from './abilities';
import { calculateFighterHitPoints, calculateArmorClass, ARMORS, type ArmorClassInput, type HitPointProgression } from './defense';
import { applyMechanicalEffects, type AppliedEffect } from './effects';
import { resolveNumericModifiers, resolveRollMode, type RollModeResult } from './modifiers';
import { SKILLS, type ProficiencyGrants, type Skill } from './proficiencies';
import { initialFighterState, validateFighterState, fighterResourceMaximum, type FighterState, type FighterResourceId } from './resources';

export type FighterCharacterInput = Readonly<{
  id: string;
  name: string;
  ruleset: 'dnd-2024';
  fighterLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;
  baseAbilities: AbilityScores;
  /** Competencias ya concedidas por clase, trasfondo y elecciones validadas fuera de este módulo. */
  baseProficiencies: ProficiencyGrants;
  /** Operaciones de características y competencias (effects.ts). */
  effects?: readonly unknown[];
  /** Operaciones numéricas y modos de tirada (modifiers.ts). */
  modifiers?: readonly unknown[];
  /** Bonificación fija a PG máximos por nivel (p. ej., robustez enana). */
  bonusHitPointsPerLevel?: number;
  hpMethod: 'fixed' | 'rolled';
  hpRolls?: readonly number[];
  equipment: Readonly<Omit<ArmorClassInput, 'dexterityScore' | 'strengthScore' | 'additionalBonus'>>;
  /** Ausente: vista de personaje recién creado. Presente: estado recuperado de almacenamiento. */
  state?: FighterState;
  /** Solo para nivel 3: la subclase elegida, por ahora se admite Campeón. */
  subclass?: 'champion';
}>;

export type CalculatedFighterSheet = Readonly<{
  id: string; name: string; ruleset: 'dnd-2024'; classId: 'fighter'; level: number;
  subclass: 'champion' | null;
  abilityScores: AbilityScores;
  abilityModifiers: Readonly<Record<Ability, number>>;
  proficiencyBonus: number;
  skillBonuses: Readonly<Record<Skill, number>>;
  savingThrowBonuses: Readonly<Record<Ability, number>>;
  skillRollModes: Readonly<Record<Skill, RollModeResult['mode']>>;
  initiative: number;
  initiativeRollMode: RollModeResult['mode'];
  armorClass: number;
  armorClassDetails: ReturnType<typeof calculateArmorClass>;
  maximumHitPoints: number;
  currentHitPoints: number;
  hitDice: Readonly<{ total: number; die: 10 }>;
  resources: Readonly<Partial<Record<FighterResourceId, Readonly<{ current: number; maximum: number }>>>>;
  features: readonly string[];
  /** El motor registra los efectos simples aplicados; no inventa rasgos no declarados. */
  appliedEffects: readonly AppliedEffect[];
  warnings: readonly string[];
}>;

function validateIdentity(input: FighterCharacterInput): void {
  if (!input || typeof input !== 'object') throw new TypeError('Personaje requerido');
  if (typeof input.id !== 'string' || !/^[a-zA-Z0-9:_-]{1,100}$/.test(input.id)) throw new TypeError('id inválido');
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120) throw new TypeError('name inválido');
  if (input.ruleset !== 'dnd-2024') throw new TypeError('Esta proyección solo admite D&D 2024');
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].includes(input.fighterLevel)) throw new RangeError('Solo Guerrero nivel 1 a 17');
  if (input.fighterLevel < 3 && input.subclass !== undefined) throw new RangeError('La subclase se elige a nivel 3');
  if (input.fighterLevel >= 3 && input.subclass !== 'champion') throw new TypeError('Selecciona la subclase Campeón para nivel 3');
  if (!input.baseProficiencies || typeof input.baseProficiencies !== 'object') throw new TypeError('Faltan competencias iniciales');
  if (!input.equipment || typeof input.equipment !== 'object') throw new TypeError('Falta equipo');
}

function fighterFeatures(level: number, subclass: 'champion' | null): readonly string[] {
  return [
    'fighting_style', 'second_wind', 'weapon_mastery',
    ...(level >= 2 ? ['action_surge', 'tactical_mind'] : []),
    ...(subclass === 'champion' ? ['champion_improved_critical', 'champion_remarkable_athlete'] : []),
    ...(level >= 4 ? ['ability_score_improvement'] : []),
    ...(level >= 5 ? ['extra_attack', 'tactical_shift'] : []),
    ...(level >= 6 ? ['ability_score_improvement_level_6'] : []),
    ...(subclass==='champion'&&level>=7 ? ['champion_additional_fighting_style'] : []),
    ...(level>=8?['ability_score_improvement_level_8']:[]),
    ...(level>=9?['indomitable','tactical_master']:[]),
    ...(subclass==='champion'&&level>=10?['champion_heroic_warrior']:[]),
    ...(level>=11?['two_extra_attacks']:[]),
    ...(level>=12?['ability_score_improvement_level_12']:[]),
    ...(level>=13?['studied_attacks']:[]),
    ...(level>=14?['ability_score_improvement_level_14']:[]),
    ...(level>=16?['ability_score_improvement_level_16','weapon_mastery_sixth']:[]),
    ...(level>=17?['action_surge_two_uses','indomitable_three_uses']:[]),
    ...(subclass==='champion'&&level>=15?['champion_superior_critical']:[]),
  ];
}

/** Calcula una instantánea de lectura: no gasta, cura ni restaura recursos. */
export function calculateFighterSheet(input: FighterCharacterInput): CalculatedFighterSheet {
  validateIdentity(input);
  const base = validateAbilityScores(input.baseAbilities);
  const lvl = input.fighterLevel;
  const effectResult = applyMechanicalEffects({
    baseAbilities: base, characterLevel: lvl, effects: input.effects ?? [],
    baseProficiencies: input.baseProficiencies,
    context: { classLevels: { fighter: lvl } },
  });
  const scores = effectResult.abilityScores;
  const abilityMods = abilityModifiers(scores);
  const context = { classLevels: { fighter: lvl } };
  const modifiers = [...(input.modifiers ?? [])];
  // Efectos propios del Campeón que el prototipo ya puede expresar.
  if (input.subclass === 'champion') {
    for (const target of ['initiative', 'skills.athletics']) {
      modifiers.push({ type: 'roll_mode', effectId: `remarkable_athlete_${target.replace('.', '_')}`,
        sourceRevisionId: 'phb2024:fighter:champion', target,
        when: { type: 'always' }, mode: 'advantage' });
    }
  }
  // La armadura que penaliza Sigilo aporta desventaja a esta prueba.
  // Se añade después del cálculo de CA para basarse en la armadura equipada.
  const armorId = input.equipment.armor ?? null;
  if (armorId !== null) {
    const armor = ARMORS[armorId];
    if (armor?.stealthDisadvantage) modifiers.push({ type:'roll_mode',
      effectId:'armor_stealth_disadvantage', sourceRevisionId:'engine:equipment',
      target:'skills.stealth', when:{type:'always'}, mode:'disadvantage' });
  }
  // Un destino numérico no declarado no altera otras estadísticas.
  const adjust = (baseValue: number, target: string): number => resolveNumericModifiers(baseValue, target, modifiers, context).value;
  const hpInput: HitPointProgression = {
    fighterLevel: lvl, constitutionScore: scores.constitution, method: input.hpMethod,
    ...(input.hpRolls === undefined ? {} : { rolls: input.hpRolls }),
  };
  const baseHp = calculateFighterHitPoints(hpInput);
  const extraHp = input.bonusHitPointsPerLevel ?? 0;
  if (!Number.isInteger(extraHp) || extraHp < 0 || extraHp > 10) throw new RangeError('Bonificación de PG por nivel inválida');
  const hp = {...baseHp, maximum: baseHp.maximum + extraHp * lvl};
  const acBonus = resolveNumericModifiers(0, 'armor_class', modifiers, context).value;
  const ac = calculateArmorClass({
    ...input.equipment, dexterityScore: scores.dexterity, strengthScore: scores.strength,
    additionalBonus: acBonus,
  });
  const skillBonuses = {} as Record<Skill, number>;
  const skillRollModes = {} as Record<Skill, RollModeResult['mode']>;
  for (const skill of SKILLS) {
    skillBonuses[skill] = adjust(effectResult.skillBonuses[skill], `skills.${skill}`);
    skillRollModes[skill] = resolveRollMode(`skills.${skill}`, modifiers, context).mode;
  }
  const savingThrowBonuses = {} as Record<Ability, number>;
  for (const ability of ['strength','dexterity','constitution','intelligence','wisdom','charisma'] as const) {
    savingThrowBonuses[ability] = adjust(effectResult.savingThrowBonuses[ability], `saving_throws.${ability}`);
  }
  const initiative = adjust(abilityMods.dexterity, 'initiative');
  const initiativeRollMode = resolveRollMode('initiative', modifiers, context).mode;
  const state = input.state === undefined ? initialFighterState(lvl, hp.maximum) : validateFighterState(input.state);
  if (state.fighterLevel !== lvl) throw new RangeError('Estado guardado y nivel actual no coinciden');
  if (state.hitPoints.maximum !== hp.maximum) {
    throw new RangeError('Los PG máximos del estado no coinciden con el recálculo; aplica una transición explícita de PG');
  }
  const resources: Partial<Record<FighterResourceId, Readonly<{ current: number; maximum: number }>>> = {};
  for (const id of ['second_wind', 'action_surge', 'indomitable'] as const) {
    const maximum = fighterResourceMaximum(lvl, id);
    if (maximum) resources[id] = { current: state.resources[id]!.current, maximum };
  }
  const warnings: string[] = [];
  if (ac.heavyArmorStrengthRequirementUnmet) warnings.push('heavy_armor_strength_requirement_unmet');
  if (ac.stealthDisadvantageFromArmor) warnings.push('armor_stealth_disadvantage');
  // Se registran también las advertencias de equipo para mostrarlas en la interfaz.
  return {
    id: input.id, name: input.name, ruleset: 'dnd-2024', classId: 'fighter', level: lvl,
    subclass: input.subclass ?? null, abilityScores: scores, abilityModifiers: abilityMods,
    proficiencyBonus: proficiencyBonus(lvl), skillBonuses, savingThrowBonuses,
    skillRollModes, initiative, initiativeRollMode, armorClass: ac.value, armorClassDetails: ac,
    maximumHitPoints: hp.maximum, currentHitPoints: state.hitPoints.current,
    hitDice: { total: hp.hitDice, die: hp.die }, resources, features: fighterFeatures(lvl, input.subclass ?? null),
    appliedEffects: effectResult.appliedEffects, warnings,
  };
}
