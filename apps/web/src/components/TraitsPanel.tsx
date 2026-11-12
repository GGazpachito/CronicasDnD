"use client";

import { useState } from "react";
import { collectCharacterTraits, type CharacterTrait, type TraitAutomation, type TraitGroup } from "../../../../packages/rules-engine/src/traits";
import type { GuidedFighterInput, GuidedFighterResult } from "../../../../packages/rules-engine/src/guided";

const GROUPS: readonly {id: TraitGroup; title: string; description: string}[] = [
  {id: "class", title: "Rasgos de clase", description: "Progresión del Guerrero según tu nivel actual."},
  {id: "subclass", title: "Rasgos de subclase", description: "Capacidades del Campeón que ya has desbloqueado."},
  {id: "species", title: "Rasgos de especie", description: "Capacidades de nacimiento y elecciones de linaje."},
  {id: "feats", title: "Dotes y origen", description: "Dotes del trasfondo, dote adicional humana y beneficio épico cuando corresponda."},
];
const AUTOMATION: Record<TraitAutomation, {label:string; description:string}> = {
  calculated: {label:"Calculado",description:"Sus bonificadores o elecciones se reflejan en los valores de la hoja."},
  partial: {label:"Apoyo parcial",description:"El motor registra algunos efectos, pero requiere acciones del jugador."},
  manual: {label:"Manual",description:"La aplicación muestra la capacidad; jugadores y DM resuelven su uso."},
};

function TraitCard({ trait }: {trait:CharacterTrait}) {
  return <details className="traits-card">
    <summary>
      <span className="traits-card-main">
        <span className="traits-card-topline">{trait.source}{trait.level ? ` · Nivel ${trait.level}` : ""}</span>
        <strong>{trait.title}</strong>
        <span className="traits-card-teaser">{trait.summary}</span>
      </span>
      <span className={`traits-status is-${trait.automation}`} title={AUTOMATION[trait.automation].description}>{AUTOMATION[trait.automation].label}</span>
    </summary>
    <div className="traits-card-body">
      <p>{AUTOMATION[trait.automation].description}</p>
      {trait.details.length > 0 && <ul>{trait.details.map((text,index)=><li key={`${trait.id}:${index}`}>{text}</li>)}</ul>}
    </div>
  </details>;
}

type TraitsPanelProps = {
  input: GuidedFighterInput;
  result: GuidedFighterResult | null;
  error: string | null;
  onEdit: (step:number)=>void;
};

/** Se alimenta exclusivamente de la proyección validada. El filtro es estado efímero de UI. */
export default function TraitsPanel({input,result,error,onEdit}:TraitsPanelProps) {
  const [query,setQuery] = useState("");
  const [groupFilter,setGroupFilter] = useState<TraitGroup | "all">("all");
  if (!result) return <section className="panel traits-unavailable" role="alert">
    <h2>No se pueden mostrar los rasgos</h2>
    <p>{error ?? "Revisa las elecciones para calcular correctamente el personaje."}</p>
    <button type="button" onClick={()=>onEdit(0)}>Revisar personaje</button>
  </section>;

  const collection=collectCharacterTraits(input,result);
  const term=query.trim().toLocaleLowerCase("es");
  const visible=collection.traits.filter(trait=>(groupFilter==="all" || trait.group===groupFilter) &&
    (!term || [trait.title,trait.source,trait.summary,...trait.details].join(" ").toLocaleLowerCase("es").includes(term)));
  const counts=collection.traits.reduce((acc,trait)=>{
    acc[trait.automation]++;
    return acc;
  },{calculated:0,partial:0,manual:0});

  return <div className="traits-page" aria-label="Catálogo de rasgos del personaje">
    <header className="traits-hero panel">
      <div className="traits-hero-top">
        <div><span className="eyebrow">RASGOS · ACTUALIZACIÓN 40</span><h2>Las capacidades de tu personaje</h2>
          <p>Rasgos disponibles según tu nivel, especie, subclase y dotes. Las descripciones son resúmenes de consulta; los valores y efectos aplicados proceden del motor.</p>
        </div>
        <button type="button" className="traits-edit" onClick={()=>onEdit(1)}>Editar origen y elecciones</button>
      </div>
      <div className="traits-summary" aria-label="Resumen de automatización">
        <div><strong>{collection.traits.length}</strong><span>Rasgos registrados</span></div>
        <div><strong>{counts.calculated}</strong><span>Calculados</span></div>
        <div><strong>{counts.partial}</strong><span>Apoyo parcial</span></div>
        <div><strong>{counts.manual}</strong><span>Manuales</span></div>
      </div>
      <p className="traits-legend">«Calculado» no implica que se realicen tiradas o acciones automáticamente. La activación de capacidades sigue correspondiendo a los jugadores.</p>
    </header>

    <div className="traits-toolbar panel">
      <label className="traits-search"><span>Buscar rasgos</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ej.: Segundo aliento, crítico, Duro…" /></label>
      <label className="traits-filter"><span>Mostrar</span><select value={groupFilter} onChange={e=>setGroupFilter(e.target.value as TraitGroup | "all")}>
        <option value="all">Todas las categorías</option>
        {GROUPS.map(group=><option key={group.id} value={group.id}>{group.title}</option>)}
      </select></label>
      <span className="traits-count" role="status">{visible.length} de {collection.traits.length} rasgos</span>
    </div>

    {GROUPS.filter(group=>groupFilter==="all" || group.id===groupFilter).map(group=>{
      const traits=visible.filter(trait=>trait.group===group.id);
      const total=collection.traits.filter(trait=>trait.group===group.id).length;
      if(total===0 && groupFilter==="all")return null;
      return <section className="traits-section" key={group.id} aria-label={group.title}>
        <div className="traits-section-header"><div><h3>{group.title}</h3><p>{group.description}</p></div><span>{traits.length}{traits.length!==total?` / ${total}`:""}</span></div>
        {traits.length ? <div className="traits-grid">{traits.map(trait=><TraitCard key={trait.id} trait={trait}/>)}</div>
          : <p className="traits-empty">Ningún rasgo de esta categoría coincide con la búsqueda.</p>}
      </section>;
    })}
    {visible.length===0 && <p className="traits-empty" role="status">No hay rasgos que coincidan con los filtros. Prueba otra búsqueda.</p>}

    <details className="traits-pending panel">
      <summary>Automatizaciones aún pendientes <span>{collection.pendingAutomation.length}</span></summary>
      <p>Esta lista procede del motor y recoge funcionalidades declaradas pero no completamente implementadas.</p>
      {collection.pendingAutomation.length ? <ul>{collection.pendingAutomation.map((item,index)=><li key={`${index}:${item}`}>{item}</li>)}</ul>
        : <p>El motor no declara automatizaciones pendientes para este personaje.</p>}
    </details>
  </div>;
}
