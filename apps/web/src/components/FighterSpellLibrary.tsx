'use client';

import type {GuidedFighterResult} from '../../../../packages/rules-engine/src/guided';
import {collectCharacterSpellbook} from '../../../../packages/rules-engine/src/spellbook';
import {wizardSpellRule,type WizardSpellRule} from '../../../../packages/rules-engine/src/wizard-spell-details';
import {SHARED_SPELL_RULES,SHARED_CLASS_SPELL_LISTS} from '../../../../packages/rules-engine/src/shared-spell-catalog';
import type {D20Mode} from '../../../../packages/rules-engine/src/d20';
import SpellLibraryPanel from './SpellLibraryPanel';

/** Proyección de hechizos concedidos por origen, sin inventar ranuras de Guerrero. */
export default function FighterSpellLibrary({result,error,mode,onEditOrigin}:{
 result:GuidedFighterResult|null;error:string|null;mode:D20Mode;onEditOrigin:()=>void;
}){
 if(!result)return <div role="alert"><p>{error??'Revisa el origen del Guerrero.'}</p><button onClick={onEditOrigin}>Editar origen</button></div>;
 const book=collectCharacterSpellbook(result);
 const distinct=new Map<string,WizardSpellRule>();
 for(const entry of book.entries){
  if(distinct.has(entry.id))continue;
  const rule=wizardSpellRule(entry.id);
  distinct.set(entry.id,rule??{id:entry.id,name:entry.name,level:entry.level,school:'Origen',
   description:'Este conjuro procede de un rasgo o dote de origen. Consulta sus efectos y requisitos en el Manual del Jugador 2024.',
   attack:false,rolls:[],cantripScales:false});
 }
 const ids=[...distinct.keys()];
 const prepared=ids;
 const primary=book.entries[0];
 return <>
  <SpellLibraryPanel rules={[...new Map([...SHARED_SPELL_RULES,...distinct.values()].map(rule=>[rule.id,rule])).values()]} classLists={[...SHARED_CLASS_SPELL_LISTS,{id:'origin',label:'Conjuros de origen',spellIds:ids}]}
   selection={{learnedIds:ids,preparedIds:prepared}} limits={{cantrips:[...distinct.values()].filter(rule=>rule.level===0).length,learnedMinimum:0,prepared:[...distinct.values()].filter(rule=>rule.level>0).length}}
   characterLevel={result.sheet.level} spellAttackBonus={primary?.attackBonus??0} spellSaveDC={primary?.saveDC??8}
   mode={mode} maxSlotLevel={0} editable={false} statsAvailable={book.entries.length>0} knownLabel="Concedidos por origen" preparedLabel="Disponibles"
   note="El Guerrero no gana ranuras por su clase. Cada concesión conserva su propia característica mágica y sus usos gratuitos; compruébalos abajo. Los dados de la ficha de conjuros son orientativos si una concesión usa otra característica."
   onLearned={()=>{}} onPrepared={()=>{}}/>
  <details className="shared-spells-origin"><summary>Fuentes y estadísticas específicas de origen ({book.entries.length})</summary>
   {book.entries.length===0?<p>Este personaje no tiene conjuros. Puedes obtenerlos por especie o dotes de origen.</p>:<ul>
    {book.entries.map(entry=><li key={entry.key}><strong>{entry.name}</strong> · {entry.sourceLabel} · {entry.abilityLabel} · ataque {entry.attackBonus>=0?'+':''}{entry.attackBonus} · CD {entry.saveDC} · {entry.level===0?'truco sin ranuras':entry.freeCastPerLongRest?'1 uso gratuito por descanso largo':'uso según su fuente'}</li>)}
   </ul>}
   <button type="button" onClick={onEditOrigin}>Modificar magia de origen</button>
  </details>
 </>;
}
