'use client';
import {useState} from 'react';
import {rollD20,type D20Mode} from '../../../../packages/rules-engine/src/d20';
import {rollDie} from '../../../../packages/rules-engine/src/dice';
import {WEAPONS,type WeaponId} from '../../../../packages/rules-engine/src/martial';
import type {InventoryState} from '../../../../packages/rules-engine/src/inventory';
import type {AbilityScores} from '../../../../packages/rules-engine/src/abilities';
import {warlockWeaponProfile,type WarlockInvocationId} from '../../../../packages/rules-engine/src/warlock';
import {WeaponRollCards,weaponAttackCard,type WeaponRollCard} from './WeaponRollCards';
const signed=(n:number)=>n>=0?'+'+n:String(n);

export function WarlockWeaponAttacks({inventory,scores,proficiency,mode,pactWeaponId,invocations,pactSlotLevel=3}:{
 inventory:InventoryState;scores:AbilityScores;proficiency:number;mode:D20Mode;pactWeaponId?:WeaponId;invocations:readonly WarlockInvocationId[];pactSlotLevel?:number;
}){
 const [results,setResults]=useState<WeaponRollCard[]>([]);
 const [error,setError]=useState('');
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
      try{setResults([weaponAttackCard(`${name} · Ataque`,rollD20(attack.attackBonus,'normal',mode))]);setError('');}
      catch(e){setResults([]);setError(e instanceof Error?e.message:'Error al atacar');}
    }}>Atacar</button>{attack.pactActive&&invocations.includes('thirsting_blade')&&<button type="button" className="overview-roll-button" onClick={()=>{
      try{setResults(Array.from({length:2},(_,index)=>weaponAttackCard(`${name} · Ataque ${index+1}`,rollD20(attack.attackBonus,'normal',mode))));setError('');}
      catch(e){setResults([]);setError(e instanceof Error?e.message:'Error en los ataques');}
    }}>Atacar ×2</button>}{attack.pactActive&&invocations.includes('eldritch_smite')&&<button type="button" className="overview-roll-button" onClick={()=>{
      try{const count=(pactSlotLevel+1)*(critical?2:1),dice=Array.from({length:count},()=>rollDie(8));setResults([{label:`${name} · Castigo sobrenatural`,kind:'damage',dice,bonus:0,total:dice.reduce((sum,die)=>sum+die,0),formula:`${count}d8 · fuerza${critical?' · crítico':''}`,critical,note:`Ranura de nivel ${pactSlotLevel}: marca el gasto manualmente; una vez por turno.`}]);setError('');}
      catch(e){setResults([]);setError(e instanceof Error?e.message:'Error en Castigo sobrenatural');}
    }}>Castigo · {(pactSlotLevel+1)*(critical?2:1)}d8</button>}<button type="button" className="overview-roll-button" onClick={()=>{
      try{const dice=attack.damageDice?Array.from({length:attack.damageDice.count*(critical?2:1)},()=>rollDie(attack.damageDice!.sides)):[];const fixed=attack.fixedDamage;setResults([{label:`${name} · Daño`,kind:'damage',dice,bonus:attack.damageBonus,fixedDamage:fixed,total:Math.max(0,dice.reduce((a,b)=>a+b,fixed)+attack.damageBonus),formula:`${dice.length?`${dice.length}d${attack.damageDice!.sides}`:'Fijo'}${critical?' · crítico':''}`,critical}]);setError('');}
      catch(e){setResults([]);setError(e instanceof Error?e.message:'Error de daño');}
    }}>Daño</button></span></div>;
  })}
  {error&&<p className="overview-dice-error" role="alert">{error}</p>}
  <WeaponRollCards rolls={results}/>
  <p className="overview-panel-note">Solo las armas simples suman competencia normalmente; el arma vinculada también la suma. Hoja sedienta y Castigo sobrenatural solo se muestran en el arma del pacto equipada. Las ranuras y la condición Derribado se gestionan manualmente.</p>
 </section>;
}

/** Módulo propio contiguo a las armas. Cada rayo de Descarga sobrenatural se tira de forma independiente. */
type BlastRoll=Readonly<{label:string;kind:'attack'|'damage';dice:readonly number[];bonus:number;total:number;critical?:boolean}>;
export function WarlockEldritchBlast({known,level,spellAttackBonus,charismaModifier,invocations,mode}:{known:boolean;level:number;spellAttackBonus:number;charismaModifier:number;invocations:readonly WarlockInvocationId[];mode:D20Mode}){
 const [critical,setCritical]=useState(false);
 const [results,setResults]=useState<BlastRoll[]>([]);
 const [error,setError]=useState('');
 const rays=level>=17?4:level>=11?3:level>=5?2:1;
 const agonizing=invocations.includes('agonizing_blast');
 const bonus=agonizing?charismaModifier:0;
 const range=invocations.includes('eldritch_spear')?120+30*level:120;
 return <section className="overview-panel panel" aria-label="Descarga sobrenatural">
  <div className="overview-panel-heading"><h3>Descarga sobrenatural</h3><span>Truco · fuerza</span></div>
  <p className="overview-panel-note">{rays} rayo{rays>1?'s':''} · alcance {range} pies · ataque de conjuro {signed(spellAttackBonus)} · 1d10{agonizing?` ${signed(bonus)}`:''} de fuerza por impacto.</p>
  <label className="overview-panel-note"><input type="checkbox" checked={critical} onChange={e=>setCritical(e.target.checked)}/> Daño crítico (2d10 por impacto)</label>
  {!known&&<p className="overview-panel-note">Aún no conoces este truco. Puedes elegirlo en la creación de Brujo.</p>}
  <div className="overview-quick-actions">
   <button type="button" disabled={!known} onClick={()=>{
    try{setError('');setResults(Array.from({length:rays},(_,i)=>{const r=rollD20(spellAttackBonus,'normal',mode);return {label:`Rayo ${i+1}`,kind:'attack' as const,dice:[r.chosen],bonus:spellAttackBonus,total:r.total};}));}
    catch(e){setResults([]);setError(e instanceof Error?e.message:'No se pudo realizar la tirada');}
   }}>Lanzar {rays===1?'rayo':'rayos'} · d20</button>
   <button type="button" disabled={!known} onClick={()=>{
    try{setError('');setResults(Array.from({length:rays},(_,i)=>{const dice=Array.from({length:critical?2:1},()=>rollDie(10));return {label:`Rayo ${i+1}`,kind:'damage' as const,dice,bonus,total:Math.max(0,dice.reduce((a,b)=>a+b,0)+bonus),critical};}));}
    catch(e){setResults([]);setError(e instanceof Error?e.message:'No se pudo lanzar el daño');}
   }}>Tirar daño · d10</button>
  </div>
  {error&&<p className="error" role="alert">{error}</p>}
  {results.length>0&&<output className="warlock-blast-results" aria-live="polite">{results.map((roll,index)=><article key={`${roll.kind}-${index}`} className="overview-roll-result warlock-blast-result"><div className="overview-roll-result-heading"><strong>{roll.label} · {roll.kind==='attack'?'Ataque':'Daño de fuerza'}</strong><span>{roll.kind==='attack'?'d20':roll.critical?'Crítico · 2d10':'1d10'}</span></div><div className="overview-roll-equation"><div className="overview-roll-dice">{roll.dice.map((die,dieIndex)=><span key={dieIndex} className="overview-die is-chosen">{die}</span>)}</div><div className="overview-roll-formula">{signed(roll.bonus)} <span aria-hidden="true">=</span> <strong>{roll.total}</strong></div></div><small>{roll.dice.join(' + ')} {signed(roll.bonus)} = {roll.total}</small></article>)}</output>}
  {invocations.includes('repelling_blast')&&<p className="overview-panel-note">Descarga repelente: al impactar puedes empujar al objetivo hasta 10 pies; el desplazamiento lo decides manualmente.</p>}
  <p className="overview-panel-note">No consume ranuras. El jugador elige los objetivos, verifica impactos y decide cuándo tirar daño. Los rayos son ataques independientes; el segundo se desbloquea en el nivel 5, el tercero en el 11 y el cuarto en el 17.</p>
 </section>;
}
