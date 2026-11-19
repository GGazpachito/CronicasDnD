'use client';
import {useState} from 'react';
import {rollD20,type D20Mode} from '../../../../packages/rules-engine/src/d20';
import {rollDie} from '../../../../packages/rules-engine/src/dice';
import {WEAPONS,type WeaponId} from '../../../../packages/rules-engine/src/martial';
import type {InventoryState} from '../../../../packages/rules-engine/src/inventory';
import type {AbilityScores} from '../../../../packages/rules-engine/src/abilities';
import {warlockWeaponProfile,type WarlockInvocationId} from '../../../../packages/rules-engine/src/warlock';
const signed=(n:number)=>n>=0?'+'+n:String(n);

export function WarlockWeaponAttacks({inventory,scores,proficiency,mode,pactWeaponId,invocations}:{
 inventory:InventoryState;scores:AbilityScores;proficiency:number;mode:D20Mode;pactWeaponId?:WeaponId;invocations:readonly WarlockInvocationId[];
}){
 const [result,setResult]=useState('');
 const [critical,setCritical]=useState(false);
 const [useCharisma,setUseCharisma]=useState(true);
 return <section className="overview-panel panel" aria-label="Ataques con armas de Brujo">
  <div className="overview-panel-heading"><h3>Ataques con arma</h3><span>Equipo marcado</span></div>
  <label className="overview-panel-note"><input type="checkbox" checked={critical} onChange={e=>setCritical(e.target.checked)}/> Daño crítico (duplicar dados)</label>
  {invocations.includes('pact_of_blade')&&<p className="overview-panel-note">{pactWeaponId?'Arma vinculada: '+WEAPONS[pactWeaponId].name:'Selecciona tu arma de pacto en Rasgos.'} El beneficio solo se aplica mientras esté equipada.</p>}
  {invocations.includes('pact_of_blade')&&<label className="overview-panel-note"><input type="checkbox" checked={useCharisma} onChange={e=>setUseCharisma(e.target.checked)}/> Usar Carisma para el arma del pacto</label>}
  {inventory.equipped.weapons.length===0&&<p className="overview-panel-note">Equipa un arma desde Equipo para utilizar sus tiradas.</p>}
  {inventory.equipped.weapons.map(id=>{
   const attack=warlockWeaponProfile(id,inventory,scores,proficiency,invocations,pactWeaponId,useCharisma);
   const name=WEAPONS[id].name;
   const damage=attack.damageDice?String(attack.damageDice.count)+'d'+attack.damageDice.sides:String(attack.fixedDamage);
   return <div className="overview-record" key={id}><span><strong>{name}</strong><small> Ataque {signed(attack.attackBonus)} · {damage} {signed(attack.damageBonus)}{attack.pactActive?' · Pacto activo':''}</small></span>
    <span className="overview-roll-actions"><button type="button" className="overview-roll-button" onClick={()=>{
      try{const r=rollD20(attack.attackBonus,'normal',mode);setResult(name+': ataque '+r.total+' (d20 '+r.chosen+' '+signed(attack.attackBonus)+').');}
      catch(e){setResult(e instanceof Error?e.message:'Error al atacar');}
    }}>Atacar</button><button type="button" className="overview-roll-button" onClick={()=>{
      try{const dice=attack.damageDice?Array.from({length:attack.damageDice.count*(critical?2:1)},()=>rollDie(attack.damageDice!.sides)):[];setResult(name+': daño '+Math.max(0,dice.reduce((a,b)=>a+b,attack.fixedDamage)+attack.damageBonus)+' ('+(dice.join('+')||attack.fixedDamage)+' '+signed(attack.damageBonus)+').');}
      catch(e){setResult(e instanceof Error?e.message:'Error de daño');}
    }}>Daño</button></span></div>;
  })}
  {result&&<p role="status" className="overview-panel-note">{result}</p>}
  <p className="overview-panel-note">Solo las armas simples suman competencia normalmente; el arma vinculada también la suma. El tipo de daño alternativo del pacto lo decide el jugador.</p>
 </section>;
}

/** Módulo propio contiguo a las armas. Cada rayo de Descarga sobrenatural se tira de forma independiente. */
export function WarlockEldritchBlast({known,level,spellAttackBonus,mode}:{known:boolean;level:number;spellAttackBonus:number;mode:D20Mode}){
 const [critical,setCritical]=useState(false);
 const [results,setResults]=useState<string[]>([]);
 const rays=level>=17?4:level>=11?3:level>=5?2:1;
 return <section className="overview-panel panel" aria-label="Descarga sobrenatural">
  <div className="overview-panel-heading"><h3>Descarga sobrenatural</h3><span>Truco · fuerza</span></div>
  <p className="overview-panel-note">{rays} rayo{rays>1?'s':''} · ataque de conjuro {signed(spellAttackBonus)} · 1d10 de fuerza por impacto.</p>
  <label className="overview-panel-note"><input type="checkbox" checked={critical} onChange={e=>setCritical(e.target.checked)}/> Daño crítico (2d10 por impacto)</label>
  {!known&&<p className="overview-panel-note">Aún no conoces este truco. Puedes elegirlo en la creación de Brujo.</p>}
  <div className="overview-quick-actions">
   <button type="button" disabled={!known} onClick={()=>{
    try{setResults(Array.from({length:rays},(_,i)=>{const r=rollD20(spellAttackBonus,'normal',mode);return 'Rayo '+(i+1)+': ataque '+r.total+' (d20 '+r.chosen+' '+signed(spellAttackBonus)+')';}));}
    catch(e){setResults([e instanceof Error?e.message:'No se pudo realizar la tirada']);}
   }}>Lanzar {rays===1?'rayo':'rayos'} · d20</button>
   <button type="button" disabled={!known} onClick={()=>{
    try{setResults(Array.from({length:rays},(_,i)=>{const dice=Array.from({length:critical?2:1},()=>rollDie(10));return 'Rayo '+(i+1)+': daño '+dice.reduce((a,b)=>a+b,0)+' ('+dice.join('+')+')';}));}
    catch(e){setResults([e instanceof Error?e.message:'No se pudo lanzar el daño']);}
   }}>Tirar daño · d10</button>
  </div>
  {results.length>0&&<output className="overview-panel-note" aria-live="polite">{results.map((line,i)=><p key={i}>{line}</p>)}</output>}
  <p className="overview-panel-note">No consume ranuras. El jugador elige los objetivos, verifica impactos y decide cuándo tirar daño. Los rayos adicionales se desbloquean en niveles posteriores.</p>
 </section>;
}
