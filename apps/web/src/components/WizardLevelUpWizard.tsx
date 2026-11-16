'use client';
import {useMemo,useRef,useState} from 'react';
import {calculateGuidedWizard,WIZARD_SCHOLAR_OPTIONS,WIZARD_SPELL_CATALOG,type GuidedWizardInput,type WizardLevelOneState,type WizardScholarSkill} from '../../../../packages/rules-engine/src/wizard-creation';
import {wizardCoreStatistics} from '../../../../packages/rules-engine/src/wizard';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview,type WizardLevelUpResult} from '../../../../packages/rules-engine/src/wizard-level-up';
import {wizardSpellRule} from '../../../../packages/rules-engine/src/wizard-spell-details';
import type {Skill} from '../../../../packages/rules-engine/src/proficiencies';
import type {D20Mode} from '../../../../packages/rules-engine/src/d20';
import LevelUpDialogFrame from './LevelUpDialogFrame';
import WizardSpellDetails from './WizardSpellDetails';
const SKILL_NAMES:Record<string,string>={arcana:'Arcanos',history:'Historia',investigation:'Investigación',medicine:'Medicina',nature:'Naturaleza',religion:'Religión'};
type Props=Readonly<{input:GuidedWizardInput;state:WizardLevelOneState;mode:D20Mode;onConfirm:(result:WizardLevelUpResult)=>void;onCancel:()=>void}>;
function toggle(ids:readonly string[],id:string,max:number){return ids.includes(id)?ids.filter(x=>x!==id):ids.length<max?[...ids,id]:[...ids];}
export default function WizardLevelUpWizard({input,state,mode,onConfirm,onCancel}:Props){
 const next=input.level+1;
 const [stage,setStage]=useState<0|1|2>(0);
 const current=useMemo(()=>calculateGuidedWizard(input),[input]);
 const availableSkills=useMemo(()=>WIZARD_SCHOLAR_OPTIONS.filter(skill=>current.skillProficiencies.includes(skill as Skill)),[current]);
 const [scholarSkill,setScholarSkill]=useState<WizardScholarSkill>(availableSkills[0]);
 const [newSpells,setNewSpells]=useState<string[]>([]);
 const [bonusSpells,setBonusSpells]=useState<string[]>([]);
 const [prepared,setPrepared]=useState<string[]>([...input.preparedIds]);
 const [manualError,setManualError]=useState('');
 const submitting=useRef(false);
 const spellLevel=next===2?1:2;
 const choices=useMemo(()=>{
  try{return {result:prepareWizardLevelUp(input,state,{newSpellIds:newSpells as unknown as [string,string],preparedIds:prepared,...(next===2?{scholarSkill}:{evokerBonusSpellIds:bonusSpells as [string,string]})}),error:''};}
  catch(e){return {result:null,error:e instanceof Error?e.message:'Elecciones incompletas'};}
 },[input,state,newSpells,prepared,next,scholarSkill,bonusSpells]);
 const plan=wizardLevelUpChoicesPreview(input);
 if(!plan)return null;
 const list=WIZARD_SPELL_CATALOG.filter(spell=>spell.level<=spellLevel&&!input.spellbookIds.includes(spell.id));
 const extra=WIZARD_SPELL_CATALOG.filter(spell=>spell.level<=2&&spell.school==='evocation'&&!input.spellbookIds.includes(spell.id)&&!newSpells.includes(spell.id));
 const availablePrepared=new Set([...input.spellbookIds,...newSpells,...bonusSpells]);
 const spellOptions=WIZARD_SPELL_CATALOG.filter(spell=>availablePrepared.has(spell.id));
 const nextCore=wizardCoreStatistics(next,current.abilityScores);
 const previousCore=wizardCoreStatistics(input.level,current.abilityScores);
 const hpBonus=(input.species==='dwarf'?1:0)+(input.humanFeat==='tough'?2:0);
 const estimatedHpGain=nextCore.maximumHitPoints-previousCore.maximumHitPoints+hpBonus;
 function displaySpellChoices(spells:readonly (typeof WIZARD_SPELL_CATALOG)[number][],selected:readonly string[],onToggle:(id:string)=>void,disabled?:readonly string[]){
  return <div className="wizard-spell-picker wizard-spell-choice-list">{spells.map(spell=>{
   const details=wizardSpellRule(spell.id);
   return <div className="wizard-spell-option" key={spell.id}><label><input type="checkbox" disabled={disabled?.includes(spell.id)} checked={selected.includes(spell.id)} onChange={()=>onToggle(spell.id)}/><span>{spell.name}</span><small>Nivel {spell.level}</small></label>
    {details&&<WizardSpellDetails spell={details} characterLevel={next} spellAttackBonus={current.spellAttackBonus} mode={mode}/>}
   </div>;
  })}</div>;
 }
 const footer=<>
  <button type="button" className="level-wizard-cancel" onClick={onCancel}>Cancelar</button>
  <div className="level-wizard-actions-right">
   {stage>0&&<button type="button" className="level-wizard-back" onClick={()=>{setStage(s=>(s-1) as 0|1|2);setManualError('');}}>Atrás</button>}
   {stage<2?<button type="button" onClick={()=>setStage(s=>(s+1) as 0|1|2)} disabled={stage===1&&!choices.result}>Siguiente</button>
   :<button type="button" disabled={!choices.result} onClick={()=>{if(submitting.current||!choices.result)return;submitting.current=true;try{onConfirm(choices.result);}catch(e){setManualError(e instanceof Error?e.message:'No se pudo confirmar');submitting.current=false;}}}>Confirmar subida a nivel {next}</button>}
  </div>
 </>;
 return <LevelUpDialogFrame eyebrow="PROGRESIÓN · MAGO / EVOCACIÓN" title={`Subir del nivel ${input.level} al ${next}`} subtitle="Tres pasos: novedades, elecciones y confirmación. Nada se modifica hasta confirmar." stage={stage} onClose={onCancel} footer={footer}>
  {stage===0&&<div className="level-wizard-section">
   <h3>Qué recibes al alcanzar el nivel {next}</h3>
   <ul className="level-wizard-milestones">{plan.features.map(feature=><li key={feature.id}><strong>{feature.title}</strong><p className="level-wizard-explanation">{feature.description}</p></li>)}<li><strong>Libro de conjuros</strong><p className="level-wizard-explanation">Añades dos conjuros de Mago nuevos al libro{next===3?', y dos adicionales gratuitos de Evocación':''}. Lee sus reglas antes de elegirlos.</p></li><li><strong>PG y capacidad de lanzamiento</strong><p className="level-wizard-explanation">Tus PG máximos aumentan en {estimatedHpGain}. Conservas el daño recibido y las ranuras que habías gastado. Las ranuras nuevas empiezan disponibles.</p></li></ul>
   <div className="level-wizard-stats"><div className="level-wizard-stat"><span>PG máximos</span><strong>{current.maximumHitPoints} → {current.maximumHitPoints+estimatedHpGain}</strong></div><div className="level-wizard-stat"><span>Competencia</span><strong>+{previousCore.proficiencyBonus} → +{nextCore.proficiencyBonus}</strong></div><div className="level-wizard-stat"><span>Preparados recomendados</span><strong>{input.preparedIds.length} → {plan.progression.preparedSpellCount}</strong></div><div className="level-wizard-stat"><span>Ranuras nivel 1</span><strong>{state.magic.slots.maximum[0]} → {plan.progression.spellSlots[0]}</strong></div><div className="level-wizard-stat"><span>Ranuras nivel 2</span><strong>{state.magic.slots.maximum[1]} → {plan.progression.spellSlots[1]}</strong></div><div className="level-wizard-stat"><span>Competencias nuevas</span><strong>{next===2?'Pericia Erudito':'Ninguna'}</strong></div></div>
   <p className="level-wizard-note">Las explicaciones de los conjuros incluyen sus efectos y tiradas disponibles. El gasto de espacios y la resolución de salvaciones son decisiones del jugador.</p>
  </div>}
  {stage===1&&<div className="level-wizard-section">
   <h3>Decisiones de este nivel</h3>
   {next===2&&<fieldset className="level-wizard-fieldset"><legend>Erudito: una pericia académica</legend><label className="field"><span>Habilidad en la que ya tienes competencia</span><select value={scholarSkill} onChange={e=>setScholarSkill(e.target.value as WizardScholarSkill)}>{availableSkills.map(skill=><option value={skill} key={skill}>{SKILL_NAMES[skill]}</option>)}</select></label><p className="level-wizard-explanation">La pericia duplica tu bonificador de competencia para la habilidad elegida. No concede una habilidad distinta.</p></fieldset>}
   <fieldset className="level-wizard-fieldset"><legend>Dos conjuros nuevos ({newSpells.length}/2)</legend><p className="muted-note">Añádelos al libro. Podrás leer su descripción pulsando «Ver reglas y tiradas».</p>{displaySpellChoices(list,newSpells,id=>{setNewSpells(v=>toggle(v,id,2));setBonusSpells(v=>v.filter(x=>x!==id));})}</fieldset>
   {next===3&&<fieldset className="level-wizard-fieldset"><legend>Evocación: dos conjuros gratuitos ({bonusSpells.length}/2)</legend><p className="muted-note">Escoge dos evocaciones distintas que no estén ya en tu libro.</p>{displaySpellChoices(extra,bonusSpells,id=>setBonusSpells(v=>toggle(v,id,2)))}</fieldset>}
   <fieldset className="level-wizard-fieldset"><legend>Preparación de progresión ({prepared.length}/{plan.progression.preparedSpellCount})</legend><p className="muted-note">Esta elección cubre los conjuros preparados por progresión de clase. En la pestaña Hechizos podrás marcar cantidades adicionales sin límite numérico.</p>{displaySpellChoices(spellOptions,prepared,id=>setPrepared(v=>toggle(v,id,plan.progression.preparedSpellCount)),input.preparedIds)}</fieldset>
   {choices.result?<p className="level-wizard-ok">Todas las elecciones de progresión son válidas. Puedes revisar los cambios.</p>:<p className="level-wizard-error" role="status">Pendiente: {choices.error}</p>}
  </div>}
  {stage===2&&<div className="level-wizard-section">
   <h3>Revisión final del personaje</h3>
   {choices.result?<>
    <div className="level-wizard-stats">{[
     {name:'Nivel',old:input.level,value:choices.result.input.level},
     {name:'PG máximos',old:current.maximumHitPoints,value:current.maximumHitPoints+choices.result.hitPointsIncrease},
     {name:'Competencia',old:previousCore.proficiencyBonus,value:nextCore.proficiencyBonus},
     {name:'Ataque mágico',old:current.spellAttackBonus,value:current.spellAttackBonus},
     {name:'Conjuros en libro',old:input.spellbookIds.length+(input.evokerBonusSpellIds?.length??0),value:choices.result.input.spellbookIds.length+(choices.result.input.evokerBonusSpellIds?.length??0)},
     {name:'Preparados',old:input.preparedIds.length,value:choices.result.input.preparedIds.length},
    ].map(s=><div key={s.name} className="level-wizard-stat"><span>{s.name}</span><strong>{s.old} → {s.value}</strong></div>)}</div>
    <div><h4>Capacidades obtenidas</h4><ul className="level-wizard-small-list">{choices.result.gainedFeatures.map(feature=><li key={feature.title}><strong>{feature.title}</strong><p className="level-wizard-explanation">{feature.description}</p></li>)}</ul></div>
    {next===2&&<p className="level-wizard-choice-info"><strong>Pericia obtenida</strong>{SKILL_NAMES[scholarSkill]}: se duplica la competencia.</p>}
    <div><h4>Nuevos conjuros y explicación</h4>{[...newSpells,...bonusSpells].map(id=>{const spell=wizardSpellRule(id);return spell&&<div key={id} className="level-wizard-choice-info"><strong>{spell.name} · Nivel {spell.level}</strong><p>{spell.description}</p></div>;})}</div>
    <p className="muted-note">Se preservan PG actuales, daño, equipo, retrato, inspiración, ranuras usadas y elecciones manuales. Después debes pulsar Guardar cambios para actualizar PostgreSQL.</p>
   </>:<p className="level-wizard-error" role="alert">{choices.error}</p>}
   {manualError&&<p className="level-wizard-error" role="alert">{manualError}</p>}
  </div>}
 </LevelUpDialogFrame>;
}
