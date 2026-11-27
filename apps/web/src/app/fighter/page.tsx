"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {type EpicBoonId} from "../../../../../packages/rules-engine/src/epic-boons";
import SaveLoadPanel from "../../components/SaveLoadPanel";
import CharacterHeader from "../../components/CharacterHeader";
import CharacterCreationDialog from "../../components/CharacterCreationDialog";
import useCharacterRouteMode from "../../components/useCharacterRouteMode";
import CharacterProfilePanel from "../../components/CharacterProfilePanel";
import PrincipalOverview from "../../components/PrincipalOverview";
import TraitsPanel from "../../components/TraitsPanel";
import AbilityScoreMethodPicker from "../../components/AbilityScoreMethodPicker";
import FighterSpellLibrary from "../../components/FighterSpellLibrary";
import SharedCompanionsPanel from "../../components/SharedCompanionsPanel";
import type {CompanionSheet} from "../../../../../packages/rules-engine/src/companions";
import SharedSpellsLayout from "../../components/SharedSpellsLayout";
import LevelUpWizard from "../../components/LevelUpWizard";
import LevelDownDialog from "../../components/LevelDownDialog";
import {previewFighterLevelDown} from "../../../../../packages/rules-engine/src/level-down";
import CharacterTabs, { type SheetTab } from "../../components/CharacterTabs";
import SheetPlaceholder from "../../components/SheetPlaceholder";
import EquipmentPanel from "../../components/EquipmentPanel";
import { initialAdventureState, synchronizeAdventureSheet, validateAdventureState, type AdventureState } from "../../../../../packages/rules-engine/src/adventure";
import {makeCharacterSnapshot,validateCharacterSnapshot,type CharacterSnapshot} from "../../../../../packages/rules-engine/src/persistence";
import { EMPTY_CHARACTER_PROFILE, validateCharacterProfile, type CharacterProfile } from "../../../../../packages/rules-engine/src/character-profile";
import { calculateGuidedFighter, BACKGROUNDS, SPECIES_NAMES, FIGHTER_SKILL_OPTIONS, HUMAN_FEATS, type BackgroundId, type SpeciesId, type ElfLineage, type GuidedFighterInput, type HumanOriginFeat } from "../../../../../packages/rules-engine/src/guided";
import { type SupportedFighterLevel } from "../../../../../packages/rules-engine/src/progression";
import { type Ability, type AbilityScores } from "../../../../../packages/rules-engine/src/abilities";
import type {AbilityGenerationMethod} from '../../../../../packages/rules-engine/src/ability-generation';
import { SKILLS, type Skill } from "../../../../../packages/rules-engine/src/proficiencies";
import type { ArmorId } from "../../../../../packages/rules-engine/src/defense";
import { FIGHTING_STYLES, WEAPONS, FIGHTER_PACKAGES, type FightingStyleId, type WeaponId, type StartingPackageId } from "../../../../../packages/rules-engine/src/martial";
import { ORIGIN_FEATS, TOOL_NAMES, SKILLED_OPTIONS, type ToolId } from "../../../../../packages/rules-engine/src/origin-feats";
import { SPELL_LISTS, MAGIC_ABILITY_OPTIONS, spellName, type SpellListId, type SpellAbility, type MagicInitiateSelection } from "../../../../../packages/rules-engine/src/origin-magic";
import { BACKGROUND_PACKAGES, GAMING_SETS, ITEM_NAMES, combineStartingInventory, validateBackgroundEquipment, type BackgroundPackageId, type GamingSetId } from "../../../../../packages/rules-engine/src/background-equipment";
import { replayInventory, equippedArmor, hasEquippedShield, importLegacyMagicWards, nextMagicInstanceId, type InventoryAction } from "../../../../../packages/rules-engine/src/inventory";

const NAMES: Record<Ability, string> = {strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
const SKILL_NAMES: Record<Skill,string> = {
  acrobatics:'Acrobacias',animal_handling:'Trato con animales',arcana:'Arcanos',athletics:'Atletismo',deception:'Engaño',history:'Historia',insight:'Perspicacia',intimidation:'Intimidación',investigation:'Investigación',medicine:'Medicina',nature:'Naturaleza',perception:'Percepción',performance:'Interpretación',persuasion:'Persuasión',religion:'Religión',sleight_of_hand:'Juego de manos',stealth:'Sigilo',survival:'Supervivencia'
};
const FEATS = ORIGIN_FEATS;
const originFeatName=(x:string)=>({magic_initiate_cleric:'Iniciado en la Magia (Clérigo)',magic_initiate_wizard:'Iniciado en la Magia (Mago)',...ORIGIN_FEATS} as Record<string,string>)[x]??x;
const validSkills=(bg:BackgroundId)=>FIGHTER_SKILL_OPTIONS.filter(s=>!(BACKGROUNDS[bg].skills as readonly string[]).includes(s));
function initialForBackground(bg:BackgroundId):{plusTwoAbility:Ability;plusOneAbility:Ability;fighterSkills:Skill[]}{
const b=BACKGROUNDS[bg];return {plusTwoAbility:b.abilities[0] as Ability,plusOneAbility:b.abilities[1] as Ability,fighterSkills:validSkills(bg).slice(0,2)};
}
export default function Home(){
  const router=useRouter();
  const routeMode=useCharacterRouteMode();
  const pendingSaveNavigation=useRef(false);
  const [step,setStep]=useState(0);
  const [activeTab,setActiveTab]=useState<SheetTab>("principal");
  const [editorOpen,setEditorOpen]=useState(false);
  const [creationConfirmed,setCreationConfirmed]=useState(false);
  const editorVisible=editorOpen||(!creationConfirmed&&routeMode==='creation');
  const loadingFromLink=routeMode==='existing';
  const editorBackup=useRef<{input:GuidedFighterInput;adventure:AdventureState|null}|null>(null);
  const [adventure,setAdventure]=useState<AdventureState|null>(null);
  const [name,setName]=useState('');
  const [profile,setProfile]=useState<CharacterProfile>(EMPTY_CHARACTER_PROFILE);
  const [profileLoadRevision,setProfileLoadRevision]=useState(0);
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
  const [levelWizardOpen,setLevelWizardOpen]=useState(false);
  const [levelDownOpen,setLevelDownOpen]=useState(false);
  const [background,setBackground]=useState<BackgroundId>('soldier');
  const [species,setSpecies]=useState<SpeciesId>('human');
  const [scores,setScores]=useState<AbilityScores>({strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8});
  const [companions,setCompanions]=useState<readonly CompanionSheet[]>([]);
  const [abilityGenerationMethod,setAbilityGenerationMethod]=useState<AbilityGenerationMethod>('standard_array');
  const [mode,setMode]=useState<'two_plus_one'|'three_ones'>('two_plus_one');
  const [two,setTwo]=useState<Ability>('strength');
  const [one,setOne]=useState<Ability>('dexterity');
  const [fighterSkills,setFighterSkills]=useState<Skill[]>(['perception','survival']);
  const [humanSkill,setHumanSkill]=useState<Skill>('investigation');
  const [humanFeat,setHumanFeat]=useState<HumanOriginFeat>('savage_attacker');
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
  const [starter,setStarter]=useState<StartingPackageId>('a');
  const [backgroundPackage,setBackgroundPackage]=useState<BackgroundPackageId>('a');
  const [soldierGamingSet,setSoldierGamingSet]=useState<GamingSetId>('dice_set');
  const [inventoryEdits,setInventoryEdits]=useState<{key:string;actions:InventoryAction[]}>({key:'',actions:[]});
  const inventoryKey=[starter,background,backgroundPackage,background==='soldier'&&backgroundPackage==='a'?soldierGamingSet:''].join(':');
  const starting=useMemo(()=>combineStartingInventory(starter,validateBackgroundEquipment(background,{startingPackage:backgroundPackage,...(background==='soldier'?{gamingSet:soldierGamingSet}:{})})),[starter,background,backgroundPackage,soldierGamingSet]);
  const activeActions=useMemo(()=>inventoryEdits.key===inventoryKey?inventoryEdits.actions:[],[inventoryEdits,inventoryKey]);
  const inventory=useMemo(()=>replayInventory(starting,FIGHTER_PACKAGES[starter].initialArmor,activeActions),[starting,starter,activeActions]);
  const armor:ArmorId|null=equippedArmor(inventory);
  const shield=hasEquippedShield(inventory);
  function transact(action:InventoryAction){
    try{
      const registered:InventoryAction=action.type==='magic_grant'?{...action,instanceId:nextMagicInstanceId(activeActions)}:action;
      const updated=[...activeActions,registered];
      replayInventory(starting,FIGHTER_PACKAGES[starter].initialArmor,updated);
      setInventoryEdits({key:inventoryKey,actions:updated});return null;
    }catch(e){return e instanceof Error?e.message:'Operación no válida';}
  }
  function undoTransaction(){if(activeActions.length) setInventoryEdits({key:inventoryKey,actions:activeActions.slice(0,-1)});}
  function resetTransactions(){setInventoryEdits({key:inventoryKey,actions:[]});}
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
  const rulesInput=useMemo<GuidedFighterInput>(()=>({name,level,background,species,
    ...(level>=4?{level4Improvement:{mode:asiMode,first:asiFirst,...(asiMode==='two_ones'?{second:asiSecond}:{})}}:{}),
    ...(level>=6?{level6Improvement:{mode:asi6Mode,first:asi6First,...(asi6Mode==='two_ones'?{second:asi6Second}:{})}}:{}),
    ...(level>=8?{level8Improvement:{mode:asi8Mode,first:asi8First,...(asi8Mode==='two_ones'?{second:asi8Second}:{})}}:{}),
    ...(level>=12?{level12Improvement:{mode:asi12Mode,first:asi12First,...(asi12Mode==='two_ones'?{second:asi12Second}:{})}}:{}),
    ...(level>=14?{level14Improvement:{mode:asi14Mode,first:asi14First,...(asi14Mode==='two_ones'?{second:asi14Second}:{})}}:{}),
    ...(level>=16?{level16Improvement:{mode:asi16Mode,first:asi16First,...(asi16Mode==='two_ones'?{second:asi16Second}:{})}}:{}),
    ...(level>=19&&epicBoon?{epicBoon:{id:epicBoon,ability:epicAbility}}:{}),
    assignedAbilities:scores,abilityGenerationMethod,companions,increaseMode:mode,plusTwoAbility:two,plusOneAbility:one,fighterSkills,humanSkill,humanFeat,humanFeatDetails,backgroundMagicInitiate,humanSize,elfLineage:lineage,elfSenseSkill:elfSkill,elfSpellAbility:elfSpell,armor,shield,inventoryActions:activeActions,martial:{fightingStyle:style,...(level>=7?{additionalFightingStyle:additionalStyle as FightingStyleId}:{}),weaponMasteries:masteries,startingPackage:starter},
    backgroundEquipment:{startingPackage:backgroundPackage,...(background==='soldier'?{gamingSet:soldierGamingSet}:{})}}),[name,level,asiMode,asiFirst,asiSecond,asi6Mode,asi6First,asi6Second,asi8Mode,asi8First,asi8Second,asi12Mode,asi12First,asi12Second,asi14Mode,asi14First,asi14Second,asi16Mode,asi16First,asi16Second,epicBoon,epicAbility,additionalStyle,background,species,scores,abilityGenerationMethod,companions,mode,two,one,fighterSkills,humanSkill,humanFeat,humanFeatDetails,backgroundMagicInitiate,humanSize,lineage,elfSkill,elfSpell,armor,shield,style,masteries,starter,backgroundPackage,soldierGamingSet,activeActions]);
  // Separar perfil y reglas evita recalcular toda la hoja por cada tecla en las notas.
  const input=useMemo<GuidedFighterInput>(()=>({...rulesInput,profile}),[rulesInput,profile]);
  const output=useMemo(()=>{try{return {result:calculateGuidedFighter(rulesInput),error:null};}catch(e){return {result:null,error:e instanceof Error?e.message:'Error al crear el personaje'};}},[rulesInput]);
  function loadSavedInput(saved:GuidedFighterInput){
    setName(saved.name);setProfile(saved.profile?validateCharacterProfile(saved.profile):EMPTY_CHARACTER_PROFILE);
    setProfileLoadRevision(n=>n+1);
    setLevel(saved.level);setLevelMessage('');
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
    setCompanions([...(saved.companions??[])]);
    setScores({...saved.assignedAbilities});setAbilityGenerationMethod(saved.abilityGenerationMethod??'standard_array');setMode(saved.increaseMode);setTwo(saved.plusTwoAbility);setOne(saved.plusOneAbility);
    setFighterSkills([...saved.fighterSkills]);setHumanSkill(saved.humanSkill??'investigation');
    setHumanFeat(saved.humanFeat??'savage_attacker');setHumanSize(saved.humanSize??'medium');
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
    setStyle(martial?.fightingStyle??'defense');setAdditionalStyle(martial?.additionalFightingStyle??'');setMasteries(martial?[...martial.weaponMasteries]:['greatsword','flail','javelin']);
    const newStarter=martial?.startingPackage??'a';setStarter(newStarter);
    const newBackgroundPack=saved.backgroundEquipment?.startingPackage??'a';setBackgroundPackage(newBackgroundPack);
    const game=saved.backgroundEquipment?.gamingSet??'dice_set';setSoldierGamingSet(game);
    const key=[newStarter,saved.background,newBackgroundPack,saved.background==='soldier'&&newBackgroundPack==='a'?game:''].join(':');
    setInventoryEdits({key,actions:[...(saved.inventoryActions??[])]});
    setStep(0);
  }
  const sheet=output.result?.sheet;
  const sessionCheck=useMemo(()=>{
    if(!sheet)return {state:null,outOfSync:false};
    if(!adventure)return {state:initialAdventureState(sheet),outOfSync:false};
    try{return {state:validateAdventureState(adventure,sheet),outOfSync:false};}
    catch{return {state:adventure,outOfSync:true};}
  },[sheet,adventure]);
  // La edición del origen puede modificar los PG máximos sin subir de nivel.
  // Preparamos la conciliación sin tocar la sesión hasta confirmar «Guardar».
  const editorSynchronization=useMemo(()=>{
    if(!editorVisible||!sessionCheck.outOfSync||!sheet||!adventure)return null;
    try{return synchronizeAdventureSheet(adventure,sheet);}catch{return null;}
  },[editorVisible,sessionCheck.outOfSync,sheet,adventure]);
  /** La subida se decide en LevelUpWizard y llega como instantánea ya validada.
   * Un único evento de React confirma a la vez nivel, elecciones y estado de partida.
   */
  function confirmWizardLevelUp(snapshot:CharacterSnapshot,synchronized:boolean,freshSession:boolean){
    loadSavedInput(snapshot.input);
    setAdventure(snapshot.adventure);
    setLevelWizardOpen(false);
    setLevelMessage(`Nivel ${snapshot.input.level} alcanzado. ${freshSession?'Se inició una sesión de partida nueva. ':synchronized?'La sesión actual se sincronizó previamente. ':''}Pulsa «Actualizar guardado» para conservar los cambios en PostgreSQL.`);
  }
  /** Retroceso seguro: vista previa pura y confirmación conjunta de ficha y sesión. */
  const levelDownAssessment=useMemo(()=>{
    if(!levelDownOpen)return {preview:null,error:''};
    try{return {preview:previewFighterLevelDown(input,adventure),error:''};}
    catch(e){return {preview:null,error:e instanceof Error?e.message:'No se puede calcular la bajada de nivel'};}
  },[levelDownOpen,input,adventure]);
  function confirmFighterLevelDown(){
    const next=levelDownAssessment.preview;
    if(!next)throw new RangeError('La bajada de nivel no es válida');
    loadSavedInput(next.snapshot.input);
    setAdventure(next.snapshot.adventure);
    setLevelDownOpen(false);
    setLevelMessage(`Has vuelto al nivel ${next.toLevel}. Se han ajustado los rasgos y recursos. Pulsa «Guardar cambios» para actualizar PostgreSQL.`);
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
    setCreationConfirmed(true);setEditorOpen(false);editorBackup.current=null;setActiveTab('principal');
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
  function changePackage(id:StartingPackageId){setStarter(id);}
  function changeMastery(index:number,value:WeaponId){setMasteries(prev=>prev.map((old,i)=>i===index?value:old));}
  // El mismo diálogo sirve para crear y editar; ninguna pestaña muestra el formulario.
  function openEditorAt(targetStep:number){
    if(!editorOpen)editorBackup.current={input,adventure};
    setEditorOpen(true);
    setStep(targetStep);
    setActiveTab('principal');
  }
  function cancelEditor(){
    if(!creationConfirmed){router.push('/create');return;}
    if(editorBackup.current){loadSavedInput(editorBackup.current.input);setAdventure(editorBackup.current.adventure);}
    editorBackup.current=null;setEditorOpen(false);
  }
  function saveEditor(){
    if(!output.result||(sessionCheck.outOfSync&&!editorSynchronization))return;
    if(editorSynchronization)setAdventure(editorSynchronization);
    editorBackup.current=null;setCreationConfirmed(true);setEditorOpen(false);setActiveTab('principal');
  }
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">D20</span><div><strong>CrónicasDnD</strong><span>Hoja digital · D&D 2024</span></div></div><div className="status"><Link href="/" className="wizard-class-link" onNavigate={event=>{if(pendingSaveNavigation.current&&!window.confirm("Tienes cambios sin guardar. ¿Descartarlos y volver al menú?"))event.preventDefault();}}>Menú de personajes</Link><span className="status-dot"/> Edición local · Guardado manual</div></header>
    <div className="content">
      <p className="sheet-release-note">HOJA DE PERSONAJE · D&D 2024 · GUERRERO</p>
      {creationConfirmed&&<>
      <CharacterHeader
        name={name}
        portraitDataUrl={profile.portraitDataUrl}
        level={level}
        background={bg.name}
        species={SPECIES_NAMES[species]}
        valid={Boolean(output.result&&!sessionCheck.outOfSync)}
        onEdit={()=>openEditorAt(0)}
        onLevelUp={level<20?()=>setLevelWizardOpen(true):undefined}
        onLevelDown={level>1?()=>setLevelDownOpen(true):undefined}
      />
      {levelDownOpen&&<LevelDownDialog preview={levelDownAssessment.preview} error={levelDownAssessment.error} onClose={()=>setLevelDownOpen(false)} onConfirm={confirmFighterLevelDown}/>}
      {levelWizardOpen&&level<20&&<LevelUpWizard
        input={input} adventure={adventure} outOfSync={sessionCheck.outOfSync}
        onClose={()=>setLevelWizardOpen(false)} onConfirmed={confirmWizardLevelUp}/>}
      </>}
      <div className="character-sheet-content" hidden={!creationConfirmed&&!loadingFromLink}><SaveLoadPanel characterClass="fighter"
        snapshot={creationConfirmed&&output.result&&!sessionCheck.outOfSync&&sessionCheck.state?makeCharacterSnapshot(input,sessionCheck.state):null}
        validate={validateCharacterSnapshot} onLoad={loadSavedSnapshot}
        normalize={saved=>makeCharacterSnapshot(saved.input,saved.adventure)}
        onPendingChange={pending=>{pendingSaveNavigation.current=pending;}}/></div>
      {creationConfirmed&&<CharacterTabs activeTab={activeTab} onChange={setActiveTab}/>}
      <section id="sheet-panel-principal" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-principal" hidden={activeTab!=='principal'}>
        {creationConfirmed&&<><div className="sheet-section-heading"><div><span className="eyebrow">PÁGINA PRINCIPAL</span><h2>Tu hoja de personaje</h2><p>Valores calculados por el motor, tiradas manuales y gestión directa del estado de partida.</p></div></div>
      <PrincipalOverview result={output.result} error={output.error} input={input} adventure={sessionCheck.state} outOfSync={sessionCheck.outOfSync} onAdventureChange={setAdventure} onEdit={openEditorAt}/></>}
      {editorVisible&&<CharacterCreationDialog characterClass="Guerrero" isNew={!creationConfirmed} valid={Boolean(output.result&&(!sessionCheck.outOfSync||editorSynchronization))} error={output.error??(sessionCheck.outOfSync&&!editorSynchronization?'No se pueden reconciliar estos cambios con la sesión actual. Revisa tus elecciones.':'')} onSave={saveEditor} onCancel={cancelEditor}>
      {editorSynchronization&&<p className="info-line" role="status">Al guardar, los PG de la sesión se sincronizarán con el nuevo máximo, conservando el daño sufrido y los recursos gastados. Puedes cancelar sin modificar la partida.</p>}
      <nav className="wizard-tabs" aria-label="Pasos de creación">{STEPS.map((s,i)=><button type="button" key={s} className={step===i?'active':''} aria-current={step===i?'step':undefined} onClick={()=>setStep(i)}><span>{String(i+1).padStart(2,'0')}</span>{s}</button>)}</nav>
      <div className="workspace">
        <aside id="character-editor" className="editor panel">
          <div className="panel-heading"><div><span className="eyebrow">PASO {step+1} DE {STEPS.length}</span><h2>{STEPS[step]}</h2></div><span className="step-marker">MVP</span></div>
          {step===0&&<>
            <label className="field"><span>Nombre del personaje</span><input value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label>
            <p className="muted-note">Guerrero · nivel {level}. La progresión se realiza exclusivamente desde «Subir de nivel» en la cabecera, mediante el asistente compartido.</p>
            {level>=3&&<div className="info-line">Subclase: Campeón. Próximo nivel: {level===20?'nivel máximo':level+1}.</div>}
            {output.error&&<p className="save-error" role="alert">La hoja actual de nivel {level} tiene un error que impide la progresión o el guardado: {output.error}</p>}
            {sessionCheck.outOfSync&&<p className="save-error" role="alert">Nivel {level} sin sincronizar: han cambiado los PG máximos o el estado de partida. Al intentar subir se solicitará confirmar la sincronización sin borrar la sesión.</p>}
            {levelMessage&&<p className="level-stepper-message" role="alert">{levelMessage}</p>}
          </>}
          {step===1&&<>
            <label className="field"><span>Trasfondo</span><select value={background} onChange={e=>onBackground(e.target.value as BackgroundId)}>{Object.entries(BACKGROUNDS).map(([id,b])=><option key={id} value={id}>{b.name}</option>)}</select></label>
            <div className="origin-detail"><strong>Dote: {originFeatName(bg.feat)}</strong><small>Competencias: {bg.skills.map(s=>SKILL_NAMES[s as Skill]).join(', ')}</small><small>Herramienta: {background==='soldier'?GAMING_SETS[soldierGamingSet]:bg.tool}</small></div>
            {background==='soldier'&&<label className="field"><span>Competencia con juego de azar</span><select value={soldierGamingSet} onChange={e=>setSoldierGamingSet(e.target.value as GamingSetId)}>{Object.entries(GAMING_SETS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
            <label className="field"><span>Especie</span><select value={species} onChange={e=>setSpecies(e.target.value as SpeciesId)}><option value="human">Humano</option><option value="dwarf">Enano</option><option value="elf">Elfo</option><option value="halfling">Mediano</option></select></label>
            {(background==='acolyte'||background==='sage')&&magicFields('Iniciado en la Magia del trasfondo',background==='acolyte'?'cleric':'wizard',bgMagicAbility,background==='acolyte'?bgClericCantrips:bgWizardCantrips,background==='acolyte'?bgClericSpell:bgWizardSpell,{setAbility:setBgMagicAbility,setCantrips:background==='acolyte'?setBgClericCantrips:setBgWizardCantrips,setSpell:background==='acolyte'?setBgClericSpell:setBgWizardSpell})}
            {species==='human'&&<>
              <label className="field"><span>Tamaño</span><select value={humanSize} onChange={e=>setHumanSize(e.target.value as 'small'|'medium')}><option value="medium">Mediano</option><option value="small">Pequeño</option></select></label>
              <label className="field"><span>Dote de origen adicional</span><select value={humanFeat} onChange={e=>setHumanFeat(e.target.value as HumanOriginFeat)}>{HUMAN_FEATS.filter(f=>f!==bg.feat).map(f=><option key={f} value={f}>{FEATS[f]}</option>)}</select></label>
              {humanFeat==='magic_initiate'&&<>
                <label className="field"><span>Lista de conjuros de la dote humana</span><select value={humanMagicList} onChange={e=>changeHumanMagicList(e.target.value as SpellListId)}>{(Object.keys(SPELL_LISTS) as SpellListId[]).filter(id=>!(background==='acolyte'&&id==='cleric')&&!(background==='sage'&&id==='wizard')).map(id=><option value={id} key={id}>{SPELL_LISTS[id].label}</option>)}</select></label>
                {magicFields('Iniciado en la Magia del Humano',humanMagicList,humanMagicAbility,humanCantrips,humanSpell,{setAbility:setHumanMagicAbility,setCantrips:setHumanCantrips,setSpell:setHumanSpell})}
              </>}
              {humanFeat==='skilled'&&<><p className="muted-note">Escoge tres habilidades o herramientas distintas, sin repetir competencias existentes.</p>{[0,1,2].map(i=><label className="field" key={i}><span>Competencia {i+1}</span><select value={skilled[i]} onChange={e=>selectSlot(skilled,setSkilled,i,e.target.value)}>{SKILLED_OPTIONS.map(k=><option value={k} key={k}>{k.startsWith('skill:')?`Habilidad: ${SKILL_NAMES[k.slice(6) as Skill]}`:`Herramienta: ${TOOL_NAMES[k.slice(5) as ToolId]}`}</option>)}</select></label>)}</>}
            </>}
            {species==='elf'&&<><label className="field"><span>Linaje élfico</span><select value={lineage} onChange={e=>setLineage(e.target.value as ElfLineage)}><option value="drow">Drow</option><option value="high_elf">Alto elfo</option><option value="wood_elf">Elfo de los bosques</option></select></label><label className="field"><span>Característica para conjuros del linaje</span><select value={elfSpell} onChange={e=>setElfSpell(e.target.value as typeof elfSpell)}>{(['intelligence','wisdom','charisma'] as const).map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label></>}
            {species==='dwarf'&&<div className="info-line">Robustez enana: +1 PG máximo por nivel (automatizado).</div>}
            {species==='halfling'&&<div className="info-line">Mediano: tamaño Pequeño y 30 pies de velocidad. En Rasgos encontrarás Suerte, Valentía, Agilidad de mediano y Sigilo natural; sus efectos situacionales se gestionan manualmente.</div>}
          </>}
          {step===2&&<>
            <div className="section-label"><h3>Características iniciales</h3><span>Tres métodos</span></div>
            <AbilityScoreMethodPicker method={abilityGenerationMethod} scores={scores} onChange={(method,nextScores)=>{setAbilityGenerationMethod(method);setScores(nextScores);}}/>
            <div className="divider"/><div className="section-label"><h3>Mejoras del trasfondo</h3></div>
            <label className="field"><span>Distribución</span><select value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="two_plus_one">+2 y +1 a características distintas</option><option value="three_ones">+1 a las tres características</option></select></label>
            {mode==='two_plus_one'&&<><label className="field"><span>Característica que recibe +2</span><select value={two} onChange={e=>setTwo(e.target.value as Ability)}>{allowed.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label><label className="field"><span>Característica que recibe +1</span><select value={one} onChange={e=>setOne(e.target.value as Ability)}>{allowed.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label></>}
            <p className="muted-note">Opciones del trasfondo: {allowed.map(a=>NAMES[a]).join(', ')}.</p>
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
            <div className="info-line">{(style==='defense'||level>=7&&additionalStyle==='defense')?'Defensa: +1 a CA mientras llevas armadura. Aplicado automáticamente.':'Los estilos de ataque se calculan en Principal. Las decisiones tácticas corresponden al jugador y al director.'}</div>
            {level>=7&&additionalStyle&&<p className="muted-note">Estilo adicional del Campeón: {FIGHTING_STYLES[additionalStyle]}. Elegido durante la progresión de nivel.</p>}
            <div className="section-label"><h3>Maestrías iniciales</h3><span>3 tipos distintos</span></div>
            {Array.from({length:3},(_,i)=>i).map(i=><label key={i} className="field"><span>Arma dominada {i+1}</span><select value={masteries[i]} onChange={e=>changeMastery(i,e.target.value as WeaponId)}>{Object.entries(WEAPONS).map(([id,data])=><option key={id} value={id}>{data.name} · {data.mastery}</option>)}</select></label>)}
            {masteries.length>3&&<p className="muted-note">Maestrías ganadas al subir de nivel: {masteries.slice(3).map(id=>WEAPONS[id].name).join(', ')}. Su elección permanece en el asistente de progresión.</p>}
            <p className="muted-note">Las maestrías deben ser distintas. Las nuevas elecciones de nivel se realizan desde «Subir de nivel». Puedes elegir armas aunque aún no las poseas; sus ataques y propiedades se consultan en Principal.</p>
            <div className="divider"/>
            <label className="field"><span>Equipo inicial de clase</span><select value={starter} onChange={e=>changePackage(e.target.value as StartingPackageId)}>{Object.entries(FIGHTER_PACKAGES).map(([id,pack])=><option key={id} value={id}>{pack.label}</option>)}</select></label>
            <div className="origin-detail"><strong>{FIGHTER_PACKAGES[starter].gold} po · Equipo de clase</strong>{FIGHTER_PACKAGES[starter].items.map((it,i)=><small key={i}>{it.quantity} × {it.name}</small>)}{starter==='c'&&<small>Sin objetos. La compra de equipo se añadirá después.</small>}</div>
            <div className="info-line">El equipo inicial se añade al inventario. Las compras, el botín y los cambios de equipo se gestionan después desde la pestaña Equipo.</div>
            <div className="divider"/>
            <div className="section-label"><h3>Equipo del trasfondo</h3><span>{bg.name}</span></div>
            <label className="field"><span>Opción del trasfondo</span><select value={backgroundPackage} onChange={e=>setBackgroundPackage(e.target.value as BackgroundPackageId)}><option value="a">A · Objetos y monedas</option><option value="b">B · 50 piezas de oro, sin objetos</option></select></label>
            <div className="origin-detail"><strong>{BACKGROUND_PACKAGES[background][backgroundPackage].gold} po · Trasfondo</strong>
              {backgroundPackage==='a'&&BACKGROUND_PACKAGES[background].a.items.map(it=><small key={it.id}>{it.quantity} × {ITEM_NAMES[it.id]}</small>)}
              {background==='soldier'&&backgroundPackage==='a'&&<small>1 × {GAMING_SETS[soldierGamingSet]} (juego de azar elegido)</small>}
              {backgroundPackage==='b'&&<small>Sin objetos de trasfondo; la competencia con herramientas se conserva.</small>}
            </div>
            <p className="muted-note">El oro y los objetos del trasfondo se suman a los de clase. Si cambias un paquete, se reinicia el historial de operaciones del inventario.</p>
          </>}
          <div className="wizard-actions"><button type="button" disabled={step===0} onClick={()=>setStep(x=>Math.max(0,x-1))}>Anterior</button><button type="button" disabled={step===STEPS.length-1} onClick={()=>setStep(x=>Math.min(STEPS.length-1,x+1))}>Siguiente</button></div>
          <div className="editor-footnote">Las elecciones iniciales se aplicarán juntas al guardar. El progreso posterior se modifica exclusivamente desde los asistentes de nivel.</div>
        </aside>
      </div>
      </CharacterCreationDialog>}
      </section>
      <section id="sheet-panel-rasgos" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-rasgos" hidden={activeTab!=='rasgos'}>
        <TraitsPanel input={input} result={output.result} error={output.error} onEdit={openEditorAt}/>
      </section>
      <section id="sheet-panel-equipo" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-equipo" hidden={activeTab!=='equipo'}>
        <EquipmentPanel
          inventory={output.result?.inventory??null}
          error={output.error}
          outOfSync={sessionCheck.outOfSync}
          actionCount={activeActions.length}
          onInventoryAction={transact}
          onUndo={undoTransaction}
          onReset={resetTransactions}
          onEdit={()=>openEditorAt(4)}
          onOpenAttacks={()=>setActiveTab('principal')}
        />
      </section>
      <section id="sheet-panel-hechizos" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-hechizos" hidden={activeTab!=='hechizos'}>
        <SharedSpellsLayout spellClass="Guerrero" description="La magia de origen no concede ranuras de clase.">
          <FighterSpellLibrary result={output.result} error={output.error} mode="normal" onEditOrigin={()=>openEditorAt(1)}/>
        </SharedSpellsLayout>
      </section>
      <section id="sheet-panel-personaje" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-personaje" hidden={activeTab!=='personaje'}>
        <CharacterProfilePanel key={profileLoadRevision} profile={profile} onChange={setProfile} name={name}
          species={SPECIES_NAMES[species]}
          background={bg.name} characterClass="Guerrero" level={level} onEditIdentity={()=>openEditorAt(0)}/>
      </section>
      <section id="sheet-panel-companions" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-companions" hidden={activeTab!=='companions'}>
        <SharedCompanionsPanel companions={companions} onChange={setCompanions}/>
      </section>
      <section id="sheet-panel-combate" className="sheet-tab-panel" role="tabpanel" aria-labelledby="sheet-tab-combate" hidden={activeTab!=='combate'}>
        <SheetPlaceholder eyebrow="COMBATE · DESARROLLO FUTURO" title="Coming Soon"
          description="El combate táctico se incorporará más adelante. Las tiradas básicas de armas y los recursos de clase siguen disponibles en Principal."
          actionLabel="Volver a Principal" onAction={()=>setActiveTab('principal')} />
      </section>
      <footer className="footer">Guardado manual disponible en desarrollo local. Compras y hallazgos sujetos al director de juego. No equivale a una hoja completa y validada de D&D 2024.</footer>
    </div>
  </main>;
}
