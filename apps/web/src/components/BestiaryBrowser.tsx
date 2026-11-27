'use client';
import {useState} from 'react';
import Link from 'next/link';
import {BESTIARY_ENTRIES,findBestiaryCreature,type BestiaryCategory} from '../../../../packages/rules-engine/src/bestiary';
import CreatureStatBlock from './CreatureStatBlock';

type Filter='todos'|BestiaryCategory;
const CATEGORY_LABELS:Record<BestiaryCategory,string>={familiar_especial:'Pacto de la Cadena: especiales',familiar_comun:'Familiares comunes',bestia:'Bestias y animales',enemigo:'Enemigos',otra:'Otras criaturas'};
const AVAILABLE_CATEGORIES=(Object.keys(CATEGORY_LABELS) as BestiaryCategory[]).filter(category=>BESTIARY_ENTRIES.some(entry=>entry.category===category));

/** Explorador genérico: el catálogo podrá incorporar enemigos sin cambiar esta vista. */
export default function BestiaryBrowser({initialId}:Readonly<{initialId?:string}>){
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<Filter>('todos');
 const [selectedId,setSelectedId]=useState(initialId&&findBestiaryCreature(initialId)?initialId:BESTIARY_ENTRIES[0]?.id??'');
 const needle=query.toLocaleLowerCase('es').trim();
 const visible=BESTIARY_ENTRIES.filter(entry=>(filter==='todos'||entry.category===filter)&&(!needle||[entry.name,entry.sheet.creatureType,entry.sheet.challengeRating].some(value=>value.toLocaleLowerCase('es').includes(needle))));
 const selected=visible.find(entry=>entry.id===selectedId)??visible[0];
 return <main className="app-shell bestiary-page">
  <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">D20</span><div><strong>CrónicasDnD</strong><span>Volver al menú principal</span></div></Link><div className="status"><span className="status-dot"/> Archivo de criaturas</div></header>
  <div className="bestiary-content">
   <div className="bestiary-page-heading"><div><span className="eyebrow">ARCHIVO DE CRIATURAS · D&D 2024</span><h1>Bestiario</h1><p>La fuente de referencia única para las fichas de familiares y futuras bestias, monstruos y enemigos. Aquí puedes consultar estadísticas y realizar tiradas, sin modificar los datos originales.</p></div><Link href="/" className="overview-link">← Menú principal</Link></div>
   <div className="bestiary-layout">
    <section className="panel bestiary-catalog" aria-label="Catálogo de criaturas">
     <h2>Catálogo</h2><p className="muted-note">{visible.length} de {BESTIARY_ENTRIES.length} fichas disponibles. Orden: desafío ascendente, después nombre A–Z.</p>
     <label className="field"><span>Buscar criatura, tipo o desafío</span><input type="search" aria-label="Buscar criatura" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ej.: pseudodragón, bestia, 1/4"/></label>
     <label className="field"><span>Grupo</span><select value={filter} onChange={e=>setFilter(e.target.value as Filter)} aria-label="Filtrar criaturas"><option value="todos">Todas las criaturas</option>{AVAILABLE_CATEGORIES.map(category=><option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>
     <div className="bestiary-items" role="group" aria-label="Resultados del Bestiario">
      {visible.map(entry=><button key={entry.id} type="button" className={`bestiary-item${selected?.id===entry.id?' bestiary-item-selected':''}`} onClick={()=>setSelectedId(entry.id)} aria-pressed={selected?.id===entry.id}><span><strong>{entry.name}</strong><small>{entry.sheet.creatureType} · {CATEGORY_LABELS[entry.category]}</small></span><span className="bestiary-item-cr">VD {entry.sheet.challengeRating}</span></button>)}
      {visible.length===0&&<p className="muted-note">No hay criaturas con esos filtros. Prueba otra búsqueda.</p>}
     </div>
    </section>
    <section className="bestiary-details" aria-label="Ficha de criatura seleccionada">
     {selected?<><div className="bestiary-detail-head"><span className="eyebrow">{CATEGORY_LABELS[selected.category].toLocaleUpperCase('es')}</span><a className="overview-link" href={selected.source} target="_blank" rel="noopener noreferrer">Consultar fuente ↗</a></div><CreatureStatBlock key={selected.id} sheet={selected.sheet} readOnly/></>:<p className="muted-note">Selecciona una criatura para consultar su hoja.</p>}
    </section>
   </div>
   <p className="muted-note bestiary-footnote">El catálogo no es un inventario ni un editor: conserva los bloques de referencia. Los compañeros manuales se crean desde cada hoja de personaje, de forma independiente.</p>
  </div>
 </main>;
}
