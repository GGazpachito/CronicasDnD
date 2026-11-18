'use client';
import {useEffect,useRef,useState} from 'react';
import type {D20Mode} from '../../../../packages/rules-engine/src/d20';
import type {GuidedWizardInput} from '../../../../packages/rules-engine/src/wizard-creation';
import {wizardMasteryAlternatives,wizardReplaceMasteryAfterLongRest} from '../../../../packages/rules-engine/src/wizard-level-up';
import {wizardSpellRule} from '../../../../packages/rules-engine/src/wizard-spell-details';
import WizardSpellDetails from './WizardSpellDetails';

type Props=Readonly<{
 input:GuidedWizardInput;spellAttackBonus:number;mode:D20Mode;
 onConfirm:(next:GuidedWizardInput)=>void;onCancel:()=>void;
}>;

/** El cambio opcional de UNA sola Maestría se ofrece como parte del descanso largo.
 * Cerrar el diálogo no descansa ni modifica el personaje.
 */
export default function WizardMasteryRestDialog({input,spellAttackBonus,mode,onConfirm,onCancel}:Props){
 const ref=useRef<HTMLElement>(null);
 const cancelRef=useRef(onCancel);
 const [changeLevel,setChangeLevel]=useState<0|1|2>(0);
 const [replacement,setReplacement]=useState('');
 const [error,setError]=useState('');
 useEffect(()=>{cancelRef.current=onCancel;},[onCancel]);
 useEffect(()=>{
  ref.current?.focus();
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')cancelRef.current();};
  document.addEventListener('keydown',onKey);
  return ()=>document.removeEventListener('keydown',onKey);
 },[]);
 const choices=changeLevel===0?[]:wizardMasteryAlternatives(input,changeLevel).filter(spell=>spell.id!==input.spellMasteryIds?.[changeLevel-1]);
 const selected=wizardSpellRule(replacement);
 const current1=wizardSpellRule(input.spellMasteryIds?.[0]??'')?.name??'—';
 const current2=wizardSpellRule(input.spellMasteryIds?.[1]??'')?.name??'—';
 function confirm(){
  try{
   if(changeLevel!==0&&!choices.some(spell=>spell.id===replacement))throw new RangeError('Selecciona una alternativa válida del mismo nivel');
   const next=changeLevel===0?input:wizardReplaceMasteryAfterLongRest(input,changeLevel,replacement);
   onConfirm(next);
  }catch(e){setError(e instanceof Error?e.message:'No se pudo completar el descanso');}
 }
 return <div className="level-wizard-backdrop">
  <section className="level-wizard" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="wizard-mastery-rest-title">
   <header className="level-wizard-top"><div><span className="eyebrow">MAGO · MAESTRÍA NIVEL 18</span><h2 id="wizard-mastery-rest-title">Terminar descanso largo</h2><p>Puedes mantener tus dos conjuros dominados o cambiar uno de ellos por otro del mismo nivel y tiempo de una acción.</p></div><button type="button" className="level-wizard-close" aria-label="Cancelar descanso" onClick={onCancel}>×</button></header>
   <div className="level-wizard-body level-wizard-section">
    <div className="level-wizard-stats"><div className="level-wizard-stat"><span>Maestría nivel 1</span><strong>{current1}</strong></div><div className="level-wizard-stat"><span>Maestría nivel 2</span><strong>{current2}</strong></div></div>
    <label className="field"><span>Cambio opcional al finalizar el descanso</span><select value={changeLevel} onChange={e=>{setChangeLevel(Number(e.target.value) as 0|1|2);setReplacement('');setError('');}}><option value={0}>Mantener ambos conjuros</option><option value={1}>Sustituir el conjuro de nivel 1</option><option value={2}>Sustituir el conjuro de nivel 2</option></select></label>
    {changeLevel!==0&&<label className="field"><span>Nuevo conjuro dominado de nivel {changeLevel}</span><select value={replacement} onChange={e=>{setReplacement(e.target.value);setError('');}}><option value="">Selecciona un conjuro de tu libro</option>{choices.map(spell=><option key={spell.id} value={spell.id}>{spell.name}</option>)}</select></label>}
    {changeLevel!==0&&replacement&&selected&&<WizardSpellDetails spell={selected} characterLevel={input.level} spellAttackBonus={spellAttackBonus} mode={mode}/>}
    <p className="muted-note">Al confirmar se recuperan ranuras, PG y recursos habituales del descanso. No se gastan ranuras al lanzar los conjuros de Maestría a su nivel mínimo, pero sus efectos siguen siendo manuales. Guarda el personaje para conservar los cambios.</p>
    {error&&<p className="level-wizard-error" role="alert">{error}</p>}
   </div>
   <footer className="level-wizard-actions"><button type="button" className="level-wizard-cancel" onClick={onCancel}>Cancelar</button><button type="button" disabled={changeLevel!==0&&!replacement} onClick={confirm}>Confirmar descanso largo</button></footer>
  </section>
 </div>;
}
