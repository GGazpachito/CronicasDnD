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
import WarlockLevelUpWizard from '../../components/WarlockLevelUpWizard';
import LevelDownDialog from '../../components/LevelDownDialog';
import {WarlockWeaponAttacks,WarlockEldritchBlast} from '../../components/WarlockAttacks';
import SheetPlaceholder from '../../components/SheetPlaceholder';
import {type Ability} from '../../../../../packages/rules-engine/src/abilities';
import {SKILLS,type Skill} from '../../../../../packages/rules-engine/src/proficiencies';
import {BACKGROUNDS,SPECIES_NAMES,type BackgroundId,type SpeciesId} from '../../../../../packages/rules-engine/src/guided';
import {EMPTY_CHARACTER_PROFILE} from '../../../../../packages/rules-engine/src/character-profile';
import {WEAPONS,type WeaponId} from '../../../../../packages/rules-engine/src/martial';
import {WEAPON_STATS} from '../../../../../packages/rules-engine/src/attacks';
import {WARLOCK_EQUIPMENT_OPTIONS} from '../../../../../packages/rules-engine/src/warlock-inventory';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS,WARLOCK_SPELLS_THROUGH_LEVEL_TWO,WARLOCK_FIEND_LEVEL_THREE_IDS,TOME_CANTRIP_OPTIONS,TOME_RITUAL_OPTIONS,warlockSpellRule} from '../../../../../packages/rules-engine/src/warlock-spells';
import {type InventoryAction} from '../../../../../packages/rules-engine/src/inventory';
import {type D20Mode} from '../../../../../packages/rules-engine/src/d20';
import {previewWarlockLevelDown} from '../../../../../packages/rules-engine/src/warlock-level-up';
import {
 WARLOCK_INVOCATIONS,WARLOCK_LEVEL_ONE_INVOCATIONS,WARLOCK_SKILL_OPTIONS,
 calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,warlockShortRest,warlockLongRest,warlockMagicalCunning,warlockDarkOnesBlessing,warlockPactSlots,toggleWarlockPactSlot,
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
 const [levelUpOpen,setLevelUpOpen]=useState(false);
 const [levelDownOpen,setLevelDownOpen]=useState(false);
 const calculated=useMemo(()=>{
  try{return {sheet:calculateWarlockOne(warlockInputForPreview(input),state),error:''};}
  catch(e){return {sheet:null,error:e instanceof Error?e.message:'Elecciones no válidas'};}
 },[input,state]);
 const sheet=calculated.sheet;
 const snapshot=useMemo(()=>{
  if(!sheet)return null;
  try{return makeWarlockCharacterSnapshot(input,state);}catch{return null;}
 },[input,state,sheet]);
 const levelDownAssessment=useMemo(()=>{
  if(input.level===1||!snapshot)return {preview:null,error:'No hay una bajada de nivel válida'};
  try{return {preview:previewWarlockLevelDown(input,state),error:''};}
  catch(error){return {preview:null,error:error instanceof Error?error.message:'No se puede bajar de nivel'};}
 },[input,state,snapshot]);
 const background=BACKGROUNDS[input.background];
 const invocation=input.invocations[0];
 const hasBlade=input.invocations.includes('pact_of_blade');
 const hasChain=input.invocations.includes('pact_of_chain');
 const hasTome=input.invocations.includes('pact_of_tome');
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
  if(input.level!==1)return;
  setInput(prev=>{
   const {pactWeaponId,tomeCantripIds,tomeRitualIds,...rest}=prev;
   void pactWeaponId;void tomeCantripIds;void tomeRitualIds;
   return {...rest,invocations:[id],...(id==='pact_of_tome'?{tomeCantripIds:['acid_splash','fire_bolt','light'],tomeRitualIds:['alarm','identify']}:{}),
    ...(id==='pact_of_blade'&&prev.pactWeaponId?{pactWeaponId:prev.pactWeaponId}:{})};
  });
  patchState({mageArmorActive:false,tomePresent:false,familiarForm:null,familiarName:''});
 }
 function toggleSpell(field:'cantripIds'|'preparedIds',id:string){
  if(input.level!==1)return;
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
 function shortRest(){setState(warlockShortRest);setFeedback('Descanso corto: las ranuras de Magia de Pacto se recuperan. Astucia mágica no se recarga hasta el descanso largo. Los PG no cambian automáticamente.');}
 function longRest(){
  if(!sheet)return;
  setState(prev=>warlockLongRest(prev,sheet.maximumHitPoints,input.species==='human'));
  setFeedback('Descanso largo: ranuras, Astucia mágica y PG recuperados. Revisa los efectos temporales.');
 }
 function useMagicalCunning(){
  try{setState(warlockMagicalCunning(state,input.level));setFeedback('Astucia mágica: tras un rito de un minuto recuperas una ranura de pacto gastada. Uso consumido hasta el próximo descanso largo.');}
  catch(reason){setFeedback(reason instanceof Error?reason.message:'Astucia mágica no disponible');}
 }
 function togglePactSlot(index:number){setState(previous=>toggleWarlockPactSlot(previous,input.level,index));}
 function applyDarkOnesBlessing(){
  if(!sheet||input.level<3||input.subclassId!=='fiend')return;
  const amount=Math.max(1,sheet.abilityModifiers.charisma+input.level);
  setState(previous=>warlockDarkOnesBlessing(input,previous));
  setFeedback(`Bendición del Oscuro: al confirmar que se ha cumplido su condición, dispones de hasta ${amount} PG temporales. No se acumulan.`);
 }
 function restore(saved:ReturnType<typeof makeWarlockCharacterSnapshot>){
  setInput(saved.input);setState(saved.warlockState);setEditing(false);setLevelUpOpen(false);setLevelDownOpen(false);setTab('principal');setFeedback('');setProfileRevision(n=>n+1);
 }
 const tomeCantrips=hasTome&&state.tomePresent?(input.tomeCantripIds??[]).map(id=>warlockSpellRule(id)).filter(x=>x!==undefined):[];
 const tomeRituals=hasTome&&state.tomePresent?(input.tomeRitualIds??[]).map(id=>warlockSpellRule(id)).filter(x=>x!==undefined):[];
 const tomeActive=hasTome&&state.tomePresent;
 const spellRules=[...new Map([...SHARED_SPELL_RULES,...tomeCantrips,...tomeRituals].map(spell=>[spell.id,spell])).values()];
 const fiendSpellIds=input.level>=3&&input.subclassId==='fiend'?WARLOCK_FIEND_LEVEL_THREE_IDS:[];
 const activeSpellIds=[...new Set([...input.cantripIds,...input.preparedIds,...fiendSpellIds,...(tomeActive?input.tomeCantripIds??[]:[]),...(tomeActive?input.tomeRitualIds??[]:[])])];
 const availablePreparedIds=[...new Set([...input.preparedIds,...fiendSpellIds,...(tomeActive?input.tomeRitualIds??[]:[])])];
 const darkOnesBlessingAmount=sheet&&input.level>=3?Math.max(1,sheet.abilityModifiers.charisma+input.level):0;
 const pactSlotLevel=input.level>=3?2:1;
 const inventory=sheet?.inventory;
 const eligiblePactWeapons=inventory?.items.filter(item=>Object.hasOwn(WEAPONS,item.id)&&WEAPON_STATS[item.id as WeaponId].kind==='melee')??[];
 const pactSlots=warlockPactSlots(state,input.level);
 const pactActions=<div className="overview-quick-actions"><button type="button" onClick={shortRest}>Descanso corto</button><button type="button" onClick={longRest}>Descanso largo</button>{input.level>=2&&<button type="button" disabled={Boolean(state.magicalCunningUsed)||pactSlots.every(spent=>!spent)} onClick={useMagicalCunning}>Astucia mágica · {state.magicalCunningUsed?'usada':'1 uso'}</button>}</div>;

 return <main className="app-shell wizard-page">
  <header className="topbar"><div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Brujo · D&D 2024</span></div></div><Link href="/" className="wizard-class-link">Menú de personajes</Link></header>
  <div className="content">
   <p className="sheet-release-note">CLASE · BRUJO NIVEL {input.level} · PHB 2024</p>
   <CharacterHeader name={input.name} portraitDataUrl={input.profile?.portraitDataUrl} level={input.level} background={background.name} species={SPECIES_NAMES[input.species]} className="Brujo" valid={Boolean(snapshot)} onEdit={()=>setEditing(true)}
    onLevelUp={input.level<4&&snapshot?()=>{setLevelUpOpen(true);setEditing(false);}:undefined}
    onLevelDown={input.level>=2&&levelDownAssessment.preview?()=>setLevelDownOpen(true):undefined}/>
   <p className="wizard-progression-hint">{input.level===1?'Siguiente desbloqueo: Astucia mágica, nuevas invocaciones y segunda ranura de Magia de Pacto.':input.level===2?'Siguiente desbloqueo: Patrón Infernal, Bendición del Oscuro, cuatro conjuros del patrón y ranuras de nivel 2.':input.level===3?'Siguiente desbloqueo: mejora de característica, tercer truco y quinto conjuro preparado.':'Brujo nivel 4 completado. Nivel 5: nuevos conjuros de nivel 3, invocaciones y competencia +3 (pendiente). '}</p>
   {levelUpOpen&&<WarlockLevelUpWizard input={input} state={state} mode={mode} onAdvance={(nextInput,nextState)=>{setInput(nextInput);setState(nextState);setLevelUpOpen(false);setEditing(false);setFeedback(`¡Brujo nivel ${nextInput.level}! Recursos y conjuros actualizados. Guarda los cambios para conservar el progreso.`);}} onCancel={()=>setLevelUpOpen(false)}/>}
   {levelDownOpen&&<LevelDownDialog preview={levelDownAssessment.preview} error={levelDownAssessment.error} onClose={()=>setLevelDownOpen(false)} onConfirm={()=>{
    if(!levelDownAssessment.preview)throw new RangeError('La bajada de Brujo no es válida');
    setInput(levelDownAssessment.preview.snapshot.input);setState(levelDownAssessment.preview.snapshot.warlockState);
    setLevelDownOpen(false);setEditing(false);setTab('principal');setFeedback(`Brujo nivel ${levelDownAssessment.preview.snapshot.input.level}. Se han actualizado invocaciones, conjuros, PG y ranuras. Guarda los cambios.`);
   }}/>}
   <SaveLoadPanel characterClass="warlock" snapshot={snapshot} validate={validateWarlockCharacterSnapshot} onLoad={restore} normalize={saved=>makeWarlockCharacterSnapshot(saved.input,saved.warlockState)}/>
   {editing&&<section className="wizard-editor panel" aria-label="Creación de Brujo">
    <div className="panel-heading"><div><span className="eyebrow">PERSONAJE · NIVEL {input.level}</span><h2>Opciones de Brujo</h2><p>{input.level===1?'Selecciona origen, Carisma, invocación y dos conjuros preparados. No necesitas libro de conjuros.':'Identidad, origen, equipo y ajustes del personaje. Las invocaciones y los conjuros se escogieron en la subida de nivel.'}</p></div></div>
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
      <div className="section-label"><h3>Invocaciones sobrenaturales</h3><span>{input.invocations.length} de {input.level===1?1:3}</span></div>
      {input.level===1?<label className="field"><span>Invocación conocida</span><select value={invocation} onChange={e=>swapInvocation(e.target.value as WarlockInvocationId)}>{picker(WARLOCK_LEVEL_ONE_INVOCATIONS,id=>WARLOCK_INVOCATIONS[id].name)}</select></label>:<p className="muted-note">{input.invocations.map(id=>WARLOCK_INVOCATIONS[id].name).join(' · ')}. Las sustituciones reglamentarias se realizan al subir de nivel.</p>}
      {input.level===1&&<p className="muted-note">{WARLOCK_INVOCATIONS[invocation].summary}</p>}
      {hasTome&&<><p className="muted-note">El libro permite elegir tres trucos y dos rituales. En esta fase se ofrecen opciones del catálogo compartido ya disponible; se ampliará a otras listas.</p>
       <h4>Trucos del Tomo ({input.tomeCantripIds?.length??0}/3)</h4><div className="wizard-spell-picker">{TOME_CANTRIP_OPTIONS.map(s=><label className="wizard-spell-option" key={s.id}><input type="checkbox" checked={input.tomeCantripIds?.includes(s.id)??false} onChange={()=>toggleTome('tomeCantripIds',s.id,3)}/>{s.name}</label>)}</div>
       <h4>Rituales del Tomo ({input.tomeRitualIds?.length??0}/2)</h4><div className="wizard-spell-picker">{TOME_RITUAL_OPTIONS.filter(s=>!input.preparedIds.includes(s.id)).map(s=><label className="wizard-spell-option" key={s.id}><input type="checkbox" checked={input.tomeRitualIds?.includes(s.id)??false} onChange={()=>toggleTome('tomeRitualIds',s.id,2)}/>{s.name}</label>)}</div>
      </>}
     </div>
    </div>
    <div className="divider"/>
    <div className="wizard-editor-grid">
     <div><h3>Trucos ({input.cantripIds.length}/{input.level>=4?3:2})</h3><div className="wizard-spell-picker">{WARLOCK_LEVEL_ONE_CANTRIPS.map(spell=><label className="wizard-spell-option" key={spell.id}><input type="checkbox" disabled={input.level>=2} checked={input.cantripIds.includes(spell.id)} onChange={()=>toggleSpell('cantripIds',spell.id)}/>{spell.name}</label>)}</div></div>
     <div><h3>Conjuros preparados ({input.preparedIds.length}/{input.level===1?2:input.level===2?3:input.level===3?4:5})</h3><div className="wizard-spell-picker">{(input.level>=3?WARLOCK_SPELLS_THROUGH_LEVEL_TWO:WARLOCK_LEVEL_ONE_SPELLS).map(spell=><label className="wizard-spell-option" key={spell.id}><input type="checkbox" disabled={input.level>=2} checked={input.preparedIds.includes(spell.id)} onChange={()=>toggleSpell('preparedIds',spell.id)}/>{spell.name}</label>)}</div>{fiendSpellIds.length>0&&<p className="muted-note">+4 conjuros del Patrón Infernal siempre preparados sin consumir estas elecciones.</p>}</div>
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
     hitDiceDescription={`Dados de golpe: ${input.level}d8 · Brujo nivel ${input.level}`} mode={mode} onModeChange={setMode}
     hpContent={<SharedHealthControls current={state.hitPointsCurrent} temporary={state.temporaryHitPoints} maximum={sheet.maximumHitPoints} onAdjust={adjustHp} onError={setFeedback}/>}
     attacksContent={<><WarlockWeaponAttacks inventory={sheet.inventory} scores={sheet.abilityScores} proficiency={sheet.proficiencyBonus} mode={mode} pactWeaponId={input.pactWeaponId} invocations={input.invocations}/><WarlockEldritchBlast known={input.cantripIds.includes('eldritch_blast')} level={input.level} spellAttackBonus={sheet.spellAttackBonus} charismaModifier={sheet.abilityModifiers.charisma} invocations={input.invocations} mode={mode}/></>}
     resourcesContent={<section className="overview-panel panel"><div className="overview-panel-heading"><h3>Recursos</h3><span>Brujo nivel {input.level}</span></div>{input.invocations.map(id=><div key={id} className="overview-record"><span>Invocación sobrenatural</span><strong>{WARLOCK_INVOCATIONS[id].name}</strong></div>)}{input.level>=2&&<div className="overview-record"><span>Astucia mágica</span><strong>{state.magicalCunningUsed?'Usada · 0/1':'Disponible · 1/1'}</strong></div>}{input.level>=3&&<div className="overview-record"><span>Bendición del Oscuro · PG temporales</span><strong>{darkOnesBlessingAmount}</strong><button type="button" onClick={applyDarkOnesBlessing}>Aplicar al cumplirse la condición</button></div>}<p className="overview-panel-note">La decisión de activar un rasgo corresponde al jugador.</p></section>}
     spellSlotsContent={<section className="overview-panel panel"><div className="overview-panel-heading"><h3>Magia de Pacto</h3><span>Recuperación corta y larga</span></div><SpellSlotDiamonds level={pactSlotLevel} spent={pactSlots} onToggle={togglePactSlot}/><p className="overview-panel-note">{pactSlots.length} ranura{pactSlots.length===1?'':'s'} de nivel {pactSlotLevel}. Gastarlas no lanza automáticamente un conjuro.</p>{pactActions}</section>}
     footerContent={<><section className="overview-panel panel"><h3>Percepción pasiva</h3><strong className="overview-spotlight">{10+sheet.skillBonuses.perception}</strong><p className="overview-panel-note">10 + Percepción {signed(sheet.skillBonuses.perception)}</p></section><section className="overview-panel panel"><h3>Movimiento y origen</h3><strong className="overview-spotlight">{sheet.speedFeet} <small>pies</small></strong><p className="overview-panel-note">Tamaño {sheet.size==='medium'?'mediano':'pequeño'} · Brujo nivel {input.level}</p></section><SharedDeathSavePanel marks={state.manualDeathMarks} onToggle={toggleDeathMark}/><SharedInspirationPanel checked={state.heroicInspiration} onChange={checked=>patchState({heroicInspiration:checked})}/></>}
     warningContent={feedback?<p className="panel overview-panel-note" role="status">{feedback}</p>:undefined}
    />}
   </section>
   <section id="sheet-panel-rasgos" role="tabpanel" aria-labelledby="sheet-tab-rasgos" hidden={tab!=='rasgos'} className="sheet-tab-panel">
    <TraitsPanel collection={sheet?collectWarlockTraits(input,sheet):undefined} error={calculated.error} onEdit={()=>setEditing(true)}/>
    <div className="warlock-special-traits">
     <section className="panel wizard-module"><h3>Opciones específicas de Brujo</h3>
      {hasBlade&&<div className="wizard-module"><h4>Arma del Pacto de la Hoja</h4><p className="muted-note">Elige un arma cuerpo a cuerpo que poseas; solo recibe competencia y la opción de usar Carisma si está equipada desde Equipo.</p><label className="field"><span>Arma vinculada</span><select value={input.pactWeaponId??''} onChange={e=>patch({pactWeaponId:e.target.value?e.target.value as WeaponId:undefined})}><option value="">Sin arma vinculada</option>{eligiblePactWeapons.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>{input.pactWeaponId&&<p className="muted-note" role="status">{inventory?.equipped.weapons.includes(input.pactWeaponId)?'Pacto activo sobre el arma equipada.':'Vínculo seleccionado; equipa el arma en Equipo para aplicar sus beneficios.'}</p>}</div>}
      {input.invocations.includes('armor_of_shadows')&&<div><h4>Armadura de sombras</h4><p className="muted-note">Marca el efecto cuando lances Armadura de mago sobre ti. No se gasta ranura.</p><label className="field"><span>Conjuro activo</span><input type="checkbox" checked={state.mageArmorActive} onChange={e=>patchState({mageArmorActive:e.target.checked})}/></label>{inventory?.equipped.armor&&<p className="muted-note">La fórmula 13 + Destreza no se aplica mientras lleves armadura equipada.</p>}</div>}
      {input.invocations.includes('eldritch_mind')&&<p className="muted-note">Ventaja en las tiradas de salvación de Constitución para mantener concentración. Se elige y tira con ventaja cuando la situación lo requiera; no todas las salvaciones de Constitución la reciben.</p>}
      {hasTome&&<div><h4>Libro de las sombras</h4><label className="field"><span>Libro presente y llevado</span><input type="checkbox" checked={state.tomePresent} onChange={e=>patchState({tomePresent:e.target.checked})}/></label><p className="muted-note">Los conjuros del libro aparecen en Hechizos mientras lo lleves. Invoca un nuevo libro al acabar un descanso para cambiar las elecciones en el editor.</p></div>}
      {hasChain&&<button type="button" className="overview-link" onClick={()=>setTab('companions')}>Abrir familiar en Compañeros</button>}
      {input.invocations.includes('lessons_of_the_first_ones')&&<p className="muted-note">Lecciones de los Primeros: dote de origen {input.lessonsFeat==='alert'?'Alerta':'Duro'}. Sus efectos pasivos se incorporan a la hoja.</p>}
      {input.level>=2&&<div><h4>Astucia mágica</h4><p className="muted-note">Rito de un minuto: recuperas una ranura de Magia de Pacto gastada. Solo una vez por descanso largo. No se realiza ninguna acción de partida automáticamente.</p><button type="button" disabled={Boolean(state.magicalCunningUsed)||pactSlots.every(spent=>!spent)} onClick={useMagicalCunning}>Recuperar una ranura · {state.magicalCunningUsed?'uso agotado':'1 uso'}</button></div>}
     </section>
     {input.level>=3?<section className="panel wizard-module"><h3>Patrón Infernal · nivel 3</h3><h4>Bendición del Oscuro</h4><p>Si reduces a un enemigo a 0 PG, o una criatura lo hace a 10 pies de ti, ganas {darkOnesBlessingAmount} PG temporales. No se suman a los que ya tengas: conserva la cantidad mayor.</p><button type="button" onClick={applyDarkOnesBlessing}>Activar Bendición del Oscuro tras cumplirse la condición</button><h4>Conjuros del patrón</h4><p className="muted-note">Manos ardientes, Orden imperiosa, Rayo abrasador y Sugestión están siempre preparados, aparte de tus cuatro conjuros ordinarios. Los encuentras en Hechizos.</p></section>:<section className="panel wizard-module"><h3>Patrón Infernal · pendiente</h3><p>La subclase comienza en nivel 3; todavía no concede efectos.</p></section>}
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
      limits={{cantrips:(input.level>=4?3:2)+(tomeActive?3:0),learnedMinimum:2,prepared:availablePreparedIds.length}}
      characterLevel={input.level} spellAttackBonus={sheet?.spellAttackBonus??2} spellSaveDC={sheet?.spellSaveDC??10} mode={mode}
      maxSlotLevel={pactSlotLevel} editable={false} knownLabel="Conocidos" preparedLabel="Disponibles"
      note="Los trucos no consumen ranura. El Tomo añade tres trucos y dos rituales mientras se lleve. Desde nivel 3, los cuatro conjuros del Patrón Infernal están siempre preparados y no ocupan las cuatro elecciones ordinarias. Los descansos y gastos se marcan manualmente."
      onLearned={()=>{}} onPrepared={()=>{}}/>
     <div className="divider"/><h3>Opciones específicas de Brujo · Magia de Pacto</h3>
     <SpellSlotDiamonds level={pactSlotLevel} spent={pactSlots} onToggle={togglePactSlot}/>
     <p className="muted-note">{pactSlots.length} ranura{pactSlots.length===1?'':'s'} de nivel {pactSlotLevel}. Se recuperan tras descansos cortos y largos; no se consumen al consultar un conjuro.</p>
     {pactActions}
     {tomeActive&&<p className="muted-note">Libro de las Sombras presente. Los rituales pueden lanzarse como rituales sin gastar una ranura; se resuelven durante la partida.</p>}
    </SharedSpellsLayout>
   </section>
   <section id="sheet-panel-personaje" role="tabpanel" aria-labelledby="sheet-tab-personaje" hidden={tab!=='personaje'} className="sheet-tab-panel">
    <CharacterProfilePanel key={profileRevision} profile={input.profile??EMPTY_CHARACTER_PROFILE} name={input.name} species={SPECIES_NAMES[input.species]} background={background.name} characterClass="Brujo" level={input.level} onChange={profile=>patch({profile})} onEditIdentity={()=>setEditing(true)}/>
   </section>
   <section id="sheet-panel-companions" role="tabpanel" aria-labelledby="sheet-tab-companions" hidden={tab!=='companions'} className="sheet-tab-panel">
    <SharedCompanionsPanel companions={input.companions??[]} onChange={companions=>patch({companions})}><WarlockCompanionsPanel hasChain={hasChain} state={state} onChange={patchState}/></SharedCompanionsPanel>
   </section>
   <section id="sheet-panel-combate" role="tabpanel" aria-labelledby="sheet-tab-combate" hidden={tab!=='combate'} className="sheet-tab-panel">
    <SheetPlaceholder eyebrow="COMBATE · DESARROLLO FUTURO" title="Coming Soon" description="Combate permanece manual. Puedes usar los dados de ataques, conjuros y Descarga sobrenatural desde Principal." actionLabel="Volver a Principal" onAction={()=>setTab('principal')}/>
   </section>
   <footer className="footer">Brujo {input.level} · D&D 2024 · {input.invocations.length} invocaciones · Guardado en PostgreSQL por acción explícita.</footer>
  </div>
 </main>;
}
