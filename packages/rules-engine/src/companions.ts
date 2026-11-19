import {ABILITIES,type AbilityScores} from './abilities';

/** Ficha manual común. No representa un rasgo que conceda criaturas automáticamente. */
export type CompanionAttack=Readonly<{id:string;name:string;attackBonus:number;damage:string;notes:string}>;
export type CompanionSheet=Readonly<{
 id:string;name:string;creatureType:string;size:string;armorClass:number;hitPoints:number;hitPointsMaximum:number;
 speed:string;challengeRating:string;proficiencyBonus:number;abilities:AbilityScores;savingThrows:string;skills:string;
 senses:string;languages:string;defenses:string;equipment:string;attacks:readonly CompanionAttack[];traits:string;actions:string;notes:string;
}>;
export const EMPTY_COMPANION:CompanionSheet={id:'',name:'',creatureType:'',size:'Mediano',armorClass:10,
 hitPoints:1,hitPointsMaximum:1,speed:'30 pies',challengeRating:'',proficiencyBonus:2,
 abilities:{strength:10,dexterity:10,constitution:10,intelligence:10,wisdom:10,charisma:10},
 savingThrows:'',skills:'',senses:'',languages:'',defenses:'',equipment:'',attacks:[],traits:'',actions:'',notes:''};

export function validateCompanionSheets(raw:unknown):readonly CompanionSheet[]{
 if(!Array.isArray(raw)||raw.length>20)throw new RangeError('Se admiten hasta 20 compañeros manuales');
 const ids=new Set<string>();
 const string=(value:unknown,max=2000)=>typeof value==='string'&&value.length<=max;
 const int=(value:unknown,min:number,max:number)=>typeof value==='number'&&Number.isInteger(value)&&value>=min&&value<=max;
 for(const entry of raw){
  if(!entry||typeof entry!=='object'||Array.isArray(entry))throw new RangeError('Ficha de compañero inválida');
  const sheet=entry as Record<string,unknown>;
  if(!string(sheet.id,120)||!(sheet.id as string).trim()||ids.has(sheet.id as string))throw new RangeError('Identificador de compañero inválido o repetido');
  ids.add(sheet.id as string);
  if(!string(sheet.name,120)||!(sheet.name as string).trim())throw new RangeError('El compañero debe tener nombre (máximo 120 caracteres)');
  for(const field of ['creatureType','size','speed','challengeRating','savingThrows','skills','senses','languages','defenses','equipment','traits','actions','notes'])if(!string(sheet[field]))throw new RangeError(`Campo de compañero inválido: ${field}`);
  if(!int(sheet.armorClass,0,40)||!int(sheet.hitPoints,0,100000)||!int(sheet.hitPointsMaximum,1,100000)||
     (sheet.hitPoints as number)>(sheet.hitPointsMaximum as number)||!int(sheet.proficiencyBonus,0,15))throw new RangeError('Defensas o puntos de golpe de compañero inválidos');
  const scores=sheet.abilities;
  if(!scores||typeof scores!=='object'||Array.isArray(scores)||ABILITIES.some(a=>!int((scores as Record<string,unknown>)[a],1,30)))throw new RangeError('Características de compañero inválidas');
  if(!Array.isArray(sheet.attacks)||sheet.attacks.length>20)throw new RangeError('Ataques del compañero inválidos');
  const attackIds=new Set<string>();
  for(const attack of sheet.attacks){
   if(!attack||typeof attack!=='object'||Array.isArray(attack))throw new RangeError('Ataque inválido');
   const data=attack as Record<string,unknown>;
   if(!string(data.id,120)||!(data.id as string).trim()||attackIds.has(data.id as string)||!string(data.name,120)||!(data.name as string).trim()||
      !int(data.attackBonus,-50,50)||!string(data.damage,250)||!string(data.notes,2000))throw new RangeError('Datos de ataque de compañero inválidos');
   attackIds.add(data.id as string);
  }
 }
 return raw as CompanionSheet[];
}
