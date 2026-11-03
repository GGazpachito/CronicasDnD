/** Paso 04: puntos de golpe máximos y clase de armadura. D&D 2024, sin estado mutable. */
import { abilityModifier } from './abilities';

export type HitPointProgression = Readonly<{
  fighterLevel: number;
  constitutionScore: number;
  method: 'fixed' | 'rolled';
  /** Solo niveles 2..N, cada tirada entre 1 y 10. No se utiliza si method=fixed. */
  rolls?: readonly number[];
}>;
export type HitPointResult = Readonly<{ maximum: number; hitDice: number; die: 10; gainsByLevel: readonly number[] }>;

function int(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label}: entero entre ${min} y ${max} requerido`);
  }
  return value;
}

/** Para clases distintas o multiclase habrá otro calculador; no se inventan reglas todavía. */
export function calculateFighterHitPoints(input: HitPointProgression): HitPointResult {
  const level = int(input.fighterLevel, 'fighterLevel', 1, 20);
  const con = abilityModifier(input.constitutionScore);
  if (input.method !== 'fixed' && input.method !== 'rolled') throw new TypeError('Método de PG no admitido');
  if (input.method === 'fixed' && input.rolls !== undefined) throw new TypeError('Método fijo no admite rolls');
  if (input.method === 'rolled' && (!Array.isArray(input.rolls) || input.rolls.length !== level - 1)) {
    throw new TypeError('Se requiere una tirada por cada nivel posterior al primero');
  }
  const gains: number[] = [10 + con];
  for (let i = 1; i < level; i++) {
    const die = input.method === 'fixed' ? 6 : int(input.rolls![i-1], `tirada nivel ${i+1}`, 1, 10);
    gains.push(Math.max(1, die + con));
  }
  return { maximum: gains.reduce((a,b)=>a+b,0), hitDice: level, die: 10, gainsByLevel: gains };
}

export type ArmorId = 'padded' | 'leather' | 'studded_leather' | 'hide' | 'chain_shirt' | 'scale_mail' | 'breastplate' | 'half_plate' | 'ring_mail' | 'chain_mail' | 'splint' | 'plate';
export type ArmorType = 'light' | 'medium' | 'heavy';
export type Armor = Readonly<{ type: ArmorType; base: number; dexterityCap: number | null; strengthRequirement?: number; stealthDisadvantage: boolean }>;
/** Catálogo de valores mecánicos del PHB 2024 (capítulo 6); nombres internos, sin textos del libro. */
export const ARMORS: Readonly<Record<ArmorId, Armor>> = {
  padded:{type:'light',base:11,dexterityCap:null,stealthDisadvantage:true},
  leather:{type:'light',base:11,dexterityCap:null,stealthDisadvantage:false},
  studded_leather:{type:'light',base:12,dexterityCap:null,stealthDisadvantage:false},
  hide:{type:'medium',base:12,dexterityCap:2,stealthDisadvantage:false},
  chain_shirt:{type:'medium',base:13,dexterityCap:2,stealthDisadvantage:false},
  scale_mail:{type:'medium',base:14,dexterityCap:2,stealthDisadvantage:true},
  breastplate:{type:'medium',base:14,dexterityCap:2,stealthDisadvantage:false},
  half_plate:{type:'medium',base:15,dexterityCap:2,stealthDisadvantage:true},
  ring_mail:{type:'heavy',base:14,dexterityCap:0,stealthDisadvantage:true},
  chain_mail:{type:'heavy',base:16,dexterityCap:0,strengthRequirement:13,stealthDisadvantage:true},
  splint:{type:'heavy',base:17,dexterityCap:0,strengthRequirement:15,stealthDisadvantage:true},
  plate:{type:'heavy',base:18,dexterityCap:0,strengthRequirement:15,stealthDisadvantage:true},
} as const;

export type ArmorFormula = Readonly<{ id: string; base: number; addDexterity: boolean; dexterityCap: number | null }>;
export type ArmorClassInput = Readonly<{
  dexterityScore: number;
  strengthScore: number;
  /** Una única armadura puesta. No es una lista de inventario. */
  armor?: ArmorId | null;
  /** Fórmula alternativa proporcionada por rasgos o conjuros; solo si no se usa armadura. */
  alternateFormula?: ArmorFormula;
  shieldEquipped?: boolean;
  shieldTrained?: boolean;
  /** Bonificadores de CA compatibles ya resueltos por el motor de modificadores. */
  additionalBonus?: number;
}>;
export type ArmorClassResult = Readonly<{
  value: number; base: number; shieldBonus: number; additionalBonus: number;
  formula: string; stealthDisadvantageFromArmor: boolean;
  heavyArmorStrengthRequirementUnmet: boolean;
}>;

export function calculateArmorClass(input: ArmorClassInput): ArmorClassResult {
  const dexMod = abilityModifier(input.dexterityScore);
  const strength = int(input.strengthScore, 'strengthScore', 1, 30);
  const armorId = input.armor ?? null;
  if (armorId !== null && !Object.prototype.hasOwnProperty.call(ARMORS, armorId)) throw new TypeError('Armadura desconocida');
  if (armorId !== null && input.alternateFormula !== undefined) throw new TypeError('Elige solo una fórmula base de CA');
  const armor = armorId === null ? null : ARMORS[armorId];
  let base: number;
  let formula: string;
  if (armor !== null) {
    base = armor.base + (armor.dexterityCap === null ? dexMod : Math.min(dexMod, armor.dexterityCap));
    formula = `armor:${armorId}`;
  } else if (input.alternateFormula) {
    const alternative = input.alternateFormula;
    if (typeof alternative.id !== 'string' || !/^[a-zA-Z0-9:_@.-]{1,100}$/.test(alternative.id)) throw new TypeError('ID de fórmula inválido');
    const alternativeBase = int(alternative.base, 'alternateFormula.base', 0, 40);
    if (typeof alternative.addDexterity !== 'boolean') throw new TypeError('addDexterity inválido');
    if (alternative.dexterityCap !== null) int(alternative.dexterityCap, 'dexterityCap', 0, 10);
    base = alternativeBase + (alternative.addDexterity ? alternative.dexterityCap === null ? dexMod : Math.min(dexMod, alternative.dexterityCap) : 0);
    formula = `alternative:${alternative.id}`;
  } else { base = 10 + dexMod; formula = 'unarmored'; }
  if (input.shieldEquipped !== undefined && typeof input.shieldEquipped !== 'boolean') throw new TypeError('shieldEquipped inválido');
  if (input.shieldTrained !== undefined && typeof input.shieldTrained !== 'boolean') throw new TypeError('shieldTrained inválido');
  const shieldBonus = input.shieldEquipped && input.shieldTrained ? 2 : 0;
  const additionalBonus = int(input.additionalBonus ?? 0, 'additionalBonus', -100, 100);
  return {
    value: base + shieldBonus + additionalBonus,
    base, shieldBonus, additionalBonus, formula,
    stealthDisadvantageFromArmor: armor?.stealthDisadvantage ?? false,
    heavyArmorStrengthRequirementUnmet: armor?.strengthRequirement !== undefined && strength < armor.strengthRequirement,
  };
}
