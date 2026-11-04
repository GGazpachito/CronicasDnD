/** Paso 08. Creación guiada parcial de Guerrero según PHB 2024, pp. 33-38, 91, 178-195.
 * El catálogo declara las capacidades que aún no están implementadas, en vez de simularlas.
 */
import { ABILITIES, type Ability, type AbilityScores, proficiencyBonus } from './abilities';
import { SKILLS, type Skill } from './proficiencies';
import { calculateFighterSheet, type CalculatedFighterSheet, type FighterCharacterInput } from './sheet';

export const FIGHTER_SKILL_OPTIONS: readonly Skill[] = [
  'acrobatics', 'animal_handling', 'athletics', 'history', 'insight',
  'intimidation', 'persuasion', 'perception', 'survival',
];
export const BACKGROUNDS = {
  acolyte: { name: 'Acólito', abilities: ['intelligence','wisdom','charisma'], skills: ['insight','religion'], feat: 'magic_initiate_cleric', tool: 'Útiles de caligrafía' },
  criminal: { name: 'Criminal', abilities: ['dexterity','constitution','intelligence'], skills: ['sleight_of_hand','stealth'], feat: 'alert', tool: 'Herramientas de ladrón' },
  sage: { name: 'Erudito', abilities: ['constitution','intelligence','wisdom'], skills: ['arcana','history'], feat: 'magic_initiate_wizard', tool: 'Útiles de caligrafía' },
  soldier: { name: 'Soldado', abilities: ['strength','dexterity','constitution'], skills: ['athletics','intimidation'], feat: 'savage_attacker', tool: 'Juego de azar (a elegir)' },
} as const;
export type BackgroundId = keyof typeof BACKGROUNDS;
export type SpeciesId = 'human' | 'dwarf' | 'elf';
export type ElfLineage = 'drow' | 'high_elf' | 'wood_elf';
export type HumanOriginFeat = 'alert' | 'tough' | 'savage_attacker';
export const HUMAN_FEATS: readonly HumanOriginFeat[] = ['alert','tough','savage_attacker'];
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export type GuidedFighterInput = Readonly<{
  name: string;
  level: 1 | 2 | 3;
  background: BackgroundId;
  species: SpeciesId;
  /** Puntuaciones antes de los aumentos por trasfondo. */
  assignedAbilities: AbilityScores;
  increaseMode: 'two_plus_one' | 'three_ones';
  plusTwoAbility: Ability;
  plusOneAbility: Ability;
  fighterSkills: readonly Skill[];
  humanSkill?: Skill;
  humanFeat?: HumanOriginFeat;
  humanSize?: 'small' | 'medium';
  elfLineage?: ElfLineage;
  elfSenseSkill?: 'insight' | 'perception' | 'survival';
  elfSpellAbility?: 'intelligence' | 'wisdom' | 'charisma';
  armor: FighterCharacterInput['equipment']['armor'];
  shield: boolean;
}>;
export type GuidedFighterResult = Readonly<{
  sheet: CalculatedFighterSheet;
  origin: Readonly<{background: BackgroundId; species: SpeciesId; feat: string; additionalFeat?: HumanOriginFeat; size: 'small' | 'medium'; speedFeet: number; tools: readonly string[]}>;
  pendingAutomation: readonly string[];
}>;

function fail(message: string): never { throw new RangeError(message); }
function isSkill(value: unknown): value is Skill { return typeof value === 'string' && SKILLS.includes(value as Skill); }
function isAbility(value: unknown): value is Ability { return typeof value === 'string' && ABILITIES.includes(value as Ability); }
function initiativeBonus(id: string, bonus: number) {
  return {type:'numeric_modifier', effectId:`alert_${id}`, sourceRevisionId:`phb2024:${id}`,target:'initiative',when:{type:'always'},operation:'add',value:bonus,group:`alert_${id}`,stacking:'sum',priority:0};
}

export function calculateGuidedFighter(input: GuidedFighterInput): GuidedFighterResult {
  if (!input || typeof input !== 'object') fail('Datos de creación necesarios');
  const bg = BACKGROUNDS[input.background];
  if (!bg) fail('Trasfondo no disponible');
  if (!['human','dwarf','elf'].includes(input.species)) fail('Especie no disponible');
  if (![1,2,3].includes(input.level)) fail('Nivel fuera del prototipo');
  if (!input.name?.trim() || input.name.length > 120) fail('Introduce un nombre válido');
  if (!input.assignedAbilities || typeof input.assignedAbilities !== 'object') fail('Faltan características');
  const assigned = ABILITIES.map(a => input.assignedAbilities[a]);
  if (assigned.some(v=>!Number.isInteger(v)) || [...assigned].sort((a,b)=>a-b).join(',') !== [...STANDARD_ARRAY].sort((a,b)=>a-b).join(',')) {
    fail('Debes distribuir exactamente los seis valores de la matriz estándar, sin repetirlos');
  }
  const allowed = [...bg.abilities] as Ability[];
  if (input.increaseMode !== 'two_plus_one' && input.increaseMode !== 'three_ones') fail('Método de mejora inválido');
  if (input.increaseMode === 'two_plus_one' && (!isAbility(input.plusTwoAbility) || !isAbility(input.plusOneAbility) || !allowed.includes(input.plusTwoAbility) || !allowed.includes(input.plusOneAbility) || input.plusTwoAbility===input.plusOneAbility)) {
    fail('Elige dos características distintas entre las tres del trasfondo');
  }
  const finalScores: Record<Ability,number> = {...input.assignedAbilities};
  if (input.increaseMode === 'three_ones') for (const a of allowed) finalScores[a] += 1;
  else { finalScores[input.plusTwoAbility]+=2; finalScores[input.plusOneAbility]+=1; }
  if (ABILITIES.some(a=>finalScores[a]>20)) fail('No se puede superar 20 por las mejoras del trasfondo');
  if (!Array.isArray(input.fighterSkills) || input.fighterSkills.length!==2 || new Set(input.fighterSkills).size!==2 || input.fighterSkills.some(s=>!isSkill(s)||!FIGHTER_SKILL_OPTIONS.includes(s))) fail('Elige dos habilidades distintas de la lista del Guerrero');
  // Se exige una elección libre diferente si ya concede esa competencia el trasfondo.
  const skills = new Set<Skill>(bg.skills as readonly Skill[]);
  for (const skill of input.fighterSkills) {
    if (skills.has(skill)) fail(`La competencia ${skill} ya la otorga el trasfondo; elige otra`);
    skills.add(skill);
  }
  const pending: string[] = [];
  let bonusHitPointsPerLevel=0;
  const modifiers: unknown[]=[];
  let size: 'small'|'medium'='medium';
  let speedFeet=30;
  let extraFeat: HumanOriginFeat|undefined;
  if (bg.feat==='alert') modifiers.push(initiativeBonus('criminal',proficiencyBonus(input.level)));
  else if (bg.feat==='magic_initiate_cleric' || bg.feat==='magic_initiate_wizard') pending.push('Falta elegir y automatizar los conjuros de Iniciado en la Magia del trasfondo');
  else pending.push('Ataque salvaje se registra, pero su efecto en combate todavía no está implementado');
  if (input.species==='human') {
    if (!input.humanSize || !['small','medium'].includes(input.humanSize)) fail('El humano debe elegir tamaño');
    size=input.humanSize;
    if (!isSkill(input.humanSkill) || skills.has(input.humanSkill)) fail('El humano debe elegir una habilidad adicional distinta');
    skills.add(input.humanSkill);
    if (!input.humanFeat || !HUMAN_FEATS.includes(input.humanFeat)) fail('El humano debe elegir una dote de origen adicional');
    if (input.humanFeat===bg.feat) fail('No se puede elegir dos veces la misma dote de origen');
    extraFeat=input.humanFeat;
    if (extraFeat==='alert') modifiers.push(initiativeBonus('human',proficiencyBonus(input.level)));
    if (extraFeat==='tough') bonusHitPointsPerLevel+=2;
    if (extraFeat==='savage_attacker') pending.push('Ataque salvaje adicional: efecto en combate pendiente');
    pending.push('Inspiración heroica al terminar un descanso largo todavía no se registra');
  } else if (input.species==='dwarf') {
    bonusHitPointsPerLevel+=1;
    pending.push('Enano: visión en la oscuridad, resistencia al veneno y Sentido de la piedra aún no automatizados');
  } else {
    if (!input.elfLineage || !['drow','high_elf','wood_elf'].includes(input.elfLineage)) fail('El elfo debe elegir linaje');
    if (!input.elfSenseSkill || !['insight','perception','survival'].includes(input.elfSenseSkill) || skills.has(input.elfSenseSkill)) fail('Elige una habilidad de Sentidos agudos no repetida');
    if (!input.elfSpellAbility || !['intelligence','wisdom','charisma'].includes(input.elfSpellAbility)) fail('Elige característica para conjuros de linaje élfico');
    skills.add(input.elfSenseSkill);
    if (input.elfLineage==='wood_elf') speedFeet=35;
    pending.push('Elfo: linaje y conjuros, visión en la oscuridad, ascendencia feérica y trance se registran, pero sus efectos especiales están pendientes');
  }
  pending.push('Estilo de combate, tres maestrías de armas y equipo inicial de clase requieren elecciones guiadas futuras');
  const character: FighterCharacterInput = {
    id:'guided-preview',name:input.name.trim(),ruleset:'dnd-2024',fighterLevel:input.level,
    baseAbilities:finalScores,baseProficiencies:{skills:[...skills],savingThrows:['strength','constitution']},
    modifiers,hpMethod:'fixed',equipment:{armor:input.armor,shieldEquipped:input.shield,shieldTrained:true},
    bonusHitPointsPerLevel,
    ...(input.level===3?{subclass:'champion' as const}:{})
  };
  const sheet=calculateFighterSheet(character);
  return {sheet,origin:{background:input.background,species:input.species,feat:bg.feat,...(extraFeat?{additionalFeat:extraFeat}:{}),size,speedFeet,tools:[bg.tool]},pendingAutomation:pending};
}
