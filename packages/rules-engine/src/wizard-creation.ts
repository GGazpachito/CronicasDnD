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
import {calculateArmorClass} from './defense';
import {equippedArmor,type InventoryAction,type InventoryState} from './inventory';
import {wizardInventory} from './wizard-inventory';
import {applyFighterAbilityImprovement,type FighterAbilityImprovement} from './progression';
import {WIZARD_LEVEL_THREE_SPELLS} from './wizard-third-level';
import {WIZARD_LEVEL_FOUR_SPELLS} from './wizard-fourth-level';
import {WIZARD_LEVEL_FIVE_SPELLS} from './wizard-fifth-level';
import {WIZARD_LEVEL_SIX_SPELLS} from './wizard-sixth-level';
import {WIZARD_LEVEL_SEVEN_SPELLS} from './wizard-seventh-level';
import {WIZARD_LEVEL_EIGHT_SPELLS} from './wizard-eighth-level';
import {WIZARD_LEVEL_NINE_SPELLS} from './wizard-ninth-level';
import {wizardMasteryCastingTime} from './wizard-mastery';
import {applyWizardEpicBoon,type WizardEpicBoonChoice} from './wizard-epic-boons';
import type {BackgroundEquipmentChoice} from './background-equipment';
import {validateWizardSpellSelection,type WizardSpellSelection} from './wizard-spell-library';

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
/** Catálogo de nivel 2, Manual del Jugador 2024 pp. 168-169. */
const rawLevelTwo=[
 ['alter_self','Alterar el propio aspecto','transmutation'],['arcane_lock','Cerradura arcana','abjuration'],
 ['arcane_vigor','Vigor arcano','abjuration'],['augury','Augurio','divination',true],
 ['blindness_deafness','Ceguera/Sordera','transmutation'],['blur','Contorno borroso','illusion'],
 ['cloud_of_daggers','Nube de dagas','conjuration'],['continual_flame','Llama continua','evocation'],
 ['crown_of_madness','Corona de locura','enchantment'],['darkness','Oscuridad','evocation'],
 ['darkvision','Visión en la oscuridad','transmutation'],['detect_thoughts','Detectar pensamientos','divination'],
 ['dragons_breath','Aliento de dragón','transmutation'],['enhance_ability','Potenciar característica','transmutation'],
 ['enlarge_reduce','Agrandar/Reducir','transmutation'],['flaming_sphere','Esfera flamígera','evocation'],
 ['gentle_repose','Apacible descanso','necromancy',true],['gust_of_wind','Ráfaga de viento','evocation'],
 ['hold_person','Inmovilizar persona','enchantment'],['invisibility','Invisibilidad','illusion'],
 ['knock','Llamar','transmutation'],['levitate','Levitar','transmutation'],
 ['locate_object','Localizar objeto','divination'],['magic_mouth','Boca mágica','illusion',true],
 ['magic_weapon','Arma mágica','transmutation'],['melfs_acid_arrow','Flecha ácida de Melf','evocation'],
 ['mind_spike','Púa mental','divination'],['mirror_image','Imagen múltiple','illusion'],
 ['misty_step','Paso brumoso','conjuration'],['nystuls_magic_aura','Aura mágica de Nystul','illusion'],
 ['phantasmal_force','Fuerza fantasmal','illusion'],['ray_of_enfeeblement','Rayo debilitador','necromancy'],
 ['rope_trick','Truco de la cuerda','transmutation'],['scorching_ray','Rayo abrasador','evocation'],
 ['see_invisibility','Ver invisibilidad','divination'],['shatter','Estallar','evocation'],
 ['spider_climb','Trepar cual arácnido','transmutation'],['suggestion','Sugestión','enchantment'],
 ['web','Telaraña','conjuration']
] as const;
export const WIZARD_LEVEL_TWO_SPELLS=rawLevelTwo.map(([id,name,school,ritual])=>({id,name,level:2 as const,school,ritual}));
export const WIZARD_SPELL_CATALOG=[...WIZARD_LEVEL_ONE_SPELLS,...WIZARD_LEVEL_TWO_SPELLS,...WIZARD_LEVEL_THREE_SPELLS,...WIZARD_LEVEL_FOUR_SPELLS,...WIZARD_LEVEL_FIVE_SPELLS,...WIZARD_LEVEL_SIX_SPELLS,...WIZARD_LEVEL_SEVEN_SPELLS,...WIZARD_LEVEL_EIGHT_SPELLS,...WIZARD_LEVEL_NINE_SPELLS] as const;
/** Misma dote de mejora de características utilizada por otras clases. */
export type WizardLevel4Improvement=FighterAbilityImprovement;
export const WIZARD_SCHOLAR_OPTIONS=['arcana','history','investigation','medicine','nature','religion'] as const satisfies readonly Skill[];
export type WizardScholarSkill=(typeof WIZARD_SCHOLAR_OPTIONS)[number];
export const WIZARD_LEVEL_ONE_DEFAULTS={cantrips:['light','mage_hand','ray_of_frost'],spellbook:['detect_magic','feather_fall','mage_armor','magic_missile','sleep','thunderwave'],prepared:['feather_fall','mage_armor','magic_missile','thunderwave']} as const;

export type GuidedWizardInput=Readonly<{
 classId:'wizard';level:1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19;name:string;profile?:CharacterProfile;
 background:BackgroundId;species:SpeciesId;
 assignedAbilities:AbilityScores;
 increaseMode:'two_plus_one'|'three_ones';plusTwoAbility:Ability;plusOneAbility:Ability;
 wizardSkills:readonly WizardSkill[];humanSkill?:Skill;humanFeat?:'alert'|'tough';
 humanSize?:'small'|'medium';elfLineage?:ElfLineage;
 equipmentChoice:WizardEquipmentChoice; backgroundEquipment?:BackgroundEquipmentChoice; inventoryActions?:readonly InventoryAction[];
 cantripIds:readonly string[];spellbookIds:readonly string[];preparedIds:readonly string[];
 /** Biblioteca manual opcional: sin límites de cantidad, independiente del avance reglamentario. */
 spellSelection?:WizardSpellSelection;
 /** Nivel 2: la habilidad de Erudito debe estar ya entrenada. */
 scholarSkill?:WizardScholarSkill;
 /** Nivel 3: única tradición implementada. */
 subclass?:'evoker';
 /** Dos conjuros gratuitos del rasgo Experto en Evocación del nivel 3. */
 evokerBonusSpellIds?:readonly string[];
 /** Nivel 4: dote Mejora de característica, +2 o +1/+1, sin superar 20. */
 level4Improvement?:WizardLevel4Improvement;
 /** Nivel 5: un conjuro adicional de Evocación al obtener ranuras de nivel 3. */
 evokerLevelThreeSpellId?:string;
 /** Nivel 7: conjuro gratuito de Evocación al obtener ranuras de nivel 4. */
  evokerLevelFourSpellId?:string;
  /** Nivel 8: segunda mejora de característica. */
  level8Improvement?:WizardLevel4Improvement;
  /** Nivel 12: tercera mejora de característica. */
  level12Improvement?:WizardLevel4Improvement;
  /** Nivel 9: nuevo conjuro gratuito de Evocación al obtener ranura de nivel 5. */
  evokerLevelFiveSpellId?:string;
  /** Nivel 11: nueva Evocación gratuita al acceder a ranuras de nivel 6. */
  evokerLevelSixSpellId?:string;
  /** Nivel 13: Evocación gratuita al obtener la primera ranura de nivel 7. */
  evokerLevelSevenSpellId?:string;
  /** Nivel 15: conjuro gratis de Evocación al desbloquear ranuras de nivel 8. */
  evokerLevelEightSpellId?:string;
  /** Nivel 16: cuarta mejora de característica. */
  level16Improvement?:WizardLevel4Improvement;
  /** Nivel 17: Evocación gratuita al desbloquear ranuras de nivel 9. */
  evokerLevelNineSpellId?:string;
  /** Nivel 18: conjuros dominados del libro, niveles 1 y 2, lanzables con una acción. */
  spellMasteryIds?:readonly [string,string];
  /** Nivel 19: selección explícita de dote épica y característica que aumenta. */
  epicBoon?:WizardEpicBoonChoice;
}>;
/**
 * Proyección visual de un Mago todavía sin nombre. La validación estricta de
 * calculateGuidedWizardOne y del snapshot permanece intacta: este identificador
 * temporal NUNCA se escribe en el input persistido.
 *
 * Es necesario durante el prerenderizado de /wizard, que comienza con el
 * campo Nombre vacío. El resultado solo sirve para calcular la vista previa
 * y el estado inicial de juego.
 */
export function wizardInputForPreview(input:GuidedWizardInput):GuidedWizardInput{
 return input.name.trim()?input:{...input,name:'Mago provisional'};
}
export type WizardLevelOneView=Readonly<{
 classId:'wizard';level:1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19;name:string;abilityScores:AbilityScores;
 abilityModifiers:ReturnType<typeof abilityModifiers>;
 skillBonuses:ReturnType<typeof calculateSkillBonuses>;
 savingThrowBonuses:ReturnType<typeof calculateSavingThrows>;
 skillProficiencies:readonly Skill[];
 maximumHitPoints:number;armorClass:number;initiative:number;speedFeet:number;truesightFeet:number;
 size:'small'|'medium';spellAttackBonus:number;spellSaveDC:number;
 equipment:typeof WIZARD_LEVEL_ONE_EQUIPMENT[WizardEquipmentChoice]; inventory:InventoryState;
 spells:ReturnType<typeof validateWizardSpellChoices>;
 backgroundFeat:string;
}>;
const validSkill=(value:unknown):value is Skill=>typeof value==='string'&&(SKILLS as string[]).includes(value);
function selectSpells(ids:readonly string[],items:readonly {id:string;level:number;school:string;ritual?:boolean}[]):WizardSpellReference[]{
 return ids.map(id=>{
  const spell=items.find(s=>s.id===id);
  if(!spell)throw new RangeError(`Conjuro fuera del catálogo inicial del Mago: ${id}`);
  return {id:spell.id,level:spell.level as WizardSpellReference['level'],school:spell.school as WizardSpellReference['school'],ritual:spell.ritual,
   castingTime:wizardMasteryCastingTime(spell.id,spell.level)};
 });
}
export function calculateGuidedWizard(input:GuidedWizardInput):WizardLevelOneView{
 if(!input||input.classId!=='wizard'||![1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19].includes(input.level))throw new RangeError('La creación guiada admite Magos de niveles 1 a 19');
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
 const level4Scores=input.level>=4?applyFighterAbilityImprovement(scores,input.level4Improvement!,4):scores;
 const level8Scores=input.level>=8?applyFighterAbilityImprovement(level4Scores,input.level8Improvement!,8):level4Scores;
 const level12Scores=input.level>=12?applyFighterAbilityImprovement(level8Scores,input.level12Improvement!,12):level8Scores;
 const level16Scores=input.level>=16?applyFighterAbilityImprovement(level12Scores,input.level16Improvement!,16):level12Scores;
 if(input.level<19&&input.epicBoon!==undefined)throw new RangeError('El beneficio épico solo está disponible desde nivel 19');
 const finalScores=input.level>=19?applyWizardEpicBoon(level16Scores,input.epicBoon!):level16Scores;
 if(input.level<4&&input.level4Improvement!==undefined)throw new RangeError('Mejora de nivel 4 no disponible todavía');
 if(input.level<8&&input.level8Improvement!==undefined)throw new RangeError('Mejora de nivel 8 no disponible todavía');
 if(input.level<12&&input.level12Improvement!==undefined)throw new RangeError('Mejora de nivel 12 no disponible todavía');
 if(input.level<16&&input.level16Improvement!==undefined)throw new RangeError('Mejora de nivel 16 no disponible todavía');
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
 if(input.level<18&&input.spellMasteryIds!==undefined)throw new RangeError('Maestría de conjuros se desbloquea en el nivel 18');
 const choices:WizardSpellChoices={cantrips:selectSpells(input.cantripIds,WIZARD_LEVEL_ONE_CANTRIPS),spellbook:[],preparedIds:input.preparedIds,
  ...(input.level>=18?{spellMasteryIds:input.spellMasteryIds}:{})};
 const spellbookExpected=6+2*(input.level-1);
 if(input.spellbookIds.length!==spellbookExpected)throw new RangeError(`El libro necesita ${spellbookExpected} conjuros de progresión`);
 if(input.level>=2){
  if(!WIZARD_SCHOLAR_OPTIONS.includes(input.scholarSkill as WizardScholarSkill))throw new RangeError('Elige la pericia de Erudito');
 }else if(input.scholarSkill!==undefined)throw new RangeError('Erudito solo se desbloquea en el nivel 2');
 if(input.level>=3){
  if(input.subclass!=='evoker')throw new RangeError('Elige la subclase Evocación');
  if(!Array.isArray(input.evokerBonusSpellIds)||input.evokerBonusSpellIds.length!==2||new Set(input.evokerBonusSpellIds).size!==2)
   throw new RangeError('Elige dos conjuros adicionales de Evocación');
 }else if(input.subclass!==undefined||input.evokerBonusSpellIds!==undefined)
  throw new RangeError('La tradición Evocación se desbloquea en el nivel 3');
 const highest=wizardProgression(input.level,input.level>=3?'evoker':undefined).highestSlotLevel;
 const fromCatalog=(ids:readonly string[])=>selectSpells(ids,WIZARD_SPELL_CATALOG);
 const main=fromCatalog(input.spellbookIds);
 if(main.some(sp=>sp.level>highest))throw new RangeError('Conjuros de nivel todavía no disponible');
 const bonus=input.level>=3?fromCatalog(input.evokerBonusSpellIds!):[];
 if(bonus.some(sp=>sp.school!=='evocation'||sp.level>2)||new Set([...main,...bonus].map(sp=>sp.id)).size!==main.length+bonus.length)
  throw new RangeError('Los dos conjuros gratuitos de nivel 3 deben ser evocaciones nuevas de niveles 1 o 2');
 if(input.level<5&&input.evokerLevelThreeSpellId!==undefined)throw new RangeError('El conjuro gratuito del nivel 5 todavía no está disponible');
 const bonus5=input.level>=5?fromCatalog([input.evokerLevelThreeSpellId!]):[];
 if(input.level>=5&&(typeof input.evokerLevelThreeSpellId!=='string'||bonus5[0]?.school!=='evocation'||bonus5[0].level>3))
  throw new RangeError('En nivel 5, Evocación concede un conjuro gratuito de nivel 1 a 3');
 if(new Set([...main,...bonus,...bonus5].map(sp=>sp.id)).size!==main.length+bonus.length+bonus5.length)
  throw new RangeError('Los conjuros de Evocación gratuitos no pueden estar repetidos');
 if(input.level<7&&input.evokerLevelFourSpellId!==undefined)throw new RangeError('El conjuro gratuito de nivel 7 todavía no está disponible');
 const bonus7=input.level>=7?fromCatalog([input.evokerLevelFourSpellId!]):[];
 if(input.level>=7&&(typeof input.evokerLevelFourSpellId!=='string'||bonus7[0]?.school!=='evocation'||bonus7[0].level>4))
  throw new RangeError('En nivel 7, Evocación concede un conjuro gratuito de nivel 1 a 4');
 if(new Set([...main,...bonus,...bonus5,...bonus7].map(sp=>sp.id)).size!==main.length+bonus.length+bonus5.length+bonus7.length)
  throw new RangeError('El conjuro gratuito de Evocación del nivel 7 debe ser nuevo');
 if(input.level<9&&input.evokerLevelFiveSpellId!==undefined)throw new RangeError('El conjuro gratuito del nivel 9 todavía no está disponible');
 const bonus9=input.level>=9?fromCatalog([input.evokerLevelFiveSpellId!]):[];
 if(input.level>=9&&(typeof input.evokerLevelFiveSpellId!=='string'||bonus9[0]?.school!=='evocation'||bonus9[0].level>5))
  throw new RangeError('En nivel 9, Evocación concede un conjuro gratuito de nivel 1 a 5');
 if(new Set([...main,...bonus,...bonus5,...bonus7,...bonus9].map(sp=>sp.id)).size!==main.length+bonus.length+bonus5.length+bonus7.length+bonus9.length)
  throw new RangeError('El conjuro gratuito de Evocación del nivel 9 debe ser nuevo');
 if(input.level<11&&input.evokerLevelSixSpellId!==undefined)throw new RangeError('El conjuro gratuito del nivel 11 todavía no está disponible');
 const bonus11=input.level>=11?fromCatalog([input.evokerLevelSixSpellId!]):[];
 if(input.level>=11&&(typeof input.evokerLevelSixSpellId!=='string'||bonus11[0]?.school!=='evocation'||bonus11[0].level>6))
  throw new RangeError('En nivel 11, Evocación concede un conjuro gratuito de nivel 1 a 6');
 if(new Set([...main,...bonus,...bonus5,...bonus7,...bonus9,...bonus11].map(sp=>sp.id)).size!==main.length+bonus.length+bonus5.length+bonus7.length+bonus9.length+bonus11.length)
  throw new RangeError('El conjuro gratuito de Evocación del nivel 11 debe ser nuevo');
 if(input.level<13&&input.evokerLevelSevenSpellId!==undefined)throw new RangeError('El conjuro gratuito del nivel 13 todavía no está disponible');
 const bonus13=input.level>=13?fromCatalog([input.evokerLevelSevenSpellId!]):[];
 if(input.level>=13&&(typeof input.evokerLevelSevenSpellId!=='string'||bonus13[0]?.school!=='evocation'||bonus13[0].level>7))
  throw new RangeError('En nivel 13, Evocación concede un conjuro gratuito de nivel 1 a 7');
 if(new Set([...main,...bonus,...bonus5,...bonus7,...bonus9,...bonus11,...bonus13].map(sp=>sp.id)).size!==main.length+bonus.length+bonus5.length+bonus7.length+bonus9.length+bonus11.length+bonus13.length)
  throw new RangeError('El conjuro gratuito de Evocación del nivel 13 debe ser nuevo');
 if(input.level<15&&input.evokerLevelEightSpellId!==undefined)throw new RangeError('El conjuro gratuito del nivel 15 todavía no está disponible');
 const bonus15=input.level>=15?fromCatalog([input.evokerLevelEightSpellId!]):[];
 if(input.level>=15&&(typeof input.evokerLevelEightSpellId!=='string'||bonus15[0]?.school!=='evocation'||bonus15[0].level>8))
  throw new RangeError('En nivel 15, Evocación concede un conjuro gratuito de nivel 1 a 8');
 if(input.level<17&&input.evokerLevelNineSpellId!==undefined)throw new RangeError('El conjuro gratuito del nivel 17 todavía no está disponible');
 const bonus17=input.level>=17?fromCatalog([input.evokerLevelNineSpellId!]):[];
 if(input.level>=17&&(typeof input.evokerLevelNineSpellId!=='string'||bonus17[0]?.school!=='evocation'||bonus17[0].level>9))
  throw new RangeError('En nivel 17, Evocación concede un conjuro gratuito de nivel 1 a 9');
 const learned=[...main,...bonus,...bonus5,...bonus7,...bonus9,...bonus11,...bonus13,...bonus15,...bonus17];
 if(new Set(learned.map(sp=>sp.id)).size!==learned.length)throw new RangeError('Los conjuros gratuitos de Evocación deben ser nuevos');
 const spells=validateWizardSpellChoices(input.level,{...choices,spellbook:learned},input.level>=3?'evoker':undefined);
 if(input.spellSelection!==undefined)validateWizardSpellSelection(input.spellSelection);
 const bonuses=abilityModifiers(finalScores);
 const proficiency=[...new Set<Skill>([...bg.skills as readonly Skill[],...input.wizardSkills,...(input.species==='human'?[input.humanSkill!]:[])])];
 const inventory=wizardInventory(input);
 const armorClass=calculateArmorClass({dexterityScore:finalScores.dexterity,strengthScore:finalScores.strength,armor:equippedArmor(inventory),shieldEquipped:inventory.equipped.shield,shieldTrained:false}).value;
 const hpBonus=(input.species==='dwarf'?1:0)+(input.humanFeat==='tough'?2:0);
 if(input.level>=2&&!proficiency.includes(input.scholarSkill!))throw new RangeError('Erudito requiere competencia previa en la habilidad');
 const core=wizardCoreStatistics(input.level,finalScores);
 return {classId:'wizard',level:input.level,name:input.name.trim(),abilityScores:finalScores,abilityModifiers:bonuses,
  skillBonuses:calculateSkillBonuses(finalScores,input.level,{skills:proficiency,expertiseSkills:input.scholarSkill?[input.scholarSkill]:[]}),skillProficiencies:proficiency,
  savingThrowBonuses:calculateSavingThrows(finalScores,input.level,{savingThrows:['intelligence','wisdom']}),
  maximumHitPoints:core.maximumHitPoints+hpBonus*input.level+(input.epicBoon?.id==='fortitude'?40:0),
  armorClass,
  initiative:bonuses.dexterity+((bg.feat==='alert'||input.humanFeat==='alert')?core.proficiencyBonus:0),
  speedFeet:(input.species==='elf'&&input.elfLineage==='wood_elf'?35:30)+(input.epicBoon?.id==='speed'?30:0),
  truesightFeet:input.epicBoon?.id==='truesight'?60:0,
  size:input.species==='halfling'||(input.species==='human'&&input.humanSize==='small')?'small':'medium',
  spellAttackBonus:core.spellAttackBonus,spellSaveDC:core.spellSaveDC,
  equipment:WIZARD_LEVEL_ONE_EQUIPMENT[input.equipmentChoice],inventory,spells,backgroundFeat:bg.feat};
}
/** API histórica: mantiene el contrato de creación inicial y rechaza los niveles superiores. */
export function calculateGuidedWizardOne(input:GuidedWizardInput):WizardLevelOneView{
 if(input.level!==1)throw new RangeError('Esta función crea únicamente Magos de nivel 1');
 return calculateGuidedWizard(input);
}
export type WizardDeathMarks=Readonly<{successes:readonly [boolean,boolean,boolean];failures:readonly [boolean,boolean,boolean]}>;
export type WizardLevelOneState=Readonly<{
 hitPointsCurrent:number;temporaryHitPoints:number;heroicInspiration:boolean;magic:WizardMagicState;
 /** Registro manual opcional para mantener la compatibilidad con guardados de la 48. */
 manualDeathMarks?:WizardDeathMarks;
 /** Marcas individuales de ranura gastada: opcionales por compatibilidad con la actualización 48. */
 slotMarks?:readonly boolean[];
}>;
export function initialWizardOneState(input:GuidedWizardInput):WizardLevelOneState{
 const sheet=calculateGuidedWizard(input);
 return {hitPointsCurrent:sheet.maximumHitPoints,temporaryHitPoints:0,heroicInspiration:input.species==='human',magic:initialWizardMagicState(input.level,input.level>=3?'evoker':undefined),manualDeathMarks:{successes:[false,false,false],failures:[false,false,false]}};
}
export function validateWizardOneState(raw:unknown,sheet:WizardLevelOneView):WizardLevelOneState{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Estado de Mago inválido');
 const state=raw as Record<string,unknown>;
 if(Object.keys(state).some(k=>!['hitPointsCurrent','temporaryHitPoints','heroicInspiration','magic','manualDeathMarks','slotMarks'].includes(k)))throw new RangeError('Estado de Mago contiene datos desconocidos');
 const hp=state.hitPointsCurrent,tp=state.temporaryHitPoints;
 if(!Number.isInteger(hp)||(hp as number)<0||(hp as number)>sheet.maximumHitPoints||!Number.isInteger(tp)||(tp as number)<0||(tp as number)>10000||typeof state.heroicInspiration!=='boolean')throw new RangeError('PG o inspiración del Mago inválidos');
 const magic=state.magic as WizardMagicState;
 if(!magic||typeof magic!=='object'||!magic.slots||typeof magic.arcaneRecoveryUsed!=='boolean'||!Number.isSafeInteger(magic.overchannelUses)||magic.overchannelUses<0||(sheet.level<14&&magic.overchannelUses!==0)||!Array.isArray(magic.signatureUsed)||magic.signatureUsed.length!==0)
  throw new RangeError('Recursos de magia de Mago inválidos');
 const slots=createSlotPool(magic.slots.maximum,magic.slots.remaining);
 if(slots.maximum.join(',')!==wizardProgression(sheet.level,sheet.level>=3?'evoker':undefined).spellSlots.join(','))throw new RangeError('Ranuras de nivel distinto a la ficha');
 let manualDeathMarks:WizardDeathMarks|undefined;
 if(state.manualDeathMarks!==undefined){
  const marks=state.manualDeathMarks as Record<string,unknown>;
  if(!marks||typeof marks!=='object'||Array.isArray(marks)||Object.keys(marks).some(k=>k!=='successes'&&k!=='failures'))throw new RangeError('Marcadores manuales inválidos');
  const validTrack=(value:unknown):value is [boolean,boolean,boolean]=>Array.isArray(value)&&value.length===3&&value.every(x=>typeof x==='boolean');
  if(!validTrack(marks.successes)||!validTrack(marks.failures))throw new RangeError('Los marcadores manuales requieren tres booleanos por grupo');
  manualDeathMarks={successes:[...marks.successes],failures:[...marks.failures]};
 }
 const marks=state.slotMarks;
 if(marks!==undefined&&(!Array.isArray(marks)||marks.length!==slots.maximum.reduce((a,b)=>a+b,0)||marks.some(value=>typeof value!=='boolean')||slots.maximum.some((maximum,i)=>{const offset=slots.maximum.slice(0,i).reduce((a,b)=>a+b,0);return marks.slice(offset,offset+maximum).filter(Boolean).length!==maximum-slots.remaining[i]})))
  throw new RangeError('Las marcas de espacios de conjuro no coinciden con las ranuras disponibles');
 return {hitPointsCurrent:hp as number,temporaryHitPoints:tp as number,heroicInspiration:state.heroicInspiration,magic:{slots,arcaneRecoveryUsed:magic.arcaneRecoveryUsed,overchannelUses:magic.overchannelUses,signatureUsed:[]},...(manualDeathMarks?{manualDeathMarks}:{}),...(marks!==undefined?{slotMarks:[...(marks as boolean[])]}:{})};
}
export type WizardCharacterSnapshot=Readonly<{
 schemaVersion:3;ruleset:'dnd-2024';input:GuidedWizardInput;wizardState:WizardLevelOneState;
}>;
export function validateWizardCharacterSnapshot(raw:unknown):WizardCharacterSnapshot{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Guardado de Mago inválido');
 const value=raw as Record<string,unknown>;
 if(value.schemaVersion!==3||value.ruleset!=='dnd-2024'||Object.keys(value).some(k=>!['schemaVersion','ruleset','input','wizardState'].includes(k)))throw new RangeError('Versión o estructura de Mago incorrectas');
 const permitted=['spellSelection','scholarSkill','subclass','evokerBonusSpellIds','level4Improvement','evokerLevelThreeSpellId','evokerLevelFourSpellId','level8Improvement','level12Improvement','level16Improvement','evokerLevelFiveSpellId','evokerLevelSixSpellId','evokerLevelSevenSpellId','evokerLevelEightSpellId','evokerLevelNineSpellId','spellMasteryIds','epicBoon','classId','level','name','profile','background','species','assignedAbilities','increaseMode','plusTwoAbility','plusOneAbility','wizardSkills','humanSkill','humanFeat','humanSize','elfLineage','equipmentChoice','backgroundEquipment','inventoryActions','cantripIds','spellbookIds','preparedIds'];
 if(!value.input||typeof value.input!=='object'||Array.isArray(value.input)||Object.keys(value.input as Record<string,unknown>).some(key=>!permitted.includes(key)))throw new RangeError('La creación de Mago incluye campos desconocidos');
 let clean:GuidedWizardInput;
 try{const json=JSON.stringify(value.input);if(json.length>120_000)throw new Error();clean=JSON.parse(json) as GuidedWizardInput;}catch{throw new RangeError('Datos de Mago demasiado grandes o no serializables');}
 if(clean.profile!==undefined)clean={...clean,profile:validateCharacterProfile(clean.profile)};
 const sheet=calculateGuidedWizard(clean);
 return {schemaVersion:3,ruleset:'dnd-2024',input:clean,wizardState:validateWizardOneState(value.wizardState,sheet)};
}
export function makeWizardCharacterSnapshot(input:GuidedWizardInput,state?:WizardLevelOneState):WizardCharacterSnapshot{
 return validateWizardCharacterSnapshot({schemaVersion:3,ruleset:'dnd-2024',input:{...input,profile:validateCharacterProfile(input.profile??EMPTY_CHARACTER_PROFILE)},wizardState:state??initialWizardOneState(input)});
}
