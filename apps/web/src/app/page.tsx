"use client";

import { useMemo, useRef, useState } from "react";
import {EPIC_BOONS,type EpicBoonId} from "../../../../packages/rules-engine/src/epic-boons";
import SaveLoadPanel from "../components/SaveLoadPanel";
import CharacterHeader from "../components/CharacterHeader";
import PrincipalOverview from "../components/PrincipalOverview";
import TraitsPanel from "../components/TraitsPanel";
import CharacterTabs, { type SheetTab } from "../components/CharacterTabs";
import SheetPlaceholder from "../components/SheetPlaceholder";
import PlayPanel from "../components/PlayPanel";
import SurvivalPanel from "../components/SurvivalPanel";
import IncomingAttacksPanel from "../components/IncomingAttacksPanel";
import MagicWardsPanel from "../components/MagicWardsPanel";
import AttacksPanel from "../components/AttacksPanel";
import CombatPanel from "../components/CombatPanel";
import TurnPanel from "../components/TurnPanel";
import ConditionsPanel from "../components/ConditionsPanel";
import { recordWeaponAttack } from "../../../../packages/rules-engine/src/combat";
import type {AttackTurnUsage} from "../../../../packages/rules-engine/src/turns";
import {conditionCapabilities,initialConditionLedger} from "../../../../packages/rules-engine/src/conditions";
import type { WeaponAttackProfile,AttackResolution } from "../../../../packages/rules-engine/src/attacks";
import type {MasteryContext} from "../../../../packages/rules-engine/src/mastery-effects";
import { initialAdventureState, validateAdventureState, updateAdventureCombat, type AdventureState } from "../../../../packages/rules-engine/src/adventure";
import type { CharacterSnapshot } from "../../../../packages/rules-engine/src/persistence";
import { calculateGuidedFighter, BACKGROUNDS, FIGHTER_SKILL_OPTIONS, HUMAN_FEATS, type BackgroundId, type SpeciesId, type ElfLineage, type GuidedFighterInput, type HumanOriginFeat } from "../../../../packages/rules-engine/src/guided";
import { adjacentFighterLevel, type SupportedFighterLevel } from "../../../../packages/rules-engine/src/progression";
import {prepareFighterLevelUp,prepareFighterLevelUpWithFreshSession} from "../../../../packages/rules-engine/src/level-up";
import { ABILITIES, type Ability, type AbilityScores } from "../../../../packages/rules-engine/src/abilities";
import { SKILLS, type Skill } from "../../../../packages/rules-engine/src/proficiencies";
import type { ArmorId } from "../../../../packages/rules-engine/src/defense";
import { FIGHTING_STYLES, WEAPONS, FIGHTER_PACKAGES, type FightingStyleId, type WeaponId, type StartingPackageId } from "../../../../packages/rules-engine/src/martial";
import { ORIGIN_FEATS, CRAFTER_TOOLS, MUSICAL_INSTRUMENTS, TOOL_NAMES, SKILLED_OPTIONS, type ToolId } from "../../../../packages/rules-engine/src/origin-feats";
import { SPELL_LISTS, MAGIC_ABILITY_OPTIONS, spellName, type SpellListId, type SpellAbility, type MagicInitiateSelection } from "../../../../packages/rules-engine/src/origin-magic";
import { BACKGROUND_PACKAGES, GAMING_SETS, ITEM_NAMES, combineStartingInventory, validateBackgroundEquipment, type BackgroundPackageId, type GamingSetId } from "../../../../packages/rules-engine/src/background-equipment";
import { INVENTORY_NAMES, INVENTORY_PRICES_CP, replayInventory, equippedArmor, hasEquippedShield, importLegacyMagicWards, nextMagicInstanceId, formatCopper, type InventoryAction, type InventoryItemId } from "../../../../packages/rules-engine/src/inventory";
import {MAGIC_WARD_CATALOG} from "../../../../packages/rules-engine/src/magic-wards";

const NAMES: Record<Ability, string> = {strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
const SKILL_NAMES: Record<Skill,string> = {
  acrobatics:'Acrobacias',animal_handling:'Trato con animales',arcana:'Arcanos',athletics:'Atletismo',deception:'Engaño',history:'Historia',insight:'Perspicacia',intimidation:'Intimidación',investigation:'Investigación',medicine:'Medicina',nature:'Naturaleza',perception:'Percepción',performance:'Interpretación',persuasion:'Persuasión',religion:'Religión',sleight_of_hand:'Juego de manos',stealth:'Sigilo',survival:'Supervivencia'
};
const ARMOR_OPTIONS: ReadonlyArray<{id:ArmorId|null;name:string}> = [
{id:null,name:'Sin armadura'},{id:'leather',name:'Cuero'},{id:'studded_leather',name:'Cuero tachonado'},{id:'hide',name:'Pieles'},
{id:'chain_shirt',name:'Camisa de malla'},{id:'scale_mail',name:'Cota de escamas'},{id:'breastplate',name:'Coraza'},
{id:'half_plate',name:'Media armadura'},{id:'ring_mail',name:'Cota de anillas'},{id:'chain_mail',name:'Cota de malla'},
{id:'splint',name:'Bandas'},{id:'plate',name:'Placas'}
];
const FEATURES:Record<string,string>={ability_score_improvement:'Mejora de característica (nivel 4)',extra_attack:'Ataque adicional (nivel 5)',tactical_shift:'Desplazamiento táctico (nivel 5)',fighting_style:'Estilo de combate',second_wind:'Segundo aliento',weapon_mastery:'Maestría de armas',action_surge:'Acción súbita',tactical_mind:'Mente táctica',champion_improved_critical:'Crítico mejorado',champion_remarkable_athlete:'Atleta extraordinario',ability_score_improvement_level_6:'Mejora de característica (nivel 6)',champion_additional_fighting_style:'Estilo de combate adicional (Campeón nivel 7)',ability_score_improvement_level_8:'Mejora de característica (nivel 8)',indomitable:'Indomable (nivel 9)',tactical_master:'Dominio táctico (nivel 9)',champion_heroic_warrior:'Guerrero heroico (Campeón nivel 10)',two_extra_attacks:'Dos ataques adicionales (nivel 11)',ability_score_improvement_level_12:'Mejora de característica (nivel 12)',studied_attacks:'Ataques estudiados (nivel 13)',ability_score_improvement_level_14:'Mejora de característica (nivel 14)',champion_superior_critical:'Crítico superior (Campeón nivel 15): 18–20',ability_score_improvement_level_16:'Mejora de característica (nivel 16)',weapon_mastery_sixth:'Sexta maestría de armas (nivel 16)',action_surge_two_uses:'Acción súbita (2 usos, nivel 17)',indomitable_three_uses:'Indomable (3 usos, nivel 17)',champion_survivor:'Superviviente (Campeón nivel 18)',epic_boon:'Beneficio épico (nivel 19)',epic_boon_combat_prowess:'Pericia en combate',epic_boon_fortitude:'Fortaleza',epic_boon_speed:'Velocidad',three_extra_attacks:'Tres ataques adicionales (nivel 20): cuatro ataques por acción Atacar'};
const FEATS = ORIGIN_FEATS;
const originFeatName=(x:string)=>({magic_initiate_cleric:'Iniciado en la Magia (Clérigo)',magic_initiate_wizard:'Iniciado en la Magia (Mago)',...ORIGIN_FEATS} as Record<string,string>)[x]??x;
const signed=(n:number)=>n>=0?`+${n}`:String(n);
const validSkills=(bg:BackgroundId)=>FIGHTER_SKILL_OPTIONS.filter(s=>!(BACKGROUNDS[bg].skills as readonly string[]).includes(s));
function initialForBackground(bg:BackgroundId):{plusTwoAbility:Ability;plusOneAbility:Ability;fighterSkills:Skill[]}{
const b=BACKGROUNDS[bg];return {plusTwoAbility:b.abilities[0] as Ability,plusOneAbility:b.abilities[1] as Ability,fighterSkills:validSkills(bg).slice(0,2)};
}
export default function Home(){
  const [step,setStep]=useState(0);
  const [activeTab,setActiveTab]=useState<SheetTab>("principal");
  const editorDetailsRef=useRef<HTMLDetailsElement>(null);
  const toolsDetailsRef=useRef<HTMLDetailsElement>(null);
  const [adventure,setAdventure]=useState<AdventureState|null>(null);
  const [name,setName]=useState('Aldric');
  const [level,setLevel]=useState<SupportedFighterLevel>(1);
  const [asiMode,setAsiMode]=useState<'plus_two'|'two_ones'>('plus_two');
  const [asiFirst,setAsiFirst]=useState<Ability>('strength');
  const [asiSecond,setAsiSecond]=useState<Ability>('constitution');
  const [asi6Mode,setAsi6Mode]=useState<'plus_two'|'two_ones'>('plus_two');
  const [asi6First,setAsi6First]=useState<Ability>('constitution');
  const [asi6Second,setAsi6Second]=useState<Ability>('dexterity');
  const [asi8Mode,setAsi8Mode]=useState<'plus_two'|'two_ones'>('plus_two');
  const [asi8First,setAsi8First]=useState<Ability>('wisdom');
  const [asi8Second,setAsi8Second]=useState<Ability>('dexterity');
  const [asi12Mode,setAsi12Mode]=useState<'plus_two'|'two_ones'>('plus_two');
  const [asi12First,setAsi12First]=useState<Ability>('wisdom');
  const [asi12Second,setAsi12Second]=useState<Ability>('dexterity');
  const [asi14Mode,setAsi14Mode]=useState<'plus_two'|'two_ones'>('plus_two');
  const [asi14First,setAsi14First]=useState<Ability>('charisma');
  const [asi14Second,setAsi14Second]=useState<Ability>('dexterity');
  const [asi16Mode,setAsi16Mode]=useState<'plus_two'|'two_ones'>('plus_two');
  const [asi16First,setAsi16First]=useState<Ability>('intelligence');
  const [asi16Second,setAsi16Second]=useState<Ability>('dexterity');
  const [epicBoon,setEpicBoon]=useState<EpicBoonId|''>('');
  const [epicAbility,setEpicAbility]=useState<Ability>('strength');
  const [levelMessage,setLevelMessage]=useState('');
  const [levelRecovery,setLevelRecovery]=useState<SupportedFighterLevel|null>(null);
  const [background,setBackground]=useState<BackgroundId>('soldier');
  const [species,setSpecies]=useState<SpeciesId>('human');
  const [scores,setScores]=useState<AbilityScores>({strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8});
  const [mode,setMode]=useState<'two_plus_one'|'three_ones'>('two_plus_one');
  const [two,setTwo]=useState<Ability>('strength');
  const [one,setOne]=useState<Ability>('dexterity');
  const [fighterSkills,setFighterSkills]=useState<Skill[]>(['perception','survival']);
  const [humanSkill,setHumanSkill]=useState<Skill>('investigation');
  const [humanFeat,setHumanFeat]=useState<HumanOriginFeat>('tough');
  const [bgMagicAbility,setBgMagicAbility]=useState<SpellAbility>('wisdom');
  const [bgClericCantrips,setBgClericCantrips]=useState<string[]>(['guidance','sacred_flame']);
  const [bgClericSpell,setBgClericSpell]=useState('bless');
  const [bgWizardCantrips,setBgWizardCantrips]=useState<string[]>(['fire_bolt','mage_hand']);
  const [bgWizardSpell,setBgWizardSpell]=useState('magic_missile');
  const [humanMagicList,setHumanMagicList]=useState<SpellListId>('druid');
  const [humanMagicAbility,setHumanMagicAbility]=useState<SpellAbility>('wisdom');
  const [humanCantrips,setHumanCantrips]=useState<string[]>(['druidcraft','guidance']);
  const [humanSpell,setHumanSpell]=useState('goodberry');
  const [crafterTools,setCrafterTools]=useState<string[]>(['carpenters_tools','leatherworkers_tools','smiths_tools']);
  const [instruments,setInstruments]=useState<string[]>(['lute','flute','drum']);
  const [skilled,setSkilled]=useState<string[]>(['skill:medicine','skill:deception','tool:disguise_kit']);
  const [humanSize,setHumanSize]=useState<'small'|'medium'>('medium');
  const [lineage,setLineage]=useState<ElfLineage>('wood_elf');
  const [elfSkill,setElfSkill]=useState<'insight'|'perception'|'survival'>('insight');
  const [elfSpell,setElfSpell]=useState<'intelligence'|'wisdom'|'charisma'>('intelligence');
  const [style,setStyle]=useState<FightingStyleId>('defense');
  const [additionalStyle,setAdditionalStyle]=useState<FightingStyleId|''>('');
  const [masteries,setMasteries]=useState<WeaponId[]>(['greatsword','flail','javelin']);
  const [fourthMastery,setFourthMastery]=useState<WeaponId>('shortsword');
  const [fifthMastery,setFifthMastery]=useState<WeaponId|''>('');
  const [sixthMastery,setSixthMastery]=useState<WeaponId|''>('');
  const [starter,setStarter]=useState<StartingPackageId>('a');
  const [backgroundPackage,setBackgroundPackage]=useState<BackgroundPackageId>('a');
  const [soldierGamingSet,setSoldierGamingSet]=useState<GamingSetId>('dice_set');
  const [inventoryEdits,setInventoryEdits]=useState<{key:string;actions:InventoryAction[]}>({key:'',actions:[]});
  const [inventoryError,setInventoryError]=useState<string|null>(null);
  const [tradeItem,setTradeItem]=useState<InventoryItemId>('shield');
  const [tradeCount,setTradeCount]=useState(1);
  const inventoryKey=[starter,background,backgroundPackage,background==='soldier'&&backgroundPackage==='a'?soldierGamingSet:''].join(':');
  const starting=useMemo(()=>combineStartingInventory(starter,validateBackgroundEquipment(background,{startingPackage:backgroundPackage,...(background==='soldier'?{gamingSet:soldierGamingSet}:{})})),[starter,background,backgroundPackage,soldierGamingSet]);
  const activeActions=useMemo(()=>inventoryEdits.key===inventoryKey?inventoryEdits.actions:[],[inventoryEdits,inventoryKey]);
  const inventory=useMemo(()=>replayInventory(starting,FIGHTER_PACKAGES[starter].initialArmor,activeActions),[starting,starter,activeActions]);
  const armor:ArmorId|null=equippedArmor(inventory);
  const shield=hasEquippedShield(inventory);
  const quotedQty=Number.isInteger(tradeCount)&&tradeCount>=1&&tradeCount<=1000?tradeCount:0;
  function transact(action:InventoryAction){
    try{
      const registered:InventoryAction=action.type==='magic_grant'?{...action,instanceId:nextMagicInstanceId(activeActions)}:action;
      const updated=[...activeActions,registered];
      replayInventory(starting,FIGHTER_PACKAGES[starter].initialArmor,updated);
      setInventoryEdits({key:inventoryKey,actions:updated});setInventoryError(null);return null;
    }catch(e){const message=e instanceof Error?e.message:'Operación no válida';setInventoryError(message);return message;}
  }
  function undoTransaction(){if(activeActions.length) {setInventoryEdits({key:inventoryKey,actions:activeActions.slice(0,-1)});setInventoryError(null);}}
  function resetTransactions(){setInventoryEdits({key:inventoryKey,actions:[]});setInventoryError(null);}
  const bg=BACKGROUNDS[background];
  const allowed=bg.abilities as readonly Ability[];
  function onBackground(next:BackgroundId){const defaults=initialForBackground(next);setBackground(next);setTwo(defaults.plusTwoAbility);setOne(defaults.plusOneAbility);setFighterSkills(defaults.fighterSkills);
    if(next==='acolyte'){setBgMagicAbility('wisdom');if(humanFeat==='magic_initiate'&&humanMagicList==='cleric')changeHumanMagicList('druid');}
    if(next==='sage'){setBgMagicAbility('intelligence');if(humanFeat==='magic_initiate'&&humanMagicList==='wizard')changeHumanMagicList('druid');}
  }
  function changeHumanMagicList(next:SpellListId){setHumanMagicList(next);setHumanCantrips([...SPELL_LISTS[next].cantrips.slice(0,2)]);setHumanSpell(SPELL_LISTS[next].level1[0]);}
  const backgroundMagicInitiate=useMemo<MagicInitiateSelection|undefined>(()=>background==='acolyte'
    ? {list:'cleric',spellcastingAbility:bgMagicAbility,cantrips:bgClericCantrips,level1Spell:bgClericSpell}
    : background==='sage'?{list:'wizard',spellcastingAbility:bgMagicAbility,cantrips:bgWizardCantrips,level1Spell:bgWizardSpell}:undefined,
    [background,bgMagicAbility,bgClericCantrips,bgClericSpell,bgWizardCantrips,bgWizardSpell]);
  const humanFeatDetails=useMemo(()=>({magicInitiate:{list:humanMagicList,spellcastingAbility:humanMagicAbility,cantrips:humanCantrips,level1Spell:humanSpell},crafterTools,musicianInstruments:instruments,skilledProficiencies:skilled}),[humanMagicList,humanMagicAbility,humanCantrips,humanSpell,crafterTools,instruments,skilled]);
  const input=useMemo<GuidedFighterInput>(()=>({name,level,background,species,
    ...(level>=4?{level4Improvement:{mode:asiMode,first:asiFirst,...(asiMode==='two_ones'?{second:asiSecond}:{})}}:{}),
    ...(level>=6?{level6Improvement:{mode:asi6Mode,first:asi6First,...(asi6Mode==='two_ones'?{second:asi6Second}:{})}}:{}),
    ...(level>=8?{level8Improvement:{mode:asi8Mode,first:asi8First,...(asi8Mode==='two_ones'?{second:asi8Second}:{})}}:{}),
    ...(level>=12?{level12Improvement:{mode:asi12Mode,first:asi12First,...(asi12Mode==='two_ones'?{second:asi12Second}:{})}}:{}),
    ...(level>=14?{level14Improvement:{mode:asi14Mode,first:asi14First,...(asi14Mode==='two_ones'?{second:asi14Second}:{})}}:{}),
    ...(level>=16?{level16Improvement:{mode:asi16Mode,first:asi16First,...(asi16Mode==='two_ones'?{second:asi16Second}:{})}}:{}),
    ...(level>=19&&epicBoon?{epicBoon:{id:epicBoon,ability:epicAbility}}:{}),
    assignedAbilities:scores,increaseMode:mode,plusTwoAbility:two,plusOneAbility:one,fighterSkills,humanSkill,humanFeat,humanFeatDetails,backgroundMagicInitiate,humanSize,elfLineage:lineage,elfSenseSkill:elfSkill,elfSpellAbility:elfSpell,armor,shield,inventoryActions:activeActions,martial:{fightingStyle:style,...(level>=7?{additionalFightingStyle:additionalStyle as FightingStyleId}:{}),weaponMasteries:masteries,startingPackage:starter},
    backgroundEquipment:{startingPackage:backgroundPackage,...(background==='soldier'?{gamingSet:soldierGamingSet}:{})}}),[name,level,asiMode,asiFirst,asiSecond,asi6Mode,asi6First,asi6Second,asi8Mode,asi8First,asi8Second,asi12Mode,asi12First,asi12Second,asi14Mode,asi14First,asi14Second,asi16Mode,asi16First,asi16Second,epicBoon,epicAbility,additionalStyle,background,species,scores,mode,two,one,fighterSkills,humanSkill,humanFeat,humanFeatDetails,backgroundMagicInitiate,humanSize,lineage,elfSkill,elfSpell,armor,shield,style,masteries,starter,backgroundPackage,soldierGamingSet,activeActions]);
  const output=useMemo(()=>{try{return {result:calculateGuidedFighter(input),error:null};}catch(e){return {result:null,error:e instanceof Error?e.message:'Error al crear el personaje'};}},[input]);
  function loadSavedInput(saved:GuidedFighterInput){
    setName(saved.name);setLevel(saved.level);setLevelMessage('');setLevelRecovery(null);
    setAsiMode(saved.level4Improvement?.mode??'plus_two');setAsiFirst(saved.level4Improvement?.first??'strength');
    setAsiSecond(saved.level4Improvement?.second??'constitution');
    setAsi6Mode(saved.level6Improvement?.mode??'plus_two');setAsi6First(saved.level6Improvement?.first??'constitution');
    setAsi6Second(saved.level6Improvement?.second??'dexterity');
    setAsi8Mode(saved.level8Improvement?.mode??'plus_two');setAsi8First(saved.level8Improvement?.first??'wisdom');
    setAsi8Second(saved.level8Improvement?.second??'dexterity');
    setAsi12Mode(saved.level12Improvement?.mode??'plus_two');setAsi12First(saved.level12Improvement?.first??'wisdom');
    setAsi12Second(saved.level12Improvement?.second??'dexterity');
    setAsi14Mode(saved.level14Improvement?.mode??'plus_two');setAsi14First(saved.level14Improvement?.first??'charisma');
    setAsi14Second(saved.level14Improvement?.second??'dexterity');
    setAsi16Mode(saved.level16Improvement?.mode??'plus_two');setAsi16First(saved.level16Improvement?.first??'intelligence');
    setAsi16Second(saved.level16Improvement?.second??'dexterity');setEpicBoon(saved.epicBoon?.id??'');setEpicAbility(saved.epicBoon?.ability??'strength');setBackground(saved.background);setSpecies(saved.species);
    setScores({...saved.assignedAbilities});setMode(saved.increaseMode);setTwo(saved.plusTwoAbility);setOne(saved.plusOneAbility);
    setFighterSkills([...saved.fighterSkills]);setHumanSkill(saved.humanSkill??'investigation');
    setHumanFeat(saved.humanFeat??'tough');setHumanSize(saved.humanSize??'medium');
    setLineage(saved.elfLineage??'wood_elf');setElfSkill(saved.elfSenseSkill??'insight');setElfSpell(saved.elfSpellAbility??'intelligence');
    if(saved.backgroundMagicInitiate){
      setBgMagicAbility(saved.backgroundMagicInitiate.spellcastingAbility);
      if(saved.backgroundMagicInitiate.list==='cleric'){
        setBgClericCantrips([...saved.backgroundMagicInitiate.cantrips]);setBgClericSpell(saved.backgroundMagicInitiate.level1Spell);
      }else if(saved.backgroundMagicInitiate.list==='wizard'){
        setBgWizardCantrips([...saved.backgroundMagicInitiate.cantrips]);setBgWizardSpell(saved.backgroundMagicInitiate.level1Spell);
      }
    }
    const details=saved.humanFeatDetails;
    if(details?.magicInitiate){
      setHumanMagicList(details.magicInitiate.list);setHumanMagicAbility(details.magicInitiate.spellcastingAbility);
      setHumanCantrips([...details.magicInitiate.cantrips]);setHumanSpell(details.magicInitiate.level1Spell);
    }
    if(details?.crafterTools)setCrafterTools([...details.crafterTools]);
    if(details?.musicianInstruments)setInstruments([...details.musicianInstruments]);
    if(details?.skilledProficiencies)setSkilled([...details.skilledProficiencies]);
    const martial=saved.martial;
    setStyle(martial?.fightingStyle??'defense');setAdditionalStyle(martial?.additionalFightingStyle??'');setMasteries(martial?[...martial.weaponMasteries]:['greatsword','flail','javelin']);setFourthMastery(martial?.weaponMasteries[3]??'shortsword');setFifthMastery(martial?.weaponMasteries[4]??'');setSixthMastery(martial?.weaponMasteries[5]??'');
    const newStarter=martial?.startingPackage??'a';setStarter(newStarter);
    const newBackgroundPack=saved.backgroundEquipment?.startingPackage??'a';setBackgroundPackage(newBackgroundPack);
    const game=saved.backgroundEquipment?.gamingSet??'dice_set';setSoldierGamingSet(game);
    const key=[newStarter,saved.background,newBackgroundPack,saved.background==='soldier'&&newBackgroundPack==='a'?game:''].join(':');
    setInventoryEdits({key,actions:[...(saved.inventoryActions??[])]});setInventoryError(null);
    setTradeCount(1);setStep(0);
  }
  const sheet=output.result?.sheet;
  const sessionCheck=useMemo(()=>{
    if(!sheet)return {state:null,outOfSync:false};
    if(!adventure)return {state:initialAdventureState(sheet),outOfSync:false};
    try{return {state:validateAdventureState(adventure,sheet),outOfSync:false};}
    catch{return {state:adventure,outOfSync:true};}
  },[sheet,adventure]);
  /** Construye la siguiente hoja usando las elecciones actuales, sin alterar el estado de React. */
  function nextFighterInput(next:SupportedFighterLevel):{
    value:GuidedFighterInput;masteries:WeaponId[]
  }{
    const chosenMasteries=next===4?[...masteries,fourthMastery]:next===10?[...masteries,fifthMastery as WeaponId]:next===16?[...masteries,sixthMastery as WeaponId]:[...masteries];
    const value:GuidedFighterInput={...input,level:next,
      ...(next>=4?{level4Improvement:{mode:asiMode,first:asiFirst,...(asiMode==='two_ones'?{second:asiSecond}:{})}}:{}),
      ...(next>=6?{level6Improvement:{mode:asi6Mode,first:asi6First,...(asi6Mode==='two_ones'?{second:asi6Second}:{})}}:{}),
      ...(next>=8?{level8Improvement:{mode:asi8Mode,first:asi8First,...(asi8Mode==='two_ones'?{second:asi8Second}:{})}}:{}),
      ...(next>=12?{level12Improvement:{mode:asi12Mode,first:asi12First,...(asi12Mode==='two_ones'?{second:asi12Second}:{})}}:{}),
      ...(next>=14?{level14Improvement:{mode:asi14Mode,first:asi14First,...(asi14Mode==='two_ones'?{second:asi14Second}:{})}}:{}),
      ...(next>=16?{level16Improvement:{mode:asi16Mode,first:asi16First,...(asi16Mode==='two_ones'?{second:asi16Second}:{})}}:{}),
      ...(next>=19&&epicBoon?{epicBoon:{id:epicBoon,ability:epicAbility}}:{}),
      martial:{...input.martial!,weaponMasteries:chosenMasteries,
        ...(next>=7?{additionalFightingStyle:additionalStyle as FightingStyleId}:{})}};
    return {value,masteries:chosenMasteries};
  }
  function acceptLevelTransition(snapshot:CharacterSnapshot,chosenMasteries:WeaponId[],description:string){
    setAdventure(snapshot.adventure);
    setMasteries(chosenMasteries);
    setLevel(snapshot.input.level);
    setLevelRecovery(null);
    setLevelMessage(description);
  }
  function selectFighterLevel(next:SupportedFighterLevel){
    setLevelMessage('');setLevelRecovery(null);
    if(next===level)return;
    if(next<level){
      if(adventure!==null&&typeof window!=='undefined'&&!window.confirm(`¿Bajar a nivel ${next}? Se reiniciará la sesión de combate actual (PG, recursos gastados, historial y turnos). Guarda antes una copia del personaje si quieres conservarla.`))return;
      setLevel(next);setMasteries(prev=>prev.slice(0,next>=16?6:next>=10?5:next>=4?4:3));setAdventure(null);
      setLevelMessage(`Ahora estás en nivel ${next}. Se ha reiniciado el estado de combate. Guarda una copia si quieres conservar la partida anterior.`);return;
    }
    if(next!==level+1){setLevelMessage('Sube exactamente un nivel cada vez.');return;}
    if(!output.result?.sheet){setLevelMessage(`No se puede subir: ${output.error??'revisa las elecciones del personaje'}`);return;}
    if(next===19&&!epicBoon){setLevelMessage('Antes de subir al nivel 19, elige un beneficio épico en Características.');return;}
    if(next===16&&!sixthMastery){
      setLevelMessage('Para alcanzar el nivel 16, elige una sexta maestría en Equipo.');return;
    }
    if(next===10&&!fifthMastery){
      setLevelMessage('Para alcanzar el nivel 10, elige una quinta maestría en Equipo.');return;
    }
    if(next===7&&!additionalStyle){
      setLevelMessage('Para alcanzar el nivel 7 debes elegir un segundo estilo de combate en este mismo apartado. Después vuelve a pulsar la flecha derecha.');
      return;
    }
    const candidate=nextFighterInput(next);
    // Validar la nueva hoja ANTES de comprobar el estado de combate. Así no se
    // confunde una elección inválida con un error de persistencia.
    try{calculateGuidedFighter(candidate.value);}catch(e){
      setLevelMessage(`No se puede subir al nivel ${next}: ${e instanceof Error?e.message:'revisa las elecciones'} (comprueba Características y Equipo).`);
      return;
    }
    const needsSync=sessionCheck.outOfSync;
    if(needsSync&&adventure&&typeof window!=='undefined'&&!window.confirm(
      `Los PG máximos o el estado de partida del nivel ${level} no coinciden con la hoja. ¿Intentar sincronizar la sesión actual antes de subir a ${next}, conservando el daño y el historial?`
    )){
      setLevelMessage('Se ha cancelado la sincronización. No se ha modificado el nivel.');return;
    }
    try{
      const source=needsSync?adventure:sessionCheck.state;
      if(!source)throw new RangeError('Falta el estado de partida para avanzar');
      const transition=prepareFighterLevelUp(input,source,candidate.value,needsSync);
      acceptLevelTransition(transition.snapshot,candidate.masteries,
        `Nivel ${next} alcanzado. ${transition.synchronizedBeforeAdvance?'La sesión se sincronizó previamente. ':''}Pulsa «Actualizar guardado» en Mis personajes para conservarlo.`);
    }catch(e){
      const message=e instanceof Error?e.message:'Error desconocido';
      setLevelMessage(`La hoja de nivel ${next} es válida, pero la sesión de combate impide subir: ${message}. Puedes conservar la partida y revisar el error o utilizar la recuperación de sesión disponible aquí.`);
      setLevelRecovery(next);
    }
  }
  /** Recuperación voluntaria: solo en caso de estado de combate incompatible.
   * Nunca cambia el guardado de PostgreSQL hasta que el usuario lo actualiza.
   */
  function retryLevelWithFreshSession(){
    if(levelRecovery===null)return;
    const next=levelRecovery;
    if(next!==level+1){setLevelRecovery(null);return;}
    if(!window.confirm(
      `¿Subir a nivel ${next} iniciando una sesión de combate nueva? Se reiniciarán PG actuales, recursos gastados, condiciones, turnos e historial de la SESIÓN EN PANTALLA. El personaje guardado en PostgreSQL permanecerá intacto hasta que pulses «Actualizar guardado». Cancela si necesitas conservar la sesión actual.`
    ))return;
    try{
      const candidate=nextFighterInput(next);
      const transition=prepareFighterLevelUpWithFreshSession(input,candidate.value);
      acceptLevelTransition(transition.snapshot,candidate.masteries,
        `Nivel ${next} alcanzado. Se ha creado una sesión de combate nueva. Antes de guardar, verifica los PG y recursos actuales.`);
    }catch(e){setLevelMessage(`La recuperación no ha podido subir de nivel: ${e instanceof Error?e.message:'error desconocido'}`);}
  }
  function confirmWeaponAttack(profile:WeaponAttackProfile,resolution:AttackResolution,context:MasteryContext,usage:AttackTurnUsage,usePeerlessAim=false){
    if(!sheet||!sessionCheck.state||sessionCheck.outOfSync||!output.result?.inventory)throw new RangeError('Primero valida y sincroniza el personaje');
    if(sessionCheck.state.fighter.hitPoints.current===0)throw new RangeError('A 0 PG no se pueden registrar ataques: revisa el estado del personaje');
    if(!conditionCapabilities(sessionCheck.state.combat.conditions??initialConditionLedger()).canTakeAction)throw new RangeError('Las condiciones impiden registrar ataques');
    if(usePeerlessAim&&!sheet.features.includes('epic_boon_combat_prowess'))throw new RangeError('No tienes Pericia en combate');
    const result=recordWeaponAttack(sessionCheck.state.combat,output.result.inventory,profile,resolution,context,usage,sheet.level,usePeerlessAim,sheet.features.includes('epic_boon_combat_prowess'));
    const nextActions=result.inventoryAction?[...activeActions,result.inventoryAction]:activeActions;
    replayInventory(starting,FIGHTER_PACKAGES[starter].initialArmor,nextActions);
    if(result.inventoryAction)setInventoryEdits({key:inventoryKey,actions:nextActions});
    setAdventure({...sessionCheck.state,combat:result.combat});
    setInventoryError(null);
  }
  function handleCombatChange(combat:import('../../../../packages/rules-engine/src/combat').CombatState){
    if(!sheet||!sessionCheck.state||sessionCheck.outOfSync)return;
    setAdventure(updateAdventureCombat(sessionCheck.state,combat,sheet));
  }
  function loadSavedSnapshot(snapshot:CharacterSnapshot){
    // Los personajes de la fase 4.9 almacenaban objetos mágicos en AdventureState.
    // Convertimos sus instancias al historial único una sola vez al cargarlos.
    const legacy=snapshot.adventure.magicWards??[];
    if(legacy.length&&snapshot.input.martial&&snapshot.input.backgroundEquipment){
      const actions=importLegacyMagicWards(snapshot.input.inventoryActions??[],legacy);
      const migrated={...snapshot.input,inventoryActions:actions};
      calculateGuidedFighter(migrated); // Comprobar la migración antes de cambiar la UI.
      loadSavedInput(migrated);
      setAdventure({...snapshot.adventure,magicWards:[]});
    }else {loadSavedInput(snapshot.input);setAdventure(snapshot.adventure);}
  }
  const taken=[...bg.skills,...fighterSkills];
  const humanCandidates=SKILLS.filter(s=>!taken.includes(s));
  const elfCandidates=(['insight','perception','survival'] as const).filter(s=>!taken.includes(s));
  const setSkillAt=(slot:number,skill:Skill)=>setFighterSkills(prev=>prev.map((s,i)=>i===slot?skill:s));
  const STEPS=['Identidad','Origen','Características','Competencias','Equipo'];
  function selectSlot(values:string[], setter:(v:string[])=>void,index:number,next:string){setter(values.map((s,i)=>i===index?next:s));}
  function magicFields(title:string,list:SpellListId,ability:SpellAbility,cantrips:string[],spell:string,actions:{setAbility:(v:SpellAbility)=>void;setCantrips:(v:string[])=>void;setSpell:(v:string)=>void}){
    return <div className="magic-fields"><div className="section-label"><h3>{title}</h3><span>{SPELL_LISTS[list].label}</span></div>
      <label className="field"><span>Característica de lanzamiento</span><select value={ability} onChange={e=>actions.setAbility(e.target.value as SpellAbility)}>{MAGIC_ABILITY_OPTIONS.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>
      {[0,1].map(i=><label className="field" key={i}><span>Truco {i+1}</span><select value={cantrips[i]} onChange={e=>actions.setCantrips(cantrips.map((x,j)=>i===j?e.target.value:x))}>{SPELL_LISTS[list].cantrips.map(id=><option value={id} key={id}>{spellName(id)}</option>)}</select></label>)}
      <label className="field"><span>Conjuro de nivel 1</span><select value={spell} onChange={e=>actions.setSpell(e.target.value)}>{SPELL_LISTS[list].level1.map(id=><option value={id} key={id}>{spellName(id)}</option>)}</select></label>
      <p className="muted-note">El conjuro de nivel 1 concede un lanzamiento gratuito por descanso largo. Su uso no se consume aún en esta interfaz.</p>
    </div>;
  }
  function changePackage(id:StartingPackageId){setStarter(id);setInventoryError(null);}
  function changeMastery(index:number,value:WeaponId){setMasteries(prev=>prev.map((old,i)=>i===index?value:old));}
  // Un acceso desde otra pestaña debe abrir el editor Y llevar al control elegido.
  function openEditorAt(targetStep:number, levelControl=false){
    editorDetailsRef.current?.setAttribute("open", "");
    setStep(targetStep);
    setActiveTab('principal');
    window.requestAnimationFrame(()=>{
      document.getElementById(levelControl?'fighter-level-stepper':'character-editor')
        ?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
  function openExistingTools(target:"attacks"|"resources") {
    toolsDetailsRef.current?.setAttribute("open", "");
    window.requestAnimationFrame(()=>document.getElementById(target==="attacks"?"existing-attacks-panel":"existing-play-tools")?.scrollIntoView({behavior:"smooth",block:"start"}));
  }
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Hoja digital · D&D 2024</span></div></div><div className="status"><span className="status-dot"/> Edición local · Guardado manual</div></header>
    <div className="content">
      <p className="sheet-release-note">ACTUALIZACIÓN 40 · RASGOS DEL PERSONAJE</p>
      <CharacterHeader
        name={name}
        level={level}
        background={bg.name}
        species={species==='human'?'Humano':species==='dwarf'?'Enano':'Elfo'}
        valid={Boolean(output.result&&!sessionCheck.outOfSync)}
        onEdit={()=>openEditorAt(0)}
        onLevelUp={()=>openEditorAt(0,true)}
      />
      <SaveLoadPanel input={input} adventure={sessionCheck.outOfSync?null:sessionCheck.state} valid={Boolean(output.result&&!sessionCheck.outOfSync)} onLoad={loadSavedSnapshot}/>
      <CharacterTabs activeTab={activeTab} onChange={setActiveTab}/>
      <section id="sheet-panel-principal" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-principal" hidden={activeTab!=='principal'}>
        <div className="sheet-section-heading"><div><span className="eyebrow">PÁGINA PRINCIPAL</span><h2>Tu hoja de personaje</h2><p>Valores calculados por el motor, tiradas manuales y gestión directa del estado de partida.</p></div></div>
      <PrincipalOverview result={output.result} error={output.error} input={input} adventure={sessionCheck.state} outOfSync={sessionCheck.outOfSync} onAdventureChange={setAdventure} onEdit={openEditorAt} onOpenTools={openExistingTools}/>
      <details id="existing-play-tools" ref={toolsDetailsRef} className="legacy-tools panel">
        <summary>Herramientas existentes de partida y combate <span>8 módulos conservados</span></summary>
        <p className="muted-note">Estos sistemas siguen disponibles mientras rediseñamos la hoja. La pestaña Combate completa se desarrollará más adelante.</p>
        <div className="legacy-tools-content">
      <PlayPanel sheet={sheet??null} state={sessionCheck.state} outOfSync={sessionCheck.outOfSync} onChange={setAdventure}/>
      <SurvivalPanel sheet={sheet??null} state={sessionCheck.state} outOfSync={sessionCheck.outOfSync} onChange={setAdventure}/>
      <MagicWardsPanel inventory={output.result?.inventory??null} outOfSync={sessionCheck.outOfSync} onInventoryAction={transact}/>
      <IncomingAttacksPanel sheet={sheet??null} state={sessionCheck.state} species={output.result?.origin.species??null} inventory={output.result?.inventory??null} outOfSync={sessionCheck.outOfSync} onChange={setAdventure}/>
      <ConditionsPanel combat={sessionCheck.outOfSync?null:sessionCheck.state?.combat??null} outOfSync={sessionCheck.outOfSync} onChange={handleCombatChange} baseSpeed={output.result?.origin.speedFeet??30}/>
      <TurnPanel fighterLevel={sheet?.level??level} heroicWarrior={sheet?.features.includes('champion_heroic_warrior')??false} epicSpeed={sheet?.features.includes('epic_boon_speed')??false} combat={sessionCheck.outOfSync?null:sessionCheck.state?.combat??null} outOfSync={sessionCheck.outOfSync} onChange={handleCombatChange} baseSpeedFeet={output.result?.origin.speedFeet??30} hitPoints={sessionCheck.state?.fighter.hitPoints.current??0}/>
      <div id="existing-attacks-panel">
      <AttacksPanel combat={sessionCheck.outOfSync?null:sessionCheck.state?.combat??null} sheet={sheet??null} inventory={output.result?.inventory??null} martial={input.martial??null} onRecord={confirmWeaponAttack} canRecord={Boolean(sheet&&!sessionCheck.outOfSync&&sessionCheck.state&&sessionCheck.state.fighter.hitPoints.current>0&&conditionCapabilities(sessionCheck.state.combat.conditions??initialConditionLedger()).canTakeAction)}/>
      </div>
      <CombatPanel combat={sessionCheck.outOfSync?null:sessionCheck.state?.combat??null} outOfSync={sessionCheck.outOfSync} onChange={handleCombatChange}/>
        </div>
      </details>
      <details className="overview-editor-details" ref={editorDetailsRef}>
        <summary>Editar personaje y consultar la hoja técnica original <span>Creación · progresión · inventario</span></summary>
        <div className="overview-editor-content">
      <nav className="wizard-tabs" aria-label="Pasos de creación">{STEPS.map((s,i)=><button type="button" key={s} className={step===i?'active':''} aria-current={step===i?'step':undefined} onClick={()=>setStep(i)}><span>{String(i+1).padStart(2,'0')}</span>{s}</button>)}</nav>
      <div className="workspace">
        <aside id="character-editor" className="editor panel">
          <div className="panel-heading"><div><span className="eyebrow">PASO {step+1} DE {STEPS.length}</span><h2>{STEPS[step]}</h2></div><span className="step-marker">MVP</span></div>
          {step===0&&<>
            <label className="field"><span>Nombre del personaje</span><input value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label>
            <div className="field"><span className="field-label">Clase</span><div className="info-line">Guerrero (única clase disponible en esta versión)</div></div>
            <div className="field"><span className="field-label">Nivel del personaje</span>
              <div id="fighter-level-stepper" className="level-stepper" role="group" aria-label="Cambiar nivel del Guerrero">
                <button type="button" className="level-stepper-arrow" aria-label="Bajar un nivel" title="Bajar un nivel" disabled={adjacentFighterLevel(level,-1)===null}
                  onClick={()=>{const next=adjacentFighterLevel(level,-1);if(next!==null)selectFighterLevel(next);}}><span aria-hidden="true">←</span></button>
                <div className="level-stepper-display" role="status" aria-live="polite" aria-atomic="true">
                  <span className="level-stepper-eyebrow">NIVEL ACTUAL</span>
                  <strong className="level-stepper-number">{level}</strong>
                  <span className="level-stepper-range">Guerrero · 1 a 20</span>
                </div>
                <button type="button" className="level-stepper-arrow" aria-label="Subir un nivel" title="Subir un nivel" disabled={adjacentFighterLevel(level,1)===null}
                  onClick={()=>{const next=adjacentFighterLevel(level,1);if(next!==null)selectFighterLevel(next);}}><span aria-hidden="true">→</span></button>
              </div>
              <p className="muted-note">La flecha derecha sube un nivel y conserva la partida. La izquierda baja un nivel y, previa confirmación, reinicia la sesión de combate.</p>
              {level===6&&<label className="field"><span>Elección obligatoria para subir a nivel 7: segundo estilo del Campeón</span>
                <select value={additionalStyle} onChange={e=>{setAdditionalStyle(e.target.value as FightingStyleId|'');setLevelMessage('');setLevelRecovery(null);}}>
                  <option value="">Elige un segundo estilo</option>
                  {Object.entries(FIGHTING_STYLES).filter(([id])=>id!==style).map(([id,label])=><option key={id} value={id}>{label}</option>)}
                </select>
                <small>El estilo debe ser distinto del primero. La elección se consolida al subir a 7.</small>
              </label>}
            </div>
            {level>=3&&<div className="info-line">Subclase: Campeón. Próximo nivel: {level===20?'nivel máximo':level+1}.</div>}
            {output.error&&<p className="save-error" role="alert">La hoja actual de nivel {level} tiene un error que impide la progresión o el guardado: {output.error}</p>}
            {sessionCheck.outOfSync&&<p className="save-error" role="alert">Nivel {level} sin sincronizar: han cambiado los PG máximos o el estado de partida. Al intentar subir se solicitará confirmar la sincronización sin borrar la sesión.</p>}
            {levelMessage&&<p className="level-stepper-message" role="alert">{levelMessage}</p>}
            {levelRecovery!==null&&<div className="play-warning" role="group" aria-label="Recuperar subida de nivel">
              <p>La hoja es válida, pero la partida no ha superado la transición de nivel. El guardado actual no se ha modificado.</p>
              <button type="button" onClick={retryLevelWithFreshSession}>Subir a nivel {levelRecovery} con una sesión de combate nueva</button>
              <p className="muted-note">Solo como último recurso, con confirmación. Se perderá la sesión de combate en pantalla, no el personaje de PostgreSQL.</p>
            </div>}
          </>}
          {step===1&&<>
            <label className="field"><span>Trasfondo</span><select value={background} onChange={e=>onBackground(e.target.value as BackgroundId)}>{Object.entries(BACKGROUNDS).map(([id,b])=><option key={id} value={id}>{b.name}</option>)}</select></label>
            <div className="origin-detail"><strong>Dote: {originFeatName(bg.feat)}</strong><small>Competencias: {bg.skills.map(s=>SKILL_NAMES[s as Skill]).join(', ')}</small><small>Herramienta: {background==='soldier'?GAMING_SETS[soldierGamingSet]:bg.tool}</small></div>
            {background==='soldier'&&<label className="field"><span>Competencia con juego de azar</span><select value={soldierGamingSet} onChange={e=>setSoldierGamingSet(e.target.value as GamingSetId)}>{Object.entries(GAMING_SETS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
            <label className="field"><span>Especie</span><select value={species} onChange={e=>setSpecies(e.target.value as SpeciesId)}><option value="human">Humano</option><option value="dwarf">Enano</option><option value="elf">Elfo</option></select></label>
            {(background==='acolyte'||background==='sage')&&magicFields('Iniciado en la Magia del trasfondo',background==='acolyte'?'cleric':'wizard',bgMagicAbility,background==='acolyte'?bgClericCantrips:bgWizardCantrips,background==='acolyte'?bgClericSpell:bgWizardSpell,{setAbility:setBgMagicAbility,setCantrips:background==='acolyte'?setBgClericCantrips:setBgWizardCantrips,setSpell:background==='acolyte'?setBgClericSpell:setBgWizardSpell})}
            {species==='human'&&<>
              <label className="field"><span>Tamaño</span><select value={humanSize} onChange={e=>setHumanSize(e.target.value as 'small'|'medium')}><option value="medium">Mediano</option><option value="small">Pequeño</option></select></label>
              <label className="field"><span>Dote de origen adicional</span><select value={humanFeat} onChange={e=>setHumanFeat(e.target.value as HumanOriginFeat)}>{HUMAN_FEATS.filter(f=>f!==bg.feat).map(f=><option key={f} value={f}>{FEATS[f]}</option>)}</select></label>
              {humanFeat==='magic_initiate'&&<>
                <label className="field"><span>Lista de conjuros de la dote humana</span><select value={humanMagicList} onChange={e=>changeHumanMagicList(e.target.value as SpellListId)}>{(Object.keys(SPELL_LISTS) as SpellListId[]).filter(id=>!(background==='acolyte'&&id==='cleric')&&!(background==='sage'&&id==='wizard')).map(id=><option value={id} key={id}>{SPELL_LISTS[id].label}</option>)}</select></label>
                {magicFields('Iniciado en la Magia del Humano',humanMagicList,humanMagicAbility,humanCantrips,humanSpell,{setAbility:setHumanMagicAbility,setCantrips:setHumanCantrips,setSpell:setHumanSpell})}
              </>}
              {humanFeat==='crafter'&&<><p className="muted-note">Escoge tres herramientas de artesano distintas.</p>{[0,1,2].map(i=><label className="field" key={i}><span>Herramienta {i+1}</span><select value={crafterTools[i]} onChange={e=>selectSlot(crafterTools,setCrafterTools,i,e.target.value)}>{CRAFTER_TOOLS.map(t=><option value={t} key={t}>{TOOL_NAMES[t]}</option>)}</select></label>)}</>}
              {humanFeat==='musician'&&<><p className="muted-note">Escoge tres instrumentos musicales distintos.</p>{[0,1,2].map(i=><label className="field" key={i}><span>Instrumento {i+1}</span><select value={instruments[i]} onChange={e=>selectSlot(instruments,setInstruments,i,e.target.value)}>{MUSICAL_INSTRUMENTS.map(t=><option value={t} key={t}>{TOOL_NAMES[t]}</option>)}</select></label>)}</>}
              {humanFeat==='skilled'&&<><p className="muted-note">Escoge tres habilidades o herramientas distintas, sin repetir competencias existentes.</p>{[0,1,2].map(i=><label className="field" key={i}><span>Competencia {i+1}</span><select value={skilled[i]} onChange={e=>selectSlot(skilled,setSkilled,i,e.target.value)}>{SKILLED_OPTIONS.map(k=><option value={k} key={k}>{k.startsWith('skill:')?`Habilidad: ${SKILL_NAMES[k.slice(6) as Skill]}`:`Herramienta: ${TOOL_NAMES[k.slice(5) as ToolId]}`}</option>)}</select></label>)}</>}
              {humanFeat==='lucky'&&<div className="info-line">Afortunado: puntos de suerte máximos iguales a tu bonificador de competencia.</div>}
            </>}
            {species==='elf'&&<><label className="field"><span>Linaje élfico</span><select value={lineage} onChange={e=>setLineage(e.target.value as ElfLineage)}><option value="drow">Drow</option><option value="high_elf">Alto elfo</option><option value="wood_elf">Elfo de los bosques</option></select></label><label className="field"><span>Característica para conjuros del linaje</span><select value={elfSpell} onChange={e=>setElfSpell(e.target.value as typeof elfSpell)}>{(['intelligence','wisdom','charisma'] as const).map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label></>}
            {species==='dwarf'&&<div className="info-line">Robustez enana: +1 PG máximo por nivel (automatizado).</div>}
          </>}
          {step===2&&<>
            <div className="section-label"><h3>Matriz estándar</h3><span>15, 14, 13, 12, 10, 8</span></div>
            <div className="ability-inputs">{ABILITIES.map(a=><label className="ability-input" key={a}><span>{NAMES[a].slice(0,3).toUpperCase()}</span><select aria-label={NAMES[a]} value={scores[a]} onChange={e=>setScores(prev=>({...prev,[a]:Number(e.target.value)}))}>{[15,14,13,12,10,8].map(v=><option key={v} value={v}>{v}</option>)}</select><small>{NAMES[a]}</small></label>)}</div>
            <p className="muted-note">Asigna cada valor una sola vez. Si repites alguno, se mostrará el error y no se calculará la hoja.</p>
            <div className="divider"/><div className="section-label"><h3>Mejoras del trasfondo</h3></div>
            <label className="field"><span>Distribución</span><select value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="two_plus_one">+2 y +1 a características distintas</option><option value="three_ones">+1 a las tres características</option></select></label>
            {mode==='two_plus_one'&&<><label className="field"><span>Característica que recibe +2</span><select value={two} onChange={e=>setTwo(e.target.value as Ability)}>{allowed.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label><label className="field"><span>Característica que recibe +1</span><select value={one} onChange={e=>setOne(e.target.value as Ability)}>{allowed.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label></>}
            <p className="muted-note">Opciones del trasfondo: {allowed.map(a=>NAMES[a]).join(', ')}.</p>
            {level>=3&&<><div className="divider"/><div className="section-label"><h3>Dote Mejora de característica, nivel 4</h3><span>{level>=4?'Aplicada':'Elígela antes de subir'}</span></div>
              <p className="muted-note">En esta fase puedes elegir la dote Mejora de característica (+2 o +1/+1, máximo 20). Las demás dotes generales se añadirán más adelante.</p>
              <label className="field"><span>Distribución al alcanzar nivel 4</span><select value={asiMode} onChange={e=>setAsiMode(e.target.value as typeof asiMode)}><option value="plus_two">+2 a una característica</option><option value="two_ones">+1 a dos características</option></select></label>
              <label className="field"><span>Primera característica</span><select value={asiFirst} onChange={e=>setAsiFirst(e.target.value as Ability)}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>
              {asiMode==='two_ones'&&<label className="field"><span>Segunda característica</span><select value={asiSecond} onChange={e=>setAsiSecond(e.target.value as Ability)}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>}
              <p className="muted-note">Elige antes de subir a nivel 4. Cambiar la mejora después puede requerir sincronizar el estado de combate.</p>
            </>}
            {level>=5&&<><div className="divider"/><div className="section-label"><h3>Segunda mejora de característica · nivel 6</h3><span>{level>=6?'Aplicada':'Elígela antes de subir'}</span></div>
              <p className="muted-note">Esta mejora es independiente de la de nivel 4. Se acumula con ella, hasta un máximo de 20 por característica.</p>
              <label className="field"><span>Distribución al alcanzar nivel 6</span><select value={asi6Mode} onChange={e=>setAsi6Mode(e.target.value as typeof asi6Mode)}><option value="plus_two">+2 a una característica</option><option value="two_ones">+1 a dos características</option></select></label>
              <label className="field"><span>Primera característica (nivel 6)</span><select value={asi6First} onChange={e=>setAsi6First(e.target.value as Ability)}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>
              {asi6Mode==='two_ones'&&<label className="field"><span>Segunda característica (nivel 6)</span><select value={asi6Second} onChange={e=>setAsi6Second(e.target.value as Ability)}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>}
              <p className="muted-note">En nivel 6 el Guerrero también puede elegir otra dote que cumpla requisitos; ese catálogo sigue pendiente. Aquí se implementa Mejora de característica.</p>
            </>}
            {level>=7&&<><div className="divider"/><div className="section-label"><h3>Tercera mejora de característica · nivel 8</h3><span>{level>=8?'Aplicada':'Elígela antes de subir'}</span></div>
              <p className="muted-note">Esta mejora es independiente de las de niveles 4 y 6. Máximo 20 por característica; otras dotes generales siguen pendientes.</p>
              <label className="field"><span>Distribución al alcanzar nivel 8</span><select value={asi8Mode} onChange={e=>setAsi8Mode(e.target.value as typeof asi8Mode)}><option value="plus_two">+2 a una característica</option><option value="two_ones">+1 a dos características</option></select></label>
              <label className="field"><span>Primera característica (nivel 8)</span><select value={asi8First} onChange={e=>setAsi8First(e.target.value as Ability)}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>
              {asi8Mode==='two_ones'&&<label className="field"><span>Segunda característica (nivel 8)</span><select value={asi8Second} onChange={e=>setAsi8Second(e.target.value as Ability)}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>}
            </>}
            {level>=11&&<><div className="divider"/><div className="section-label"><h3>Cuarta mejora de característica · nivel 12</h3><span>{level>=12?'Aplicada':'Elígela antes de subir'}</span></div>
              <p className="muted-note">Elección independiente de las mejoras de niveles 4, 6 y 8. Esta fase implementa Mejora de característica; el catálogo de dotes generales está pendiente.</p>
              <label className="field"><span>Distribución al alcanzar nivel 12</span><select value={asi12Mode} onChange={e=>setAsi12Mode(e.target.value as typeof asi12Mode)}><option value="plus_two">+2 a una característica</option><option value="two_ones">+1 a dos características</option></select></label>
              <label className="field"><span>Primera característica (nivel 12)</span><select value={asi12First} onChange={e=>setAsi12First(e.target.value as Ability)}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>
              {asi12Mode==='two_ones'&&<label className="field"><span>Segunda característica (nivel 12)</span><select value={asi12Second} onChange={e=>setAsi12Second(e.target.value as Ability)}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>}
            </>}
            {level>=13&&<><div className="divider"/><div className="section-label"><h3>Quinta mejora de característica · nivel 14</h3><span>{level>=14?'Aplicada':'Elígela antes de subir'}</span></div>
              <p className="muted-note">Elige la mejora del nivel 14 antes de avanzar. Se acumula con las mejoras anteriores, sin superar 20 en ninguna característica. Otras dotes generales siguen pendientes.</p>
              <label className="field"><span>Distribución al alcanzar nivel 14</span><select value={asi14Mode} onChange={e=>{setAsi14Mode(e.target.value as typeof asi14Mode);setLevelMessage('');}}><option value="plus_two">+2 a una característica</option><option value="two_ones">+1 a dos características</option></select></label>
              <label className="field"><span>Primera característica (nivel 14)</span><select value={asi14First} onChange={e=>{setAsi14First(e.target.value as Ability);setLevelMessage('');}}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>
              {asi14Mode==='two_ones'&&<label className="field"><span>Segunda característica (nivel 14)</span><select value={asi14Second} onChange={e=>{setAsi14Second(e.target.value as Ability);setLevelMessage('');}}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>}
            </>}
            {level>=15&&<><div className="divider"/><div className="section-label"><h3>Sexta mejora de característica · nivel 16</h3><span>{level>=16?'Aplicada':'Elígela antes de subir'}</span></div>
              <p className="muted-note">Elige cómo mejorar las características en nivel 16. Esta mejora se suma a las anteriores y no puede elevar una puntuación por encima de 20.</p>
              <label className="field"><span>Distribución al alcanzar nivel 16</span><select value={asi16Mode} onChange={e=>{setAsi16Mode(e.target.value as typeof asi16Mode);setLevelMessage('');}}><option value="plus_two">+2 a una característica</option><option value="two_ones">+1 a dos características</option></select></label>
              <label className="field"><span>Primera característica (nivel 16)</span><select value={asi16First} onChange={e=>{setAsi16First(e.target.value as Ability);setLevelMessage('');}}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>
              {asi16Mode==='two_ones'&&<label className="field"><span>Segunda característica (nivel 16)</span><select value={asi16Second} onChange={e=>{setAsi16Second(e.target.value as Ability);setLevelMessage('');}}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>}
            </>}
          </>}
            {step===2&&level>=18&&<><div className="divider"/><div className="section-label"><h3>Beneficio épico · nivel 19</h3><span>{level>=19?'Aplicado':'Elección para subir'}</span></div>
              <p className="muted-note">Elige una dote épica disponible y la característica que aumenta en +1 (hasta 30). Hemos automatizado inicialmente tres opciones. No se asigna ninguna por defecto.</p>
              <label className="field"><span>Dote de beneficio épico</span><select value={epicBoon} onChange={e=>{setEpicBoon(e.target.value as EpicBoonId|'');setLevelMessage('');}}>
                <option value="">Selecciona tu beneficio épico</option>{Object.entries(EPIC_BOONS).map(([id,name])=><option key={id} value={id}>{name}</option>)}
              </select></label>
              <label className="field"><span>Característica que aumenta +1</span><select value={epicAbility} onChange={e=>{setEpicAbility(e.target.value as Ability);setLevelMessage('');}}>{ABILITIES.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label>
              {epicBoon==='fortitude'&&<p className="info-line">Fortaleza: +40 PG máximos. Al recuperar PG, puedes añadir tu modificador de Constitución una vez hasta tu siguiente turno.</p>}
              {epicBoon==='speed'&&<p className="info-line">Velocidad: +30 pies y puedes Destrabarte como acción adicional (resuelve el fin de Agarrado con el DM).</p>}
              {epicBoon==='combat_prowess'&&<p className="info-line">Pericia en combate: puedes convertir una tirada de ataque fallida en impacto una vez hasta el inicio de tu siguiente turno.</p>}
            </>}
          {step===3&&<>
            <p className="muted-note">El Guerrero elige dos habilidades. El trasfondo ya concede dos competencias adicionales.</p>
            {([0,1] as const).map(i=><label key={i} className="field"><span>Habilidad del Guerrero {i+1}</span><select value={fighterSkills[i]} onChange={e=>setSkillAt(i,e.target.value as Skill)}>{validSkills(background).map(s=><option key={s} value={s}>{SKILL_NAMES[s]}</option>)}</select></label>)}
            {species==='human'&&<label className="field"><span>Habilidad adicional del Humano</span><select value={humanSkill} onChange={e=>setHumanSkill(e.target.value as Skill)}>{[humanSkill,...humanCandidates].filter((s,i,arr)=>arr.indexOf(s)===i).map(s=><option key={s} value={s}>{SKILL_NAMES[s]}</option>)}</select></label>}
            {species==='elf'&&<label className="field"><span>Sentidos agudos (Elfo)</span><select value={elfSkill} onChange={e=>setElfSkill(e.target.value as typeof elfSkill)}>{[elfSkill,...elfCandidates].filter((s,i,arr)=>arr.indexOf(s)===i).map(s=><option key={s} value={s}>{SKILL_NAMES[s]}</option>)}</select></label>}
            <div className="origin-detail"><strong>Salvaciones del Guerrero</strong><small>Fuerza y Constitución</small></div>
          </>}
          {step===4&&<>
            <label className="field"><span>Estilo de combate del Guerrero</span><select value={style} onChange={e=>{const chosen=e.target.value as FightingStyleId;setStyle(chosen);if(chosen===additionalStyle)setAdditionalStyle('');}}>{Object.entries(FIGHTING_STYLES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
            {level>=6&&<label className="field"><span>Segundo estilo de combate del Campeón (nivel 7)</span><select value={additionalStyle} onChange={e=>{setAdditionalStyle(e.target.value as FightingStyleId|'');setLevelRecovery(null);setLevelMessage('');}}><option value="">Selecciona el segundo estilo</option>{Object.entries(FIGHTING_STYLES).filter(([id])=>id!==style).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
            {level>=6&&<p className="muted-note">El segundo estilo se activa al subir a nivel 7. Debe ser distinto del primero y sus bonificadores se aplicarán automáticamente cuando corresponda.</p>}
            <div className="info-line">{(style==='defense'||level>=7&&additionalStyle==='defense')?'Defensa: +1 a CA mientras llevas armadura. Aplicado automáticamente.':'Los estilos de ataque se calculan en el nuevo panel de combate. Las reacciones y sentidos siguen pendientes.'}</div>
            <div className="section-label"><h3>Maestría de armas</h3><span>{level>=16?6:level>=10?5:level>=4?4:3} tipos distintos</span></div>
            {Array.from({length:level>=16?6:level>=10?5:level>=4?4:3},(_,i)=>i).map(i=><label key={i} className="field"><span>Arma dominada {i+1}</span><select value={masteries[i]} onChange={e=>changeMastery(i,e.target.value as WeaponId)}>{Object.entries(WEAPONS).map(([id,data])=><option key={id} value={id}>{data.name} · {data.mastery}</option>)}</select></label>)}
            {level===3&&<label className="field"><span>Cuarta maestría al subir a nivel 4</span><select value={fourthMastery} onChange={e=>setFourthMastery(e.target.value as WeaponId)}>{Object.entries(WEAPONS).map(([id,data])=><option key={id} value={id}>{data.name} · {data.mastery}</option>)}</select></label>}
            {level===9&&<label className="field"><span>Quinta maestría al subir a nivel 10</span>
              <select value={fifthMastery} onChange={e=>{setFifthMastery(e.target.value as WeaponId|'');setLevelMessage('');}}>
                <option value="">Elige tu quinta arma dominada</option>
                {Object.entries(WEAPONS).filter(([id])=>!masteries.includes(id as WeaponId)).map(([id,data])=><option key={id} value={id}>{data.name} · {data.mastery}</option>)}
              </select></label>}
            {level===15&&<label className="field"><span>Sexta maestría al subir a nivel 16</span>
              <select value={sixthMastery} onChange={e=>{setSixthMastery(e.target.value as WeaponId|'');setLevelMessage('');}}>
                <option value="">Elige tu sexta arma dominada</option>
                {Object.entries(WEAPONS).filter(([id])=>!masteries.includes(id as WeaponId)).map(([id,data])=><option key={id} value={id}>{data.name} · {data.mastery}</option>)}
              </select></label>}
            {level>=9&&<p className="info-line">Dominio táctico: al atacar con un arma que dominas, podrás elegir Empujar, Debilitar o Ralentizar en lugar de su maestría habitual, solo para ese ataque. Se elige en «Ataques con armas».</p>}
            <p className="muted-note">Las maestrías deben ser distintas. Selecciona la cuarta antes de subir a nivel 4. Puedes elegir armas aunque aún no las poseas. Sus propiedades se muestran en el panel de combate; la mayoría de efectos situacionales se resuelven con el director.</p>
            <div className="divider"/>
            <label className="field"><span>Equipo inicial de clase</span><select value={starter} onChange={e=>changePackage(e.target.value as StartingPackageId)}>{Object.entries(FIGHTER_PACKAGES).map(([id,pack])=><option key={id} value={id}>{pack.label}</option>)}</select></label>
            <div className="origin-detail"><strong>{FIGHTER_PACKAGES[starter].gold} po · Equipo de clase</strong>{FIGHTER_PACKAGES[starter].items.map((it,i)=><small key={i}>{it.quantity} × {it.name}</small>)}{starter==='c'&&<small>Sin objetos. La compra de equipo se añadirá después.</small>}</div>
            <div className="info-line">El equipo inicial se añade al inventario. Ahora puedes cambiar la armadura, comprar y equipar un escudo, o incorporar objetos hallados.</div>
            <div className="divider"/>
            <div className="section-label"><h3>Equipo del trasfondo</h3><span>{bg.name}</span></div>
            <label className="field"><span>Opción del trasfondo</span><select value={backgroundPackage} onChange={e=>setBackgroundPackage(e.target.value as BackgroundPackageId)}><option value="a">A · Objetos y monedas</option><option value="b">B · 50 piezas de oro, sin objetos</option></select></label>
            <div className="origin-detail"><strong>{BACKGROUND_PACKAGES[background][backgroundPackage].gold} po · Trasfondo</strong>
              {backgroundPackage==='a'&&BACKGROUND_PACKAGES[background].a.items.map(it=><small key={it.id}>{it.quantity} × {ITEM_NAMES[it.id]}</small>)}
              {background==='soldier'&&backgroundPackage==='a'&&<small>1 × {GAMING_SETS[soldierGamingSet]} (juego de azar elegido)</small>}
              {backgroundPackage==='b'&&<small>Sin objetos de trasfondo; la competencia con herramientas se conserva.</small>}
            </div>
            <p className="muted-note">El oro y los objetos del trasfondo se suman a los de clase. Si cambias un paquete, se reinicia el historial de operaciones del inventario.</p>
            <div className="divider"/>
            <div className="section-label"><h3>Inventario editable</h3><span>{activeActions.length} operaciones</span></div>
            <div className="money-summary inventory-money"><strong>{formatCopper(inventory.coinsCopper)}</strong><small>Saldo disponible</small></div>
            <label className="field"><span>Objeto del catálogo</span><select value={tradeItem} onChange={e=>setTradeItem(e.target.value as InventoryItemId)}>{Object.entries(INVENTORY_NAMES).sort((a,b)=>a[1].localeCompare(b[1],'es')).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
            <label className="field"><span>Cantidad</span><input type="number" min={1} max={1000} step={1} value={tradeCount} onChange={e=>setTradeCount(Number(e.target.value))}/></label>
            <p className="muted-note">{INVENTORY_PRICES_CP[tradeItem]===undefined?'Precio no disponible en el catálogo reducido: puedes registrar el objeto como hallazgo.':`Compra: ${formatCopper((INVENTORY_PRICES_CP[tradeItem]??0)*quotedQty)} · Venta: ${formatCopper(Math.floor((INVENTORY_PRICES_CP[tradeItem]??0)*quotedQty/2))}`}</p>
            <div className="trade-actions">
              <button type="button" disabled={INVENTORY_PRICES_CP[tradeItem]===undefined} onClick={()=>transact({type:'buy',itemId:tradeItem,quantity:tradeCount})}>Comprar</button>
              <button type="button" disabled={INVENTORY_PRICES_CP[tradeItem]===undefined} onClick={()=>transact({type:'sell',itemId:tradeItem,quantity:tradeCount})}>Vender</button>
              <button type="button" onClick={()=>transact({type:'add',itemId:tradeItem,quantity:tradeCount})}>Añadir botín</button>
              <button type="button" onClick={()=>transact({type:'remove',itemId:tradeItem,quantity:tradeCount})}>Descartar</button>
            </div>
            {inventoryError&&<div className="error" role="alert">{inventoryError}</div>}
            <p className="muted-note">Las tiendas y los hallazgos se confirman con el director de juego. Los objetos sin precio validado solo se pueden añadir como botín.</p>
            <div className="divider"/>
            <label className="field"><span>Armadura equipada (solo objetos que posees)</span><select value={inventory.equipped.armor??'none'} onChange={e=>transact({type:'equip_armor',armor:e.target.value==='none'?null:e.target.value as ArmorId})}>
              <option value="none">Sin armadura</option>
              {inventory.items.filter(it=>ARMOR_OPTIONS.some(x=>x.id===it.id)).map(it=><option key={it.id} value={it.id}>{INVENTORY_NAMES[it.id]}</option>)}
            </select></label>
            {inventory.magicItems.some(m=>m.itemId==='armor_enhancement'&&m.worn)&&<p className="muted-note">Llevas una armadura mágica. Puedes quitártela desde «Objetos mágicos del inventario» o elegir aquí una armadura normal.</p>}
            {inventory.magicItems.some(m=>m.itemId==='shield_enhancement'&&m.worn)&&<p className="muted-note">Tu escudo mágico se equipa y retira en «Objetos mágicos del inventario».</p>}
            <label className="switch-field"><span><strong>Escudo equipado</strong><small>Debes poseer al menos uno</small></span><input type="checkbox" checked={inventory.equipped.shield} disabled={!inventory.equipped.shield&&!inventory.items.some(it=>it.id==='shield')} onChange={e=>transact({type:'equip_shield',equipped:e.target.checked})}/></label>
            <div className="trade-actions trade-history"><button type="button" disabled={!activeActions.length} onClick={undoTransaction}>Deshacer última</button><button type="button" disabled={!activeActions.length} onClick={resetTransactions}>Reiniciar inventario</button></div>
          </>}
          <div className="wizard-actions"><button type="button" disabled={step===0} onClick={()=>setStep(x=>Math.max(0,x-1))}>Anterior</button><button type="button" disabled={step===STEPS.length-1} onClick={()=>setStep(x=>Math.min(STEPS.length-1,x+1))}>Siguiente</button></div>
          <div className="editor-footnote">Creación parcial con guardado manual local. Los precios se expresan en piezas de cobre y se venden objetos a mitad del valor de catálogo.</div>
        </aside>
        <section className="preview panel" aria-live="polite">
          <div className="panel-heading"><div><span className="eyebrow">HOJA EN VIVO</span><h2>{name.trim()||'Sin nombre'}</h2><p>Guerrero {level}{level>=3?' · Campeón':''} · {bg.name} · {species==='human'?'Humano':species==='dwarf'?'Enano':'Elfo'}</p></div><span className="roundel">{level}</span></div>
          {output.error&&<div className="error" role="alert"><strong>Revisa tus elecciones.</strong><p>{output.error}</p></div>}
          {sheet&&output.result&&<>
            <div className="stat-cards"><div className="stat-card"><span>PG MÁXIMOS</span><strong>{sheet.maximumHitPoints}</strong><small>Actuales: {!sessionCheck.outOfSync&&sessionCheck.state?sessionCheck.state.fighter.hitPoints.current:'pendiente'} · {sheet.hitDice.total}d{sheet.hitDice.die}</small></div><div className="stat-card"><span>CLASE DE ARMADURA</span><strong>{sheet.armorClass}</strong><small>{sheet.armorClassDetails.formula}</small></div><div className="stat-card"><span>INICIATIVA</span><strong>{signed(sheet.initiative)}</strong><small>{sheet.initiativeRollMode==='advantage'?'Ventaja':sheet.initiativeRollMode==='disadvantage'?'Desventaja':'Normal'}</small></div></div>
            <div className="preview-section"><div className="section-label"><h3>Características finales</h3><span>Competencia {signed(sheet.proficiencyBonus)}</span></div><div className="ability-grid">{ABILITIES.map(a=><div className="ability-stat" key={a}><span>{NAMES[a].slice(0,3).toUpperCase()}</span><strong>{sheet.abilityScores[a]}</strong><small>{signed(sheet.abilityModifiers[a])}</small></div>)}</div></div>
            <div className="two-col"><div className="preview-section"><div className="section-label"><h3>Habilidades</h3><span>Competencias elegidas</span></div><div className="data-list">{SKILLS.map(k=><div className="data-row" key={k}><span>{SKILL_NAMES[k]} {taken.includes(k)||((species==='human'&&humanSkill===k)||(species==='elf'&&elfSkill===k))?'•':''}</span><span><strong>{signed(sheet.skillBonuses[k])}</strong>{sheet.skillRollModes[k]!=='normal'&&<b className="mode-chip">{sheet.skillRollModes[k]==='advantage'?'Ventaja':'Desventaja'}</b>}</span></div>)}</div></div><div className="preview-section"><div className="section-label"><h3>Origen y rasgos</h3><span>PHB 2024</span></div><div className="resource-grid">{Object.entries(sheet.resources).map(([id,r])=>r&&<div className="resource-card" key={id}><span>{id==='second_wind'?'Segundo aliento':id==='action_surge'?'Acción súbita':'Indomable'}</span><strong>{!sessionCheck.outOfSync&&sessionCheck.state?sessionCheck.state.fighter.resources[id as 'second_wind'|'action_surge']?.current??r.current:r.current}/{r.maximum}</strong></div>)}</div><p className="muted-note">Tamaño: {output.result.origin.size==='medium'?'Mediano':'Pequeño'} · Velocidad: {output.result.origin.speedFeet} pies</p><p className="muted-note">Dote del trasfondo: {originFeatName(bg.feat)}{output.result.origin.additionalFeat?` · Dote humana: ${FEATS[output.result.origin.additionalFeat]}`:''}</p><p className="muted-note">Herramientas: {output.result.origin.tools.join(', ')}</p>{output.result.origin.luckPointsMaximum!==undefined&&<p className="muted-note">Puntos de suerte máximos: {output.result.origin.luckPointsMaximum} (sin gestión de gasto)</p>}{output.result.martial&&<><p className="muted-note">Estilo: {FIGHTING_STYLES[output.result.martial.choices.fightingStyle]} · Dinero de clase: {output.result.martial.gold} po</p><p className="muted-note">Maestrías: {output.result.martial.masteries.map(m=>`${m.weapon} (${m.property})`).join(', ')}</p></>}
            <ul className="feature-list">{sheet.features.map((f,i)=><li key={`${f}-${i}`}>{FEATURES[f]??f}</li>)}</ul></div></div>
            {output.result.inventory&&<div className="preview-section inventory-section">
              <div className="section-label"><h3>Inventario actual</h3><span>{output.result.inventory.items.length} tipos comunes · {output.result.inventory.magicItems.length} mágicos</span></div>
              <div className="money-summary"><strong>{formatCopper(output.result.inventory.coinsCopper)}</strong><span>Saldo inicial: {output.result.startingInventory?.totalGold??0} po · {activeActions.length} operaciones</span></div>
              <div className="data-list">{output.result.inventory.items.length===0&&<p className="muted-note">No hay objetos en tu inventario.</p>}{output.result.inventory.items.map(it=><div className="data-row" key={it.id}><span>{it.name}<small className="item-origin">{it.sources.map(src=>`${src.from==='class'?'Clase':src.from==='background'?'Trasfondo':src.from==='purchase'?'Comprado':'Botín'} ×${src.quantity}`).join(' + ')}{inventory.equipped.armor===it.id?' · EQUIPADA':''}{inventory.equipped.shield&&it.id==='shield'?' · EQUIPADO':''}</small></span><strong>×{it.quantity}</strong></div>)}</div>
              {output.result.inventory.magicItems.length>0&&<div className="data-list">{output.result.inventory.magicItems.map(it=><div className="data-row" key={it.instanceId}>
                <span>{MAGIC_WARD_CATALOG[it.itemId].label}{it.armorId?` (${INVENTORY_NAMES[it.armorId]})`:''}{it.weaponId?` (${WEAPONS[it.weaponId].name})`:''}{it.enhancement?` +${it.enhancement}`:''}{it.damageType?` (${it.damageType})`:''}<small className="item-origin">Objeto mágico recibido del DM · {it.worn?(it.itemId==='weapon_enhancement'?'Preparada':'Puesto'):'Guardado'} · {it.attuned?'Vinculado':MAGIC_WARD_CATALOG[it.itemId].attunement?'Sin vincular':'Sin vinculación requerida'}</small></span><strong>×1</strong>
              </div>)}</div>}
              <p className="muted-note">Equipo efectivo: {armor?INVENTORY_NAMES[armor]:'sin armadura'} · Escudo: {shield?'sí':'no'} · La CA se recalcula al equipar o desequipar. Los objetos mágicos reemplazan la pieza mundana correspondiente.</p>
              <p className="muted-note">Los paquetes de aventurero siguen siendo un único objeto. El inventario puede guardarse mediante el panel Mis personajes.</p>
            </div>}
            {output.result.spells.length>0&&<div className="preview-section"><div className="section-label"><h3>Conjuros de origen</h3><span>{output.result.spells.length} concedidos</span></div><div className="spell-list">{output.result.spells.map((sp,i)=><div className="spell-entry" key={`${sp.source}-${sp.id}-${i}`}><div><strong>{sp.name}</strong><small>{sp.source==='background'?'Trasfondo':sp.source==='human_feat'?'Dote humana':'Linaje élfico'} · {sp.level===0?'Truco':'Nivel 1'} · {NAMES[sp.spellcastingAbility]}</small></div>{sp.freeCastPerLongRest&&<span className="mode-chip">1 gratis / descanso largo</span>}</div>)}</div><p className="muted-note">Los conjuros están validados y registrados; sus tiradas, efectos y usos consumidos aún no se ejecutan.</p></div>}
            <div className="preview-section pending-section"><div className="section-label"><h3>Automatizaciones pendientes</h3><span>{output.result.pendingAutomation.length}</span></div><ul className="feature-list">{output.result.pendingAutomation.map((p,i)=><li key={i}>{p}</li>)}</ul></div>
            {sheet.warnings.length>0&&<div className="warning" role="status">{sheet.warnings.includes('heavy_armor_strength_requirement_unmet')&&<p>La armadura pesada no cumple el requisito de Fuerza.</p>}{sheet.warnings.includes('armor_stealth_disadvantage')&&<p>La armadura impone desventaja en Sigilo.</p>}</div>}
          </>}
        </section>
      </div>
        </div>
      </details>
      </section>
      <section id="sheet-panel-rasgos" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-rasgos" hidden={activeTab!=='rasgos'}>
        <TraitsPanel input={input} result={output.result} error={output.error} onEdit={openEditorAt}/>
      </section>
      <section id="sheet-panel-equipo" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-equipo" hidden={activeTab!=='equipo'}>
        <SheetPlaceholder eyebrow="EQUIPO · FASE 41" title="Inventario y equipamiento"
          description="La gestión completa de objetos, armas, armaduras, sintonización y monedas se trasladará aquí. El inventario actual sigue disponible en el editor existente."
          actionLabel="Editar equipo actual" onAction={()=>openEditorAt(4)}>
          {output.result?.inventory&&<div className="sheet-preview-metrics">
            <div><span>Objetos comunes</span><strong>{output.result.inventory.items.length}</strong></div>
            <div><span>Objetos mágicos</span><strong>{output.result.inventory.magicItems.length}</strong></div>
            <div><span>Monedas disponibles</span><strong>{formatCopper(output.result.inventory.coinsCopper)}</strong></div>
          </div>}
        </SheetPlaceholder>
      </section>
      <section id="sheet-panel-hechizos" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-hechizos" hidden={activeTab!=='hechizos'}>
        <SheetPlaceholder eyebrow="HECHIZOS · FASE 43" title="Hechizos"
          description="La hoja de conjuros completa se implementará al incorporar una clase lanzadora. Los conjuros concedidos por el origen ya se registran, pero sus usos y tiradas todavía no están automatizados.">
          <div className="sheet-quick-list" aria-label="Conjuros de origen registrados">
            {output.result?.spells.length ? output.result.spells.map((spell,index)=><span key={`${spell.source}-${spell.id}-${index}`}>{spell.name} · {spell.level===0?'Truco':'Nivel 1'}</span>) : <p className="muted-note">Este personaje no tiene conjuros de origen registrados, o la hoja no es válida.</p>}
          </div>
        </SheetPlaceholder>
      </section>
      <section id="sheet-panel-personaje" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-personaje" hidden={activeTab!=='personaje'}>
        <SheetPlaceholder eyebrow="PERSONAJE · FASE 42" title="Historia y apariencia"
          description="Aquí se incorporarán el trasfondo narrativo, la personalidad, las notas y el retrato del personaje. Estos campos aún no están disponibles ni se guardan."
          actionLabel="Editar identidad y origen" onAction={()=>openEditorAt(1)}>
          <div className="sheet-preview-metrics">
            <div><span>Nombre</span><strong>{name.trim()||'Sin nombre'}</strong></div>
            <div><span>Trasfondo</span><strong>{bg.name}</strong></div>
            <div><span>Especie</span><strong>{species==='human'?'Humano':species==='dwarf'?'Enano':'Elfo'}</strong></div>
          </div>
        </SheetPlaceholder>
      </section>
      <section id="sheet-panel-combate" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-combate" hidden={activeTab!=='combate'}>
        <SheetPlaceholder eyebrow="COMBATE · DESARROLLO FUTURO" title="Coming Soon"
          description="La nueva interfaz de combate todavía no está diseñada. Los módulos de combate ya existentes se conservan en Principal, bajo «Herramientas existentes de partida y combate»."
          actionLabel="Volver a Principal" onAction={()=>setActiveTab('principal')} />
      </section>
      <footer className="footer">Guardado manual disponible en desarrollo local. Compras y hallazgos sujetos al director de juego. No equivale a una hoja completa y validada de D&D 2024.</footer>
    </div>
  </main>;
}
