/** Paso 66: Brujo nivel 1, reglas D&D 2024.
 * Elecciones, proyección, acciones y estado persistido están separados.
 * Patrón Infernal se elige en nivel 3: no concede rasgos prematuros.
 */
import {ABILITIES,abilityModifiers,type Ability,type AbilityScores} from './abilities';
import {validateGeneratedAbilities,type AbilityGenerationMethod} from './ability-generation';
import {SKILLS,calculateSkillBonuses,calculateSavingThrows,type Skill} from './proficiencies';
import {BACKGROUNDS,SPECIES_NAMES,type BackgroundId,type SpeciesId,type ElfLineage} from './guided';
import {EMPTY_CHARACTER_PROFILE,validateCharacterProfile,type CharacterProfile} from './character-profile';
import {calculateArmorClass} from './defense';
import {equippedArmor,type InventoryAction,type InventoryState} from './inventory';
import {WEAPONS,type WeaponId} from './martial';
import {WEAPON_STATS} from './attacks';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS,TOME_CANTRIP_OPTIONS,TOME_RITUAL_OPTIONS} from './warlock-spells';
import {warlockInventory,type WarlockEquipmentChoice} from './warlock-inventory';
import type {BackgroundEquipmentChoice} from './background-equipment';

export const WARLOCK_SKILL_OPTIONS=['arcana','deception','history','intimidation','investigation','nature','religion'] as const satisfies readonly Skill[];
export type WarlockSkill=(typeof WARLOCK_SKILL_OPTIONS)[number];
export const WARLOCK_INVOCATIONS={
 armor_of_shadows:{name:'Armadura de sombras',summary:'Armadura de mago sobre ti sin consumir ranura; el jugador activa el conjuro.'},
 eldritch_mind:{name:'Mente sobrenatural',summary:'Ventaja en salvaciones de Constitución para mantener la concentración.'},
 pact_of_blade:{name:'Pacto de la Hoja',summary:'Arma cuerpo a cuerpo vinculada; competencia y Carisma para ataque y daño, si está equipada.'},
 pact_of_chain:{name:'Pacto de la Cadena',summary:'Encontrar familiar sin gastar ranura; puede tener formas especiales.'},
 pact_of_tome:{name:'Pacto del Tomo',summary:'Libro de las sombras con tres trucos y dos rituales de nivel 1, mientras lo lleves.'}
} as const;
export type WarlockInvocationId=keyof typeof WARLOCK_INVOCATIONS;
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

export type GuidedWarlockInput=Readonly<{
 classId:'warlock';level:1;name:string;profile?:CharacterProfile;
 background:BackgroundId;species:SpeciesId;assignedAbilities:AbilityScores;
 abilityGenerationMethod?:AbilityGenerationMethod;
 increaseMode:'two_plus_one'|'three_ones';plusTwoAbility:Ability;plusOneAbility:Ability;
 warlockSkills:readonly WarlockSkill[];humanSkill?:Skill;humanFeat?:'alert'|'tough';
 humanSize?:'small'|'medium';elfLineage?:ElfLineage;
 equipmentChoice:WarlockEquipmentChoice;backgroundEquipment?:BackgroundEquipmentChoice;
 inventoryActions?:readonly InventoryAction[];
 cantripIds:readonly string[];preparedIds:readonly string[];
 invocations:readonly WarlockInvocationId[];
 pactWeaponId?:WeaponId;
 tomeCantripIds?:readonly string[];
 tomeRitualIds?:readonly string[];
}>;
export type WarlockOneState=Readonly<{
 hitPointsCurrent:number;temporaryHitPoints:number;heroicInspiration:boolean;
 pactSlotSpent:boolean;
 mageArmorActive:boolean;
 tomePresent:boolean;
 familiarForm:FamiliarForm|null;
 familiarName:string;
}>;
export type CalculatedWarlockOne=Readonly<{
 level:1;name:string;abilityScores:AbilityScores;
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
 if(!input||input.classId!=='warlock'||input.level!==1)throw new RangeError('Paso 66: solo se admite Brujo de nivel 1');
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>120)throw new RangeError('Introduce el nombre del Brujo');
 const bg=BACKGROUNDS[input.background];
 if(!bg||!Object.hasOwn(SPECIES_NAMES,input.species))throw new RangeError('Origen no disponible');
 const assigned=validateGeneratedAbilities(input.assignedAbilities,input.abilityGenerationMethod??'standard_array');
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
 uniqueChoices(input.preparedIds,WARLOCK_LEVEL_ONE_SPELLS.map(s=>s.id),2,'Conjuros preparados de Brujo');
 uniqueChoices(input.invocations,Object.keys(WARLOCK_INVOCATIONS),1,'Invocaciones sobrenaturales');
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
 const hp=8+mods.constitution+(input.species==='dwarf'?1:0)+(input.humanFeat==='tough'?2:0);
 return {
  level:1,name:input.name.trim(),abilityScores:scores,abilityModifiers:mods,proficiencyBonus:2,
  skillBonuses:calculateSkillBonuses(scores,1,{skills:trained}),skillProficiencies:trained,
  savingThrowBonuses:calculateSavingThrows(scores,1,{savingThrows:['wisdom','charisma']}),
  maximumHitPoints:hp,armorClass:ac.value,armorDescription:mageArmor?'Armadura de mago activa (13 + DES)':armor?'Armadura equipada':'Sin armadura (10 + DES)',
  initiative:mods.dexterity+((bg.feat==='alert'||input.humanFeat==='alert')?2:0),
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
  pactSlotSpent:false,mageArmorActive:false,tomePresent:false,familiarForm:null,familiarName:''};
}
/** Magia de Pacto: la única ranura vuelve tras cualquier descanso corto. */
export function warlockShortRest(state:WarlockOneState):WarlockOneState{
 return {...state,pactSlotSpent:false};
}
/** El descanso largo no invoca familiares ni libros por sí solo. */
export function warlockLongRest(state:WarlockOneState,maximumHitPoints:number,isHuman:boolean):WarlockOneState{
 if(!Number.isInteger(maximumHitPoints)||maximumHitPoints<1)throw new RangeError('Máximo de PG inválido');
 return {...state,pactSlotSpent:false,hitPointsCurrent:maximumHitPoints,temporaryHitPoints:0,
  mageArmorActive:false,...(isHuman?{heroicInspiration:true}:{})};
}
export function validateWarlockOneState(raw:unknown,input:GuidedWarlockInput,sheet:CalculatedWarlockOne):WarlockOneState{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Estado del Brujo inválido');
 const state=raw as Record<string,unknown>;
 if(Object.keys(state).some(k=>!['hitPointsCurrent','temporaryHitPoints','heroicInspiration','pactSlotSpent','mageArmorActive','tomePresent','familiarForm','familiarName'].includes(k)))throw new RangeError('Estado del Brujo con campos desconocidos');
 if(!Number.isInteger(state.hitPointsCurrent)||(state.hitPointsCurrent as number)<0||(state.hitPointsCurrent as number)>sheet.maximumHitPoints||
  !Number.isInteger(state.temporaryHitPoints)||(state.temporaryHitPoints as number)<0||(state.temporaryHitPoints as number)>10000)throw new RangeError('Puntos de golpe del Brujo inválidos');
 for(const k of ['heroicInspiration','pactSlotSpent','mageArmorActive','tomePresent']){
  if(typeof state[k]!=='boolean')throw new RangeError('Estado booleano inválido: '+k);
 }
 if(state.mageArmorActive&&!input.invocations.includes('armor_of_shadows'))throw new RangeError('Armadura de sombras no disponible');
 if(state.tomePresent&&!input.invocations.includes('pact_of_tome'))throw new RangeError('Tomo no disponible');
 if(state.familiarForm!==null&&(!input.invocations.includes('pact_of_chain')||typeof state.familiarForm!=='string'||!Object.hasOwn(WARLOCK_FAMILIARS,state.familiarForm)))throw new RangeError('Familiar no disponible');
 if(typeof state.familiarName!=='string'||state.familiarName.length>120)throw new RangeError('Nombre del familiar inválido');
 if(!input.invocations.includes('pact_of_chain')&&state.familiarName)throw new RangeError('Nombre de familiar sin pacto');
 return {hitPointsCurrent:state.hitPointsCurrent as number,temporaryHitPoints:state.temporaryHitPoints as number,
  heroicInspiration:state.heroicInspiration as boolean,pactSlotSpent:state.pactSlotSpent as boolean,
  mageArmorActive:state.mageArmorActive as boolean,tomePresent:state.tomePresent as boolean,
  familiarForm:state.familiarForm as FamiliarForm|null,familiarName:state.familiarName as string};
}
export type WarlockCharacterSnapshot=Readonly<{
 schemaVersion:4;ruleset:'dnd-2024';input:GuidedWarlockInput;warlockState:WarlockOneState;
}>;
export function validateWarlockCharacterSnapshot(raw:unknown):WarlockCharacterSnapshot{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Guardado de Brujo inválido');
 const value=raw as Record<string,unknown>;
 if(value.schemaVersion!==4||value.ruleset!=='dnd-2024'||Object.keys(value).some(k=>!['schemaVersion','ruleset','input','warlockState'].includes(k)))throw new RangeError('Versión o estructura del Brujo no compatible');
 const allowed=['abilityGenerationMethod','classId','level','name','profile','background','species','assignedAbilities','increaseMode','plusTwoAbility','plusOneAbility','warlockSkills','humanSkill','humanFeat','humanSize','elfLineage','equipmentChoice','backgroundEquipment','inventoryActions','cantripIds','preparedIds','invocations','pactWeaponId','tomeCantripIds','tomeRitualIds'];
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
