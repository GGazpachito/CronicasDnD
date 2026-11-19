'use client';
import Link from 'next/link';
import {familiarSheetFromBestiary,findBestiaryCreature} from '../../../../packages/rules-engine/src/bestiary';
import {WARLOCK_FAMILIARS,type FamiliarForm,type WarlockOneState} from '../../../../packages/rules-engine/src/warlock';
import CreatureStatBlock from './CreatureStatBlock';

export default function WarlockCompanionsPanel({hasChain,state,onChange}:{
 hasChain:boolean;state:WarlockOneState;onChange:(value:Partial<WarlockOneState>)=>void;
}){
 if(!hasChain)return null;
 return <section className="panel wizard-module">
   <span className="eyebrow">EXTENSIÓN EXCLUSIVA DE BRUJO</span><h2>Familiar del Pacto de la Cadena</h2>
    <p>El Pacto de la Cadena permite lanzar Encontrar familiar sin gastar ranura de conjuro. Elige la forma al invocarlo y se mostrará su ficha desde el Bestiario. Esta hoja te ayuda con los valores y tiradas; las órdenes, acciones y condiciones del conjuro siguen en manos de los jugadores.</p>
    <div className="wizard-editor-grid">
     <label className="field"><span>Forma actual del familiar</span><select aria-label="Forma actual del familiar" value={state.familiarForm??''} onChange={e=>onChange({familiarForm:e.target.value?e.target.value as FamiliarForm:null})}><option value="">Sin familiar manifestado</option><optgroup label="Formas especiales del Pacto de la Cadena">{(Object.keys(WARLOCK_FAMILIARS) as FamiliarForm[]).filter(id=>findBestiaryCreature(id)?.category==='familiar_especial').map(id=><option key={id} value={id}>{WARLOCK_FAMILIARS[id]}</option>)}</optgroup><optgroup label="Formas comunes y compatibilidad">{(Object.keys(WARLOCK_FAMILIARS) as FamiliarForm[]).filter(id=>findBestiaryCreature(id)?.category==='familiar_comun').map(id=><option key={id} value={id}>{WARLOCK_FAMILIARS[id]}</option>)}</optgroup></select></label>
     <label className="field"><span>Nombre (opcional)</span><input maxLength={120} value={state.familiarName} onChange={e=>onChange({familiarName:e.target.value})} placeholder="Nombre del familiar"/></label>
    </div>
    {state.familiarForm&&findBestiaryCreature(state.familiarForm)&&<div className="bestiary-familiar-sheet"><div className="bestiary-familiar-header"><strong>Compañero vinculado · Ficha de referencia</strong><Link href={`/bestiary?creature=${state.familiarForm}`} className="overview-link">Ver en el Bestiario</Link></div><CreatureStatBlock key={`${state.familiarForm}:${state.familiarName}`} readOnly sheet={familiarSheetFromBestiary(state.familiarForm,state.familiarName)}/></div>}
    {!state.familiarForm&&<p className="muted-note">Selecciona una forma para consultar la ficha de tu familiar. Tus compañeros creados manualmente permanecen independientes.</p>}
    <p className="muted-note">Puedes renunciar a uno de tus ataques durante la acción de Atacar para permitir que tu familiar ataque usando su reacción, si se cumplen las condiciones del pacto. La decisión es manual.</p>
 </section>;
}
