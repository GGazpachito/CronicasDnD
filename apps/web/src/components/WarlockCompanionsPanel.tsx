'use client';
import {WARLOCK_FAMILIARS,type FamiliarForm,type WarlockOneState} from '../../../../packages/rules-engine/src/warlock';

export default function WarlockCompanionsPanel({hasChain,state,onChange}:{
 hasChain:boolean;state:WarlockOneState;onChange:(value:Partial<WarlockOneState>)=>void;
}){
 if(!hasChain)return null;
 return <section className="panel wizard-module">
   <span className="eyebrow">EXTENSIÓN EXCLUSIVA DE BRUJO</span><h2>Familiar del Pacto de la Cadena</h2>
    <p>El Pacto de la Cadena permite lanzar Encontrar familiar sin gastar ranura de conjuro. Los componentes y demás condiciones se consultan en el conjuro. Elige la forma al invocarlo; esta hoja registra tu elección, pero no ejecuta órdenes ni administra automáticamente acciones de combate.</p>
    <div className="wizard-editor-grid">
     <label className="field"><span>Forma actual del familiar</span><select value={state.familiarForm??''} onChange={e=>onChange({familiarForm:e.target.value?e.target.value as FamiliarForm:null})}><option value="">Sin familiar manifestado</option>{Object.entries(WARLOCK_FAMILIARS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
     <label className="field"><span>Nombre (opcional)</span><input maxLength={120} value={state.familiarName} onChange={e=>onChange({familiarName:e.target.value})} placeholder="Nombre del familiar"/></label>
    </div>
    {state.familiarForm&&<div className="overview-record"><span><strong>{state.familiarName.trim()||WARLOCK_FAMILIARS[state.familiarForm]}</strong><small>Forma: {WARLOCK_FAMILIARS[state.familiarForm]}</small></span><span>Compañero vinculado</span></div>}
    <p className="muted-note">Las estadísticas, ataques, salvaciones, PG y efectos específicos de cada bloque de criatura aún no están normalizados. Consulta el bloque oficial al dirigir sus acciones. Puedes sustituir la forma cuando vuelvas a lanzar Encontrar familiar.</p>
    <p className="muted-note">Puedes renunciar a uno de tus ataques durante la acción de Atacar para permitir que tu familiar ataque usando su reacción, si se cumplen las condiciones del pacto. La decisión es manual.</p>
 </section>;
}
