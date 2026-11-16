/** Paso 48: creación inicial de Mago, PHB 2024 pp. 165-168.
 * El Mago usa su propio modelo; no se convierte artificialmente en Guerrero.
 * Las especies y dotes con efectos activos se muestran como pendientes de automatizar.
 */
import {ABILITIES,abilityModifiers,validateAbilityScores,type Ability,type AbilityScores} from './abilities';
import {SKILLS,calculateSkillBonuses,calculateSavingThrows,type Skill} from './proficiencies';
import {BACKGROUNDS,SPECIES_NAMES,STANDARD_ARRAY,type BackgroundId,type SpeciesId,type ElfLineage} from './guided';
import {EMPTY_CHARACTER_PROFILE,validateCharacterProfile,type CharacterProfile} from './character-profile';
import {wizardCoreStatistics,wizardProgression,validateWizardSpellChoices,initialWizardMagicState,type WizardMagicState,type WizardSpellChoices,type WizardSpellReference} from './wizard';
import {createSlotPool} from './spellcasting-core';

export const WIZARD_SKILL_OPTIONS=['arcana','history','insight','investigation','medicine','nature','religion'] as const satisfies readonly Skill[];
export type WizardSkill=(typeof WIZARD_SKILL_OPTIONS)[number];
export type WizardEquipmentChoice='equipment'|'gold';
export const WIZARD_LEVEL_ONE_EQUIPMENT={equipment:{description:'2 dagas, foco arcano (bastón), túnica, libro de conjuros, equipo de erudito y 5 po',gold:5},gold:{description:'55 po para adquirir tu propio equipo; libro de conjuros concedido por clase',gold:55}} as const;

/** Lista inicial de conjuros PHB 2024 p. 168. Su catálogo completo se ampliará en la fase 49. */
const rawCantrips=[
 ['acid_splash','Salpicadura ácida','evocation'],['blade_ward','Protección contra armas','abjuration'],
 ['chill_touch','Toque helado','necromancy'],['dancing_lights','Luces danzantes','illusion'],
 ['elementalism','Elementalismo','transmutation'],['fire_bolt','Descarga de fuego','evocation'],
 ['friends','Amistad','enchantment'],['light','Luz','evocation'],['mage_hand','Mano de mago','conjuration'],
 ['mending','Remendar','transmutation'],['message','Mensaje','transmutation'],
 ['mind_sliver','Fragmento mental','enchantment'],['minor_illusion','Ilusión menor','illusion'],
 ['poison_spray','Rociada venenosa','necromancy'],['prestidigitation','Prestidigitación','transmutation'],
 ['ray_of_frost','Rayo de escarcha','evocation'],['shocking_grasp','Agarre electrizante','evocation'],
 ['thunderclap','Estallido de trueno','evocation'],['toll_the_dead','Doblar a muerto','necromancy'],
 ['true_strike','Golpe verdadero','divination']
] as const;
const rawLevelOne=[
 ['alarm','Alarma','abjuration',true],['burning_hands','Manos ardientes','evocation',false],
 ['charm_person','Hechizar persona','enchantment',false],['chromatic_orb','Orbe cromático','evocation',false],
 ['color_spray','Rociada de color','illusion',false],['comprehend_languages','Comprender idiomas','divination',true],
 ['detect_magic','Detectar magia','divination',true],['disguise_self','Disfrazarse','illusion',false],
 ['expeditious_retreat','Retirada expeditiva','transmutation',false],['false_life','Falsa vida','necromancy',false],
 ['feather_fall','Caída de pluma','transmutation',false],['find_familiar','Encontrar familiar','conjuration',true],
 ['fog_cloud','Nube de niebla','conjuration',false],['grease','Grasa','conjuration',false],
 ['ice_knife','Cuchillo de hielo','conjuration',false],['identify','Identificar','divination',true],
 ['illusory_script','Escritura ilusoria','illusion',true],['jump','Salto','transmutation',false],
 ['longstrider','Zancada prodigiosa','transmutation',false],['mage_armor','Armadura de mago','abjuration',false],
 ['magic_missile','Proyectil mágico','evocation',false],['protection_from_evil_and_good','Protección contra el bien y el mal','abjuration',false],
 ['ray_of_sickness','Rayo de enfermedad','necromancy',false],['shield','Escudo','abjuration',false],
 ['silent_image','Imagen silenciosa','illusion',false],['sleep','Dormir','enchantment',false],
 ['tashas_hideous_laughter','Risa horrible de Tasha','enchantment',false],
 ['tensers_floating_disk','Disco flotante de Tenser','conjuration',true],
 ['thunderwave','Onda atronadora','evocation',false],['unseen_servant','Sirviente invisible','conjuration',true],
 ['witch_bolt','Rayo de bruja','evocation',false]
] as const;
export const WIZARD_LEVEL_ONE_CANTRIPS=rawCantrips.map(([id,name,school])=>({id,name,level:0 as const,school}));
export const WIZARD_LEVEL_ONE_SPELLS=rawLevelOne.map(([id,name,school,ritual])=>({id,name,level:1 as const,school,ritual}));
export const WIZARD_LEVEL_ONE_DEFAULTS={cantrips:['light','mage_hand','ray_of_frost'],spellbook:['detect_magic','feather_fall','mage_armor','magic_missile','sleep','thunderwave'],prepared:['feather_fall','mage_armor','magic_missile','thunderwave']} as const;

export type GuidedWizardInput=Readonly<{
 classId:'wizard';level:1;name:string;profile?:CharacterProfile;
 background:BackgroundId;species:SpeciesId;
 assignedAbilities:AbilityScores;
 increaseMode:'two_plus_one'|'three_ones';plusTwoAbility:Ability;plusOneAbility:Ability;
 wizardSkills:readonly WizardSkill[];humanSkill?:Skill;humanFeat?:'alert'|'tough';
 humanSize?:'small'|'medium';elfLineage?:ElfLineage;
 equipmentChoice:WizardEquipmentChoice;
 cantripIds:readonly string[];spellbookIds:readonly string[];preparedIds:readonly string[];
}>;
export type WizardLevelOneView=Readonly<{
 classId:'wizard';level:1;name:string;abilityScores:AbilityScores;
 abilityModifiers:ReturnType<typeof abilityModifiers>;
 skillBonuses:ReturnType<typeof calculateSkillBonuses>;
 savingThrowBonuses:ReturnType<typeof calculateSavingThrows>;
 skillProficiencies:readonly Skill[];
 maximumHitPoints:number;armorClass:number;initiative:number;speedFeet:number;
 size:'small'|'medium';spellAttackBonus:number;spellSaveDC:number;
 equipment:typeof WIZARD_LEVEL_ONE_EQUIPMENT[WizardEquipmentChoice];
 spells:ReturnType<typeof validateWizardSpellChoices>;
 backgroundFeat:string;
}>;
const validSkill=(value:unknown):value is Skill=>typeof value==='string'&&(SKILLS as string[]).includes(value);
function selectSpells(ids:readonly string[],items:readonly {id:string;level:number;school:string;ritual?:boolean}[]):WizardSpellReference[]{
 return ids.map(id=>{
  const spell=items.find(s=>s.id===id);
  if(!spell)throw new RangeError(`Conjuro fuera del catálogo inicial del Mago: ${id}`);
  return {id:spell.id,level:spell.level as 0|1,school:spell.school as WizardSpellReference['school'],ritual:spell.ritual};
 });
}
export function calculateGuidedWizardOne(input:GuidedWizardInput):WizardLevelOneView{
 if(!input||input.classId!=='wizard'||input.level!==1)throw new RangeError('Esta fase admite únicamente Mago de nivel 1');
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>120)throw new RangeError('Nombre de Mago inválido');
 const bg=BACKGROUNDS[input.background];if(!bg)throw new RangeError('Trasfondo desconocido');
 if(!Object.prototype.hasOwnProperty.call(SPECIES_NAMES,input.species))throw new RangeError('Especie desconocida');
 const assigned=validateAbilityScores(input.assignedAbilities);
 if([...Object.values(assigned)].sort((a,b)=>a-b).join(',')!==[...STANDARD_ARRAY].sort((a,b)=>a-b).join(','))
  throw new RangeError('Distribuye los valores 15, 14, 13, 12, 10 y 8 exactamente una vez');
 const scores={...assigned};const allowed=bg.abilities as readonly Ability[];
 if(input.increaseMode==='two_plus_one'){
  if(!allowed.includes(input.plusTwoAbility)||!allowed.includes(input.plusOneAbility)||input.plusTwoAbility===input.plusOneAbility)throw new RangeError('Selecciona dos características diferentes permitidas por el trasfondo');
  scores[input.plusTwoAbility]+=2;scores[input.plusOneAbility]++;
 }else if(input.increaseMode==='three_ones'){
  for(const ability of allowed)scores[ability]++;
 }else throw new RangeError('Método de mejoras no válido');
 if(ABILITIES.some(a=>scores[a]>20))throw new RangeError('Mejora de trasfondo excede 20');
 if(!Array.isArray(input.wizardSkills)||input.wizardSkills.length!==2||new Set(input.wizardSkills).size!==2||input.wizardSkills.some(s=>!WIZARD_SKILL_OPTIONS.includes(s)||(bg.skills as readonly string[]).includes(s)))
  throw new RangeError('Elige dos habilidades distintas de Mago que no conceda ya el trasfondo');
 if(input.species==='human'){
  if(!validSkill(input.humanSkill)||!['alert','tough'].includes(input.humanFeat??'')||input.humanFeat===bg.feat)
   throw new RangeError('Humano: elige habilidad adicional y dote de origen compatible (Alerta o Duro)');
  if(input.humanSize!==undefined&&!['small','medium'].includes(input.humanSize))throw new RangeError('Tamaño humano inválido');
 }else if(input.humanSkill!==undefined||input.humanFeat!==undefined||input.humanSize!==undefined)throw new RangeError('Las elecciones humanas solo corresponden al humano');
 if(input.species==='elf'){
  if(!['drow','high_elf','wood_elf'].includes(input.elfLineage??''))throw new RangeError('Selecciona linaje élfico');
 }else if(input.elfLineage!==undefined)throw new RangeError('Linaje élfico incompatible');
 if(!Object.prototype.hasOwnProperty.call(WIZARD_LEVEL_ONE_EQUIPMENT,input.equipmentChoice))throw new RangeError('Equipo inicial inválido');
 if(!Array.isArray(input.cantripIds)||!Array.isArray(input.spellbookIds)||!Array.isArray(input.preparedIds)||input.cantripIds.some(id=>typeof id!=='string')||input.spellbookIds.some(id=>typeof id!=='string')||input.preparedIds.some(id=>typeof id!=='string'))
  throw new RangeError('Debes proporcionar listas de conjuros válidas');
 const choices:WizardSpellChoices={
  cantrips:selectSpells(input.cantripIds,WIZARD_LEVEL_ONE_CANTRIPS),
  spellbook:selectSpells(input.spellbookIds,WIZARD_LEVEL_ONE_SPELLS),
  preparedIds:input.preparedIds,
 };
 const spells=validateWizardSpellChoices(1,choices);
 const bonuses=abilityModifiers(scores);
 const proficiency=[...new Set<Skill>([...bg.skills as readonly Skill[],...input.wizardSkills,...(input.species==='human'?[input.humanSkill!]:[])])];
 const hpBonus=(input.species==='dwarf'?1:0)+(input.humanFeat==='tough'?2:0);
 const core=wizardCoreStatistics(1,scores);
 return {classId:'wizard',level:1,name:input.name.trim(),abilityScores:scores,abilityModifiers:bonuses,
  skillBonuses:calculateSkillBonuses(scores,1,{skills:proficiency}),skillProficiencies:proficiency,
  savingThrowBonuses:calculateSavingThrows(scores,1,{savingThrows:['intelligence','wisdom']}),
  maximumHitPoints:Math.max(1,6+bonuses.constitution)+hpBonus,
  armorClass:10+bonuses.dexterity,
  initiative:bonuses.dexterity+((bg.feat==='alert'||input.humanFeat==='alert')?2:0),
  speedFeet:input.species==='elf'&&input.elfLineage==='wood_elf'?35:30,
  size:input.species==='halfling'||(input.species==='human'&&input.humanSize==='small')?'small':'medium',
  spellAttackBonus:core.spellAttackBonus,spellSaveDC:core.spellSaveDC,
  equipment:WIZARD_LEVEL_ONE_EQUIPMENT[input.equipmentChoice],spells,backgroundFeat:bg.feat};
}
export type WizardLevelOneState=Readonly<{
 hitPointsCurrent:number;temporaryHitPoints:number;heroicInspiration:boolean;magic:WizardMagicState;
}>;
export function initialWizardOneState(input:GuidedWizardInput):WizardLevelOneState{
 const sheet=calculateGuidedWizardOne(input);
 return {hitPointsCurrent:sheet.maximumHitPoints,temporaryHitPoints:0,heroicInspiration:input.species==='human',magic:initialWizardMagicState(1)};
}
export function validateWizardOneState(raw:unknown,sheet:WizardLevelOneView):WizardLevelOneState{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Estado de Mago inválido');
 const state=raw as Record<string,unknown>;
 if(Object.keys(state).some(k=>!['hitPointsCurrent','temporaryHitPoints','heroicInspiration','magic'].includes(k)))throw new RangeError('Estado de Mago contiene datos desconocidos');
 const hp=state.hitPointsCurrent,tp=state.temporaryHitPoints;
 if(!Number.isInteger(hp)||(hp as number)<0||(hp as number)>sheet.maximumHitPoints||!Number.isInteger(tp)||(tp as number)<0||(tp as number)>10000||typeof state.heroicInspiration!=='boolean')throw new RangeError('PG o inspiración del Mago inválidos');
 const magic=state.magic as WizardMagicState;
 if(!magic||typeof magic!=='object'||!magic.slots||typeof magic.arcaneRecoveryUsed!=='boolean'||magic.overchannelUses!==0||!Array.isArray(magic.signatureUsed)||magic.signatureUsed.length!==0)
  throw new RangeError('Recursos de magia de Mago inválidos');
 const slots=createSlotPool(magic.slots.maximum,magic.slots.remaining);
 if(slots.maximum.join(',')!==wizardProgression(1).spellSlots.join(','))throw new RangeError('Ranuras de nivel distinto al 1');
 return {hitPointsCurrent:hp as number,temporaryHitPoints:tp as number,heroicInspiration:state.heroicInspiration,magic:{slots,arcaneRecoveryUsed:magic.arcaneRecoveryUsed,overchannelUses:0,signatureUsed:[]}};
}
export type WizardCharacterSnapshot=Readonly<{
 schemaVersion:3;ruleset:'dnd-2024';input:GuidedWizardInput;wizardState:WizardLevelOneState;
}>;
export function validateWizardCharacterSnapshot(raw:unknown):WizardCharacterSnapshot{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Guardado de Mago inválido');
 const value=raw as Record<string,unknown>;
 if(value.schemaVersion!==3||value.ruleset!=='dnd-2024'||Object.keys(value).some(k=>!['schemaVersion','ruleset','input','wizardState'].includes(k)))throw new RangeError('Versión o estructura de Mago incorrectas');
 const permitted=['classId','level','name','profile','background','species','assignedAbilities','increaseMode','plusTwoAbility','plusOneAbility','wizardSkills','humanSkill','humanFeat','humanSize','elfLineage','equipmentChoice','cantripIds','spellbookIds','preparedIds'];
 if(!value.input||typeof value.input!=='object'||Array.isArray(value.input)||Object.keys(value.input as Record<string,unknown>).some(key=>!permitted.includes(key)))throw new RangeError('La creación de Mago incluye campos desconocidos');
 let clean:GuidedWizardInput;
 try{const json=JSON.stringify(value.input);if(json.length>120_000)throw new Error();clean=JSON.parse(json) as GuidedWizardInput;}catch{throw new RangeError('Datos de Mago demasiado grandes o no serializables');}
 if(clean.profile!==undefined)clean={...clean,profile:validateCharacterProfile(clean.profile)};
 const sheet=calculateGuidedWizardOne(clean);
 return {schemaVersion:3,ruleset:'dnd-2024',input:clean,wizardState:validateWizardOneState(value.wizardState,sheet)};
}
export function makeWizardCharacterSnapshot(input:GuidedWizardInput,state?:WizardLevelOneState):WizardCharacterSnapshot{
 const sheet=calculateGuidedWizardOne(input);
 return validateWizardCharacterSnapshot({schemaVersion:3,ruleset:'dnd-2024',input:{...input,profile:validateCharacterProfile(input.profile??EMPTY_CHARACTER_PROFILE)},wizardState:state??initialWizardOneState(input)});
}
