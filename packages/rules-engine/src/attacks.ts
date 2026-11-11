/** Fase 4.3 · Ataques con armas D&D 2024, niveles 1–7 del Guerrero.
 * Datos mecánicos normalizados del PHB 2024, pp. 12, 25-28, 96, 209-210, 213-215.
 * Calculador puro: no modifica criaturas, inventarios ni estados de partida.
 */
import type { CalculatedFighterSheet } from './sheet';
import { WEAPONS, type WeaponId, type MasteryId, type FightingStyleId } from './martial';
import type { InventoryState } from './inventory';
import {validateMagicWards,type EnhancementBonus} from './magic-wards';

export type DamageType = 'bludgeoning' | 'piercing' | 'slashing';
export type DamageDice = Readonly<{ count: number; sides: number }>;
export type WeaponStats = Readonly<{
  kind: 'melee' | 'ranged';
  dice: DamageDice | null;
  fixedDamage?: number;
  damageType: DamageType;
  finesse?: boolean;
  light?: boolean;
  heavy?: boolean;
  twoHanded?: boolean;
  versatileSides?: number;
  reach?: boolean;
  thrownRange?: readonly [number, number];
  rangedRange?: readonly [number, number];
  ammunition?: 'arrow' | 'bolt' | 'bullet' | 'needle' | 'sling_bullet';
  loading?: boolean;
}>;
const die = (sides:number,count=1):DamageDice => ({sides,count});
/** Catálogo de estadísticas, no de equipo comercial. No cambia la lista pública de maestrías. */
export const WEAPON_STATS: Readonly<Record<WeaponId,WeaponStats>> = {
  club:{kind:'melee',dice:die(4),damageType:'bludgeoning',light:true},
  dagger:{kind:'melee',dice:die(4),damageType:'piercing',finesse:true,light:true,thrownRange:[20,60]},
  greatclub:{kind:'melee',dice:die(8),damageType:'bludgeoning',twoHanded:true},
  handaxe:{kind:'melee',dice:die(6),damageType:'slashing',light:true,thrownRange:[20,60]},
  javelin:{kind:'melee',dice:die(6),damageType:'piercing',thrownRange:[30,120]},
  light_hammer:{kind:'melee',dice:die(4),damageType:'bludgeoning',light:true,thrownRange:[20,60]},
  mace:{kind:'melee',dice:die(6),damageType:'bludgeoning'},
  quarterstaff:{kind:'melee',dice:die(6),damageType:'bludgeoning',versatileSides:8},
  sickle:{kind:'melee',dice:die(4),damageType:'slashing',light:true},
  spear:{kind:'melee',dice:die(6),damageType:'piercing',versatileSides:8,thrownRange:[20,60]},
  dart:{kind:'ranged',dice:die(4),damageType:'piercing',finesse:true,thrownRange:[20,60]},
  light_crossbow:{kind:'ranged',dice:die(8),damageType:'piercing',twoHanded:true,rangedRange:[80,320],ammunition:'bolt',loading:true},
  shortbow:{kind:'ranged',dice:die(6),damageType:'piercing',twoHanded:true,rangedRange:[80,320],ammunition:'arrow'},
  sling:{kind:'ranged',dice:die(4),damageType:'bludgeoning',rangedRange:[30,120],ammunition:'sling_bullet'},
  battleaxe:{kind:'melee',dice:die(8),damageType:'slashing',versatileSides:10},
  flail:{kind:'melee',dice:die(8),damageType:'bludgeoning'},
  glaive:{kind:'melee',dice:die(10),damageType:'slashing',heavy:true,twoHanded:true,reach:true},
  greataxe:{kind:'melee',dice:die(12),damageType:'slashing',heavy:true,twoHanded:true},
  greatsword:{kind:'melee',dice:die(6,2),damageType:'slashing',heavy:true,twoHanded:true},
  halberd:{kind:'melee',dice:die(10),damageType:'slashing',heavy:true,twoHanded:true,reach:true},
  lance:{kind:'melee',dice:die(10),damageType:'piercing',heavy:true,twoHanded:true,reach:true},
  longsword:{kind:'melee',dice:die(8),damageType:'slashing',versatileSides:10},
  maul:{kind:'melee',dice:die(6,2),damageType:'bludgeoning',heavy:true,twoHanded:true},
  morningstar:{kind:'melee',dice:die(8),damageType:'piercing'},
  pike:{kind:'melee',dice:die(10),damageType:'piercing',heavy:true,twoHanded:true,reach:true},
  rapier:{kind:'melee',dice:die(8),damageType:'piercing',finesse:true},
  scimitar:{kind:'melee',dice:die(6),damageType:'slashing',finesse:true,light:true},
  shortsword:{kind:'melee',dice:die(6),damageType:'piercing',finesse:true,light:true},
  trident:{kind:'melee',dice:die(8),damageType:'piercing',versatileSides:10,thrownRange:[20,60]},
  warhammer:{kind:'melee',dice:die(8),damageType:'bludgeoning',versatileSides:10},
  war_pick:{kind:'melee',dice:die(8),damageType:'piercing',versatileSides:10},
  whip:{kind:'melee',dice:die(4),damageType:'slashing',finesse:true,reach:true},
  blowgun:{kind:'ranged',dice:null,fixedDamage:1,damageType:'piercing',rangedRange:[25,100],ammunition:'needle',loading:true},
  hand_crossbow:{kind:'ranged',dice:die(6),damageType:'piercing',light:true,rangedRange:[30,120],ammunition:'bolt',loading:true},
  heavy_crossbow:{kind:'ranged',dice:die(10),damageType:'piercing',heavy:true,twoHanded:true,rangedRange:[100,400],ammunition:'bolt',loading:true},
  longbow:{kind:'ranged',dice:die(8),damageType:'piercing',heavy:true,twoHanded:true,rangedRange:[150,600],ammunition:'arrow'},
  musket:{kind:'ranged',dice:die(12),damageType:'piercing',twoHanded:true,rangedRange:[40,120],ammunition:'bullet',loading:true},
  pistol:{kind:'ranged',dice:die(10),damageType:'piercing',rangedRange:[30,90],ammunition:'bullet',loading:true},
};
export type WeaponAttackOptions = Readonly<{
  /** Obligatorio solo para armas con Sutileza si se quiere usar Destreza en lugar de Fuerza. */
  ability?: 'strength' | 'dexterity';
  thrown?: boolean;
  twoHanded?: boolean;
  /** Ataque extra de la propiedad Ligera. Debe habilitarlo el turno/segunda arma, comprobados por la mesa. */
  lightExtraAttack?: boolean;
  /** Para Duelo, indica si se está sosteniendo otra arma en la otra mano. */
  otherWeaponHeld?: boolean;
  /** Contexto situacional, no se infiere de la hoja. */
  adjacentEnemy?: boolean;
  advantage?: boolean;
  /** Fuentes externas identificadas por el motor de condiciones. */
  conditionAdvantage?: boolean;
  conditionDisadvantage?: boolean;
  /** Penalización al test d20 por agotamiento (0 a -12). */
  conditionD20Penalty?: number;
  targetDistanceFeet?: number;
}>;
export type WeaponAttackProfile = Readonly<{
  weaponId: WeaponId; weaponName: string; ability:'strength'|'dexterity'; abilityModifier:number;
  /** Identidad de la instancia: nunca se mejora otra copia de la misma arma. */
  magicWeaponInstanceId?:string; magicEnhancement?:EnhancementBonus;
  attackBonus:number; damageModifier:number; damageDice:DamageDice|null; fixedDamage:number;
  damageType:DamageType; mode:'normal'|'advantage'|'disadvantage';
  criticalMinimum:19|20; mastery:MasteryId|null; masterySaveDC:number|null;
  grazeOnMiss:number|null;
  thrown:boolean; twoHanded:boolean; lightExtraAttack:boolean;
  range:readonly [number,number]|null;
  ammunition:WeaponStats['ammunition']; greatWeaponFighting:boolean;
  notes:readonly string[];
}>;
function integerBetween(v:unknown,min:number,max:number,label:string):number{
  if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max)throw new RangeError(`${label}: valor fuera de rango`);
  return v;
}
function isWeapon(id:unknown):id is WeaponId{return typeof id==='string'&&Object.hasOwn(WEAPON_STATS,id);}
export function ownedWeapons(inventory:InventoryState):WeaponId[]{
  if(!inventory||!Array.isArray(inventory.items))throw new RangeError('Inventario requerido');
  return inventory.items.filter(item=>isWeapon(item.id)&&item.quantity>0).map(item=>item.id as WeaponId);
}
export function calculateWeaponAttack(
  sheet:CalculatedFighterSheet, weaponId:WeaponId, style:FightingStyleId|readonly FightingStyleId[],
  masteries:readonly WeaponId[], options:WeaponAttackOptions={}
):WeaponAttackProfile {
  if(!sheet||sheet.classId!=='fighter'||sheet.ruleset!=='dnd-2024'||sheet.level<1||sheet.level>7)throw new RangeError('Hoja de Guerrero 2024 nivel 1–7 requerida');
  if(!isWeapon(weaponId))throw new RangeError('Arma desconocida');
  const styles:readonly FightingStyleId[]=typeof style==='string'?[style]:style;
  if(!Array.isArray(styles)||styles.length<1||styles.length>(sheet.level>=7?2:1)||new Set(styles).size!==styles.length||styles.some(s=>!['archery','blind_fighting','defense','dueling','great_weapon_fighting','interception','protection','thrown_weapon_fighting','two_weapon_fighting','unarmed_fighting'].includes(s)))throw new RangeError('Estilos de combate desconocidos, duplicados o no desbloqueados');
  if(!Array.isArray(masteries)||masteries.length!==(sheet.level>=4?4:3)||new Set(masteries).size!==(sheet.level>=4?4:3)||masteries.some(x=>!isWeapon(x)))throw new RangeError('Maestrías de Guerrero inválidas para su nivel');
  if(!options||typeof options!=='object'||Array.isArray(options))throw new RangeError('Opciones de ataque inválidas');
  for(const key of Object.keys(options))if(!['ability','thrown','twoHanded','lightExtraAttack','otherWeaponHeld','adjacentEnemy','advantage','conditionAdvantage','conditionDisadvantage','conditionD20Penalty','targetDistanceFeet'].includes(key))throw new RangeError('Opción de ataque desconocida');
  for(const key of ['thrown','twoHanded','lightExtraAttack','otherWeaponHeld','adjacentEnemy','advantage','conditionAdvantage','conditionDisadvantage'] as const)if(options[key]!==undefined&&typeof options[key]!=='boolean')throw new RangeError(`${key} debe ser booleano`);
  if(options.conditionD20Penalty!==undefined&&(typeof options.conditionD20Penalty!=='number'||!Number.isSafeInteger(options.conditionD20Penalty)||options.conditionD20Penalty>0||options.conditionD20Penalty< -12||options.conditionD20Penalty%2!==0))throw new RangeError('Penalización d20 de condición inválida');
  const w=WEAPON_STATS[weaponId];
  const thrown=options.thrown===true || (w.kind==='ranged'&&!w.rangedRange&&Boolean(w.thrownRange));
  const twoHanded=w.twoHanded===true||(options.twoHanded===true&&w.versatileSides!==undefined);
  if(thrown&&!w.thrownRange)throw new RangeError('Esta arma no tiene la propiedad Arrojadiza');
  if(thrown&&w.twoHanded)throw new RangeError('Esta arma requiere dos manos');
  if(options.twoHanded&&!w.twoHanded&&!w.versatileSides)throw new RangeError('Esta arma no puede usarse a dos manos');
  if(thrown&&options.twoHanded)throw new RangeError('No se puede arrojar un arma empuñada a dos manos');
  if(options.lightExtraAttack&&!w.light)throw new RangeError('El ataque extra requiere un arma Ligera');
  if(options.lightExtraAttack&&!options.otherWeaponHeld)throw new RangeError('El ataque extra requiere otra arma en la otra mano');
  if(options.lightExtraAttack&&twoHanded)throw new RangeError('Un ataque extra Ligero no se efectúa a dos manos');
  if(options.otherWeaponHeld&&twoHanded)throw new RangeError('No puedes sujetar otra arma al atacar a dos manos');
  if(options.targetDistanceFeet!==undefined&&(typeof options.targetDistanceFeet!=='number'||!Number.isFinite(options.targetDistanceFeet)||options.targetDistanceFeet<0||options.targetDistanceFeet>10_000))throw new RangeError('Distancia de objetivo inválida');
  const ability=options.ability??(w.kind==='ranged'?'dexterity':'strength');
  if(ability!=='strength'&&ability!=='dexterity')throw new RangeError('Característica de ataque desconocida');
  if(!w.finesse&&ability!==(w.kind==='ranged'?'dexterity':'strength'))throw new RangeError('Solo las armas con Sutileza permiten elegir Fuerza o Destreza');
  const modifier=sheet.abilityModifiers[ability];
  const baseDice=(!thrown&&options.twoHanded&&w.versatileSides)?die(w.versatileSides):w.dice;
  const range=thrown?w.thrownRange??null:w.kind==='ranged'?w.rangedRange??w.thrownRange??null:null;
  const rangedAttack=thrown||w.kind==='ranged';
  const notes:string[]=[];
  let attackBonus=modifier+sheet.proficiencyBonus; // Guerrero: competencia con armas simples y marciales.
  if(styles.includes('archery')&&w.kind==='ranged')attackBonus+=2;
  attackBonus+=options.conditionD20Penalty??0;
  let damageModifier=options.lightExtraAttack&&!styles.includes('two_weapon_fighting')?Math.min(0,modifier):modifier;
  if(styles.includes('dueling')&&w.kind==='melee'&&!twoHanded&&!options.otherWeaponHeld&&!thrown)damageModifier+=2;
  if(styles.includes('thrown_weapon_fighting')&&thrown)damageModifier+=2;
  if(options.lightExtraAttack)notes.push('Confirma que el ataque adicional está permitido por Ligera y que utilizas otra arma.');
  if(styles.includes('great_weapon_fighting')&&w.kind==='melee'&&twoHanded&&(w.twoHanded||w.versatileSides))notes.push('Combate con arma a dos manos: cada dado de daño del arma con resultado 1 o 2 se trata como 3.');
  if(weaponId==='lance'&&twoHanded)notes.push('La lanza de caballería puede manejarse con una mano estando montado: este prototipo no modela ese caso.');
  if(w.loading)notes.push('Carga: limita la cantidad de proyectiles por acción, acción adicional o reacción.');
  if(w.ammunition)notes.push('Se requiere munición adecuada. Este cálculo no la consume del inventario.');
  if(rangedAttack&&options.adjacentEnemy)notes.push('Ataque a distancia junto a un enemigo activo: desventaja.');
  if(!rangedAttack&&options.adjacentEnemy)notes.push('Estar junto a un enemigo no penaliza por sí solo un ataque cuerpo a cuerpo.');
  let disadvantage=(w.heavy&&sheet.abilityScores[w.kind==='ranged'?'dexterity':'strength']<13)||Boolean(rangedAttack&&options.adjacentEnemy);
  if(w.heavy&&sheet.abilityScores[w.kind==='ranged'?'dexterity':'strength']<13)notes.push('Arma Pesada sin característica mínima 13: desventaja.');
  if(options.targetDistanceFeet!==undefined){
    if(range){if(options.targetDistanceFeet>range[1])throw new RangeError('Objetivo fuera del alcance máximo del arma');
      if(options.targetDistanceFeet>range[0]){disadvantage=true;notes.push('Objetivo más allá del alcance normal: desventaja.');}}
    else if(options.targetDistanceFeet>(w.reach?10:5))throw new RangeError('Objetivo fuera del alcance cuerpo a cuerpo');
  }
  const adv=options.advantage===true||options.conditionAdvantage===true;
  const dis=disadvantage||options.conditionDisadvantage===true;
  const mode=adv&&dis?'normal':dis?'disadvantage':adv?'advantage':'normal';
  const mastery=masteries.includes(weaponId)?WEAPONS[weaponId].mastery:null;
  const masterySaveDC=mastery==='Topple'?8+sheet.proficiencyBonus+modifier:null;
  const grazeOnMiss=mastery==='Graze'?Math.max(0,modifier):null;
  if(mastery){
    const hint:Record<MasteryId,string>={
      Cleave:'Tajo: un posible segundo objetivo cercano; se resuelve en la mesa.',
      Graze:'Rozar: si falla contra una criatura, puede causar daño igual al modificador usado para atacar.',
      Nick:'Mella: el ataque extra de Ligera puede formar parte de la acción Atacar una vez por turno.',
      Push:'Empujar: desplazamiento posible según el tamaño del objetivo.',
      Sap:'Debilitar: el objetivo puede sufrir desventaja en su próximo ataque.',
      Slow:'Ralentizar: la velocidad del objetivo puede reducirse temporalmente.',
      Topple:'Derribar: el objetivo puede necesitar una salvación de Constitución.',
      Vex:'Hostigar: puede conceder ventaja en el siguiente ataque contra el objetivo.'
    };
    notes.push(hint[mastery]);
  }
  const greatWeaponFighting=styles.includes('great_weapon_fighting')&&w.kind==='melee'&&twoHanded&&Boolean(w.twoHanded||w.versatileSides);
  const fixedDamage=w.fixedDamage??0;
  return {weaponId,weaponName:WEAPONS[weaponId].name,ability,abilityModifier:modifier,attackBonus,damageModifier,
    damageDice:baseDice??null,fixedDamage,damageType:w.damageType,mode,criticalMinimum:sheet.subclass==='champion'?19:20,
    mastery,masterySaveDC,grazeOnMiss,thrown,twoHanded,lightExtraAttack:Boolean(options.lightExtraAttack),range,
    ammunition:w.ammunition,greatWeaponFighting,notes};
}
export type AttackResolution = Readonly<{
  naturalRoll:number;selectedRoll:number;attackTotal:number;critical:boolean;hit:boolean|null;
  damageDiceNeeded:number;damageTotal:number|null;grazeDamage:number|null;notes:readonly string[];
}>;
/** Las tiradas se introducen manualmente. Si AC es null, no se supone que impacta. */
export function resolveWeaponAttack(profile:WeaponAttackProfile,params:Readonly<{
  firstD20:number;secondD20?:number;targetAC?:number;damageRolls?:readonly number[];
}>):AttackResolution {
  if(!profile||!params)throw new RangeError('Ataque incompleto');
  const first=integerBetween(params.firstD20,1,20,'Primer d20');
  if(profile.mode!=='normal'&&params.secondD20===undefined)throw new RangeError('Ventaja/desventaja requiere un segundo d20');
  if(profile.mode==='normal'&&params.secondD20!==undefined)throw new RangeError('La tirada normal utiliza un solo d20');
  const second=params.secondD20===undefined?first:integerBetween(params.secondD20,1,20,'Segundo d20');
  const selected=profile.mode==='advantage'?Math.max(first,second):profile.mode==='disadvantage'?Math.min(first,second):first;
  if(params.targetAC!==undefined)integerBetween(params.targetAC,0,100,'CA del objetivo');
  const critical=selected>=profile.criticalMinimum;
  const hit=selected===1?false:critical?true:params.targetAC===undefined?null:selected+profile.attackBonus>=params.targetAC;
  const needed=profile.damageDice?.count?(profile.damageDice.count*(critical?2:1)):0;
  let damageTotal:number|null=null;
  if(needed===0)damageTotal=hit===false?0:Math.max(0,profile.fixedDamage+profile.damageModifier);
  if(params.damageRolls!==undefined){
    if(!Array.isArray(params.damageRolls)||params.damageRolls.length!==needed)throw new RangeError(`Se necesitan ${needed} resultados de dados de daño`);
    for(const value of params.damageRolls)integerBetween(value,1,profile.damageDice?.sides??1,'Dado de daño');
    // Al fallar, los dados no causan daño. Solo se ofrece Rozar si la maestría aplica.
    if(hit===false)damageTotal=0;
    else damageTotal=Math.max(0,params.damageRolls.reduce((sum,value)=>sum+(profile.greatWeaponFighting?Math.max(3,value):value),profile.fixedDamage+profile.damageModifier));
  }
  const grazeDamage=hit===false?profile.grazeOnMiss:null;
  const notes=[...profile.notes];
  if(hit===null)notes.push('Sin CA de objetivo no se determina impacto; valida el resultado con el director.');
  if(critical)notes.push('Crítico: se tiran dos veces los dados de daño del arma; el modificador se añade una sola vez.');
  if(grazeDamage!==null)notes.push(`Rozar: puedes infligir ${grazeDamage} de daño si el objetivo es una criatura válida.`);
  return {naturalRoll:selected,selectedRoll:selected,attackTotal:selected+profile.attackBonus,critical,hit,
    damageDiceNeeded:needed,damageTotal,grazeDamage,notes};
}
/** Regla de Combate con arma a dos manos: solo modifica los dados del arma, no otros dados. */
export function adjustGreatWeaponDice(raw:readonly number[],style:FightingStyleId,profile:WeaponAttackProfile):number[]{
  if(!Array.isArray(raw))throw new RangeError('Dados inválidos');
  for(const value of raw)integerBetween(value,1,profile.damageDice?.sides??1,'Dado de daño');
  if(style!=='great_weapon_fighting'||!profile.twoHanded||!WEAPON_STATS[profile.weaponId].twoHanded&&!WEAPON_STATS[profile.weaponId].versatileSides||WEAPON_STATS[profile.weaponId].kind!=='melee')return [...raw];
  return raw.map(v=>Math.max(3,v));
}

/** Diferencia las armas comunes de CADA instancia mágica del inventario.
 * Una espada mundana y dos espadas mágicas siempre dan tres opciones distintas.
 */
export type OwnedWeaponChoice=Readonly<{
  selectionId:string; weaponId:WeaponId; label:string;
  magicWeaponInstanceId?:string; enhancement?:EnhancementBonus;
}>;
export function ownedWeaponChoices(inventory:InventoryState):OwnedWeaponChoice[]{
  const mundane=ownedWeapons(inventory).map(weaponId=>({selectionId:`normal:${weaponId}`,weaponId,label:WEAPONS[weaponId].name}));
  const magical=validateMagicWards(inventory.magicItems??[]).filter(x=>x.itemId==='weapon_enhancement'&&x.worn).map(item=>({
    selectionId:`magic:${item.instanceId}`,weaponId:item.weaponId!,
    label:`${WEAPONS[item.weaponId!].name} +${item.enhancement} (${item.instanceId})`,
    magicWeaponInstanceId:item.instanceId,enhancement:item.enhancement,
  }));
  return [...mundane,...magical];
}
/** Calcula el bonificador mágico UNA sola vez, para la instancia seleccionada.
 * No modifica maestrías, cantidad de dados del crítico, ni daño de Rozar en un fallo.
 */
export function calculateOwnedWeaponAttack(sheet:CalculatedFighterSheet,inventory:InventoryState,
  selectionId:string,style:FightingStyleId|readonly FightingStyleId[],masteries:readonly WeaponId[],options:WeaponAttackOptions={}
):WeaponAttackProfile{
  const choice=ownedWeaponChoices(inventory).find(c=>c.selectionId===selectionId);
  if(!choice)throw new RangeError('No posees o no tienes preparada esa arma');
  const base=calculateWeaponAttack(sheet,choice.weaponId,style,masteries,options);
  if(!choice.magicWeaponInstanceId)return base;
  const improvement=choice.enhancement!;
  return {...base,weaponName:choice.label,attackBonus:base.attackBonus+improvement,
    damageModifier:base.damageModifier+improvement,
    magicWeaponInstanceId:choice.magicWeaponInstanceId,magicEnhancement:improvement,
    notes:[...base.notes,`Bonificador +${improvement} por esta arma mágica. No se duplica en críticos ni en Rozar.`]};
}
