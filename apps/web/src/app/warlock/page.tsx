'use client';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import CharacterTabs,{type SheetTab} from '../../components/CharacterTabs';
import CharacterHeader from '../../components/CharacterHeader';
import SaveLoadPanel from '../../components/SaveLoadPanel';
import SharedPrincipalSheet from '../../components/SharedPrincipalSheet';
import SharedHealthControls from '../../components/SharedHealthControls';
import SharedInspirationPanel from '../../components/SharedInspirationPanel';
import SharedDeathSavePanel from '../../components/SharedDeathSavePanel';
import SharedCompanionsPanel from '../../components/SharedCompanionsPanel';
import {SHARED_SPELL_RULES,SHARED_CLASS_SPELL_LISTS} from '../../../../../packages/rules-engine/src/shared-spell-catalog';
import AbilityScoreMethodPicker from '../../components/AbilityScoreMethodPicker';
import type {AbilityGenerationMethod} from '../../../../../packages/rules-engine/src/ability-generation';
import type {AbilityScores} from '../../../../../packages/rules-engine/src/abilities';
import TraitsPanel from '../../components/TraitsPanel';
import {collectWarlockTraits} from '../../../../../packages/rules-engine/src/warlock-traits';
import EquipmentPanel from '../../components/EquipmentPanel';
import CharacterProfilePanel from '../../components/CharacterProfilePanel';
import SpellSlotDiamonds from '../../components/SpellSlotDiamonds';
import SpellLibraryPanel from '../../components/SpellLibraryPanel';
import SharedSpellsLayout from '../../components/SharedSpellsLayout';
import WarlockCompanionsPanel from '../../components/WarlockCompanionsPanel';
import {WarlockWeaponAttacks,WarlockEldritchBlast} from '../../components/WarlockAttacks';
import SheetPlaceholder from '../../components/SheetPlaceholder';
import {type Ability} from '../../../../../packages/rules-engine/src/abilities';
import {SKILLS,type Skill} from '../../../../../packages/rules-engine/src/proficiencies';
import {BACKGROUNDS,SPECIES_NAMES,type BackgroundId,type SpeciesId} from '../../../../../packages/rules-engine/src/guided';
import {EMPTY_CHARACTER_PROFILE} from '../../../../../packages/rules-engine/src/character-profile';
import {WEAPONS,type WeaponId} from '../../../../../packages/rules-engine/src/martial';
import {WEAPON_STATS} from '../../../../../packages/rules-engine/src/attacks';
import {WARLOCK_EQUIPMENT_OPTIONS} from '../../../../../packages/rules-engine/src/warlock-inventory';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS,TOME_CANTRIP_OPTIONS,TOME_RITUAL_OPTIONS,warlockSpellRule} from '../../../../../packages/rules-engine/src/warlock-spells';
import {type InventoryAction} from '../../../../../packages/rules-engine/src/inventory';
import {type D20Mode} from '../../../../../packages/rules-engine/src/d20';
import {
 WARLOCK_INVOCATIONS,WARLOCK_SKILL_OPTIONS,
 calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,warlockShortRest,warlockLongRest,
 validateWarlockCharacterSnapshot,warlockInputForPreview,
 type GuidedWarlockInput,type WarlockOneState,type WarlockInvocationId,
} from '../../../../../packages/rules-engine/src/warlock';

const ABILITY_NAMES:Record<Ability,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
const SKILL_NAMES:Record<Skill,string>={acrobatics:'Acrobacias',animal_handling:'Trato con animales',arcana:'Arcanos',athletics:'Atletismo',deception:'Engaño',history:'Historia',insight:'Perspicacia',intimidation:'Intimidación',investigation:'Investigación',medicine:'Medicina',nature:'Naturaleza',perception:'Percepción',performance:'Interpretación',persuasion:'Persuasión',religion:'Religión',sleight_of_hand:'Juego de manos',stealth:'Sigilo',survival:'Supervivencia'};
const signed=(n:number)=>n>=0?'+'+n:String(n);
const defaults:GuidedWarlockInput={
 classId:'warlock',level:1,name:'',profile:EMPTY_CHARACTER_PROFILE,background:'acolyte',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one',plusTwoAbility:'charisma',plusOneAbility:'wisdom',
 warlockSkills:['arcana','deception'],equipmentChoice:'equipment',
 cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['charm_person','hex'],
 invocations:['pact_of_blade']
};
const picker=<T extends string>(choices:readonly T[],label:(v:T)=>string)=>choices.map(v=><option key={v} value={v}>{label(v)}</option>);
export default function WarlockPage(){
 const [input,setInput]=useState<GuidedWarlockInput>(defaults);
 const [state,setState]=useState<WarlockOneState>(()=>initialWarlockOneState(warlockInputForPreview(defaults)));
 const [tab,setTab]=useState<SheetTab>('principal');
 const [editing,setEditing]=useState(true);
 const [mode,setMode]=useState<D20Mode>('normal');
 const [feedback,setFeedback]=useState('');
 const [profileRevision,setProfileRevision]=useState(0);
 const calculated=useMemo(()=>{
  try{return {sheet:calculateWarlockOne(warlockInputForPreview(input),state),error:''};}
  catch(e){return {sheet:null,error:e instanceof Error?e.message:'Elecciones no válidas'};}
 },[input,state]);
 const sheet=calculated.sheet;
 const snapshot=useMemo(()=>{
  if(!sheet)return null;
  try{return makeWarlockCharacterSnapshot(input,state);}catch{return null;}
 },[input,state,sheet]);
 const background=BACKGROUNDS[input.background];
 const invocation=input.invocations[0];
 const hasBlade=invocation==='pact_of_blade';
 const hasChain=invocation==='pact_of_chain';
 const hasTome=invocation==='pact_of_tome';
 function patch(changes:Partial<GuidedWarlockInput>){setInput(prev=>({...prev,...changes}));}
 function updateAbilityScores(abilityGenerationMethod:AbilityGenerationMethod,assignedAbilities:AbilityScores){
  const next={...input,abilityGenerationMethod,assignedAbilities};
  patch({abilityGenerationMethod,assignedAbilities});
  try{
   const newMaximum=calculateWarlockOne(warlockInputForPreview(next),state).maximumHitPoints;
   setState(previous=>({...previous,hitPointsCurrent:previous.hitPointsCurrent===sheet?.maximumHitPoints?newMaximum:Math.min(previous.hitPointsCurrent,newMaximum)}));
  }catch{/* Corrección intermedia: la hoja explica qué valor debe ajustarse. */}
 }
 function patchState(changes:Partial<WarlockOneState>){setState(prev=>({...prev,...changes}));}
 function swapBackground(backgroundId:BackgroundId){
  const bg=BACKGROUNDS[backgroundId];
  const available=WARLOCK_SKILL_OPTIONS.filter(s=>!(bg.skills as readonly string[]).includes(s));
  const currentHuman=input.humanSkill;
  patch({background:backgroundId,backgroundEquipment:{startingPackage:'a',...(backgroundId==='soldier'?{gamingSet:'dice_set' as const}:{})},inventoryActions:[],
   plusTwoAbility:bg.abilities[0],plusOneAbility:bg.abilities[1],warlockSkills:available.slice(0,2),
   pactWeaponId:undefined,
   ...(input.species==='human'&&input.humanFeat===bg.feat?{humanFeat:bg.feat==='alert'?'tough':'alert' as const}:{}),
   ...(input.species==='human'?{humanSkill:currentHuman&&!(bg.skills as readonly string[]).includes(currentHuman)&&!available.slice(0,2).includes(currentHuman as never)?currentHuman:SKILLS.find(s=>!(bg.skills as readonly string[]).includes(s)&&!available.slice(0,2).includes(s as never))}:{})});
 }
 function swapSpecies(species:SpeciesId){
  const {humanSkill,humanFeat,humanSize,elfLineage,...base}=input;
  void humanSkill;void humanFeat;void humanSize;void elfLineage;
  const humanChoice=SKILLS.find(s=>!(background.skills as readonly string[]).includes(s)&&!(input.warlockSkills as readonly string[]).includes(s))??'perception';
  setInput({...base,species,...(species==='human'?{humanSkill:humanChoice,humanFeat:background.feat==='alert'?'tough' as const:'alert' as const,humanSize:'medium' as const}:{}),
   ...(species==='elf'?{elfLineage:'high_elf' as const}:{})});
  patchState({heroicInspiration:species==='human'});
 }
 function swapInvocation(id:WarlockInvocationId){
  setInput(prev=>{
   const {pactWeaponId,tomeCantripIds,tomeRitualIds,...rest}=prev;
   void pactWeaponId;void tomeCantripIds;void tomeRitualIds;
   return {...rest,invocations:[id],...(id==='pact_of_tome'?{tomeCantripIds:['acid_splash','fire_bolt','light'],tomeRitualIds:['alarm','identify']}:{}),
    ...(id==='pact_of_blade'&&prev.pactWeaponId?{pactWeaponId:prev.pactWeaponId}:{})};
  });
  patchState({mageArmorActive:false,tomePresent:false,familiarForm:null,familiarName:''});
 }
 function toggleSpell(field:'cantripIds'|'preparedIds',id:string){
  setInput(prev=>{
   const options=prev[field];
   const next=options.includes(id)?options.filter(value=>value!==id):options.length<2?[...options,id]:options;
   return {...prev,[field]:next};
  });
 }
 function toggleTome(field:'tomeCantripIds'|'tomeRitualIds',id:string,max:number){
  setInput(prev=>{
   const previous=prev[field]??[];
   return {...prev,[field]:previous.includes(id)?previous.filter(x=>x!==id):previous.length<max?[...previous,id]:previous};
  });
 }
 function inventoryAction(action:InventoryAction):string|null{
  try{
   const updated={...input,inventoryActions:[...(input.inventoryActions??[]),action]};
   calculateWarlockOne(warlockInputForPreview(updated),state);
   setInput(updated);setFeedback('Inventario actualizado. Guarda los cambios para conservarlos.');
   return null;
  }catch(e){return e instanceof Error?e.message:'Movimiento de inventario inválido';}
 }
 function adjustHp(delta:number,temporary:boolean){
  if(!sheet)return;
  setState(previous=>{
   if(temporary)return {...previous,temporaryHitPoints:Math.max(0,Math.min(10000,previous.temporaryHitPoints+delta))};
   if(delta>=0)return {...previous,hitPointsCurrent:Math.min(sheet.maximumHitPoints,previous.hitPointsCurrent+delta)};
   const absorbed=Math.min(previous.temporaryHitPoints,-delta);
   return {...previous,temporaryHitPoints:previous.temporaryHitPoints-absorbed,hitPointsCurrent:Math.max(0,previous.hitPointsCurrent+delta+absorbed)};
  });
 }
 function toggleDeathMark(kind:'successes'|'failures',index:number){
  setState(previous=>{const current=previous.manualDeathMarks??{successes:[false,false,false],failures:[false,false,false]};
   const next=[...current[kind]] as [boolean,boolean,boolean];next[index]=!next[index];
   return {...previous,manualDeathMarks:{...current,[kind]:next}};
  });
 }
 function shortRest(){setState(warlockShortRest);setFeedback('Descanso corto: la ranura de Magia de Pacto se ha recuperado. Los PG no cambian automáticamente.');}
 function longRest(){
  if(!sheet)return;
  setState(prev=>warlockLongRest(prev,sheet.maximumHitPoints,input.species==='human'));
  setFeedback('Descanso largo: ranura y PG recuperados. Los efectos temporales de duración limitada deben revisarse.');
 }
 function restore(saved:ReturnType<typeof makeWarlockCharacterSnapshot>){
  setInput(saved.input);setState(saved.warlockState);setEditing(false);setTab('principal');setFeedback('');setProfileRevision(n=>n+1);
 }
 const tomeCantrips=hasTome&&state.tomePresent?(input.tomeCantripIds??[]).map(id=>warlockSpellRule(id)).filter(x=>x!==undefined):[];
 const tomeRituals=hasTome&&state.tomePresent?(input.tomeRitualIds??[]).map(id=>warlockSpellRule(id)).filter(x=>x!==undefined):[];
 const tomeActive=hasTome&&state.tomePresent;
 const spellRules=[...new Map([...SHARED_SPELL_RULES,...tomeCantrips,...tomeRituals].map(spell=>[spell.id,spell])).values()];
 const activeSpellIds=[...new Set([...input.cantripIds,...input.preparedIds,...(tomeActive?input.tomeCantripIds??[]:[]),...(tomeActive?input.tomeRitualIds??[]:[])])];
 const inventory=sheet?.inventory;
 const eligiblePactWeapons=inventory?.items.filter(item=>Object.hasOwn(WEAPONS,item.id)&&WEAPON_STATS[item.id as WeaponId].kind==='melee')??[];

 return <main className="app-shell wizard-page">
  <header className="topbar"><div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Brujo · D&D 2024</span></div></div><Link href="/" className="wizard-class-link">Menú de personajes</Link></header>
  <div className="content">
   <p className="sheet-release-note">CLASE · BRUJO NIVEL 1 · PHB 2024</p>
   <CharacterHeader name={input.name} portraitDataUrl={input.profile?.portraitDataUrl} level={1} background={background.name} species={SPECIES_NAMES[input.species]} className="Brujo" valid={Boolean(snapshot)} onEdit={()=>setEditing(true)}/>
   <p className="wizard-progression-hint">Patrón Infernal previsto para el nivel 3. Próximo paso: nivel 2 con Astucia mágica, nuevas invocaciones y sustitución guiada en la ventana de subida de nivel.</p>
   <SaveLoadPanel characterClass="warlock" snapshot={snapshot} validate={validateWarlockCharacterSnapshot} onLoad={restore} normalize={saved=>makeWarlockCharacterSnapshot(saved.input,saved.warlockState)}/>
   {editing&&<section className="wizard-editor panel" aria-label="Creación de Brujo">
    <div className="panel-heading"><div><span className="eyebrow">CREACIÓN · NIVEL 1</span><h2>Opciones de Brujo</h2><p>Selecciona origen, Carisma, invocación y dos conjuros preparados. No necesitas libro de conjuros.</p></div></div>
    <div className="wizard-editor-grid">
     <div>
      <label className="field"><span>Nombre</span><input maxLength={120} value={input.name} onChange={e=>patch({name:e.target.value})}/></label>
      <label className="field"><span>Trasfondo</span><select value={input.background} onChange={e=>swapBackground(e.target.value as BackgroundId)}>{picker(Object.keys(BACKGROUNDS) as BackgroundId[],id=>BACKGROUNDS[id].name)}</select></label>
      <label className="field"><span>Especie</span><select value={input.species} onChange={e=>swapSpecies(e.target.value as SpeciesId)}>{picker(Object.keys(SPECIES_NAMES) as SpeciesId[],id=>SPECIES_NAMES[id])}</select></label>
      {input.species==='elf'&&<label className="field"><span>Linaje élfico</span><select value={input.elfLineage} onChange={e=>patch({elfLineage:e.target.value as NonNullable<GuidedWarlockInput['elfLineage']>})}><option value="high_elf">Alto elfo</option><option value="wood_elf">Elfo silvano</option><option value="drow">Drow</option></select></label>}
      {input.species==='human'&&<>
       <label className="field"><span>Habilidad humana adicional</span><select value={input.humanSkill} onChange={e=>patch({humanSkill:e.target.value as Skill})}>{picker(SKILLS,s=>SKILL_NAMES[s])}</select></label>
       <label className="field"><span>Dote humana (catálogo inicial)</span><select value={input.humanFeat} onChange={e=>patch({humanFeat:e.target.value as 'alert'|'tough'})}>{background.feat!=='alert'&&<option value="alert">Alerta</option>}<option value="tough">Duro</option></select></label>
       <label className="field"><span>Tamaño</span><select value={input.humanSize??'medium'} onChange={e=>patch({humanSize:e.target.value as 'small'|'medium'})}><option value="medium">Mediano</option><option value="small">Pequeño</option></select></label>
      </>}
      <label className="field"><span>Equipo inicial del Brujo</span><select value={input.equipmentChoice} onChange={e=>patch({equipmentChoice:e.target.value as GuidedWarlockInput['equipmentChoice'],inventoryActions:[],pactWeaponId:undefined})}><option value="equipment">Equipo + 15 po</option><option value="gold">100 po</option></select></label>
      <p className="muted-note">{WARLOCK_EQUIPMENT_OPTIONS[input.equipmentChoice].description}</p>
      <label className="field"><span>Equipo de trasfondo</span><select value={input.backgroundEquipment?.startingPackage??'a'} onChange={e=>patch({backgroundEquipment:{startingPackage:e.target.value as 'a'|'b',...(input.background==='soldier'?{gamingSet:input.backgroundEquipment?.gamingSet??'dice_set'}:{})},inventoryActions:[]})}><option value="a">Equipo + monedas</option><option value="b">50 po</option></select></label>
      {input.background==='soldier'&&<label className="field"><span>Juego del soldado</span><select value={input.backgroundEquipment?.gamingSet??'dice_set'} onChange={e=>patch({backgroundEquipment:{startingPackage:input.backgroundEquipment?.startingPackage??'a',gamingSet:e.target.value as 'dice_set'|'dragonchess_set'|'playing_card_set'|'three_dragon_ante_set'},inventoryActions:[]})}><option value="dice_set">Dados</option><option value="dragonchess_set">Dragonchess</option><option value="playing_card_set">Naipes</option><option value="three_dragon_ante_set">Tres dragones</option></select></label>}
     </div>
     <div>
      <div className="section-label"><h3>Características</h3><span>Tres métodos</span></div>
      <AbilityScoreMethodPicker method={input.abilityGenerationMethod??'standard_array'} scores={input.assignedAbilities} onChange={updateAbilityScores}/>
      <label className="field"><span>Aumento del trasfondo</span><select value={input.increaseMode} onChange={e=>patch({increaseMode:e.target.value as GuidedWarlockInput['increaseMode']})}><option value="two_plus_one">+2 y +1</option><option value="three_ones">+1 a las tres</option></select></label>
      {input.increaseMode==='two_plus_one'&&<div className="wizard-score-grid"><label className="field"><span>+2</span><select value={input.plusTwoAbility} onChange={e=>patch({plusTwoAbility:e.target.value as Ability})}>{picker(background.abilities as readonly Ability[],a=>ABILITY_NAMES[a])}</select></label><label className="field"><span>+1</span><select value={input.plusOneAbility} onChange={e=>patch({plusOneAbility:e.target.value as Ability})}>{picker(background.abilities as readonly Ability[],a=>ABILITY_NAMES[a])}</select></label></div>}
      <div className="section-label"><h3>Competencias de Brujo</h3><span>Elige dos</span></div>
      {[0,1].map(index=><label className="field" key={index}><span>Habilidad {index+1}</span><select value={input.warlockSkills[index]} onChange={e=>patch({warlockSkills:input.warlockSkills.map((skill,i)=>i===index?e.target.value as typeof skill:skill)})}>{picker(WARLOCK_SKILL_OPTIONS.filter(s=>!(background.skills as readonly string[]).includes(s)),s=>SKILL_NAMES[s])}</select></label>)}
      <div className="section-label"><h3>Invocación sobrenatural</h3><span>1 al nivel 1</span></div>
      <label className="field"><span>Invocación conocida</span><select value={invocation} onChange={e=>swapInvocation(e.target.value as WarlockInvocationId)}>{picker(Object.keys(WARLOCK_INVOCATIONS) as WarlockInvocationId[],id=>WARLOCK_INVOCATIONS[id].name)}</select></label>
      <p className="muted-note">{WARLOCK_INVOCATIONS[invocation].summary}</p>
      {hasTome&&<><p className="muted-note">El libro permite elegir tres trucos y dos rituales. En esta fase se ofrecen opciones del catálogo compartido ya disponible; se ampliará a otras listas.</p>
       <h4>Trucos del Tomo ({input.tomeCantripIds?.length??0}/3)</h4><div className="wizard-spell-picker">{TOME_CANTRIP_OPTIONS.map(s=><label className="wizard-spell-option" key={s.id}><input type="checkbox" checked={input.tomeCantripIds?.includes(s.id)??false} onChange={()=>toggleTome('tomeCantripIds',s.id,3)}/>{s.name}</label>)}</div>
       <h4>Rituales del Tomo ({input.tomeRitualIds?.length??0}/2)</h4><div className="wizard-spell-picker">{TOME_RITUAL_OPTIONS.filter(s=>!input.preparedIds.includes(s.id)).map(s=><label className="wizard-spell-option" key={s.id}><input type="checkbox" checked={input.tomeRitualIds?.includes(s.id)??false} onChange={()=>toggleTome('tomeRitualIds',s.id,2)}/>{s.name}</label>)}</div>
      </>}
     </div>
    </div>
    <div className="divider"/>
    <div className="wizard-editor-grid">
     <div><h3>Trucos ({input.cantripIds.length}/2)</h3><div className="wizard-spell-picker">{WARLOCK_LEVEL_ONE_CANTRIPS.map(spell=><label className="wizard-spell-option" key={spell.id}><input type="checkbox" checked={input.cantripIds.includes(spell.id)} onChange={()=>toggleSpell('cantripIds',spell.id)}/>{spell.name}</label>)}</div></div>
     <div><h3>Conjuros preparados ({input.preparedIds.length}/2)</h3><div className="wizard-spell-picker">{WARLOCK_LEVEL_ONE_SPELLS.map(spell=><label className="wizard-spell-option" key={spell.id}><input type="checkbox" checked={input.preparedIds.includes(spell.id)} onChange={()=>toggleSpell('preparedIds',spell.id)}/>{spell.name}</label>)}</div></div>
    </div>
    <div className="overview-quick-actions"><button type="button" onClick={()=>setEditing(false)}>Cerrar editor</button></div>
    {calculated.error&&<p role="alert" className="error">{calculated.error}</p>}
    {sheet&&!snapshot&&<p className="warning">Introduce un nombre y comprueba tus PG para habilitar el guardado.</p>}
   </section>}
   <CharacterTabs activeTab={tab} onChange={setTab}/>
   <section id="sheet-panel-principal" role="tabpanel" aria-labelledby="sheet-tab-principal" hidden={tab!=='principal'} className="sheet-tab-panel">
    <div className="sheet-section-heading"><div><span className="eyebrow">PRINCIPAL</span><h2>Hoja del Brujo</h2><p>Valores pasivos automáticos, ataques y tiradas manuales.</p></div></div>
    {!sheet?<div className="panel overview-unavailable" role="alert"><h3>Revisa tu creación</h3><p>{calculated.error}</p><button type="button" onClick={()=>setEditing(true)}>Editar personaje</button></div>:<SharedPrincipalSheet
     abilityScores={sheet.abilityScores} abilityModifiers={sheet.abilityModifiers} proficiencyBonus={sheet.proficiencyBonus}
     skillBonuses={sheet.skillBonuses} savingThrowBonuses={sheet.savingThrowBonuses}
     trainedSkills={new Set(sheet.skillProficiencies)} trainedSaves={new Set<Ability>(['wisdom','charisma'])}
     initiative={sheet.initiative} armorClass={sheet.armorClass} armorDescription={sheet.armorDescription}
     hitDiceDescription="Dados de golpe: 1d8 · Brujo nivel 1" mode={mode} onModeChange={setMode}
     hpContent={<SharedHealthControls current={state.hitPointsCurrent} temporary={state.temporaryHitPoints} maximum={sheet.maximumHitPoints} onAdjust={adjustHp} onError={setFeedback}/>}
     attacksContent={<><WarlockWeaponAttacks inventory={sheet.inventory} scores={sheet.abilityScores} proficiency={sheet.proficiencyBonus} mode={mode} pactWeaponId={input.pactWeaponId} invocations={input.invocations}/><WarlockEldritchBlast known={input.cantripIds.includes('eldritch_blast')} level={1} spellAttackBonus={sheet.spellAttackBonus} mode={mode}/></>}
     resourcesContent={<section className="overview-panel panel"><div className="overview-panel-heading"><h3>Recursos</h3><span>Brujo nivel 1</span></div><div className="overview-record"><span>Invocación sobrenatural</span><strong>{WARLOCK_INVOCATIONS[invocation].name}</strong></div><p className="overview-panel-note">La decisión de activar un rasgo corresponde al jugador.</p></section>}
     spellSlotsContent={<section className="overview-panel panel"><div className="overview-panel-heading"><h3>Magia de Pacto</h3><span>Recuperación corta y larga</span></div><SpellSlotDiamonds level={1} spent={[state.pactSlotSpent]} onToggle={()=>patchState({pactSlotSpent:!state.pactSlotSpent})}/><p className="overview-panel-note">Una ranura de nivel 1. Gastarla no lanza un conjuro automáticamente.</p><div className="overview-quick-actions"><button type="button" onClick={shortRest}>Descanso corto</button><button type="button" onClick={longRest}>Descanso largo</button></div></section>}
     footerContent={<><section className="overview-panel panel"><h3>Percepción pasiva</h3><strong className="overview-spotlight">{10+sheet.skillBonuses.perception}</strong><p className="overview-panel-note">10 + Percepción {signed(sheet.skillBonuses.perception)}</p></section><section className="overview-panel panel"><h3>Movimiento y origen</h3><strong className="overview-spotlight">{sheet.speedFeet} <small>pies</small></strong><p className="overview-panel-note">Tamaño {sheet.size==='medium'?'mediano':'pequeño'} · Brujo nivel 1</p></section><SharedDeathSavePanel marks={state.manualDeathMarks} onToggle={toggleDeathMark}/><SharedInspirationPanel checked={state.heroicInspiration} onChange={checked=>patchState({heroicInspiration:checked})}/></>}
     warningContent={feedback?<p className="panel overview-panel-note" role="status">{feedback}</p>:undefined}
    />}
   </section>
   <section id="sheet-panel-rasgos" role="tabpanel" aria-labelledby="sheet-tab-rasgos" hidden={tab!=='rasgos'} className="sheet-tab-panel">
    <TraitsPanel collection={sheet?collectWarlockTraits(input,sheet):undefined} error={calculated.error} onEdit={()=>setEditing(true)}/>
    <div className="warlock-special-traits">
     <section className="panel wizard-module"><h3>Opciones específicas de Brujo · {WARLOCK_INVOCATIONS[invocation].name}</h3>
      {hasBlade&&<div className="wizard-module"><h4>Arma del Pacto de la Hoja</h4><p className="muted-note">Elige un arma cuerpo a cuerpo que poseas; solo recibe competencia y la opción de usar Carisma si está equipada desde Equipo.</p><label className="field"><span>Arma vinculada</span><select value={input.pactWeaponId??''} onChange={e=>patch({pactWeaponId:e.target.value?e.target.value as WeaponId:undefined})}><option value="">Sin arma vinculada</option>{eligiblePactWeapons.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>{input.pactWeaponId&&<p className="muted-note" role="status">{inventory?.equipped.weapons.includes(input.pactWeaponId)?'Pacto activo sobre el arma equipada.':'Vínculo seleccionado; equipa el arma en Equipo para aplicar sus beneficios.'}</p>}</div>}
      {invocation==='armor_of_shadows'&&<div><h4>Armadura de sombras</h4><p className="muted-note">Marca el efecto cuando lances Armadura de mago sobre ti. No se gasta ranura.</p><label className="field"><span>Conjuro activo</span><input type="checkbox" checked={state.mageArmorActive} onChange={e=>patchState({mageArmorActive:e.target.checked})}/></label>{inventory?.equipped.armor&&<p className="muted-note">La fórmula 13 + Destreza no se aplica mientras lleves armadura equipada.</p>}</div>}
      {invocation==='eldritch_mind'&&<p className="muted-note">Ventaja en las tiradas de salvación de Constitución para mantener concentración. Se elige y tira con ventaja cuando la situación lo requiera; no todas las salvaciones de Constitución la reciben.</p>}
      {hasTome&&<div><h4>Libro de las sombras</h4><label className="field"><span>Libro presente y llevado</span><input type="checkbox" checked={state.tomePresent} onChange={e=>patchState({tomePresent:e.target.checked})}/></label><p className="muted-note">Los conjuros del libro aparecen en Hechizos mientras lo lleves. Invoca un nuevo libro al acabar un descanso para cambiar las elecciones en el editor.</p></div>}
      {hasChain&&<button type="button" className="overview-link" onClick={()=>setTab('companions')}>Abrir familiar en Compañeros</button>}
     </section>
     <section className="panel wizard-module"><h3>Patrón Infernal · pendiente</h3><p>La subclase comienza en nivel 3; todavía no concede efectos.</p></section>
    </div>
   </section>
   <section id="sheet-panel-equipo" role="tabpanel" aria-labelledby="sheet-tab-equipo" hidden={tab!=='equipo'} className="sheet-tab-panel">
    <EquipmentPanel inventory={inventory??null} error={calculated.error} outOfSync={false} actionCount={input.inventoryActions?.length??0}
     onInventoryAction={inventoryAction} onUndo={()=>patch({inventoryActions:(input.inventoryActions??[]).slice(0,-1)})}
     onReset={()=>patch({inventoryActions:[]})} onEdit={()=>setEditing(true)} onOpenAttacks={()=>setTab('principal')}/>
   </section>
   <section id="sheet-panel-hechizos" role="tabpanel" aria-labelledby="sheet-tab-hechizos" hidden={tab!=='hechizos'} className="sheet-tab-panel">
    <SharedSpellsLayout spellClass="Brujo" description="La biblioteca reutiliza las mismas fichas y filtros que Mago y Guerrero.">
     <SpellLibraryPanel rules={spellRules} classLists={[...SHARED_CLASS_SPELL_LISTS,...(tomeActive?[{id:'tome',label:'Libro de las Sombras',spellIds:[...tomeCantrips,...tomeRituals].map(spell=>spell.id)}]:[])]}
      selection={{learnedIds:activeSpellIds,preparedIds:activeSpellIds}}
      limits={{cantrips:2+(tomeActive?3:0),learnedMinimum:2,prepared:2+(tomeActive?2:0)}}
      characterLevel={1} spellAttackBonus={sheet?.spellAttackBonus??2} spellSaveDC={sheet?.spellSaveDC??10} mode={mode}
      maxSlotLevel={1} editable={false} knownLabel="Conocidos" preparedLabel="Disponibles"
      note="Los trucos no consumen ranura. El Tomo añade tres trucos y dos rituales mientras se lleve, sin cambiar las dos preparaciones normales. Cambia los conjuros en el editor; los descansos y gastos se marcan manualmente."
      onLearned={()=>{}} onPrepared={()=>{}}/>
     <div className="divider"/><h3>Opciones específicas de Brujo · Magia de Pacto</h3>
     <SpellSlotDiamonds level={1} spent={[state.pactSlotSpent]} onToggle={()=>patchState({pactSlotSpent:!state.pactSlotSpent})}/>
     <p className="muted-note">Una ranura de nivel 1. Se recupera tras descansos cortos y largos; no se consume al consultar un conjuro.</p>
     <div className="overview-quick-actions"><button type="button" onClick={shortRest}>Confirmar descanso corto</button><button type="button" onClick={longRest}>Confirmar descanso largo</button></div>
     {tomeActive&&<p className="muted-note">Libro de las Sombras presente. Los rituales pueden lanzarse como rituales sin gastar una ranura; se resuelven durante la partida.</p>}
    </SharedSpellsLayout>
   </section>
   <section id="sheet-panel-personaje" role="tabpanel" aria-labelledby="sheet-tab-personaje" hidden={tab!=='personaje'} className="sheet-tab-panel">
    <CharacterProfilePanel key={profileRevision} profile={input.profile??EMPTY_CHARACTER_PROFILE} name={input.name} species={SPECIES_NAMES[input.species]} background={background.name} level={1} onChange={profile=>patch({profile})} onEditIdentity={()=>setEditing(true)}/>
   </section>
   <section id="sheet-panel-companions" role="tabpanel" aria-labelledby="sheet-tab-companions" hidden={tab!=='companions'} className="sheet-tab-panel">
    <SharedCompanionsPanel companions={input.companions??[]} onChange={companions=>patch({companions})}><WarlockCompanionsPanel hasChain={hasChain} state={state} onChange={patchState}/></SharedCompanionsPanel>
   </section>
   <section id="sheet-panel-combate" role="tabpanel" aria-labelledby="sheet-tab-combate" hidden={tab!=='combate'} className="sheet-tab-panel">
    <SheetPlaceholder eyebrow="COMBATE · DESARROLLO FUTURO" title="Coming Soon" description="Combate permanece manual. Puedes usar los dados de ataques, conjuros y Descarga sobrenatural desde Principal." actionLabel="Volver a Principal" onAction={()=>setTab('principal')}/>
   </section>
   <footer className="footer">Brujo 1 · D&D 2024 · Una invocación · Guardado en PostgreSQL por acción explícita.</footer>
  </div>
 </main>;
}
