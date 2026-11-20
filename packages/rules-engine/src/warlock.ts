/** Paso 66: Brujo nivel 1, reglas D&D 2024.
 * Elecciones, proyección, acciones y estado persistido están separados.
 * Patrón Infernal se elige en nivel 3: no concede rasgos prematuros.
 */
import {ABILITIES,abilityModifiers,type Ability,type AbilityScores} from './abilities';
import {validateGeneratedAbilities,type AbilityGenerationMethod} from './ability-generation';
import {validateCompanionSheets,type CompanionSheet} from './companions';
import {SKILLS,calculateSkillBonuses,calculateSavingThrows,type Skill} from './proficiencies';
import {BACKGROUNDS,SPECIES_NAMES,type BackgroundId,type SpeciesId,type ElfLineage} from './guided';
import {EMPTY_CHARACTER_PROFILE,validateCharacterProfile,type CharacterProfile} from './character-profile';
import {calculateArmorClass} from './defense';
import {equippedArmor,type InventoryAction,type InventoryState} from './inventory';
import {WEAPONS,type WeaponId} from './martial';
import {WEAPON_STATS} from './attacks';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS,WARLOCK_SPELLS_THROUGH_LEVEL_TWO,WARLOCK_FIEND_LEVEL_THREE_IDS,TOME_CANTRIP_OPTIONS,TOME_RITUAL_OPTIONS} from './warlock-spells';
import {warlockInventory,type WarlockEquipmentChoice} from './warlock-inventory';
import type {BackgroundEquipmentChoice} from './background-equipment';

export const WARLOCK_SKILL_OPTIONS=['arcana','deception','history','intimidation','investigation','nature','religion'] as const satisfies readonly Skill[];
export type WarlockSkill=(typeof WARLOCK_SKILL_OPTIONS)[number];
export const WARLOCK_INVOCATIONS={
 armor_of_shadows:{minLevel:1,name:'Armadura de sombras',summary:'Armadura de mago sobre ti sin consumir ranura; el jugador activa el conjuro.'},
 eldritch_mind:{minLevel:1,name:'Mente sobrenatural',summary:'Ventaja en salvaciones de Constitución para mantener la concentración.'},
 pact_of_blade:{minLevel:1,name:'Pacto de la Hoja',summary:'Arma cuerpo a cuerpo vinculada; competencia y Carisma para ataque y daño, si está equipada.'},
 pact_of_chain:{minLevel:1,name:'Pacto de la Cadena',summary:'Encontrar familiar sin gastar ranura; puede tener formas especiales.'},
 pact_of_tome:{minLevel:1,name:'Pacto del Tomo',summary:'Libro de las sombras con tres trucos y dos rituales de nivel 1, mientras lo lleves.'},
 agonizing_blast:{minLevel:2,name:'Descarga agonizante',summary:'Añade Carisma al daño del truco dañino elegido; Descarga sobrenatural se calcula automáticamente.'},
 devils_sight:{minLevel:2,name:'Vista del diablo',summary:'Ves normalmente en luz tenue y oscuridad, incluso mágica, hasta 120 pies.'},
 eldritch_spear:{minLevel:2,name:'Lanza sobrenatural',summary:'Aumenta el alcance del truco dañino elegido 30 pies por nivel de Brujo.'},
 fiendish_vigor:{minLevel:2,name:'Vigor infernal',summary:'Puedes lanzar Vida falsa sobre ti sin gastar ranura y obtienes el máximo de los dados de PG temporales.'},
 lessons_of_the_first_ones:{minLevel:2,name:'Lecciones de los Primeros',summary:'Adquieres una dote de origen elegida; en esta fase se admiten Alerta y Duro.'},
 mask_of_many_faces:{minLevel:2,name:'Máscara de muchos rostros',summary:'Puedes lanzar Disfrazarse sin consumir una ranura.'},
 misty_visions:{minLevel:2,name:'Visiones brumosas',summary:'Puedes lanzar Imagen silenciosa sin gastar ranura.'},
 otherworldly_leap:{minLevel:2,name:'Salto sobrenatural',summary:'Puedes lanzar Salto sobre ti sin gastar ranura.'},
 repelling_blast:{minLevel:2,name:'Descarga repelente',summary:'El truco dañino elegido puede empujar hasta 10 pies al impactar (resolución manual).'}
} as const;
export type WarlockInvocationId=keyof typeof WARLOCK_INVOCATIONS;
export const WARLOCK_LEVEL_ONE_INVOCATIONS=(Object.keys(WARLOCK_INVOCATIONS) as WarlockInvocationId[]).filter(id=>WARLOCK_INVOCATIONS[id].minLevel===1);
export const WARLOCK_LEVEL_TWO_INVOCATIONS=Object.keys(WARLOCK_INVOCATIONS) as WarlockInvocationId[];
export const WARLOCK_FAMILIARS={
 imp:'Diablillo',pseudodragon:'Pseudodragón',quasit:'Quasit',skeleton:'Esqueleto',
 slaad_tadpole:'Renacuajo slaad',sphinx_of_wonder:'Esfinge maravillosa',
 sprite:'Duende',venomous_snake:'Serpiente venenosa',
 bat:'Murciélago',cat:'Gato',crab:'Cangrejo',frog:'Rana',hawk:'Halcón',
 lizard:'Lagarto',octopus:'Pulpo',owl:'Búho',poisonous_snake:'Serpiente',
 fish:'Pez',rat:'Rata',raven:'Cuervo',sea_horse:'Caballito de mar',
 spider:'Araña',weasel:'Comadreja'
} as const;
export type FamiliarForm=keyof typeof WARLOCK_FAMILIARS;
const SIMPLE_WEAPONS=new Set<WeaponId>(['club','dagger','greatclub','handaxe','javelin','light_hammer','mace','quarterstaff','sickle','spear','dart','light_crossbow','shortbow','sling']);

/** Historial de elecciones y efectos del nivel 2, para un descenso 3→2 reversible. */
export type WarlockLevelTwoHistory=Readonly<{
 invocations:readonly WarlockInvocationId[];cantripIds:readonly string[];preparedIds:readonly string[];
 lessonsFeat?:'alert'|'tough';pactWeaponId?:WeaponId;
 tomeCantripIds?:readonly string[];tomeRitualIds?:readonly string[];
 mageArmorActive:boolean;tomePresent:boolean;familiarForm:FamiliarForm|null;familiarName:string;
}>;
export type GuidedWarlockInput=Readonly<{
 classId:'warlock';level:1|2|3;name:string;profile?:CharacterProfile;
 background:BackgroundId;species:SpeciesId;assignedAbilities:AbilityScores;
 abilityGenerationMethod?:AbilityGenerationMethod;
 companions?:readonly CompanionSheet[];
 increaseMode:'two_plus_one'|'three_ones';plusTwoAbility:Ability;plusOneAbility:Ability;
 warlockSkills:readonly WarlockSkill[];humanSkill?:Skill;humanFeat?:'alert'|'tough';
 humanSize?:'small'|'medium';elfLineage?:ElfLineage;
 equipmentChoice:WarlockEquipmentChoice;backgroundEquipment?:BackgroundEquipmentChoice;
 inventoryActions?:readonly InventoryAction[];
 cantripIds:readonly string[];preparedIds:readonly string[];
 invocations:readonly WarlockInvocationId[];
 /** Dado de golpe del nivel 2: 5 es el promedio reglamentario; 1..8 si se tira. */
 level2HitDieRoll?:number;
 /** Dado de golpe del nivel 3: 5 de media, o resultado manual de 1d8. */
 level3HitDieRoll?:number;
 /** Primera subclase disponible: Patrón Infernal, desde nivel 3. */
 subclassId?:'fiend';
 level3History?:WarlockLevelTwoHistory;
 /** Dote de origen escogida mediante Lecciones de los Primeros (subconjunto implementado). */
 lessonsFeat?:'alert'|'tough';
 pactWeaponId?:WeaponId;
 tomeCantripIds?:readonly string[];
 tomeRitualIds?:readonly string[];
}>;
export type WarlockOneState=Readonly<{
 hitPointsCurrent:number;temporaryHitPoints:number;heroicInspiration:boolean;
 pactSlotSpent:boolean;
 secondPactSlotSpent?:boolean;
 magicalCunningUsed?:boolean;
 mageArmorActive:boolean;
 tomePresent:boolean;
 familiarForm:FamiliarForm|null;
 familiarName:string;
 manualDeathMarks?:Readonly<{successes:readonly [boolean,boolean,boolean];failures:readonly [boolean,boolean,boolean]}>;
}>;
export type CalculatedWarlockOne=Readonly<{
 level:1|2|3;name:string;abilityScores:AbilityScores;
 abilityModifiers:ReturnType<typeof abilityModifiers>;
 proficiencyBonus:2;skillBonuses:ReturnType<typeof calculateSkillBonuses>;
 savingThrowBonuses:ReturnType<typeof calculateSavingThrows>;
 skillProficiencies:readonly Skill[];
 maximumHitPoints:number;armorClass:number;armorDescription:string;initiative:number;
 speedFeet:number;size:'small'|'medium';spellAttackBonus:number;spellSaveDC:number;
 inventory:InventoryState;invocations:readonly WarlockInvocationId[];
}>;
const validSkill=(value:unknown):value is Skill=>typeof value==='string'&&(SKILLS as readonly string[]).includes(value);
const uniqueChoices=(list:readonly string[],allowed:readonly string[],count:number,label:string)=>{
 if(!Array.isArray(list)||list.length!==count||new Set(list).size!==count||list.some(id=>typeof id!=='string'||!allowed.includes(id)))throw new RangeError(label+': elige '+count+' opciones distintas del catálogo');
};
export function warlockInputForPreview(input:GuidedWarlockInput):GuidedWarlockInput{
 return input.name.trim()?input:{...input,name:'Brujo provisional'};
}
export function calculateWarlockOne(input:GuidedWarlockInput,state?:Pick<WarlockOneState,'mageArmorActive'>):CalculatedWarlockOne{
 if(!input||input.classId!=='warlock'||![1,2,3].includes(input.level))throw new RangeError('Solo se admite Brujo de niveles 1 a 3');
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>120)throw new RangeError('Introduce el nombre del Brujo');
 const bg=BACKGROUNDS[input.background];
 if(!bg||!Object.hasOwn(SPECIES_NAMES,input.species))throw new RangeError('Origen no disponible');
 const assigned=validateGeneratedAbilities(input.assignedAbilities,input.abilityGenerationMethod??'standard_array');
 if(input.companions!==undefined)validateCompanionSheets(input.companions);
 const scores={...assigned};const permitted=bg.abilities as readonly Ability[];
 if(input.increaseMode==='two_plus_one'){
  if(!permitted.includes(input.plusTwoAbility)||!permitted.includes(input.plusOneAbility)||input.plusOneAbility===input.plusTwoAbility)throw new RangeError('Dos características de trasfondo diferentes requeridas');
  scores[input.plusTwoAbility]+=2;scores[input.plusOneAbility]+=1;
 }else if(input.increaseMode==='three_ones'){
  for(const a of permitted)scores[a]+=1;
 }else throw new RangeError('Mejora de trasfondo desconocida');
 if(ABILITIES.some(a=>scores[a]>20))throw new RangeError('Las mejoras no pueden superar 20');
 if(!Array.isArray(input.warlockSkills)||input.warlockSkills.length!==2||new Set(input.warlockSkills).size!==2||
  input.warlockSkills.some(s=>!WARLOCK_SKILL_OPTIONS.includes(s)||(bg.skills as readonly string[]).includes(s)))
  throw new RangeError('Elige dos competencias distintas de Brujo no concedidas por el trasfondo');
 if(input.species==='human'){
  if(!validSkill(input.humanSkill)||[...bg.skills,...input.warlockSkills].includes(input.humanSkill as never)||!['alert','tough'].includes(input.humanFeat??'')||input.humanFeat===bg.feat)
   throw new RangeError('El humano necesita una competencia adicional no repetida y una dote de origen distinta');
  if(input.humanSize!==undefined&&!['small','medium'].includes(input.humanSize))throw new RangeError('Tamaño humano no válido');
 }else if(input.humanSkill!==undefined||input.humanFeat!==undefined||input.humanSize!==undefined)throw new RangeError('Opciones humanas en otra especie');
 if(input.species==='elf'){
  if(!['drow','high_elf','wood_elf'].includes(input.elfLineage??''))throw new RangeError('Selecciona linaje del elfo');
 }else if(input.elfLineage!==undefined)throw new RangeError('El linaje élfico no corresponde a esa especie');
 uniqueChoices(input.cantripIds,WARLOCK_LEVEL_ONE_CANTRIPS.map(s=>s.id),2,'Trucos de Brujo');
 uniqueChoices(input.preparedIds,(input.level>=3?WARLOCK_SPELLS_THROUGH_LEVEL_TWO:WARLOCK_LEVEL_ONE_SPELLS).map(s=>s.id),input.level===1?2:input.level===2?3:4,'Conjuros preparados de Brujo');
 uniqueChoices(input.invocations,Object.keys(WARLOCK_INVOCATIONS),input.level===1?1:3,'Invocaciones sobrenaturales');
 if(input.invocations.some(id=>WARLOCK_INVOCATIONS[id].minLevel>input.level))throw new RangeError('Invocación no disponible para este nivel');
 if(input.level===1&&input.level2HitDieRoll!==undefined)throw new RangeError('Dado de nivel 2 no disponible aún');
 if(input.level>=2&&input.level2HitDieRoll!==undefined&&(!Number.isInteger(input.level2HitDieRoll)||input.level2HitDieRoll<1||input.level2HitDieRoll>8))throw new RangeError('El dado adicional del Brujo debe valer de 1 a 8');
 if(input.level<3&&(input.level3HitDieRoll!==undefined||input.subclassId!==undefined||input.level3History!==undefined))throw new RangeError('El Patrón Infernal y el historial de nivel 3 no están disponibles antes del nivel 3');
 if(input.level===3){
  if(input.subclassId!=='fiend')throw new RangeError('Selecciona el Patrón Infernal al alcanzar el nivel 3');
  if(input.preparedIds.some(id=>(WARLOCK_FIEND_LEVEL_THREE_IDS as readonly string[]).includes(id)))throw new RangeError('Los conjuros gratuitos del Patrón Infernal no ocupan preparaciones ordinarias');
  if(input.level3HitDieRoll!==undefined&&(!Number.isInteger(input.level3HitDieRoll)||input.level3HitDieRoll<1||input.level3HitDieRoll>8))throw new RangeError('El dado de golpe de nivel 3 debe valer de 1 a 8');
  const history=input.level3History;
  if(!history||typeof history!=='object'||Array.isArray(history)||Object.keys(history).some(k=>!['invocations','cantripIds','preparedIds','lessonsFeat','pactWeaponId','tomeCantripIds','tomeRitualIds','mageArmorActive','tomePresent','familiarForm','familiarName'].includes(k))||
   typeof history.mageArmorActive!=='boolean'||typeof history.tomePresent!=='boolean'||typeof history.familiarName!=='string'||(history.familiarForm!==null&&!(typeof history.familiarForm==='string'&&Object.hasOwn(WARLOCK_FAMILIARS,history.familiarForm))))throw new RangeError('Historial de nivel 2 no válido');
  calculateWarlockOne({...input,level:2,subclassId:undefined,level3HitDieRoll:undefined,level3History:undefined,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   lessonsFeat:history.lessonsFeat,pactWeaponId:history.pactWeaponId,tomeCantripIds:history.tomeCantripIds,tomeRitualIds:history.tomeRitualIds});
 }
 if(input.invocations.includes('lessons_of_the_first_ones')){
  if(!input.lessonsFeat||!['alert','tough'].includes(input.lessonsFeat)||input.lessonsFeat===bg.feat||input.lessonsFeat===input.humanFeat)
   throw new RangeError('Lecciones de los Primeros necesita una dote de origen válida y no repetida (Alerta o Duro)');
 }else if(input.lessonsFeat!==undefined)throw new RangeError('Dote de Lecciones sin invocación correspondiente');
 const pactBlade=input.invocations.includes('pact_of_blade');
 const pactTome=input.invocations.includes('pact_of_tome');
 if(!pactBlade&&input.pactWeaponId!==undefined)throw new RangeError('Arma de pacto sin invocación de Hoja');
 if(pactBlade&&input.pactWeaponId!==undefined&&
  (!Object.hasOwn(WEAPONS,input.pactWeaponId)||WEAPON_STATS[input.pactWeaponId].kind!=='melee'))throw new RangeError('El arma de pacto debe ser cuerpo a cuerpo');
 if(!pactTome&&(input.tomeCantripIds!==undefined||input.tomeRitualIds!==undefined))throw new RangeError('Elecciones del Tomo sin su invocación');
 if(pactTome){
  uniqueChoices(input.tomeCantripIds??[],TOME_CANTRIP_OPTIONS.map(s=>s.id),3,'Trucos del Tomo');
  uniqueChoices(input.tomeRitualIds??[],TOME_RITUAL_OPTIONS.map(s=>s.id),2,'Rituales del Tomo');
  if(input.tomeCantripIds!.some(id=>input.cantripIds.includes(id))||input.tomeRitualIds!.some(id=>input.preparedIds.includes(id)))throw new RangeError('El Tomo debe conceder conjuros no preparados ya');
 }
 const inventory=warlockInventory(input);
 const trained=[...new Set<Skill>([...bg.skills as readonly Skill[],...input.warlockSkills,...(input.species==='human'?[input.humanSkill!]:[])])];
 const mods=abilityModifiers(scores);
 const armor=equippedArmor(inventory);
 const mageArmor=Boolean(state?.mageArmorActive)&&input.invocations.includes('armor_of_shadows')&&armor===null;
 const ac=calculateArmorClass({strengthScore:scores.strength,dexterityScore:scores.dexterity,armor,
  shieldEquipped:inventory.equipped.shield,shieldTrained:false,
  ...(mageArmor?{alternateFormula:{id:'warlock-mage-armor',base:13,addDexterity:true,dexterityCap:null}}:{})});
 const hp=8+mods.constitution+(input.level>=2?Math.max(1,(input.level2HitDieRoll??5)+mods.constitution):0)+
  (input.level>=3?Math.max(1,(input.level3HitDieRoll??5)+mods.constitution):0)+
  (input.species==='dwarf'?input.level:0)+(input.humanFeat==='tough'||input.lessonsFeat==='tough'?2*input.level:0);
 return {
  level:input.level,name:input.name.trim(),abilityScores:scores,abilityModifiers:mods,proficiencyBonus:2,
  skillBonuses:calculateSkillBonuses(scores,input.level,{skills:trained}),skillProficiencies:trained,
  savingThrowBonuses:calculateSavingThrows(scores,input.level,{savingThrows:['wisdom','charisma']}),
  maximumHitPoints:hp,armorClass:ac.value,armorDescription:mageArmor?'Armadura de mago activa (13 + DES)':armor?'Armadura equipada':'Sin armadura (10 + DES)',
  initiative:mods.dexterity+((bg.feat==='alert'||input.humanFeat==='alert'||input.lessonsFeat==='alert')?2:0),
  speedFeet:input.species==='elf'&&input.elfLineage==='wood_elf'?35:30,
  size:input.species==='halfling'||input.species==='human'&&input.humanSize==='small'?'small':'medium',
  spellAttackBonus:mods.charisma+2,spellSaveDC:8+mods.charisma+2,inventory,invocations:input.invocations
 };
}
/** Solo aplica Carisma si el arma seleccionada como pacto está equipada y la invocación existe. */
export function warlockWeaponProfile(id:WeaponId,inventory:InventoryState,scores:AbilityScores,proficiency:number,
 invocations:readonly WarlockInvocationId[],pactWeaponId?:WeaponId,useCharisma=true){
 if(!inventory.equipped.weapons.includes(id))throw new RangeError('El arma no está equipada');
 const stats=WEAPON_STATS[id];const mods=abilityModifiers(scores);
 const pactActive=invocations.includes('pact_of_blade')&&id===pactWeaponId&&stats.kind==='melee';
 const ordinaryAbility=stats.kind==='ranged'||stats.finesse&&mods.dexterity>mods.strength?'dexterity':'strength';
 const ability=pactActive&&useCharisma?'charisma':ordinaryAbility;
 const trained=pactActive||SIMPLE_WEAPONS.has(id);
 return {weaponId:id,pactActive,ability,trained,attackBonus:mods[ability]+(trained?proficiency:0),damageBonus:mods[ability],damageDice:stats.dice,fixedDamage:stats.fixedDamage??0};
}
export function initialWarlockOneState(input:GuidedWarlockInput):WarlockOneState{
 const sheet=calculateWarlockOne(input);
 return {hitPointsCurrent:sheet.maximumHitPoints,temporaryHitPoints:0,heroicInspiration:input.species==='human',
  pactSlotSpent:false,...(input.level>=2?{secondPactSlotSpent:false,magicalCunningUsed:false}:{}),
  mageArmorActive:false,tomePresent:false,familiarForm:null,familiarName:''};
}
/** Magia de Pacto: 1 ranura al nivel 1; 2 ranuras en niveles 2 y 3. */
export function warlockPactSlots(state:WarlockOneState,level:1|2|3):readonly boolean[]{
 return level===1?[state.pactSlotSpent]:[state.pactSlotSpent,state.secondPactSlotSpent??false];
}
export function toggleWarlockPactSlot(state:WarlockOneState,level:1|2|3,index:number):WarlockOneState{
 if(!Number.isInteger(index)||index<0||index>=(level===1?1:2))throw new RangeError('Ranura de pacto inexistente');
 return index===0?{...state,pactSlotSpent:!state.pactSlotSpent}:{...state,secondPactSlotSpent:!state.secondPactSlotSpent};
}
/** Astucia mágica: un rito de un minuto recupera una ranura gastada en nivel 2.
 * El uso solo se restablece al terminar un descanso largo.
 */
export function warlockMagicalCunning(state:WarlockOneState,level:1|2|3):WarlockOneState{
 if(level<2)throw new RangeError('Astucia mágica se desbloquea en nivel 2');
 if(state.magicalCunningUsed)throw new RangeError('Astucia mágica ya usada; necesitas un descanso largo');
 if(!state.pactSlotSpent&&!state.secondPactSlotSpent)throw new RangeError('No tienes ninguna ranura de pacto gastada');
 return {...state,magicalCunningUsed:true,...(state.pactSlotSpent?{pactSlotSpent:false}:{secondPactSlotSpent:false})};
}
/** Solo se invoca después de que el jugador confirme el desencadenante. */
export function warlockDarkOnesBlessing(input:GuidedWarlockInput,state:WarlockOneState):WarlockOneState{
 if(input.level<3||input.subclassId!=='fiend')throw new RangeError('Bendición del Oscuro requiere Patrón Infernal de nivel 3');
 const amount=Math.max(1,calculateWarlockOne(input,state).abilityModifiers.charisma+input.level);
 return {...state,temporaryHitPoints:Math.max(state.temporaryHitPoints,amount)};
}
/** Las ranuras se recuperan tras un descanso corto, pero no Astucia mágica. */
export function warlockShortRest(state:WarlockOneState):WarlockOneState{
 return {...state,pactSlotSpent:false,...(state.secondPactSlotSpent!==undefined?{secondPactSlotSpent:false}:{})};
}
/** El descanso largo no invoca familiares ni libros por sí solo. */
export function warlockLongRest(state:WarlockOneState,maximumHitPoints:number,isHuman:boolean):WarlockOneState{
 if(!Number.isInteger(maximumHitPoints)||maximumHitPoints<1)throw new RangeError('Máximo de PG inválido');
 return {...state,pactSlotSpent:false,...(state.secondPactSlotSpent!==undefined?{secondPactSlotSpent:false}:{}),
  ...(state.magicalCunningUsed!==undefined?{magicalCunningUsed:false}:{}),hitPointsCurrent:maximumHitPoints,temporaryHitPoints:0,
  mageArmorActive:false,...(isHuman?{heroicInspiration:true}:{})};
}
export function validateWarlockOneState(raw:unknown,input:GuidedWarlockInput,sheet:CalculatedWarlockOne):WarlockOneState{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Estado del Brujo inválido');
 const state=raw as Record<string,unknown>;
 if(Object.keys(state).some(k=>!['hitPointsCurrent','temporaryHitPoints','heroicInspiration','pactSlotSpent','secondPactSlotSpent','magicalCunningUsed','mageArmorActive','tomePresent','familiarForm','familiarName','manualDeathMarks'].includes(k)))throw new RangeError('Estado del Brujo con campos desconocidos');
 if(!Number.isInteger(state.hitPointsCurrent)||(state.hitPointsCurrent as number)<0||(state.hitPointsCurrent as number)>sheet.maximumHitPoints||
  !Number.isInteger(state.temporaryHitPoints)||(state.temporaryHitPoints as number)<0||(state.temporaryHitPoints as number)>10000)throw new RangeError('Puntos de golpe del Brujo inválidos');
 for(const k of ['heroicInspiration','pactSlotSpent','mageArmorActive','tomePresent']){
  if(typeof state[k]!=='boolean')throw new RangeError('Estado booleano inválido: '+k);
 }
 if(input.level===1&&(state.secondPactSlotSpent!==undefined||state.magicalCunningUsed!==undefined))throw new RangeError('Recursos de nivel 2 no disponibles');
 if(input.level>=2&&(state.secondPactSlotSpent!==undefined&&typeof state.secondPactSlotSpent!=='boolean'||state.magicalCunningUsed!==undefined&&typeof state.magicalCunningUsed!=='boolean'))throw new RangeError('Recursos de nivel 2 inválidos');
 if(state.mageArmorActive&&!input.invocations.includes('armor_of_shadows'))throw new RangeError('Armadura de sombras no disponible');
 if(state.tomePresent&&!input.invocations.includes('pact_of_tome'))throw new RangeError('Tomo no disponible');
 if(state.familiarForm!==null&&(!input.invocations.includes('pact_of_chain')||typeof state.familiarForm!=='string'||!Object.hasOwn(WARLOCK_FAMILIARS,state.familiarForm)))throw new RangeError('Familiar no disponible');
 if(typeof state.familiarName!=='string'||state.familiarName.length>120)throw new RangeError('Nombre del familiar inválido');
 if(!input.invocations.includes('pact_of_chain')&&state.familiarName)throw new RangeError('Nombre de familiar sin pacto');
 if(state.manualDeathMarks!==undefined){
  const marks=state.manualDeathMarks as WarlockOneState['manualDeathMarks'];
  if(!marks||!['successes','failures'].every(kind=>Array.isArray(marks[kind as 'successes'|'failures'])&&marks[kind as 'successes'|'failures'].length===3&&marks[kind as 'successes'|'failures'].every(mark=>typeof mark==='boolean')))
   throw new RangeError('Marcadores de salvación de muerte del Brujo inválidos');
 }
 return {hitPointsCurrent:state.hitPointsCurrent as number,temporaryHitPoints:state.temporaryHitPoints as number,
  heroicInspiration:state.heroicInspiration as boolean,pactSlotSpent:state.pactSlotSpent as boolean,
  ...(input.level>=2?{secondPactSlotSpent:state.secondPactSlotSpent===true,magicalCunningUsed:state.magicalCunningUsed===true}:{}),
  mageArmorActive:state.mageArmorActive as boolean,tomePresent:state.tomePresent as boolean,
  familiarForm:state.familiarForm as FamiliarForm|null,familiarName:state.familiarName as string,
  ...(state.manualDeathMarks!==undefined?{manualDeathMarks:state.manualDeathMarks as NonNullable<WarlockOneState['manualDeathMarks']>}:{})};
}
export type WarlockCharacterSnapshot=Readonly<{
 schemaVersion:4;ruleset:'dnd-2024';input:GuidedWarlockInput;warlockState:WarlockOneState;
}>;
export function validateWarlockCharacterSnapshot(raw:unknown):WarlockCharacterSnapshot{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Guardado de Brujo inválido');
 const value=raw as Record<string,unknown>;
 if(value.schemaVersion!==4||value.ruleset!=='dnd-2024'||Object.keys(value).some(k=>!['schemaVersion','ruleset','input','warlockState'].includes(k)))throw new RangeError('Versión o estructura del Brujo no compatible');
 const allowed=['companions','abilityGenerationMethod','classId','level','name','profile','background','species','assignedAbilities','increaseMode','plusTwoAbility','plusOneAbility','warlockSkills','humanSkill','humanFeat','humanSize','elfLineage','equipmentChoice','backgroundEquipment','inventoryActions','cantripIds','preparedIds','invocations','pactWeaponId','tomeCantripIds','tomeRitualIds','level2HitDieRoll','level3HitDieRoll','subclassId','level3History','lessonsFeat'];
 if(!value.input||typeof value.input!=='object'||Array.isArray(value.input)||Object.keys(value.input as Record<string,unknown>).some(k=>!allowed.includes(k)))throw new RangeError('Elecciones de Brujo con campos desconocidos');
 let input:GuidedWarlockInput;
 try{const json=JSON.stringify(value.input);if(json.length>120000)throw new Error();input=JSON.parse(json) as GuidedWarlockInput;}catch{throw new RangeError('Elecciones de Brujo demasiado grandes');}
 if(input.profile!==undefined)input={...input,profile:validateCharacterProfile(input.profile)};
 const sheet=calculateWarlockOne(input);
 const state=validateWarlockOneState(value.warlockState,input,sheet);
 return {schemaVersion:4,ruleset:'dnd-2024',input,warlockState:state};
}
export function makeWarlockCharacterSnapshot(input:GuidedWarlockInput,state?:WarlockOneState):WarlockCharacterSnapshot{
 return validateWarlockCharacterSnapshot({schemaVersion:4,ruleset:'dnd-2024',input:{...input,profile:validateCharacterProfile(input.profile??EMPTY_CHARACTER_PROFILE)},warlockState:state??initialWarlockOneState(input)});
}
