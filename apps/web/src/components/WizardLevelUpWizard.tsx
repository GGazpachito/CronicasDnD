'use client';
import {useMemo,useState} from 'react';
import {calculateGuidedWizard,WIZARD_SCHOLAR_OPTIONS,WIZARD_SPELL_CATALOG,type GuidedWizardInput,type WizardLevelOneState,type WizardScholarSkill} from '../../../../packages/rules-engine/src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview,type WizardLevelUpResult} from '../../../../packages/rules-engine/src/wizard-level-up';
import type {Skill} from '../../../../packages/rules-engine/src/proficiencies';
const SKILL_NAMES:Record<string,string>={arcana:'Arcanos',history:'Historia',investigation:'Investigación',medicine:'Medicina',nature:'Naturaleza',religion:'Religión'};
type Props=Readonly<{input:GuidedWizardInput;state:WizardLevelOneState;onConfirm:(result:WizardLevelUpResult)=>void;onCancel:()=>void}>;
function toggle(ids:readonly string[],id:string,max:number){return ids.includes(id)?ids.filter(x=>x!==id):ids.length<max?[...ids,id]:[...ids];}
/** Las elecciones son locales hasta pulsar Confirmar. */
export default function WizardLevelUpWizard({input,state,onConfirm,onCancel}:Props){
 const next=input.level+1;
 const availableSkills=useMemo(()=>{
  const sheet=calculateGuidedWizard(input);
  return WIZARD_SCHOLAR_OPTIONS.filter(skill=>sheet.skillProficiencies.includes(skill as Skill));
 },[input]);
 const [scholarSkill,setScholarSkill]=useState<WizardScholarSkill>(availableSkills[0]);
 const [newSpells,setNewSpells]=useState<string[]>([]);
 const [bonusSpells,setBonusSpells]=useState<string[]>([]);
 const [prepared,setPrepared]=useState<string[]>([...input.preparedIds]);
 const [manualError,setManualError]=useState('');
 const spellLevel=next===2?1:2;
 const choices=useMemo(()=>{
  try{
   return {result:prepareWizardLevelUp(input,state,{
    newSpellIds:newSpells as unknown as [string,string],preparedIds:prepared,
    ...(next===2?{scholarSkill}:{evokerBonusSpellIds:bonusSpells as [string,string]})
   }),error:''};
  }catch(error){return {result:null,error:error instanceof Error?error.message:'Elecciones incompletas'};}
 },[input,state,newSpells,prepared,next,scholarSkill,bonusSpells]);
 const plan=wizardLevelUpChoicesPreview(input);
 const list=WIZARD_SPELL_CATALOG.filter(spell=>spell.level<=spellLevel&&!input.spellbookIds.includes(spell.id));
 const extra=WIZARD_SPELL_CATALOG.filter(spell=>spell.level<=2&&spell.school==='evocation'&&!input.spellbookIds.includes(spell.id)&&!newSpells.includes(spell.id));
 const availablePrepared=new Set([...input.spellbookIds,...newSpells,...bonusSpells]);
 const spellOptions=WIZARD_SPELL_CATALOG.filter(spell=>availablePrepared.has(spell.id));
 if(!plan)return null;
 return <section className="panel wizard-level-up" role="region" aria-label={`Subir Mago a nivel ${next}`}>
  <div className="panel-heading"><div><span className="eyebrow">ASISTENTE DE PROGRESIÓN · MAGO</span><h2>Nivel {input.level} → {next}</h2><p>Los cambios no se aplicarán hasta confirmar. No se realiza un descanso automático.</p></div></div>
  <div className="wizard-upgrade-summary"><strong>Novedades de nivel {next}</strong>
   {plan.features.map(feature=><div key={feature.id}><strong>{feature.title}</strong><p>{feature.description}</p></div>)}
   <p>Ranuras nuevas: {plan.progression.spellSlots[0]} de nivel 1{next===3?' y 2 de nivel 2':''}. Conjuros preparados: {plan.progression.preparedSpellCount}.</p>
  </div>
  {next===2&&<label className="field wizard-level-up-skill"><span>Erudito: elige una habilidad con competencia para obtener pericia (doble bonificador)</span><select value={scholarSkill} onChange={event=>setScholarSkill(event.target.value as WizardScholarSkill)}>{availableSkills.map(skill=><option value={skill} key={skill}>{SKILL_NAMES[skill]}</option>)}</select></label>}
  <div className="wizard-level-up-grid">
   <div><h3>Dos conjuros nuevos ({newSpells.length}/2)</h3><p className="muted-note">Se añaden a tu libro. En nivel {next} puedes aprender conjuros de hasta nivel {spellLevel}.</p>
    <div className="wizard-spell-picker">{list.map(spell=><label key={spell.id} className="wizard-spell-option"><input type="checkbox" checked={newSpells.includes(spell.id)} onChange={()=>{setNewSpells(value=>toggle(value,spell.id,2));setBonusSpells(value=>value.filter(id=>id!==spell.id));}}/>{spell.name} <small>Nivel {spell.level}</small></label>)}</div>
   </div>
   {next===3&&<div><h3>Evocación: dos conjuros gratuitos ({bonusSpells.length}/2)</h3><p className="muted-note">Experto en Evocación: elige dos conjuros adicionales de la escuela de Evocación de niveles 1 o 2.</p>
    <div className="wizard-spell-picker">{extra.map(spell=><label key={spell.id} className="wizard-spell-option"><input type="checkbox" checked={bonusSpells.includes(spell.id)} onChange={()=>setBonusSpells(value=>toggle(value,spell.id,2))}/>{spell.name} <small>Nivel {spell.level}</small></label>)}</div>
   </div>}
  </div>
  <div><h3>Conjuros preparados ({prepared.length}/{plan.progression.preparedSpellCount})</h3><p className="muted-note">Mantienes los anteriores y eliges los adicionales. Para sustituir uno existente, necesitarás un descanso largo (función pendiente).</p>
   <div className="wizard-spell-picker wizard-level-up-prepared">{spellOptions.map(spell=><label key={spell.id} className="wizard-spell-option"><input type="checkbox" disabled={input.preparedIds.includes(spell.id)} checked={prepared.includes(spell.id)} onChange={()=>setPrepared(value=>toggle(value,spell.id,plan.progression.preparedSpellCount))}/>{spell.name} <small>Nivel {spell.level}</small></label>)}</div>
  </div>
  {choices.result?<div className="wizard-upgrade-preview"><strong>Vista previa de confirmación</strong><p>PG máximos +{choices.result.hitPointsIncrease}. Recursos y ranuras gastadas se conservan. El nuevo libro tendrá {choices.result.input.spellbookIds.length+(choices.result.input.evokerBonusSpellIds?.length??0)} conjuros.</p><p>Nuevos rasgos: {choices.result.gainedFeatures.map(f=>f.title).join(', ')}.</p></div>:<p className="warning" role="status">Pendiente: {choices.error}</p>}
  {manualError&&<p className="error" role="alert">{manualError}</p>}
  <div className="wizard-delta"><button type="button" onClick={onCancel}>Cancelar</button><button type="button" disabled={!choices.result} onClick={()=>{if(choices.result){try{onConfirm(choices.result);}catch(error){setManualError(error instanceof Error?error.message:'No se pudo confirmar');}}}}>Confirmar subida a nivel {next}</button></div>
 </section>;
}
