"use client";

import { useMemo, useState } from "react";
import SaveLoadPanel from "../components/SaveLoadPanel";
import PlayPanel from "../components/PlayPanel";
import SurvivalPanel from "../components/SurvivalPanel";
import IncomingAttacksPanel from "../components/IncomingAttacksPanel";
import MagicWardsPanel from "../components/MagicWardsPanel";
import AttacksPanel from "../components/AttacksPanel";
import CombatPanel from "../components/CombatPanel";
import ConditionsPanel from "../components/ConditionsPanel";
import { recordWeaponAttack } from "../../../../packages/rules-engine/src/combat";
import {conditionCapabilities,initialConditionLedger} from "../../../../packages/rules-engine/src/conditions";
import type { WeaponAttackProfile,AttackResolution } from "../../../../packages/rules-engine/src/attacks";
import { initialAdventureState, validateAdventureState, updateAdventureCombat, type AdventureState } from "../../../../packages/rules-engine/src/adventure";
import type { CharacterSnapshot } from "../../../../packages/rules-engine/src/persistence";
import { calculateGuidedFighter, BACKGROUNDS, FIGHTER_SKILL_OPTIONS, HUMAN_FEATS, type BackgroundId, type SpeciesId, type ElfLineage, type GuidedFighterInput, type HumanOriginFeat } from "../../../../packages/rules-engine/src/guided";
import { ABILITIES, type Ability, type AbilityScores } from "../../../../packages/rules-engine/src/abilities";
import { SKILLS, type Skill } from "../../../../packages/rules-engine/src/proficiencies";
import type { ArmorId } from "../../../../packages/rules-engine/src/defense";
import { FIGHTING_STYLES, WEAPONS, FIGHTER_PACKAGES, type FightingStyleId, type WeaponId, type StartingPackageId } from "../../../../packages/rules-engine/src/martial";
import { ORIGIN_FEATS, CRAFTER_TOOLS, MUSICAL_INSTRUMENTS, TOOL_NAMES, SKILLED_OPTIONS, type ToolId } from "../../../../packages/rules-engine/src/origin-feats";
import { SPELL_LISTS, MAGIC_ABILITY_OPTIONS, spellName, type SpellListId, type SpellAbility, type MagicInitiateSelection } from "../../../../packages/rules-engine/src/origin-magic";
import { BACKGROUND_PACKAGES, GAMING_SETS, ITEM_NAMES, combineStartingInventory, validateBackgroundEquipment, type BackgroundPackageId, type GamingSetId } from "../../../../packages/rules-engine/src/background-equipment";
import { INVENTORY_NAMES, INVENTORY_PRICES_CP, replayInventory, formatCopper, type InventoryAction, type InventoryItemId } from "../../../../packages/rules-engine/src/inventory";

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
const FEATURES:Record<string,string>={fighting_style:'Estilo de combate',second_wind:'Segundo aliento',weapon_mastery:'Maestría de armas',action_surge:'Acción súbita',tactical_mind:'Mente táctica',champion_improved_critical:'Crítico mejorado',champion_remarkable_athlete:'Atleta extraordinario'};
const FEATS = ORIGIN_FEATS;
const originFeatName=(x:string)=>({magic_initiate_cleric:'Iniciado en la Magia (Clérigo)',magic_initiate_wizard:'Iniciado en la Magia (Mago)',...ORIGIN_FEATS} as Record<string,string>)[x]??x;
const signed=(n:number)=>n>=0?`+${n}`:String(n);
const validSkills=(bg:BackgroundId)=>FIGHTER_SKILL_OPTIONS.filter(s=>!(BACKGROUNDS[bg].skills as readonly string[]).includes(s));
function initialForBackground(bg:BackgroundId):{plusTwoAbility:Ability;plusOneAbility:Ability;fighterSkills:Skill[]}{
const b=BACKGROUNDS[bg];return {plusTwoAbility:b.abilities[0] as Ability,plusOneAbility:b.abilities[1] as Ability,fighterSkills:validSkills(bg).slice(0,2)};
}
export default function Home(){
  const [step,setStep]=useState(0);
  const [adventure,setAdventure]=useState<AdventureState|null>(null);
  const [name,setName]=useState('Aldric');
  const [level,setLevel]=useState<1|2|3>(1);
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
  const [masteries,setMasteries]=useState<WeaponId[]>(['greatsword','flail','javelin']);
  const [starter,setStarter]=useState<StartingPackageId>('a');
  const [backgroundPackage,setBackgroundPackage]=useState<BackgroundPackageId>('a');
  const [soldierGamingSet,setSoldierGamingSet]=useState<GamingSetId>('dice_set');
  const [inventoryEdits,setInventoryEdits]=useState<{key:string;actions:InventoryAction[]}>({key:'',actions:[]});
  const [inventoryError,setInventoryError]=useState<string|null>(null);
  const [tradeItem,setTradeItem]=useState<InventoryItemId>('shield');
  const [tradeCount,setTradeCount]=useState(1);
  const inventoryKey=[starter,background,backgroundPackage,background==='soldier'&&backgroundPackage==='a'?soldierGamingSet:''].join(':');
  const starting=useMemo(()=>combineStartingInventory(starter,validateBackgroundEquipment(background,{startingPackage:backgroundPackage,...(background==='soldier'?{gamingSet:soldierGamingSet}:{})})),[starter,background,backgroundPackage,soldierGamingSet]);
  const activeActions=inventoryEdits.key===inventoryKey?inventoryEdits.actions:[];
  const inventory=useMemo(()=>replayInventory(starting,FIGHTER_PACKAGES[starter].initialArmor,activeActions),[starting,starter,activeActions]);
  const armor:ArmorId|null=inventory.equipped.armor;
  const shield=inventory.equipped.shield;
  const quotedQty=Number.isInteger(tradeCount)&&tradeCount>=1&&tradeCount<=1000?tradeCount:0;
  function transact(action:InventoryAction){
    try{
      const updated=[...activeActions,action];
      replayInventory(starting,FIGHTER_PACKAGES[starter].initialArmor,updated);
      setInventoryEdits({key:inventoryKey,actions:updated});setInventoryError(null);
    }catch(e){setInventoryError(e instanceof Error?e.message:'Operación no válida');}
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
  const backgroundMagicInitiate:MagicInitiateSelection|undefined=background==='acolyte'
    ? {list:'cleric',spellcastingAbility:bgMagicAbility,cantrips:bgClericCantrips,level1Spell:bgClericSpell}
    : background==='sage'?{list:'wizard',spellcastingAbility:bgMagicAbility,cantrips:bgWizardCantrips,level1Spell:bgWizardSpell}:undefined;
  const humanFeatDetails={magicInitiate:{list:humanMagicList,spellcastingAbility:humanMagicAbility,cantrips:humanCantrips,level1Spell:humanSpell},crafterTools,musicianInstruments:instruments,skilledProficiencies:skilled};
  const input:GuidedFighterInput={name,level,background,species,assignedAbilities:scores,increaseMode:mode,plusTwoAbility:two,plusOneAbility:one,fighterSkills,humanSkill,humanFeat,humanFeatDetails,backgroundMagicInitiate,humanSize,elfLineage:lineage,elfSenseSkill:elfSkill,elfSpellAbility:elfSpell,armor,shield,inventoryActions:activeActions,martial:{fightingStyle:style,weaponMasteries:masteries,startingPackage:starter},
    backgroundEquipment:{startingPackage:backgroundPackage,...(background==='soldier'?{gamingSet:soldierGamingSet}:{})}};
  const output=useMemo(()=>{try{return {result:calculateGuidedFighter(input),error:null};}catch(e){return {result:null,error:e instanceof Error?e.message:'Error al crear el personaje'};}},[name,level,background,species,scores,mode,two,one,fighterSkills,humanSkill,humanFeat,humanFeatDetails,backgroundMagicInitiate,humanSize,lineage,elfSkill,elfSpell,armor,shield,style,masteries,starter,backgroundPackage,soldierGamingSet,activeActions]);
  function loadSavedInput(saved:GuidedFighterInput){
    setName(saved.name);setLevel(saved.level);setBackground(saved.background);setSpecies(saved.species);
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
    setStyle(martial?.fightingStyle??'defense');setMasteries(martial?[...martial.weaponMasteries]:['greatsword','flail','javelin']);
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
  function confirmWeaponAttack(profile:WeaponAttackProfile,resolution:AttackResolution){
    if(!sheet||!sessionCheck.state||sessionCheck.outOfSync||!output.result?.inventory)throw new RangeError('Primero valida y sincroniza el personaje');
    if(sessionCheck.state.fighter.hitPoints.current===0)throw new RangeError('A 0 PG no se pueden registrar ataques: revisa el estado del personaje');
    if(!conditionCapabilities(sessionCheck.state.combat.conditions??initialConditionLedger()).canTakeAction)throw new RangeError('Las condiciones impiden registrar ataques');
    const result=recordWeaponAttack(sessionCheck.state.combat,output.result.inventory,profile,resolution);
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
  function loadSavedSnapshot(snapshot:CharacterSnapshot){loadSavedInput(snapshot.input);setAdventure(snapshot.adventure);}
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
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Creador guiado · D&D 2024</span></div></div><div className="status"><span className="status-dot"/> Motor conectado · Guardado local</div></header>
    <div className="content">
      <div className="intro"><div><span className="eyebrow">PROTOTIPO 21 / CATÁLOGO DEFENSIVO MÁGICO</span><h1>Da forma a <em>tu aventurero.</em></h1><p>Guerrero de niveles 1–3. Tus decisiones de origen se validan y se reflejan en la hoja calculada.</p></div><span className="edition">PHB 2024 + SRD</span></div>
      <SaveLoadPanel input={input} adventure={sessionCheck.outOfSync?null:sessionCheck.state} valid={Boolean(output.result&&!sessionCheck.outOfSync)} onLoad={loadSavedSnapshot}/>
      <PlayPanel sheet={sheet??null} state={sessionCheck.state} outOfSync={sessionCheck.outOfSync} onChange={setAdventure}/>
      <SurvivalPanel sheet={sheet??null} state={sessionCheck.state} outOfSync={sessionCheck.outOfSync} onChange={setAdventure}/>
      <MagicWardsPanel state={sessionCheck.state} outOfSync={sessionCheck.outOfSync} onChange={setAdventure}/>
      <IncomingAttacksPanel sheet={sheet??null} state={sessionCheck.state} species={output.result?.origin.species??null} inventory={output.result?.inventory??null} outOfSync={sessionCheck.outOfSync} onChange={setAdventure}/>
      <ConditionsPanel combat={sessionCheck.outOfSync?null:sessionCheck.state?.combat??null} outOfSync={sessionCheck.outOfSync} onChange={handleCombatChange} baseSpeed={output.result?.origin.speedFeet??30}/>
      <AttacksPanel combat={sessionCheck.outOfSync?null:sessionCheck.state?.combat??null} sheet={sheet??null} inventory={output.result?.inventory??null} martial={input.martial??null} onRecord={confirmWeaponAttack} canRecord={Boolean(sheet&&!sessionCheck.outOfSync&&sessionCheck.state&&sessionCheck.state.fighter.hitPoints.current>0&&conditionCapabilities(sessionCheck.state.combat.conditions??initialConditionLedger()).canTakeAction)}/>
      <CombatPanel combat={sessionCheck.outOfSync?null:sessionCheck.state?.combat??null} outOfSync={sessionCheck.outOfSync} onChange={handleCombatChange}/>
      <nav className="wizard-tabs" aria-label="Pasos de creación">{STEPS.map((s,i)=><button type="button" key={s} className={step===i?'active':''} aria-current={step===i?'step':undefined} onClick={()=>setStep(i)}><span>{String(i+1).padStart(2,'0')}</span>{s}</button>)}</nav>
      <div className="workspace">
        <aside className="editor panel">
          <div className="panel-heading"><div><span className="eyebrow">PASO {step+1} DE {STEPS.length}</span><h2>{STEPS[step]}</h2></div><span className="step-marker">MVP</span></div>
          {step===0&&<>
            <label className="field"><span>Nombre del personaje</span><input value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label>
            <div className="field"><span className="field-label">Clase</span><div className="info-line">Guerrero (única clase disponible en esta versión)</div></div>
            <div className="field"><span className="field-label">Nivel</span><div className="level-picker">{([1,2,3] as const).map(n=><button key={n} type="button" className={level===n?'active':''} onClick={()=>setLevel(n)}>Nivel {n}</button>)}</div></div>
            {level===3&&<div className="info-line">Subclase: Campeón. El resto se añadirá después.</div>}
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
          </>}
          {step===3&&<>
            <p className="muted-note">El Guerrero elige dos habilidades. El trasfondo ya concede dos competencias adicionales.</p>
            {([0,1] as const).map(i=><label key={i} className="field"><span>Habilidad del Guerrero {i+1}</span><select value={fighterSkills[i]} onChange={e=>setSkillAt(i,e.target.value as Skill)}>{validSkills(background).map(s=><option key={s} value={s}>{SKILL_NAMES[s]}</option>)}</select></label>)}
            {species==='human'&&<label className="field"><span>Habilidad adicional del Humano</span><select value={humanSkill} onChange={e=>setHumanSkill(e.target.value as Skill)}>{[humanSkill,...humanCandidates].filter((s,i,arr)=>arr.indexOf(s)===i).map(s=><option key={s} value={s}>{SKILL_NAMES[s]}</option>)}</select></label>}
            {species==='elf'&&<label className="field"><span>Sentidos agudos (Elfo)</span><select value={elfSkill} onChange={e=>setElfSkill(e.target.value as typeof elfSkill)}>{[elfSkill,...elfCandidates].filter((s,i,arr)=>arr.indexOf(s)===i).map(s=><option key={s} value={s}>{SKILL_NAMES[s]}</option>)}</select></label>}
            <div className="origin-detail"><strong>Salvaciones del Guerrero</strong><small>Fuerza y Constitución</small></div>
          </>}
          {step===4&&<>
            <label className="field"><span>Estilo de combate del Guerrero</span><select value={style} onChange={e=>setStyle(e.target.value as FightingStyleId)}>{Object.entries(FIGHTING_STYLES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
            <div className="info-line">{style==='defense'?'Defensa: +1 a CA mientras llevas armadura. Aplicado automáticamente.':'Los estilos de ataque se calculan en el nuevo panel de combate. Las reacciones y sentidos siguen pendientes.'}</div>
            <div className="section-label"><h3>Maestría de armas</h3><span>3 tipos distintos</span></div>
            {([0,1,2] as const).map(i=><label key={i} className="field"><span>Arma dominada {i+1}</span><select value={masteries[i]} onChange={e=>changeMastery(i,e.target.value as WeaponId)}>{Object.entries(WEAPONS).map(([id,data])=><option key={id} value={id}>{data.name} · {data.mastery}</option>)}</select></label>)}
            <p className="muted-note">Puedes elegir armas aunque aún no las poseas. Sus propiedades se muestran en el panel de combate; la mayoría de efectos situacionales se resuelven con el director.</p>
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
            <label className="field"><span>Armadura equipada (solo objetos que posees)</span><select value={armor??'none'} onChange={e=>transact({type:'equip_armor',armor:e.target.value==='none'?null:e.target.value as ArmorId})}>
              <option value="none">Sin armadura</option>
              {inventory.items.filter(it=>ARMOR_OPTIONS.some(x=>x.id===it.id)).map(it=><option key={it.id} value={it.id}>{INVENTORY_NAMES[it.id]}</option>)}
            </select></label>
            <label className="switch-field"><span><strong>Escudo equipado</strong><small>Debes poseer al menos uno</small></span><input type="checkbox" checked={shield} disabled={!shield&&!inventory.items.some(it=>it.id==='shield')} onChange={e=>transact({type:'equip_shield',equipped:e.target.checked})}/></label>
            <div className="trade-actions trade-history"><button type="button" disabled={!activeActions.length} onClick={undoTransaction}>Deshacer última</button><button type="button" disabled={!activeActions.length} onClick={resetTransactions}>Reiniciar inventario</button></div>
          </>}
          <div className="wizard-actions"><button type="button" disabled={step===0} onClick={()=>setStep(x=>Math.max(0,x-1))}>Anterior</button><button type="button" disabled={step===STEPS.length-1} onClick={()=>setStep(x=>Math.min(STEPS.length-1,x+1))}>Siguiente</button></div>
          <div className="editor-footnote">Creación parcial con guardado manual local. Los precios se expresan en piezas de cobre y se venden objetos a mitad del valor de catálogo.</div>
        </aside>
        <section className="preview panel" aria-live="polite">
          <div className="panel-heading"><div><span className="eyebrow">HOJA EN VIVO</span><h2>{name.trim()||'Sin nombre'}</h2><p>Guerrero {level}{level===3?' · Campeón':''} · {bg.name} · {species==='human'?'Humano':species==='dwarf'?'Enano':'Elfo'}</p></div><span className="roundel">{level}</span></div>
          {output.error&&<div className="error" role="alert"><strong>Revisa tus elecciones.</strong><p>{output.error}</p></div>}
          {sheet&&output.result&&<>
            <div className="stat-cards"><div className="stat-card"><span>PG MÁXIMOS</span><strong>{sheet.maximumHitPoints}</strong><small>Actuales: {!sessionCheck.outOfSync&&sessionCheck.state?sessionCheck.state.fighter.hitPoints.current:'pendiente'} · {sheet.hitDice.total}d{sheet.hitDice.die}</small></div><div className="stat-card"><span>CLASE DE ARMADURA</span><strong>{sheet.armorClass}</strong><small>{sheet.armorClassDetails.formula}</small></div><div className="stat-card"><span>INICIATIVA</span><strong>{signed(sheet.initiative)}</strong><small>{sheet.initiativeRollMode==='advantage'?'Ventaja':sheet.initiativeRollMode==='disadvantage'?'Desventaja':'Normal'}</small></div></div>
            <div className="preview-section"><div className="section-label"><h3>Características finales</h3><span>Competencia {signed(sheet.proficiencyBonus)}</span></div><div className="ability-grid">{ABILITIES.map(a=><div className="ability-stat" key={a}><span>{NAMES[a].slice(0,3).toUpperCase()}</span><strong>{sheet.abilityScores[a]}</strong><small>{signed(sheet.abilityModifiers[a])}</small></div>)}</div></div>
            <div className="two-col"><div className="preview-section"><div className="section-label"><h3>Habilidades</h3><span>Competencias elegidas</span></div><div className="data-list">{SKILLS.map(k=><div className="data-row" key={k}><span>{SKILL_NAMES[k]} {taken.includes(k)||((species==='human'&&humanSkill===k)||(species==='elf'&&elfSkill===k))?'•':''}</span><span><strong>{signed(sheet.skillBonuses[k])}</strong>{sheet.skillRollModes[k]!=='normal'&&<b className="mode-chip">{sheet.skillRollModes[k]==='advantage'?'Ventaja':'Desventaja'}</b>}</span></div>)}</div></div><div className="preview-section"><div className="section-label"><h3>Origen y rasgos</h3><span>PHB 2024</span></div><div className="resource-grid">{Object.entries(sheet.resources).map(([id,r])=>r&&<div className="resource-card" key={id}><span>{id==='second_wind'?'Segundo aliento':'Acción súbita'}</span><strong>{!sessionCheck.outOfSync&&sessionCheck.state?sessionCheck.state.fighter.resources[id as 'second_wind'|'action_surge']?.current??r.current:r.current}/{r.maximum}</strong></div>)}</div><p className="muted-note">Tamaño: {output.result.origin.size==='medium'?'Mediano':'Pequeño'} · Velocidad: {output.result.origin.speedFeet} pies</p><p className="muted-note">Dote del trasfondo: {originFeatName(bg.feat)}{output.result.origin.additionalFeat?` · Dote humana: ${FEATS[output.result.origin.additionalFeat]}`:''}</p><p className="muted-note">Herramientas: {output.result.origin.tools.join(', ')}</p>{output.result.origin.luckPointsMaximum!==undefined&&<p className="muted-note">Puntos de suerte máximos: {output.result.origin.luckPointsMaximum} (sin gestión de gasto)</p>}{output.result.martial&&<><p className="muted-note">Estilo: {FIGHTING_STYLES[output.result.martial.choices.fightingStyle]} · Dinero de clase: {output.result.martial.gold} po</p><p className="muted-note">Maestrías: {output.result.martial.masteries.map(m=>`${m.weapon} (${m.property})`).join(', ')}</p></>}
            <ul className="feature-list">{sheet.features.map(f=><li key={f}>{FEATURES[f]??f}</li>)}</ul></div></div>
            {output.result.inventory&&<div className="preview-section inventory-section">
              <div className="section-label"><h3>Inventario actual</h3><span>{output.result.inventory.items.length} tipos</span></div>
              <div className="money-summary"><strong>{formatCopper(output.result.inventory.coinsCopper)}</strong><span>Saldo inicial: {output.result.startingInventory?.totalGold??0} po · {activeActions.length} operaciones</span></div>
              <div className="data-list">{output.result.inventory.items.length===0&&<p className="muted-note">No hay objetos en tu inventario.</p>}{output.result.inventory.items.map(it=><div className="data-row" key={it.id}><span>{it.name}<small className="item-origin">{it.sources.map(src=>`${src.from==='class'?'Clase':src.from==='background'?'Trasfondo':src.from==='purchase'?'Comprado':'Botín'} ×${src.quantity}`).join(' + ')}{armor===it.id?' · EQUIPADA':''}{shield&&it.id==='shield'?' · EQUIPADO':''}</small></span><strong>×{it.quantity}</strong></div>)}</div>
              <p className="muted-note">Equipo: {armor?INVENTORY_NAMES[armor]:'sin armadura'} · Escudo: {shield?'sí':'no'} · La CA se recalcula al equipar o desequipar.</p>
              <p className="muted-note">Los paquetes de aventurero siguen siendo un único objeto. El inventario puede guardarse mediante el panel Mis personajes.</p>
            </div>}
            {output.result.spells.length>0&&<div className="preview-section"><div className="section-label"><h3>Conjuros de origen</h3><span>{output.result.spells.length} concedidos</span></div><div className="spell-list">{output.result.spells.map((sp,i)=><div className="spell-entry" key={`${sp.source}-${sp.id}-${i}`}><div><strong>{sp.name}</strong><small>{sp.source==='background'?'Trasfondo':sp.source==='human_feat'?'Dote humana':'Linaje élfico'} · {sp.level===0?'Truco':'Nivel 1'} · {NAMES[sp.spellcastingAbility]}</small></div>{sp.freeCastPerLongRest&&<span className="mode-chip">1 gratis / descanso largo</span>}</div>)}</div><p className="muted-note">Los conjuros están validados y registrados; sus tiradas, efectos y usos consumidos aún no se ejecutan.</p></div>}
            <div className="preview-section pending-section"><div className="section-label"><h3>Automatizaciones pendientes</h3><span>{output.result.pendingAutomation.length}</span></div><ul className="feature-list">{output.result.pendingAutomation.map((p,i)=><li key={i}>{p}</li>)}</ul></div>
            {sheet.warnings.length>0&&<div className="warning" role="status">{sheet.warnings.includes('heavy_armor_strength_requirement_unmet')&&<p>La armadura pesada no cumple el requisito de Fuerza.</p>}{sheet.warnings.includes('armor_stealth_disadvantage')&&<p>La armadura impone desventaja en Sigilo.</p>}</div>}
          </>}
        </section>
      </div><footer className="footer">Guardado manual disponible en desarrollo local. Compras y hallazgos sujetos al director de juego. No equivale a una hoja completa y validada de D&D 2024.</footer>
    </div>
  </main>;
}
