'use client';
import {useState} from 'react';
import type {WizardSpellRule} from '../../../../packages/rules-engine/src/wizard-spell-details';
import type {WizardSpellSelection} from '../../../../packages/rules-engine/src/wizard-spell-library';
import type {D20Mode} from '../../../../packages/rules-engine/src/d20';
import WizardSpellDetails from './WizardSpellDetails';

export type SpellListFilter=Readonly<{id:string;label:string;spellIds:readonly string[]}>;
type Tab='prepared'|'learned'|'catalog';
type Props=Readonly<{
 rules:readonly WizardSpellRule[];classLists:readonly SpellListFilter[];selection:WizardSpellSelection;
 limits:{cantrips:number;learnedMinimum:number;prepared:number};
 characterLevel:number;spellAttackBonus:number;spellSaveDC:number;mode:D20Mode;
 onLearned:(id:string,checked:boolean)=>void;onPrepared:(id:string,checked:boolean)=>void;
}>;
/** Presentación compartible entre clases. Las reglas y la persistencia las aporta el adaptador. */
export default function SpellLibraryPanel({rules,classLists,selection,limits,characterLevel,spellAttackBonus,spellSaveDC,mode,onLearned,onPrepared}:Props){
 const [tab,setTab]=useState<Tab>('prepared');
 const [query,setQuery]=useState('');
 const [selectedLists,setSelectedLists]=useState<string[]>(classLists.map(list=>list.id));
 const [levels,setLevels]=useState<number[]>([0,1,2,3,4,5,6,7,8,9]);
 const learned=new Set(selection.learnedIds),prepared=new Set(selection.preparedIds);
 const knownInBook=rules.filter(spell=>spell.level>0&&learned.has(spell.id)).length;
 const cantrips=rules.filter(spell=>spell.level===0&&learned.has(spell.id)).length;
 const preparedCount=rules.filter(spell=>spell.level>0&&prepared.has(spell.id)).length;
 const visible=rules.filter(spell=>{
  if(tab==='prepared'&&!prepared.has(spell.id))return false;
  if(tab==='learned'&&!learned.has(spell.id))return false;
  if(tab==='catalog'&&(!levels.includes(spell.level)||!classLists.some(list=>selectedLists.includes(list.id)&&list.spellIds.includes(spell.id))))return false;
  if(query.trim()&&!`${spell.name} ${spell.school} ${spell.description}`.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))return false;
  return true;
 });
 const tabs:[Tab,string,string][]=[['prepared','Preparados',String(preparedCount)],['learned','Aprendidos',String(knownInBook)],['catalog','Todos los conjuros',String(rules.length)]];
 return <section className="wizard-spell-library" aria-label="Libro de conjuros y preparación">
  <div className="stat-cards wizard-magic-stats">
   <div className="stat-card"><span>CD DE SALVACIÓN</span><strong>{spellSaveDC}</strong><small>8 + competencia + característica mágica</small></div>
   <div className="stat-card"><span>ATAQUE MÁGICO</span><strong>{spellAttackBonus>=0?'+':''}{spellAttackBonus}</strong><small>Se puede lanzar con el botón superior</small></div>
   <div className="stat-card"><span>PREPARADOS</span><strong>{preparedCount}<small> / {limits.prepared}</small></strong><small>Cantidad reglamentaria informativa</small></div>
  </div>
  <div className="wizard-spell-summary"><span>Trucos aprendidos: <strong>{cantrips} / {limits.cantrips}</strong></span><span>En el libro: <strong>{knownInBook} / {limits.learnedMinimum} mínimo</strong></span><span>Conjuros preparados: <strong>{preparedCount} / {limits.prepared}</strong></span></div>
  <p className="muted-note">Los contadores son orientativos: puedes aprender y preparar tantos conjuros como desees. En partida, el uso de niveles de ranura y las decisiones activas siguen bajo control del jugador.</p>
  <div className="wizard-spell-tabbar" role="tablist" aria-label="Secciones de hechizos">{tabs.map(([id,label,count])=><button key={id} type="button" role="tab" aria-selected={tab===id} className={tab===id?'is-active':''} onClick={()=>{setTab(id);setQuery('');}}>{label} <small>{count}</small></button>)}</div>
  <div className="wizard-spell-search"><label htmlFor="wizard-spell-query">Buscar conjuro</label><input id="wizard-spell-query" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Nombre, escuela o efecto..."/></div>
  {tab==='catalog'&&<div className="wizard-spell-filters"><fieldset><legend>Lista de clase</legend>{classLists.map(list=><label key={list.id}><input type="checkbox" checked={selectedLists.includes(list.id)} onChange={e=>setSelectedLists(previous=>e.target.checked?[...previous,list.id]:previous.filter(id=>id!==list.id))}/> {list.label} <small>({list.spellIds.length})</small></label>)}<small>Se incorporarán las listas de otras clases conforme se implementen.</small></fieldset>
   <fieldset><legend>Nivel del conjuro</legend><div className="wizard-spell-level-filters">{Array.from({length:10},(_,n)=>n).map(level=><label key={level}><input type="checkbox" checked={levels.includes(level)} onChange={event=>setLevels(previous=>event.target.checked?[...previous,level]:previous.filter(n=>n!==level))}/> {level===0?'Trucos':`N. ${level}`}</label>)}</div><small>El catálogo muestra los niveles implementados en las listas seleccionadas. Los niveles superiores se añadirán conforme avance cada clase.</small></fieldset>
  </div>}
  <div role="tabpanel" className="wizard-spell-list">
   {visible.length===0?<p className="spells-empty">No hay conjuros con estos criterios. Ajusta los filtros o aprende uno desde «Todos los conjuros».</p>:visible.map(spell=><SpellSelectionCard key={spell.id} spell={spell} tab={tab} known={learned.has(spell.id)} ready={prepared.has(spell.id)} onLearned={onLearned} onPrepared={onPrepared} characterLevel={characterLevel} spellAttackBonus={spellAttackBonus} mode={mode} maxSlotLevel={Math.floor((characterLevel+1)/2)}/>)}
  </div>
 </section>;
}
type SpellCardProps=Readonly<{spell:WizardSpellRule;tab:Tab;known:boolean;ready:boolean;onLearned:(id:string,checked:boolean)=>void;onPrepared:(id:string,checked:boolean)=>void;characterLevel:number;spellAttackBonus:number;mode:D20Mode;maxSlotLevel:number}>;
function SpellSelectionCard({spell,tab,known,ready,onLearned,onPrepared,characterLevel,spellAttackBonus,mode,maxSlotLevel}:SpellCardProps){
 const checked=tab==='catalog'?known:ready;
 return <article className="wizard-spell-entry">
  <div className="wizard-spell-entry-top"><div><h4>{spell.name}</h4><small>{spell.level===0?'Truco':`Nivel ${spell.level}`} · {spell.school} {spell.ritual?'· Ritual':''}</small></div>
   <label className="wizard-spell-entry-check"><input type="checkbox" checked={checked} onChange={event=>tab==='catalog'?onLearned(spell.id,event.target.checked):onPrepared(spell.id,event.target.checked)}/><span>{tab==='catalog'?'Aprendido':'Preparado'}</span></label>
  </div>
  {spell.level>maxSlotLevel&&<p className="muted-note">El personaje todavía no dispone de espacios de nivel {spell.level}. La selección manual no concede esos espacios.</p>}
  <WizardSpellDetails spell={spell} characterLevel={characterLevel} spellAttackBonus={spellAttackBonus} mode={mode}/>
 </article>;
}
