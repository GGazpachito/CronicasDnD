'use client';
import {useState} from 'react';
import {ABILITIES,type Ability} from '../../../../packages/rules-engine/src/abilities';
import {type CompanionSheet} from '../../../../packages/rules-engine/src/companions';
import {rollD20} from '../../../../packages/rules-engine/src/d20';

const LABELS:Record<Ability,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
const signed=(n:number)=>`${n>=0?'+':''}${n}`;

/** Misma ficha de criatura para compañeros manuales, familiares y Bestiario. */
export default function CreatureStatBlock({sheet,readOnly=false}:Readonly<{sheet:CompanionSheet;readOnly?:boolean}>){
 const [lastRoll,setLastRoll]=useState('');
 function roll(label:string,modifier:number){
  try{const result=rollD20(modifier,'normal','normal');setLastRoll(`${label}: d20 ${result.chosen} ${signed(modifier)} = ${result.total}`);}
  catch(reason){setLastRoll(reason instanceof Error?reason.message:'No se pudo tirar el d20');}
 }
 const dexterity=Math.floor((sheet.abilities.dexterity-10)/2);
 return <article className="shared-companion-sheet" aria-label={`Ficha de ${sheet.name}`}>
  <header><h3>{sheet.name}</h3><p>{sheet.creatureType||'Criatura'} · {sheet.size} · Velocidad {sheet.speed}{sheet.challengeRating&&` · Desafío ${sheet.challengeRating}`}</p></header>
  <div className="shared-companion-vitals"><div><span>CA</span><strong>{sheet.armorClass}</strong></div><div><span>PG</span><strong>{sheet.hitPoints}/{sheet.hitPointsMaximum}</strong></div><div><span>Competencia</span><strong>{signed(sheet.proficiencyBonus)}</strong></div></div>
  <h4>Características</h4><div className="shared-companion-ability-cards">{ABILITIES.map(ability=><div key={ability}><span>{LABELS[ability]}</span><strong>{sheet.abilities[ability]}</strong><small>{signed(Math.floor((sheet.abilities[ability]-10)/2))}</small><button type="button" className="overview-roll-button" onClick={()=>roll(LABELS[ability],Math.floor((sheet.abilities[ability]-10)/2))}>Tirar</button></div>)}</div>
  <div className="shared-companion-fields"><p><strong>Iniciativa:</strong> {signed(dexterity)} <button type="button" className="overview-roll-button" onClick={()=>roll('Iniciativa',dexterity)}>Tirar</button></p><p><strong>Salvaciones:</strong> {sheet.savingThrows||'—'}</p><p><strong>Habilidades:</strong> {sheet.skills||'—'}</p><p><strong>Sentidos:</strong> {sheet.senses||'—'}</p><p><strong>Idiomas:</strong> {sheet.languages||'—'}</p><p><strong>Defensas:</strong> {sheet.defenses||'—'}</p></div>
  <h4>Ataques</h4>{sheet.attacks.length===0?<p className="muted-note">Sin ataques registrados.</p>:<div className="overview-records">{sheet.attacks.map(attack=><div key={attack.id} className="overview-record"><span><strong>{attack.name}</strong><small>{attack.damage} {attack.notes&&`· ${attack.notes}`}</small></span><strong>{signed(attack.attackBonus)}</strong><button type="button" className="overview-roll-button" onClick={()=>roll(attack.name,attack.attackBonus)}>Tirar ataque</button></div>)}</div>}
  {lastRoll&&<p className="overview-roll-result" role="status" aria-live="polite">{lastRoll}</p>}
  <h4>Rasgos</h4><p className="shared-companion-prose">{sheet.traits||'Sin rasgos registrados.'}</p><h4>Acciones / reacciones</h4><p className="shared-companion-prose">{sheet.actions||'Sin acciones registradas.'}</p><h4>Equipo</h4><p className="shared-companion-prose">{sheet.equipment||'Sin equipo registrado.'}</p><h4>Notas</h4><p className="shared-companion-prose">{sheet.notes||'Sin notas.'}</p>
  {readOnly&&<p className="bestiary-read-only"><strong>Ficha de referencia.</strong> Los PG y rasgos mostrados son los valores originales del bloque; no se guardan cambios de combate aquí.</p>}
 </article>;
}
