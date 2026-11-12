/** Paso 08. Creación guiada parcial de Guerrero según PHB 2024, pp. 33-38, 91, 178-195.
 * El catálogo declara las capacidades que aún no están implementadas, en vez de simularlas.
 */
import { ABILITIES, type Ability, type AbilityScores, proficiencyBonus } from './abilities';
import { SKILLS, type Skill } from './proficiencies';
import { calculateFighterSheet, type CalculatedFighterSheet, type FighterCharacterInput } from './sheet';
import { FIGHTER_PACKAGES, WEAPONS, validateMartialChoices, type MartialChoices } from './martial';
import { ORIGIN_FEATS, TOOL_NAMES, validateHumanOriginFeat, type OriginFeatId, type HumanFeatDetails, type ToolId } from './origin-feats';
import { validateMagicInitiate, grantsFromMagicInitiate, elfLineageSpells, type SpellGrant, type MagicInitiateSelection } from './origin-magic';
import { combineStartingInventory, validateBackgroundEquipment, GAMING_SETS, type BackgroundEquipmentChoice, type StartingInventory } from './background-equipment';
import { replayInventory, equippedArmor, hasEquippedShield, type InventoryAction, type InventoryState } from './inventory';
import {collectMagicWardBonuses} from './magic-wards';
import {applyFighterLevel4Improvement,applyFighterLevel6Improvement,applyFighterLevel8Improvement,applyFighterLevel12Improvement,type FighterLevel4Improvement,type FighterLevel6Improvement,type FighterLevel8Improvement,type FighterLevel12Improvement} from './progression';

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
export type HumanOriginFeat = OriginFeatId;
export const HUMAN_FEATS: readonly HumanOriginFeat[] = Object.keys(ORIGIN_FEATS) as HumanOriginFeat[];
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export type GuidedFighterInput = Readonly<{
  name: string;
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
  /** Solo desde el nivel 4; otras dotes generales quedan fuera de este incremento. */
  level4Improvement?: FighterLevel4Improvement;
  /** Segunda mejora independiente desde nivel 6. */
  level6Improvement?:FighterLevel6Improvement;
  /** Tercera mejora independiente desde nivel 8. */
  level8Improvement?:FighterLevel8Improvement;
  /** Cuarta mejora independiente, desde nivel 12. */
  level12Improvement?:FighterLevel12Improvement;
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
  /** Elecciones internas de dotes del humano (herramientas, conjuros, habilidades). */
  humanFeatDetails?: HumanFeatDetails;
  /** Iniciado en la Magia del trasfondo, con lista fijada por el trasfondo. */
  backgroundMagicInitiate?: MagicInitiateSelection;
  humanSize?: 'small' | 'medium';
  elfLineage?: ElfLineage;
  elfSenseSkill?: 'insight' | 'perception' | 'survival';
  elfSpellAbility?: 'intelligence' | 'wisdom' | 'charisma';
  armor: FighterCharacterInput['equipment']['armor'];
  shield: boolean;
  /** Elecciones explícitas del paso 09; opcionales para no romper los tests y guardados previos. */
  martial?: MartialChoices;
  /** Elección del equipo del trasfondo; opcional para compatibilidad con pasos anteriores. */
  backgroundEquipment?: BackgroundEquipmentChoice;
  /** Diario de compra, venta, hallazgos y equipamiento a partir del lote inicial. */
  inventoryActions?: readonly InventoryAction[];
}>;
export type GuidedFighterResult = Readonly<{
  sheet: CalculatedFighterSheet;
  origin: Readonly<{background: BackgroundId; species: SpeciesId; feat: string; additionalFeat?: HumanOriginFeat; size: 'small' | 'medium'; speedFeet: number; tools: readonly string[]; luckPointsMaximum?:number}>;
  /** Conjuros concedidos por origen, no una simulación de lanzamiento ni de ranuras. */
  spells: readonly SpellGrant[];
  pendingAutomation: readonly string[];
  martial?: Readonly<{choices:MartialChoices;gold:number;inventory:readonly {name:string;quantity:number}[];masteries:readonly {weapon:string;property:string}[]}>;
  startingInventory?: StartingInventory;
  inventory?: InventoryState;
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
  if (![1,2,3,4,5,6,7,8,9,10,11,12,13].includes(input.level)) fail('Solo Guerrero nivel 1 a 13');
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
  if(input.level<4 && input.level4Improvement!==undefined)fail('La mejora de nivel 4 no está disponible antes de nivel 4');
  if(input.level<6&&input.level6Improvement!==undefined)fail('La mejora de nivel 6 no está disponible antes de nivel 6');
  if(input.level<8&&input.level8Improvement!==undefined)fail('La mejora de nivel 8 no está disponible antes de nivel 8');
  if(input.level<12&&input.level12Improvement!==undefined)fail('La mejora de nivel 12 no está disponible antes de nivel 12');
  const level4Scores=input.level>=4 ? applyFighterLevel4Improvement(finalScores,input.level4Improvement!) : finalScores;
  const level6Scores=input.level>=6 ? applyFighterLevel6Improvement(level4Scores,input.level6Improvement!) : level4Scores;
  const level8Scores=input.level>=8 ? applyFighterLevel8Improvement(level6Scores,input.level8Improvement!) : level6Scores;
  const improvedScores=input.level>=12 ? applyFighterLevel12Improvement(level8Scores,input.level12Improvement!) : level8Scores;
  if (!Array.isArray(input.fighterSkills) || input.fighterSkills.length!==2 || new Set(input.fighterSkills).size!==2 || input.fighterSkills.some(s=>!isSkill(s)||!FIGHTER_SKILL_OPTIONS.includes(s))) fail('Elige dos habilidades distintas de la lista del Guerrero');
  // Se exige una elección libre diferente si ya concede esa competencia el trasfondo.
  const skills = new Set<Skill>(bg.skills as readonly Skill[]);
  for (const skill of input.fighterSkills) {
    if (skills.has(skill)) fail(`La competencia ${skill} ya la otorga el trasfondo; elige otra`);
    skills.add(skill);
  }
  const bgEquipment = input.backgroundEquipment===undefined?undefined:validateBackgroundEquipment(input.background,input.backgroundEquipment);
  const pending: string[] = [];
  if (!bgEquipment) pending.push('Aún no se ha elegido el equipo o dinero del trasfondo');
  let bonusHitPointsPerLevel=0;
  const modifiers: unknown[]=[];
  let size: 'small'|'medium'='medium';
  let speedFeet=30;
  let extraFeat: HumanOriginFeat|undefined;
  const spells: SpellGrant[]=[];
  const extraTools: ToolId[]=[];
  let luckPointsMaximum: number|undefined;
  if (bg.feat==='alert') modifiers.push(initiativeBonus('criminal',proficiencyBonus(input.level)));
  else if (bg.feat==='magic_initiate_cleric' || bg.feat==='magic_initiate_wizard') {
    if (!input.backgroundMagicInitiate) pending.push('Falta seleccionar los conjuros de Iniciado en la Magia concedidos por el trasfondo');
    else {
      const selected=validateMagicInitiate(input.backgroundMagicInitiate,bg.feat==='magic_initiate_cleric'?'cleric':'wizard');
      spells.push(...grantsFromMagicInitiate(selected,'background'));
      pending.push('Lanzamiento, concentración y gasto/recuperación de usos de conjuros pendientes');
    }
  }
  else pending.push('Ataque salvaje se registra, pero su efecto en combate todavía no está implementado');
  if (input.species==='human') {
    if (!input.humanSize || !['small','medium'].includes(input.humanSize)) fail('El humano debe elegir tamaño');
    size=input.humanSize;
    if (!isSkill(input.humanSkill) || skills.has(input.humanSkill)) fail('El humano debe elegir una habilidad adicional distinta');
    skills.add(input.humanSkill);
    if (!input.humanFeat || !HUMAN_FEATS.includes(input.humanFeat)) fail('El humano debe elegir una dote de origen adicional');
    if (input.humanFeat===bg.feat) fail('No se puede elegir dos veces la misma dote de origen');
    const selected=validateHumanOriginFeat(input.humanFeat,input.humanFeatDetails,input.level);
    extraFeat=selected.feat;
    if (selected.feat==='magic_initiate' && selected.magicInitiate) {
      if (bg.feat.startsWith('magic_initiate_') && selected.magicInitiate.list===input.backgroundMagicInitiate?.list) fail('Iniciado en la Magia repetido debe elegir una lista diferente');
      if (bg.feat==='magic_initiate_cleric' && selected.magicInitiate.list==='cleric') fail('Iniciado en la Magia repetido debe elegir otra lista distinta de Clérigo');
      if (bg.feat==='magic_initiate_wizard' && selected.magicInitiate.list==='wizard') fail('Iniciado en la Magia repetido debe elegir otra lista distinta de Mago');
      spells.push(...grantsFromMagicInitiate(selected.magicInitiate,'human_feat'));
      pending.push('Lanzamiento, concentración y gasto/recuperación de usos de conjuros pendientes');
    }
    for (const skill of selected.skillProficiencies) {
      if (skills.has(skill)) fail(`La dote Competente no puede duplicar ${skill}; elige otra competencia`);
      skills.add(skill);
    }
    const backgroundToolIds: Partial<Record<BackgroundId,ToolId>>={acolyte:'calligraphers_supplies',criminal:'thieves_tools',sage:'calligraphers_supplies',...(bgEquipment?.gamingSet?{soldier:bgEquipment.gamingSet}:{})};
    if (selected.toolProficiencies.includes(backgroundToolIds[input.background] as ToolId)) fail('La dote no debe duplicar la herramienta del trasfondo; elige otra');
    extraTools.push(...selected.toolProficiencies);
    luckPointsMaximum=selected.luckPointsMaximum;
    if (extraFeat==='alert') modifiers.push(initiativeBonus('human',proficiencyBonus(input.level)));
    if (extraFeat==='tough') bonusHitPointsPerLevel+=2;
    if (extraFeat==='savage_attacker') pending.push('Ataque salvaje: su repetición de dados está pendiente del sistema de ataques');
    if (extraFeat==='lucky') pending.push('Afortunado: el máximo de puntos está registrado; gastar y recuperar puntos queda pendiente');
    if (extraFeat==='crafter') pending.push('Artesano: el descuento y la fabricación rápida requieren tienda/inventario');
    if (extraFeat==='musician') pending.push('Músico: Inspiración heroica a aliados durante descansos aún no automatizada');
    if (extraFeat==='healer') pending.push('Sanador: curación con botiquín y repetición de dados aún no automatizadas');
    if (extraFeat==='tavern_brawler') pending.push('Peleador de taberna: efectos de golpes desarmados aún no automatizados');
    pending.push('Inspiración heroica del Humano al terminar un descanso largo aún no se gestiona');
  } else if (input.species==='dwarf') {
    bonusHitPointsPerLevel+=1;
    pending.push('Enano: visión en la oscuridad, ventaja en salvaciones contra Envenenado y Sentido de la piedra aún pendientes');
  } else {
    if (!input.elfLineage || !['drow','high_elf','wood_elf'].includes(input.elfLineage)) fail('El elfo debe elegir linaje');
    if (!input.elfSenseSkill || !['insight','perception','survival'].includes(input.elfSenseSkill) || skills.has(input.elfSenseSkill)) fail('Elige una habilidad de Sentidos agudos no repetida');
    if (!input.elfSpellAbility || !['intelligence','wisdom','charisma'].includes(input.elfSpellAbility)) fail('Elige característica para conjuros de linaje élfico');
    skills.add(input.elfSenseSkill);
    if (input.elfLineage==='wood_elf') speedFeet=35;
    spells.push(...elfLineageSpells(input.elfLineage,input.level,input.elfSpellAbility));
    pending.push('Elfo: visión en la oscuridad, ascendencia feérica y trance no están automatizados');
    pending.push('Elfo: lanzamiento, usos gratuitos y cambio de truco del Alto elfo tras descanso aún pendientes');
  }
  const martial = input.martial===undefined ? undefined : validateMartialChoices(input.martial,input.level>=10?5:input.level>=4?4:3,input.level>=7);
  if (!martial) pending.push('Estilo de combate, tres maestrías y equipo inicial aún no seleccionados');
  if (martial && martial.fightingStyle !== 'defense') pending.push('El estilo de combate se utiliza en el panel de ataques cuando corresponde; las reacciones y sentidos especiales siguen pendientes');
  if(input.level>=4)pending.push('Dotes generales alternativas a Mejora de característica: catálogo pendiente; en esta fase solo se admite esa dote en niveles 4, 6, 8 y 12');
  if(input.level>=7&&martial?.additionalFightingStyle)pending.push('Segundo estilo del Campeón: los efectos situacionales y reacciones siguen requiriendo resolución manual');
  if(input.level>=5)pending.push('Desplazamiento táctico: el movimiento sin ataques de oportunidad de Segundo aliento debe resolverse con el DM');
  if (martial) pending.push('Las maestrías se muestran en el panel de ataques; las que requieren control de turnos, posición o estados enemigos se resuelven manualmente');
  const startingInventory=bgEquipment?combineStartingInventory(martial?.startingPackage,bgEquipment):undefined;
  if (input.inventoryActions!==undefined && (!martial || !startingInventory)) fail('Completa primero el equipo de clase y trasfondo antes de editar el inventario');
  const inventory=martial && startingInventory ? replayInventory(startingInventory,FIGHTER_PACKAGES[martial.startingPackage].initialArmor,input.inventoryActions??[]) : undefined;
  const targetArmor=inventory ? equippedArmor(inventory) : input.armor;
  const targetShield=inventory ? hasEquippedShield(inventory) : input.shield;
  if(inventory && (input.armor!==targetArmor||input.shield!==targetShield)) fail(input.inventoryActions===undefined?'El equipo debe coincidir con el paquete inicial':'El equipo equipado no coincide con el inventario');
  if(martial && !inventory && (input.armor!==FIGHTER_PACKAGES[martial.startingPackage].initialArmor || input.shield)) fail('El equipo debe coincidir con el paquete inicial');
  const magicBonuses=collectMagicWardBonuses(inventory?.magicItems??[]);
  const magicModifiers=magicBonuses.flatMap(bonus=>['armor_class',...ABILITIES.map(a=>`saving_throws.${a}`)].map(target=>({
    type:'numeric_modifier',effectId:`magic_${bonus.id}_${target.replace('.', '_')}`,
    sourceRevisionId:`srd521:magic:${bonus.id}`,target,when:{type:'always'},operation:'add',
    value:target==='armor_class'?bonus.armorClass:bonus.savingThrows,
    group:'magic_equipment',stacking:'sum',priority:0
  })));
  const fightingStyleModifiers = (martial?.fightingStyle==='defense'||martial?.additionalFightingStyle==='defense') && targetArmor!==null ? [{type:'numeric_modifier',effectId:'fighter_fighting_style_defense',sourceRevisionId:'phb2024:fighter:defense',target:'armor_class',when:{type:'always'},operation:'add',value:1,group:'fighting_style_defense',stacking:'sum',priority:0}] : [];
  const character: FighterCharacterInput = {
    id:'guided-preview',name:input.name.trim(),ruleset:'dnd-2024',fighterLevel:input.level,
    baseAbilities:improvedScores,baseProficiencies:{skills:[...skills],savingThrows:['strength','constitution']},
    modifiers:[...modifiers,...fightingStyleModifiers,...magicModifiers],hpMethod:'fixed',equipment:{armor:input.armor,shieldEquipped:input.shield,shieldTrained:true},
    bonusHitPointsPerLevel,
    ...(input.level>=3?{subclass:'champion' as const}:{})
  };
  const sheet=calculateFighterSheet(character);
  const bgTool=bgEquipment?.gamingSet?GAMING_SETS[bgEquipment.gamingSet]:bg.tool;
  return {sheet,origin:{background:input.background,species:input.species,feat:bg.feat,...(extraFeat?{additionalFeat:extraFeat}:{}),size,speedFeet,tools:[bgTool,...extraTools.map(t=>TOOL_NAMES[t])],...(luckPointsMaximum!==undefined?{luckPointsMaximum}:{})},spells,pendingAutomation:pending,
    ...(startingInventory?{startingInventory}:{}),
    ...(inventory?{inventory}:{}),
    ...(martial ? {martial:{choices:martial,gold:FIGHTER_PACKAGES[martial.startingPackage].gold,inventory:FIGHTER_PACKAGES[martial.startingPackage].items,masteries:martial.weaponMasteries.map(id=>({weapon:WEAPONS[id].name,property:WEAPONS[id].mastery}))}} : {})};
}
