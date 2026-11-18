/** Actualización 47: motor puro de progresión del Mago y Evocación, niveles 1-20.
 * Fuentes: Player's Handbook (2024), pp. 165-167 y 174.
 * No añade todavía la clase al creador ni modifica los guardados del Guerrero.
 */
import {abilityModifier,proficiencyBonus,validateAbilityScores,type AbilityScores} from './abilities';
import {createSlotPool,longRestSpellSlots,restoreSpellSlots,useSpellSlot,type SpellSlotPool} from './spellcasting-core';

export type WizardLevel=1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20;
export type WizardSubclass='evoker';
export type WizardMagicSchool='abjuration'|'conjuration'|'divination'|'enchantment'|'evocation'|'illusion'|'necromancy'|'transmutation';
export type WizardSpellLevel=0|1|2|3|4|5|6|7|8|9;
export type WizardSpellReference=Readonly<{
  id:string;
  level:WizardSpellLevel;
  school:WizardMagicSchool;
  ritual?:boolean;
  castingTime?:'action'|'bonus_action'|'reaction'|'other';
}>;

/** Tabla oficial de Mago (PHB 2024 p. 166): 20 filas, columnas 1 a 9. */
const SLOT_ROWS: readonly (readonly number[])[]=[
  [2,0,0,0,0,0,0,0,0], // 1
  [3,0,0,0,0,0,0,0,0], // 2
  [4,2,0,0,0,0,0,0,0], // 3
  [4,3,0,0,0,0,0,0,0], // 4
  [4,3,2,0,0,0,0,0,0], // 5
  [4,3,3,0,0,0,0,0,0], // 6
  [4,3,3,1,0,0,0,0,0], // 7
  [4,3,3,2,0,0,0,0,0], // 8
  [4,3,3,3,1,0,0,0,0], // 9
  [4,3,3,3,2,0,0,0,0], // 10
  [4,3,3,3,2,1,0,0,0], // 11
  [4,3,3,3,2,1,0,0,0], // 12
  [4,3,3,3,2,1,1,0,0], // 13
  [4,3,3,3,2,1,1,0,0], // 14
  [4,3,3,3,2,1,1,1,0], // 15
  [4,3,3,3,2,1,1,1,0], // 16
  [4,3,3,3,2,1,1,1,1], // 17
  [4,3,3,3,3,1,1,1,1], // 18
  [4,3,3,3,3,2,1,1,1], // 19
  [4,3,3,3,3,2,2,1,1], // 20
];
const PREPARED=[4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25] as const;
export const WIZARD_ASI_LEVELS=[4,8,12,16] as const;

/** Descripciones originales y breves, NO transcripciones del libro. */
export const WIZARD_FEATURES= [
  {id:'spellcasting',level:1,title:'Lanzamiento de conjuros',description:'Aprendes tres trucos, empiezas con seis conjuros de nivel 1 en el libro y preparas cuatro. La Inteligencia determina tus ataques mágicos y CD.'},
  {id:'ritual_adept',level:1,title:'Adepto ritual',description:'Puedes lanzar como ritual un conjuro ritual de tu libro aunque no lo tengas preparado, siempre que consultes el libro.'},
  {id:'arcane_recovery',level:1,title:'Recuperación arcana',description:'Tras un descanso corto recuperas ranuras gastadas cuya suma de niveles no supere la mitad de tu nivel de Mago redondeada hacia arriba; ninguna puede ser de nivel 6 o superior. Una vez por descanso largo.'},
  {id:'scholar',level:2,title:'Erudito',description:'Obtienes pericia en una habilidad académica de la lista de Erudito en la que ya seas competente.'},
  {id:'wizard_subclass',level:3,title:'Tradición arcana',description:'Eliges una tradición de magia. Esta primera implementación ofrece Evocación.'},
  {id:'ability_score_improvement_4',level:4,title:'Mejora de característica',description:'Puedes mejorar tus características mediante la dote correspondiente u otra dote para la que cumplas los requisitos.'},
  {id:'memorize_spell',level:5,title:'Memorizar conjuro',description:'Después de un descanso corto puedes sustituir un conjuro preparado de nivel 1 o superior por otro de tu libro.'},
  {id:'ability_score_improvement_8',level:8,title:'Mejora de característica',description:'Obtienes otra oportunidad de mejorar características o elegir una dote válida.'},
  {id:'ability_score_improvement_12',level:12,title:'Mejora de característica',description:'Obtienes otra oportunidad de mejorar características o elegir una dote válida.'},
  {id:'ability_score_improvement_16',level:16,title:'Mejora de característica',description:'Obtienes otra oportunidad de mejorar características o elegir una dote válida.'},
  {id:'spell_mastery',level:18,title:'Maestría de conjuros',description:'Elige del libro un conjuro de nivel 1 y otro de nivel 2 que se lancen con una acción. Ambos están siempre preparados y se lanzan a su nivel mínimo sin gastar ranuras. Tras un descanso largo puedes sustituir uno por otro elegible del mismo nivel.'},
  {id:'epic_boon',level:19,title:'Beneficio épico',description:'Puedes elegir un beneficio épico válido u otra dote para la que cumplas los requisitos.'},
  {id:'signature_spells',level:20,title:'Conjuros distintivos',description:'Elige dos conjuros de nivel 3 de tu libro. Están siempre preparados y puedes lanzar cada uno sin ranura una vez por descanso corto o largo.'},
] as const;
export const EVOKER_FEATURES=[
  {id:'evocation_savant',level:3,title:'Experto en Evocación',description:'Añades dos conjuros de Evocación de nivel 1 o 2 a tu libro sin coste y un conjuro adicional de esta escuela cuando accedes a un nuevo nivel de ranuras.'},
  {id:'potent_cantrip',level:3,title:'Truco potente',description:'Si fallas un ataque con un truco dañino o el objetivo supera su salvación, el objetivo recibe la mitad del daño del truco, sin efectos adicionales.'},
  {id:'sculpt_spells',level:6,title:'Esculpir conjuros',description:'Cuando lanzas una evocación que afecta a criaturas visibles, puedes proteger a 1 + nivel del conjuro: superan automáticamente su salvación y no reciben el daño que normalmente sufrirían al superarla.'},
  {id:'empowered_evocation',level:10,title:'Evocación potenciada',description:'Puedes sumar tu modificador de Inteligencia a una tirada de daño de cada conjuro de Evocación de Mago que lances.'},
  {id:'overchannel',level:14,title:'Sobrecarga',description:'Puedes maximizar el daño de un conjuro de Mago lanzado con ranura de niveles 1–5. Tras el primer uso por descanso largo, los siguientes provocan daño necrótico sobre ti que aumenta con cada uso.'},
] as const;
export type WizardFeatureId=(typeof WIZARD_FEATURES)[number]['id']|(typeof EVOKER_FEATURES)[number]['id'];

function levelChecked(level:number):asserts level is WizardLevel{
  if(!Number.isInteger(level)||level<1||level>20)throw new RangeError('El Mago admite niveles del 1 al 20');
}
export type WizardProgression=Readonly<{
  classId:'wizard';level:WizardLevel;subclass:WizardSubclass|null;
  proficiencyBonus:number;hitDie:6;cantripsKnown:number;preparedSpellCount:number;
  spellSlots:readonly number[];highestSlotLevel:number;
  minimumSpellbookCount:number;arcaneRecoveryLimit:number;
  features:readonly (typeof WIZARD_FEATURES[number]|typeof EVOKER_FEATURES[number])[];
}>;
/** Solo calcula progresión; no crea ranuras gastadas ni da hechizos elegidos automáticamente. */
export function wizardProgression(level:number,subclass?:WizardSubclass):WizardProgression{
  levelChecked(level);
  if(subclass!==undefined&&subclass!=='evoker')throw new RangeError('Solo está implementada la subclase Evocación');
  if(level>=3&&!subclass)throw new RangeError('Desde nivel 3 debes elegir la tradición Evocación');
  if(level<3&&subclass)throw new RangeError('No hay tradición arcana antes del nivel 3');
  const slots=[...SLOT_ROWS[level-1]];
  return {classId:'wizard',level,subclass:subclass??null,proficiencyBonus:proficiencyBonus(level),
    hitDie:6,cantripsKnown:level>=10?5:level>=4?4:3,
    preparedSpellCount:PREPARED[level-1],spellSlots:slots,
    highestSlotLevel:slots.reduce((max,n,i)=>n>0?i+1:max,0),
    minimumSpellbookCount:6+2*(level-1),arcaneRecoveryLimit:Math.ceil(level/2),
    features:[...WIZARD_FEATURES.filter(f=>f.level<=level),
      ...(subclass==='evoker'?EVOKER_FEATURES.filter(f=>f.level<=level):[])],
  };
}
export type WizardSpellChoices=Readonly<{
  /** Hechizos de nivel 1 o superior, obtenidos por progresión, copia y Evocación. */
  spellbook:readonly WizardSpellReference[];
  cantrips:readonly WizardSpellReference[];
  /** Solo los preparados en la lista regular; los siempre preparados se agregan aparte. */
  preparedIds:readonly string[];
  spellMasteryIds?:readonly [string,string];
  signatureSpellIds?:readonly [string,string];
}>;
export type ValidatedWizardSpells=Readonly<{
  spellbook:readonly WizardSpellReference[];cantrips:readonly WizardSpellReference[];
  preparedIds:readonly string[];alwaysPreparedIds:readonly string[];
}>;
const idValid=(value:string)=>typeof value==='string'&&/^[a-z][a-z0-9_]{0,80}$/.test(value);
function uniqueIds(values:readonly string[],context:string):void{
  if(new Set(values).size!==values.length)throw new RangeError(`${context}: no puede haber conjuros duplicados`);
}
/** Se permite llevar más conjuros que el mínimo: el Mago puede copiar pergaminos.
 * Cada referencia debe provenir de una lista oficial validada por el catálogo,
 * tarea de la siguiente entrega; este núcleo valida nivel y estructura, no autoría.
 */
export function validateWizardSpellChoices(level:number,choices:WizardSpellChoices,subclass?:WizardSubclass):ValidatedWizardSpells{
  const progression=wizardProgression(level,subclass);
  if(!choices||!Array.isArray(choices.spellbook)||!Array.isArray(choices.cantrips)||!Array.isArray(choices.preparedIds))
    throw new RangeError('Faltan elecciones de conjuros del Mago');
  const referenceOk=(s:WizardSpellReference)=>s&&idValid(s.id)&&Number.isInteger(s.level)&&s.level>=0&&s.level<=9&&
    (['abjuration','conjuration','divination','enchantment','evocation','illusion','necromancy','transmutation'] as readonly string[]).includes(s.school);
  if(choices.spellbook.some(s=>!referenceOk(s)||s.level<1||s.level>progression.highestSlotLevel))
    throw new RangeError('El libro contiene conjuros inválidos o de nivel no disponible');
  if(choices.cantrips.some(s=>!referenceOk(s)||s.level!==0))throw new RangeError('Solo pueden elegirse trucos de nivel 0');
  uniqueIds(choices.spellbook.map(s=>s.id),'Libro de conjuros');
  uniqueIds(choices.cantrips.map(s=>s.id),'Trucos');
  if(choices.spellbook.length<progression.minimumSpellbookCount)
    throw new RangeError(`El libro debe contener al menos ${progression.minimumSpellbookCount} conjuros por progresión`);
  if(choices.cantrips.length!==progression.cantripsKnown)
    throw new RangeError(`El Mago debe conocer ${progression.cantripsKnown} trucos`);
  if(choices.preparedIds.length!==progression.preparedSpellCount)
    throw new RangeError(`El Mago debe preparar ${progression.preparedSpellCount} conjuros regulares`);
  uniqueIds(choices.preparedIds,'Preparación');
  const byId=new Map(choices.spellbook.map(s=>[s.id,s]));
  if(choices.preparedIds.some(id=>!byId.has(id)))throw new RangeError('No puedes preparar conjuros fuera de tu libro');
  const always:string[]=[];
  if(level>=18){
    const mastery=choices.spellMasteryIds;
    if(!Array.isArray(mastery)||mastery.length!==2)throw new RangeError('Elige dos conjuros para Maestría (niveles 1 y 2)');
    const first=byId.get(mastery[0]);const second=byId.get(mastery[1]);
    if(!first||first.level!==1||first.castingTime!=='action'||!second||second.level!==2||second.castingTime!=='action')
      throw new RangeError('Maestría exige un conjuro de nivel 1 y otro de nivel 2, ambos de una acción');
    always.push(...mastery);
  }else if(choices.spellMasteryIds!==undefined)throw new RangeError('Maestría solo desde nivel 18');
  if(level>=20){
    const signature=choices.signatureSpellIds;
    if(!Array.isArray(signature)||signature.length!==2||new Set(signature).size!==2||signature.some(id=>byId.get(id)?.level!==3))
      throw new RangeError('Elige dos conjuros de nivel 3 distintos como distintivos');
    always.push(...signature);
  }else if(choices.signatureSpellIds!==undefined)throw new RangeError('Conjuros distintivos solo desde nivel 20');
  return {spellbook:[...choices.spellbook],cantrips:[...choices.cantrips],
    preparedIds:[...choices.preparedIds],alwaysPreparedIds:[...new Set(always)]};
}

export type WizardMagicState=Readonly<{
  slots:SpellSlotPool;
  arcaneRecoveryUsed:boolean;
  /** Cantidad de usos gastados de Sobrecarga desde el descanso largo. */
  overchannelUses:number;
  /** IDs de Conjuros distintivos cuyo lanzamiento gratuito ya se gastó. */
  signatureUsed:readonly string[];
}>;
export function initialWizardMagicState(level:number,subclass?:WizardSubclass):WizardMagicState{
  return {slots:createSlotPool(wizardProgression(level,subclass).spellSlots),
    arcaneRecoveryUsed:false,overchannelUses:0,signatureUsed:[]};
}
export function wizardUseSlot(state:WizardMagicState,slotLevel:number):WizardMagicState{
  return {...state,slots:useSpellSlot(state.slots,slotLevel)};
}
/** Declara la recuperación al finalizar un descanso corto. No permite niveles 6+. */
export function wizardArcaneRecovery(state:WizardMagicState,level:number,slotsToRestore:readonly number[],subclass?:WizardSubclass):WizardMagicState{
  const progression=wizardProgression(level,subclass);
  if(state.arcaneRecoveryUsed)throw new RangeError('Recuperación arcana ya gastada');
  if(!Array.isArray(slotsToRestore)||slotsToRestore.length===0||slotsToRestore.some(n=>!Number.isInteger(n)||n<1||n>5))
    throw new RangeError('Recuperación arcana solo restaura ranuras de niveles 1 a 5');
  const total=slotsToRestore.reduce((sum,n)=>sum+n,0);
  if(total>progression.arcaneRecoveryLimit)throw new RangeError('Superas el límite de Recuperación arcana');
  if(state.slots.maximum.join(',')!==progression.spellSlots.join(','))throw new RangeError('Estado y nivel de Mago desincronizados');
  return {...state,slots:restoreSpellSlots(state.slots,slotsToRestore),arcaneRecoveryUsed:true};
}
export function wizardLongRest(state:WizardMagicState,level:number,subclass?:WizardSubclass):WizardMagicState{
  const progression=wizardProgression(level,subclass);
  if(state.slots.maximum.join(',')!==progression.spellSlots.join(','))throw new RangeError('Estado y nivel de Mago desincronizados');
  return {...state,slots:longRestSpellSlots(state.slots),arcaneRecoveryUsed:false,
    overchannelUses:0,signatureUsed:[]};
}
/** Al subir de nivel, preserva las ranuras gastadas y añade las recién obtenidas;
 * no convierte una subida de nivel en un descanso largo gratuito.
 */
export function wizardAdvanceMagicState(state:WizardMagicState,fromLevel:number,subclass?:WizardSubclass):WizardMagicState{
  const old=wizardProgression(fromLevel,fromLevel>=3?subclass:undefined);
  const next=wizardProgression(fromLevel+1,fromLevel+1>=3?subclass:undefined);
  if(state.slots.maximum.join(',')!==old.spellSlots.join(','))throw new RangeError('Estado anterior desincronizado');
  const remaining=next.spellSlots.map((count,i)=>state.slots.remaining[i]+count-old.spellSlots[i]);
  return {...state,slots:createSlotPool(next.spellSlots,remaining)};
}

/** Reglas derivadas de Evocación; la aplicación no elige blancos ni decide impactos. */
function evokerLevel(level:number,featureLevel:number):void{
  wizardProgression(level,level>=3?'evoker':undefined);
  if(level<featureLevel)throw new RangeError(`Evocación requiere nivel ${featureLevel}`);
}
export function evokerPotentCantrip(level:number,rolledDamage:number,attackMissedOrSaveSucceeded:boolean):number{
  evokerLevel(level,3);
  if(!Number.isInteger(rolledDamage)||rolledDamage<0)throw new RangeError('Daño inválido');
  return attackMissedOrSaveSucceeded?Math.floor(rolledDamage/2):rolledDamage;
}
export function evokerSculptMaximum(level:number,spellLevel:number):number{
  evokerLevel(level,6);
  if(!Number.isInteger(spellLevel)||spellLevel<0||spellLevel>9)throw new RangeError('Nivel del conjuro inválido');
  return 1+spellLevel;
}
export function evokerEmpoweredDamageBonus(level:number,intelligenceModifier:number,isWizardEvocation:boolean):number{
  evokerLevel(level,10);
  if(!Number.isInteger(intelligenceModifier)||intelligenceModifier< -5||intelligenceModifier>10)
    throw new RangeError('Modificador de Inteligencia inválido');
  return isWizardEvocation?intelligenceModifier:0;
}
/** Sobrecarga maximiza dados de daño; el jugador/DM decide cuándo aplicarla.
 * Cada uso posterior al primero suma un dado d12 POR NIVEL DE RANURA.
 * No genera automáticamente daño sobre el personaje.
 */
export function evokerOverchannel(state:WizardMagicState,level:number,slotLevel:number):Readonly<{
  state:WizardMagicState;necroticDice:number;dieSides:12;ignoresResistanceAndImmunity:true;
}>{
  evokerLevel(level,14);
  if(!Number.isInteger(slotLevel)||slotLevel<1||slotLevel>5)throw new RangeError('Sobrecarga exige ranura de nivel 1 a 5');
  if(!Number.isInteger(state.overchannelUses)||state.overchannelUses<0)throw new RangeError('Contador de Sobrecarga inválido');
  const count=state.overchannelUses;
  return {state:{...state,overchannelUses:count+1},
    necroticDice:count===0?0:(count+1)*slotLevel,dieSides:12,ignoresResistanceAndImmunity:true};
}
/** Uso gratuito individual de Conjuros distintivos, sin consumir ranuras. */
export function wizardUseSignatureSpell(state:WizardMagicState,level:number,spellId:string,signatureIds:readonly string[]):WizardMagicState{
  wizardProgression(level,level>=3?'evoker':undefined);
  if(level<20)throw new RangeError('Conjuros distintivos se desbloquean en nivel 20');
  if(signatureIds.length!==2||new Set(signatureIds).size!==2||!signatureIds.includes(spellId))
    throw new RangeError('Conjuro no seleccionado como distintivo');
  if(state.signatureUsed.includes(spellId))throw new RangeError('Lanzamiento gratuito ya gastado');
  return {...state,signatureUsed:[...state.signatureUsed,spellId]};
}
export function wizardShortRest(state:WizardMagicState):WizardMagicState{
  return {...state,signatureUsed:[]};
}

/** Habilidades iniciales elegibles y salvaciones entrenadas del Mago.
 * Las elecciones concretas y los trasfondos se conectarán al creador en la fase 48.
 */
export const WIZARD_SKILL_OPTIONS=['arcana','history','insight','investigation','medicine','nature','religion'] as const;
export const WIZARD_SAVING_THROW_PROFICIENCIES=['intelligence','wisdom'] as const;
export const WIZARD_ARMOR_TRAINING=[] as const;
export const WIZARD_WEAPON_PROFICIENCIES=['simple'] as const;

export type WizardCoreStatistics=Readonly<{
  classId:'wizard';level:WizardLevel;hitDie:6;hitDiceTotal:number;
  maximumHitPoints:number;armorClassWithoutArmor:number;
  spellcastingAbility:'intelligence';spellAttackBonus:number;spellSaveDC:number;
  proficiencyBonus:number;intelligenceModifier:number;constitutionModifier:number;
}>;
/** PG con valores fijos oficiales (6 en primer nivel; 4 a partir del segundo).
 * Las bonificaciones por especie/dotes y CA con efectos no se suman en esta
 * proyección: el sistema principal de efectos las aplicará al integrarlo.
 */
export function wizardCoreStatistics(level:number,abilityScores:AbilityScores):WizardCoreStatistics{
  const progression=wizardProgression(level,level>=3?'evoker':undefined);
  const scores=validateAbilityScores(abilityScores);
  const con=abilityModifier(scores.constitution);
  const intelligence=abilityModifier(scores.intelligence);
  return {
    classId:'wizard',level:progression.level,hitDie:6,hitDiceTotal:level,
    maximumHitPoints:Math.max(1,6+con)+(level-1)*Math.max(1,4+con),
    armorClassWithoutArmor:10+abilityModifier(scores.dexterity),
    spellcastingAbility:'intelligence',spellAttackBonus:progression.proficiencyBonus+intelligence,
    spellSaveDC:8+progression.proficiencyBonus+intelligence,
    proficiencyBonus:progression.proficiencyBonus,
    intelligenceModifier:intelligence,constitutionModifier:con,
  };
}

/** Copiar al libro un conjuro encontrado: coste antes de descuentos del Sabio
 * o efectos externos, 50 po y dos horas por nivel (PHB 2024, p. 167).
 */
export function wizardSpellCopyCost(spellLevel:number):Readonly<{gold:number;hours:number}>{
  if(!Number.isInteger(spellLevel)||spellLevel<1||spellLevel>9)
    throw new RangeError('Se pueden copiar conjuros de niveles 1 a 9');
  return {gold:spellLevel*50,hours:spellLevel*2};
}

/** Comprueba si el libro habilita un lanzamiento ritual sin prepararlo.
 * El lanzador aún debe cumplir los requisitos del conjuro en la mesa.
 */
export function wizardCanRitualCast(spellId:string,spellbook:readonly WizardSpellReference[]):boolean{
  if(!idValid(spellId)||!Array.isArray(spellbook))throw new RangeError('Conjuro o libro inválido');
  return spellbook.some(spell=>spell.id===spellId&&spell.level>0&&spell.ritual===true);
}
