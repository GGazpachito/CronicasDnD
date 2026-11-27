"use client";

import {useState} from "react";
import type {GuidedFighterResult} from "../../../../packages/rules-engine/src/guided";
import {collectCharacterSpellbook,type SpellbookEntry} from "../../../../packages/rules-engine/src/spellbook";

type LevelFilter="all"|"0"|"1"|"2";
const FILTERS:readonly {id:LevelFilter;label:string}[]=[
  {id:"all",label:"Todos"},{id:"0",label:"Trucos"},{id:"1",label:"Nivel 1"},{id:"2",label:"Nivel 2"},
];
const signed=(value:number)=>value>=0?`+${value}`:String(value);
const levelLabel=(level:SpellbookEntry['level'])=>level===0?'Truco':`Nivel ${level}`;

function SpellCard({spell}:{spell:SpellbookEntry}) {
  return <details className="spells-card">
    <summary>
      <span className="spells-card-identity">
        <span className="spells-card-source">{spell.sourceLabel} · {levelLabel(spell.level)}</span>
        <strong>{spell.name}</strong>
        <small>{spell.abilityLabel} · Ataque mágico {signed(spell.attackBonus)} · CD {spell.saveDC}</small>
      </span>
      <span className={`spells-use-pill${spell.level===0?' is-at-will':''}`}>
        {spell.level===0?'Sin ranuras':'1 lanzamiento sin ranura / descanso largo'}
      </span>
    </summary>
    <div className="spells-card-details">
      <div className="spells-details-stats">
        <span>Característica <strong>{spell.abilityLabel}</strong></span>
        <span>Bonificador de ataque mágico <strong>{signed(spell.attackBonus)}</strong></span>
        <span>CD de salvación <strong>{spell.saveDC}</strong></span>
      </div>
      {spell.level===0
        ? <p>Este truco puede lanzarse sin gastar ranuras de conjuro.</p>
        : <p>Esta fuente permite un lanzamiento sin gastar ranura por descanso largo. {spell.allowsSpellSlot
          ? 'También puede usarse una ranura adecuada si el personaje llega a disponer de ella.'
          : 'Esta fuente no concede lanzamiento mediante ranuras.'} El uso gratuito todavía no se contabiliza automáticamente.</p>}
      <p className="spells-rule-note">No todos los conjuros necesitan ataque mágico o salvación. Consulta el SRD 5.2.1 para los componentes, objetivos, efectos y posibles dados de este conjuro. La ficha aún no ejecuta el conjuro.</p>
    </div>
  </details>;
}

/** Hoja de hechizos de origen. No altera el estado del personaje ni de la aventura. */
export default function SpellsPanel({result,error,onEditOrigin}:{
  result:GuidedFighterResult|null;
  error:string|null;
  onEditOrigin:()=>void;
}) {
  const [query,setQuery]=useState('');
  const [level,setLevel]=useState<LevelFilter>('all');
  if(!result)return <section className="panel spells-unavailable" role="alert">
    <h2>No se pueden consultar los hechizos</h2>
    <p>{error??'Revisa las elecciones del personaje antes de consultar su magia.'}</p>
    <button type="button" onClick={onEditOrigin}>Revisar origen</button>
  </section>;

  const spellbook=collectCharacterSpellbook(result);
  const term=query.trim().toLocaleLowerCase('es');
  const visible=spellbook.entries.filter(spell=>
    (level==='all'||String(spell.level)===level)&&
    (!term||`${spell.name} ${spell.id} ${spell.sourceLabel} ${spell.abilityLabel}`.toLocaleLowerCase('es').includes(term)));
  const grouped=[0,1,2] as const;

  return <div className="spells-page" aria-label="Hoja de hechizos de origen del personaje">
    <header className="spells-title">
      <div><span className="eyebrow">D&D 2024 · MAGIA DEL PERSONAJE</span>
        <h2>Hechizos</h2>
        <p>Conjuros que el personaje ha obtenido por sus rasgos y dotes. Las reglas de lanzamiento siguen en manos del jugador.</p>
      </div>
      <button type="button" className="spells-edit-button" onClick={onEditOrigin}>Modificar origen</button>
    </header>

    <div className="spells-counters" aria-label="Resumen de hechizos">
      <div><span>Concesiones mágicas</span><strong>{spellbook.totalGrants}</strong></div>
      <div><span>Trucos</span><strong>{spellbook.cantrips}</strong></div>
      <div><span>Conjuros de nivel 1 o 2</span><strong>{spellbook.leveledSpells}</strong></div>
    </div>

    {spellbook.abilities.length>0&&<section className="spells-abilities" aria-label="Estadísticas de lanzamiento">
      <div className="spells-heading"><h3>Estadísticas mágicas</h3><span>Calculadas desde la hoja</span></div>
      <div className="spells-ability-grid">{spellbook.abilities.map(ability=><div key={ability.ability} className="spells-ability-card">
        <strong>{ability.label}</strong>
        <div className="spells-ability-values"><span>Ataque mágico <b>{signed(ability.attackBonus)}</b></span><span>CD de salvación <b>{ability.saveDC}</b></span></div>
        <small>Modificador {signed(ability.modifier)} + competencia {signed(ability.proficiencyBonus)}</small>
      </div>)}</div>
      <p className="spells-formula-note">Estos bonificadores son referencias para los conjuros que los requieran; no se aplican a todos los lanzamientos.</p>
    </section>}

    <section className="spells-collection" aria-label="Conjuros conocidos por origen">
      <div className="spells-heading"><h3>Conjuros concedidos</h3><span>{spellbook.uniqueSpells} nombres diferentes</span></div>
      {spellbook.totalGrants===0
        ? <div className="spells-empty"><h4>Este personaje no tiene conjuros registrados</h4>
            <p>Un Guerrero sin dotes o rasgos mágicos no obtiene automáticamente conjuros ni ranuras de lanzador. La pestaña se llenará al elegir un origen que conceda magia.</p>
            <button type="button" className="spells-edit-button" onClick={onEditOrigin}>Revisar dotes y especie</button></div>
        : <>
          <div className="spells-toolbar">
            <label><span>Buscar conjuro</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Nombre, origen o característica"/></label>
            <div className="spells-filters" role="group" aria-label="Filtrar conjuros por nivel">{FILTERS.map(filter=><button key={filter.id} type="button" className={level===filter.id?'is-active':''} aria-pressed={level===filter.id} onClick={()=>setLevel(filter.id)}>{filter.label}</button>)}</div>
          </div>
          <p className="spells-result-count" role="status">{visible.length} concesiones visibles de {spellbook.totalGrants}.</p>
          {visible.length===0?<p className="spells-empty" role="status">No se encontraron conjuros para este filtro.</p>:
            grouped.map(group=>{
              const spells=visible.filter(spell=>spell.level===group);
              return spells.length===0?null:<section key={group} className="spells-level-group">
                <h4>{group===0?'Trucos':`Conjuros de nivel ${group}`} <span>({spells.length})</span></h4>
                <div className="spells-card-grid">{spells.map(spell=><SpellCard key={spell.key} spell={spell}/>)}</div>
              </section>;
            })}
        </>}
    </section>

    <section className="spells-limitations" aria-label="Estado de automatización de la magia">
      <h3>¿Qué está automatizado?</h3>
      <p>La lista, el origen, los niveles desbloqueados, las características de lanzamiento, el bonificador de ataque mágico y la CD se calculan a partir del personaje validado.</p>
      <p><strong>Por ahora no se automatizan</strong> los usos gratuitos, las tiradas específicas de cada conjuro, la concentración, los componentes ni la aplicación de efectos. El Guerrero implementado no recibe ranuras de conjuro de su clase. No se han creado ranuras ficticias para mostrar un contador.</p>
      <p>Fuente de reglas del programa base: <em>SRD 5.2.1</em>, publicado por Wizards of the Coast bajo licencia CC BY 4.0.</p>
    </section>
  </div>;
}
