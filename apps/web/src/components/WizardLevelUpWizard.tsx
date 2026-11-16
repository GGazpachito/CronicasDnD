'use client';
import {useMemo,useRef,useState} from 'react';
import {ABILITIES,type Ability} from '../../../../packages/rules-engine/src/abilities';
import {calculateGuidedWizard,WIZARD_SCHOLAR_OPTIONS,WIZARD_SPELL_CATALOG,WIZARD_LEVEL_ONE_CANTRIPS,
 type GuidedWizardInput,type WizardLevelOneState,type WizardScholarSkill,type WizardLevel4Improvement} from '../../../../packages/rules-engine/src/wizard-creation';
import {wizardCoreStatistics} from '../../../../packages/rules-engine/src/wizard';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview,type WizardLevelUpResult} from '../../../../packages/rules-engine/src/wizard-level-up';
import {wizardSpellRule} from '../../../../packages/rules-engine/src/wizard-spell-details';
import type {Skill} from '../../../../packages/rules-engine/src/proficiencies';
import type {D20Mode} from '../../../../packages/rules-engine/src/d20';
import LevelUpDialogFrame from './LevelUpDialogFrame';
import WizardSpellDetails from './WizardSpellDetails';
const SKILL_NAMES:Record<string,string>={arcana:'Arcanos',history:'Historia',investigation:'Investigación',medicine:'Medicina',nature:'Naturaleza',religion:'Religión'};
const ABILITY_NAMES:Record<Ability,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
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
 const [bonusFive,setBonusFive]=useState('');
 const [bonusSeven,setBonusSeven]=useState('');
 const [bonusNine,setBonusNine]=useState('');
 const [newCantrip,setNewCantrip]=useState('');
 const [improvement,setImprovement]=useState<WizardLevel4Improvement>({mode:'plus_two',first:current.abilityScores.intelligence<=18?'intelligence':'constitution'});
 const [prepared,setPrepared]=useState<string[]>([...input.preparedIds]);
 const [spellFilter,setSpellFilter]=useState('');
 const [manualError,setManualError]=useState('');
 const submitting=useRef(false);
 const plan=wizardLevelUpChoicesPreview(input);
 const spellLevel=next>=9?5:next>=7?4:next>=5?3:next>=3?2:1;
 const choices=useMemo(()=>{
  try{return {result:prepareWizardLevelUp(input,state,{newSpellIds:newSpells as unknown as [string,string],preparedIds:prepared,
   ...(next===2?{scholarSkill}:{}),...(next===3?{evokerBonusSpellIds:bonusSpells as [string,string]}:{}),
   ...(next===4?{newCantripId:newCantrip,level4Improvement:improvement}:{}),
    ...(next===8?{level8Improvement:improvement}:{}),
   ...(next===5?{evokerLevelThreeSpellId:bonusFive}:{}),...(next===7?{evokerLevelFourSpellId:bonusSeven}:{}),...(next===9?{evokerLevelFiveSpellId:bonusNine}:{})}),error:''};}
  catch(e){return {result:null,error:e instanceof Error?e.message:'Elecciones incompletas'};}
 },[input,state,newSpells,prepared,next,scholarSkill,bonusSpells,newCantrip,improvement,bonusFive,bonusSeven,bonusNine]);
 if(!plan)return null;
 const alreadyKnown=new Set([...input.spellbookIds,...input.evokerBonusSpellIds??[],...(input.evokerLevelThreeSpellId?[input.evokerLevelThreeSpellId]:[]),...(input.evokerLevelFourSpellId?[input.evokerLevelFourSpellId]:[]),...(input.evokerLevelFiveSpellId?[input.evokerLevelFiveSpellId]:[])]);
 const search=spellFilter.trim().toLocaleLowerCase('es');
 const matches=(spell:(typeof WIZARD_SPELL_CATALOG)[number])=>!search||`${spell.name} ${spell.school}`.toLocaleLowerCase('es').includes(search);
 const list=WIZARD_SPELL_CATALOG.filter(spell=>spell.level<=spellLevel&&!alreadyKnown.has(spell.id)&&matches(spell));
 const bonusThree=WIZARD_SPELL_CATALOG.filter(spell=>spell.level<=2&&spell.school==='evocation'&&!alreadyKnown.has(spell.id)&&!newSpells.includes(spell.id)&&matches(spell));
 const bonusFiveOptions=WIZARD_SPELL_CATALOG.filter(spell=>spell.level<=3&&spell.school==='evocation'&&!alreadyKnown.has(spell.id)&&!newSpells.includes(spell.id)&&matches(spell));
 const bonusSevenOptions=WIZARD_SPELL_CATALOG.filter(spell=>spell.level<=4&&spell.school==='evocation'&&!alreadyKnown.has(spell.id)&&!newSpells.includes(spell.id)&&matches(spell));
 const bonusNineOptions=WIZARD_SPELL_CATALOG.filter(spell=>spell.level<=5&&spell.school==='evocation'&&!alreadyKnown.has(spell.id)&&!newSpells.includes(spell.id)&&matches(spell));
 const availablePrepared=new Set([...alreadyKnown,...newSpells,...bonusSpells,...(bonusFive?[bonusFive]:[]),...(bonusSeven?[bonusSeven]:[]),...(bonusNine?[bonusNine]:[])]);
 const spellOptions=WIZARD_SPELL_CATALOG.filter(spell=>availablePrepared.has(spell.id)&&matches(spell));
 const nextCore=wizardCoreStatistics(next,current.abilityScores);
 const previousCore=wizardCoreStatistics(input.level,current.abilityScores);
 const hpBonus=(input.species==='dwarf'?1:0)+(input.humanFeat==='tough'?2:0);
 const estimatedHpGain=nextCore.maximumHitPoints-previousCore.maximumHitPoints+hpBonus;
 const projected=choices.result?calculateGuidedWizard(choices.result.input):null;
 function setMode(mode:'plus_two'|'two_ones'){
  setImprovement(mode==='plus_two'?{mode,first:improvement.first}:{mode,first:improvement.first,second:improvement.first==='constitution'?'dexterity':'constitution'});
 }
 function firstAbility(first:Ability){
  setImprovement(prev=>prev.mode==='plus_two'?{mode:'plus_two',first}:{mode:'two_ones',first,second:prev.second===first?(first==='constitution'?'dexterity':'constitution'):prev.second});
 }
 function displaySpellChoices(spells:readonly (typeof WIZARD_SPELL_CATALOG)[number][],selected:readonly string[],onToggle:(id:string)=>void,disabled?:readonly string[]){
  return <div className="wizard-spell-picker wizard-spell-choice-list">{spells.map(spell=>{
   const details=wizardSpellRule(spell.id);
   return <div className="wizard-spell-option" key={spell.id}><label><input type="checkbox" disabled={disabled?.includes(spell.id)} checked={selected.includes(spell.id)} onChange={()=>onToggle(spell.id)}/><span>{spell.name}</span><small>Nivel {spell.level}</small></label>
    {details&&<WizardSpellDetails spell={details} characterLevel={next} spellAttackBonus={projected?.spellAttackBonus??current.spellAttackBonus} mode={mode}/>}</div>;
  })}{spells.length===0&&<p className="muted-note">No hay conjuros con este filtro.</p>}</div>;
 }
 const footer=<>
  <button type="button" className="level-wizard-cancel" onClick={onCancel}>Cancelar</button>
  <div className="level-wizard-actions-right">
   {stage>0&&<button type="button" className="level-wizard-back" onClick={()=>{setStage(s=>(s-1) as 0|1|2);setManualError('');}}>Atrás</button>}
   {stage<2?<button type="button" onClick={()=>setStage(s=>(s+1) as 0|1|2)} disabled={stage===1&&!choices.result}>Siguiente</button>
   :<button type="button" disabled={!choices.result} onClick={()=>{if(submitting.current||!choices.result)return;submitting.current=true;try{onConfirm(choices.result);}catch(e){setManualError(e instanceof Error?e.message:'No se pudo confirmar');submitting.current=false;}}}>Confirmar subida a nivel {next}</button>}
  </div>
 </>;
 return <LevelUpDialogFrame eyebrow="PROGRESIÓN · MAGO / EVOCACIÓN" title={`Subir del nivel ${input.level} al ${next}`} subtitle="Tres pasos compartidos: novedades, elecciones y confirmación. Nada se modifica hasta confirmar." stage={stage} onClose={onCancel} footer={footer}>
  {stage===0&&<div className="level-wizard-section">
   <h3>Qué recibes al alcanzar el nivel {next}</h3>
   <ul className="level-wizard-milestones">{plan.features.map(feature=><li key={feature.id}><strong>{feature.title}</strong><p className="level-wizard-explanation">{feature.description}</p></li>)}
    {next===4&&<li><strong>Cuarto truco de Mago</strong><p className="level-wizard-explanation">Aprendes un truco nuevo. Puedes consultarlo antes de elegirlo; no ocupa ranura de conjuro.</p></li>}
    {next===9&&<li><strong>Experto en Evocación: conjuro gratuito</strong><p className="level-wizard-explanation">Al desbloquear ranuras de nivel 5, obtienes otra Evocación de nivel 1–5 gratuitamente, distinta de las de tu libro.</p></li>}
     {next===7&&<li><strong>Experto en Evocación: conjuro gratuito</strong><p className="level-wizard-explanation">Al adquirir ranuras de nivel 4 añades un conjuro gratuito de Evocación de nivel 1 a 4, distinto de los ya conocidos.</p></li>}
    {next===5&&<li><strong>Experto en Evocación: conjuro gratuito</strong><p className="level-wizard-explanation">Al acceder a ranuras de nivel 3 añades gratuitamente un conjuro de Evocación válido a tu libro, además de los dos de la progresión.</p></li>}
    <li><strong>Libro de conjuros</strong><p className="level-wizard-explanation">Añades dos conjuros nuevos a tu libro{next===3?', más dos Evocaciones gratuitas':next===5||next===7||next===9?', más una Evocación gratuita':''}. Todos tendrán su ficha y tiradas disponibles.</p></li>
    <li><strong>Puntos de golpe y espacios</strong><p className="level-wizard-explanation">Tus PG máximos aumentan al menos en {estimatedHpGain} con las características actuales. {next===4||next===8?'La mejora de Constitución puede modificar también los PG de niveles anteriores. ':''}Conservas daño y ranuras gastadas; las nuevas empiezan disponibles.</p></li>
   </ul>
   <div className="level-wizard-stats"><div className="level-wizard-stat"><span>PG máximos (sin nuevas elecciones)</span><strong>{current.maximumHitPoints} → {current.maximumHitPoints+estimatedHpGain}</strong></div><div className="level-wizard-stat"><span>Competencia</span><strong>+{previousCore.proficiencyBonus} → +{nextCore.proficiencyBonus}</strong></div><div className="level-wizard-stat"><span>Preparados reglamentarios</span><strong>{input.preparedIds.length} → {plan.progression.preparedSpellCount}</strong></div><div className="level-wizard-stat"><span>Trucos conocidos</span><strong>{input.cantripIds.length} → {plan.progression.cantripsKnown}</strong></div>{[1,2,3,4,5].map(l=><div className="level-wizard-stat" key={l}><span>Ranuras nivel {l}</span><strong>{state.magic.slots.maximum[l-1]} → {plan.progression.spellSlots[l-1]}</strong></div>)}<div className="level-wizard-stat"><span>Competencias nuevas</span><strong>{next===2?'Pericia Erudito':'Ninguna'}</strong></div></div>
   {(next===4||next===8)&&<p className="level-wizard-note">El manual permite elegir dotes alternativas si cumples sus requisitos. El motor solo tiene implementada la dote Mejora de característica para esta subida.</p>}
   <p className="level-wizard-note">Los conjuros se explican en sus desplegables. El jugador decide cuándo lanzar, recuperar ranuras y aplicar los efectos.</p>
  </div>}
  {stage===1&&<div className="level-wizard-section">
   <h3>Decisiones de este nivel</h3>
   {next===2&&<fieldset className="level-wizard-fieldset"><legend>Erudito: una pericia académica</legend><label className="field"><span>Habilidad en la que ya tienes competencia</span><select value={scholarSkill} onChange={e=>setScholarSkill(e.target.value as WizardScholarSkill)}>{availableSkills.map(skill=><option value={skill} key={skill}>{SKILL_NAMES[skill]}</option>)}</select></label><p className="level-wizard-explanation">La pericia duplica el bonificador de competencia para la habilidad elegida.</p></fieldset>}
   {(next===4||next===8)&&<fieldset className="level-wizard-fieldset"><legend>Dote Mejora de característica</legend>
    <label className="field"><span>Distribución</span><select value={improvement.mode} onChange={e=>setMode(e.target.value as WizardLevel4Improvement['mode'])}><option value="plus_two">+2 en una característica</option><option value="two_ones">+1 en dos características</option></select></label>
    <label className="field"><span>Primera característica</span><select value={improvement.first} onChange={e=>firstAbility(e.target.value as Ability)}>{ABILITIES.map(id=><option key={id} value={id}>{ABILITY_NAMES[id]} ({current.abilityScores[id]})</option>)}</select></label>
    {improvement.mode==='two_ones'&&<label className="field"><span>Segunda característica</span><select value={improvement.second} onChange={e=>setImprovement(prev=>({...prev,second:e.target.value as Ability}))}>{ABILITIES.filter(id=>id!==improvement.first).map(id=><option key={id} value={id}>{ABILITY_NAMES[id]} ({current.abilityScores[id]})</option>)}</select></label>}
    <p className="muted-note">La mejora no puede superar 20. Una subida de Constitución puede aumentar también los PG máximos de los niveles anteriores.</p>
   </fieldset>}
   {next===4&&<fieldset className="level-wizard-fieldset"><legend>Cuarto truco ({newCantrip?1:0}/1)</legend><p className="muted-note">Los trucos se pueden lanzar sin gastar ranuras. Consulta sus efectos antes de elegir.</p><div className="wizard-spell-picker">{WIZARD_LEVEL_ONE_CANTRIPS.filter(spell=>!input.cantripIds.includes(spell.id)).map(spell=>{const details=wizardSpellRule(spell.id);return <div className="wizard-spell-option" key={spell.id}><label><input type="radio" name="wizard-new-cantrip" checked={newCantrip===spell.id} onChange={()=>setNewCantrip(spell.id)}/><span>{spell.name}</span></label>{details&&<WizardSpellDetails spell={details} characterLevel={next} spellAttackBonus={projected?.spellAttackBonus??current.spellAttackBonus} mode={mode}/>}</div>;})}</div></fieldset>}
   <label className="field"><span>Buscar conjuros por nombre o escuela</span><input value={spellFilter} onChange={e=>setSpellFilter(e.target.value)} placeholder="Ej.: fuego, evocación..."/></label>
   <fieldset className="level-wizard-fieldset"><legend>Dos conjuros nuevos ({newSpells.length}/2)</legend><p className="muted-note">Añádelos al libro. Puedes abrir «Ver reglas y tiradas» en cada opción.</p>{displaySpellChoices(list,newSpells,id=>{setNewSpells(v=>toggle(v,id,2));setBonusSpells(v=>v.filter(x=>x!==id));if(bonusFive===id)setBonusFive('');if(bonusSeven===id)setBonusSeven('');if(bonusNine===id)setBonusNine('');})}</fieldset>
   {next===3&&<fieldset className="level-wizard-fieldset"><legend>Evocación: dos conjuros gratuitos ({bonusSpells.length}/2)</legend><p className="muted-note">Elige dos evocaciones distintas que no estén ya en tu libro.</p>{displaySpellChoices(bonusThree,bonusSpells,id=>setBonusSpells(v=>toggle(v,id,2)))}</fieldset>}
   {next===5&&<fieldset className="level-wizard-fieldset"><legend>Evocación: un conjuro gratuito ({bonusFive?1:0}/1)</legend><p className="muted-note">Al desbloquear ranuras de nivel 3 puedes incorporar otra Evocación de nivel 1, 2 o 3.</p><div className="wizard-spell-picker wizard-spell-choice-list">{bonusFiveOptions.map(spell=>{const details=wizardSpellRule(spell.id);return <div className="wizard-spell-option" key={spell.id}><label><input type="radio" name="wizard-free-evocation" checked={bonusFive===spell.id} onChange={()=>setBonusFive(spell.id)}/><span>{spell.name}</span><small>Nivel {spell.level}</small></label>{details&&<WizardSpellDetails spell={details} characterLevel={next} spellAttackBonus={projected?.spellAttackBonus??current.spellAttackBonus} mode={mode}/>}</div>;})}</div></fieldset>}
   {next===7&&<fieldset className="level-wizard-fieldset"><legend>Evocación: un conjuro gratuito ({bonusSeven?1:0}/1)</legend><p className="muted-note">Al desbloquear ranuras de nivel 4, elige una Evocación nueva de nivel 1–4, además de los dos conjuros habituales. Consulta las fichas antes de decidir.</p><div className="wizard-spell-picker wizard-spell-choice-list">{bonusSevenOptions.map(spell=>{const details=wizardSpellRule(spell.id);return <div className="wizard-spell-option" key={spell.id}><label><input type="radio" name="wizard-free-evocation-7" checked={bonusSeven===spell.id} onChange={()=>setBonusSeven(spell.id)}/><span>{spell.name}</span><small>Nivel {spell.level}</small></label>{details&&<WizardSpellDetails spell={details} characterLevel={next} spellAttackBonus={projected?.spellAttackBonus??current.spellAttackBonus} mode={mode}/>}</div>;})}</div></fieldset>}
   {next===9&&<fieldset className="level-wizard-fieldset"><legend>Evocación: un conjuro gratuito ({bonusNine?1:0}/1)</legend><p className="muted-note">Al desbloquear ranuras de nivel 5, puedes añadir gratuitamente una Evocación nueva de nivel 1–5. Comprueba sus efectos antes de elegir.</p><div className="wizard-spell-picker wizard-spell-choice-list">{bonusNineOptions.map(spell=>{const details=wizardSpellRule(spell.id);return <div className="wizard-spell-option" key={spell.id}><label><input type="radio" name="wizard-free-evocation-9" checked={bonusNine===spell.id} onChange={()=>setBonusNine(spell.id)}/><span>{spell.name}</span><small>Nivel {spell.level}</small></label>{details&&<WizardSpellDetails spell={details} characterLevel={next} spellAttackBonus={projected?.spellAttackBonus??current.spellAttackBonus} mode={mode}/>}</div>;})}</div></fieldset>}
   <fieldset className="level-wizard-fieldset"><legend>Preparación de progresión ({prepared.length}/{plan.progression.preparedSpellCount})</legend><p className="muted-note">Se conserva la preparación anterior. En la pestaña Hechizos puedes marcar libremente conjuros adicionales, sin bloqueo numérico.</p>{displaySpellChoices(spellOptions,prepared,id=>setPrepared(v=>toggle(v,id,plan.progression.preparedSpellCount)),input.preparedIds)}</fieldset>
   {choices.result?<p className="level-wizard-ok">Todas las elecciones de progresión son válidas. Puedes revisar los cambios.</p>:<p className="level-wizard-error" role="status">Pendiente: {choices.error}</p>}
  </div>}
  {stage===2&&<div className="level-wizard-section">
   <h3>Revisión final del personaje</h3>
   {choices.result&&projected?<>
    <div className="level-wizard-stats">{[
     {name:'Nivel',old:input.level,value:choices.result.input.level},
     {name:'PG máximos',old:current.maximumHitPoints,value:projected.maximumHitPoints},
     {name:'Competencia',old:previousCore.proficiencyBonus,value:nextCore.proficiencyBonus},
     {name:'Ataque mágico',old:current.spellAttackBonus,value:projected.spellAttackBonus},
     {name:'CD mágica',old:current.spellSaveDC,value:projected.spellSaveDC},
     {name:'Conjuros en libro',old:current.spells.spellbook.length,value:projected.spells.spellbook.length},
     {name:'Trucos',old:input.cantripIds.length,value:choices.result.input.cantripIds.length},
     {name:'Preparados reglamentarios',old:input.preparedIds.length,value:choices.result.input.preparedIds.length},
    ].map(s=><div key={s.name} className="level-wizard-stat"><span>{s.name}</span><strong>{s.old} → {s.value}</strong></div>)}</div>
    {(next===4||next===8)&&<p className="level-wizard-choice-info"><strong>Mejora de característica</strong>{ABILITIES.filter(id=>current.abilityScores[id]!==projected.abilityScores[id]).map(id=>`${ABILITY_NAMES[id]} ${current.abilityScores[id]} → ${projected.abilityScores[id]}`).join(' · ')}</p>}
    <div><h4>Capacidades obtenidas</h4><ul className="level-wizard-small-list">{choices.result.gainedFeatures.map(feature=><li key={feature.title}><strong>{feature.title}</strong><p className="level-wizard-explanation">{feature.description}</p></li>)}</ul></div>
    {next===2&&<p className="level-wizard-choice-info"><strong>Pericia obtenida</strong>{SKILL_NAMES[scholarSkill]}: se duplica la competencia.</p>}
    <div><h4>Nuevos conjuros y explicación</h4>{[...newSpells,...bonusSpells,...(bonusFive?[bonusFive]:[]),...(bonusSeven?[bonusSeven]:[]),...(bonusNine?[bonusNine]:[]),...(newCantrip?[newCantrip]:[])].map(id=>{const spell=wizardSpellRule(id);return spell&&<div key={id} className="level-wizard-choice-info"><strong>{spell.name} · Nivel {spell.level}</strong><p>{spell.description}</p></div>;})}</div>
    <p className="muted-note">Se preservan daño, equipo, retrato, inspiración y ranuras gastadas. Tras confirmar, pulsa Guardar cambios para actualizar PostgreSQL.</p>
   </>:<p className="level-wizard-error" role="alert">{choices.error}</p>}
   {manualError&&<p className="level-wizard-error" role="alert">{manualError}</p>}
  </div>}
 </LevelUpDialogFrame>;
}
