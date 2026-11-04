"use client";

import { useMemo, useState } from "react";
import { calculateGuidedFighter, BACKGROUNDS, FIGHTER_SKILL_OPTIONS, HUMAN_FEATS, type BackgroundId, type SpeciesId, type ElfLineage, type GuidedFighterInput } from "../../../../packages/rules-engine/src/guided";
import { ABILITIES, type Ability, type AbilityScores } from "../../../../packages/rules-engine/src/abilities";
import { SKILLS, type Skill } from "../../../../packages/rules-engine/src/proficiencies";
import type { ArmorId } from "../../../../packages/rules-engine/src/defense";

const NAMES: Record<Ability, string> = {strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
const SKILL_NAMES: Record<Skill,string> = {
  acrobatics:'Acrobacias',animal_handling:'Trato con animales',arcana:'Arcanos',athletics:'Atletismo',deception:'Engaño',history:'Historia',insight:'Perspicacia',intimidation:'Intimidación',investigation:'Investigación',medicine:'Medicina',nature:'Naturaleza',perception:'Percepción',performance:'Interpretación',persuasion:'Persuasión',religion:'Religión',sleight_of_hand:'Juego de manos',stealth:'Sigilo',survival:'Supervivencia'
};
const ARMOR_OPTIONS: ReadonlyArray<{id:ArmorId|null;name:string}> = [
{id:null,name:'Sin armadura'},{id:'leather',name:'Cuero'},{id:'studded_leather',name:'Cuero tachonado'},{id:'hide',name:'Pieles'},
{id:'chain_shirt',name:'Camisa de malla'},{id:'scale_mail',name:'Cota de escamas'},{id:'breastplate',name:'Coraza'},
{id:'half_plate',name:'Media armadura'},{id:'ring_mail',name:'Cota de anillas'},{id:'chain_mail',name:'Cota de malla'},
{id:'splint',name:'Bandas'},{id:'plate',name:'Placas'}
];
const FEATURES:Record<string,string>={fighting_style:'Estilo de combate (pendiente de elegir)',second_wind:'Segundo aliento',weapon_mastery:'Maestría de armas (pendiente de elegir)',action_surge:'Acción súbita',tactical_mind:'Mente táctica',champion_improved_critical:'Crítico mejorado',champion_remarkable_athlete:'Atleta extraordinario'};
const FEATS = {alert:'Alerta',tough:'Duro',savage_attacker:'Ataque salvaje'} as const;
const originFeatName=(x:string)=>({magic_initiate_cleric:'Iniciado en la Magia (Clérigo)',magic_initiate_wizard:'Iniciado en la Magia (Mago)',alert:'Alerta',savage_attacker:'Ataque salvaje'} as Record<string,string>)[x]??x;
const signed=(n:number)=>n>=0?`+${n}`:String(n);
const validSkills=(bg:BackgroundId)=>FIGHTER_SKILL_OPTIONS.filter(s=>!(BACKGROUNDS[bg].skills as readonly string[]).includes(s));
function initialForBackground(bg:BackgroundId):{plusTwoAbility:Ability;plusOneAbility:Ability;fighterSkills:Skill[]}{
const b=BACKGROUNDS[bg];return {plusTwoAbility:b.abilities[0] as Ability,plusOneAbility:b.abilities[1] as Ability,fighterSkills:validSkills(bg).slice(0,2)};
}
export default function Home(){
  const [step,setStep]=useState(0);
  const [name,setName]=useState('Aldric');
  const [level,setLevel]=useState<1|2|3>(1);
  const [background,setBackground]=useState<BackgroundId>('soldier');
  const [species,setSpecies]=useState<SpeciesId>('human');
  const [scores,setScores]=useState<AbilityScores>({strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8});
  const [mode,setMode]=useState<'two_plus_one'|'three_ones'>('two_plus_one');
  const [two,setTwo]=useState<Ability>('strength');
  const [one,setOne]=useState<Ability>('dexterity');
  const [fighterSkills,setFighterSkills]=useState<Skill[]>(['perception','survival']);
  const [humanSkill,setHumanSkill]=useState<Skill>('investigation');
  const [humanFeat,setHumanFeat]=useState<'alert'|'tough'|'savage_attacker'>('tough');
  const [humanSize,setHumanSize]=useState<'small'|'medium'>('medium');
  const [lineage,setLineage]=useState<ElfLineage>('wood_elf');
  const [elfSkill,setElfSkill]=useState<'insight'|'perception'|'survival'>('insight');
  const [elfSpell,setElfSpell]=useState<'intelligence'|'wisdom'|'charisma'>('intelligence');
  const [armor,setArmor]=useState<ArmorId|null>('chain_mail');
  const [shield,setShield]=useState(true);
  const bg=BACKGROUNDS[background];
  const allowed=bg.abilities as readonly Ability[];
  function onBackground(next:BackgroundId){const defaults=initialForBackground(next);setBackground(next);setTwo(defaults.plusTwoAbility);setOne(defaults.plusOneAbility);setFighterSkills(defaults.fighterSkills);}
  const input:GuidedFighterInput={name,level,background,species,assignedAbilities:scores,increaseMode:mode,plusTwoAbility:two,plusOneAbility:one,fighterSkills,humanSkill,humanFeat,humanSize,elfLineage:lineage,elfSenseSkill:elfSkill,elfSpellAbility:elfSpell,armor,shield};
  const output=useMemo(()=>{try{return {result:calculateGuidedFighter(input),error:null};}catch(e){return {result:null,error:e instanceof Error?e.message:'Error al crear el personaje'};}},[name,level,background,species,scores,mode,two,one,fighterSkills,humanSkill,humanFeat,humanSize,lineage,elfSkill,elfSpell,armor,shield]);
  const sheet=output.result?.sheet;
  const taken=[...bg.skills,...fighterSkills];
  const humanCandidates=SKILLS.filter(s=>!taken.includes(s));
  const elfCandidates=(['insight','perception','survival'] as const).filter(s=>!taken.includes(s));
  const setSkillAt=(slot:number,skill:Skill)=>setFighterSkills(prev=>prev.map((s,i)=>i===slot?skill:s));
  const STEPS=['Identidad','Origen','Características','Competencias','Equipo'];
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Creador guiado · D&D 2024</span></div></div><div className="status"><span className="status-dot"/> Motor conectado · Sin guardado</div></header>
    <div className="content">
      <div className="intro"><div><span className="eyebrow">PROTOTIPO 02 / CREACIÓN GUIADA</span><h1>Da forma a <em>tu aventurero.</em></h1><p>Guerrero de niveles 1–3. Tus decisiones de origen se validan y se reflejan en la hoja calculada.</p></div><span className="edition">PHB 2024 + SRD</span></div>
      <nav className="wizard-tabs" aria-label="Pasos de creación">{STEPS.map((s,i)=><button type="button" key={s} className={step===i?'active':''} aria-current={step===i?'step':undefined} onClick={()=>setStep(i)}><span>{String(i+1).padStart(2,'0')}</span>{s}</button>)}</nav>
      <div className="workspace">
        <aside className="editor panel">
          <div className="panel-heading"><div><span className="eyebrow">PASO {step+1} DE {STEPS.length}</span><h2>{STEPS[step]}</h2></div><span className="step-marker">MVP</span></div>
          {step===0&&<>
            <label className="field"><span>Nombre del personaje</span><input value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label>
            <div className="field"><span className="field-label">Clase</span><div className="info-line">Guerrero (única clase disponible en esta versión)</div></div>
            <div className="field"><span className="field-label">Nivel</span><div className="level-picker">{([1,2,3] as const).map(n=><button key={n} type="button" className={level===n?'active':''} onClick={()=>setLevel(n)}>Nivel {n}</button>)}</div></div>
            {level===3&&<div className="info-line">Subclase: Campeón. El resto se añadirá después.</div>}
          </>}
          {step===1&&<>
            <label className="field"><span>Trasfondo</span><select value={background} onChange={e=>onBackground(e.target.value as BackgroundId)}>{Object.entries(BACKGROUNDS).map(([id,b])=><option key={id} value={id}>{b.name}</option>)}</select></label>
            <div className="origin-detail"><strong>Dote: {originFeatName(bg.feat)}</strong><small>Competencias: {bg.skills.map(s=>SKILL_NAMES[s as Skill]).join(', ')}</small><small>Herramienta: {bg.tool}</small></div>
            <label className="field"><span>Especie</span><select value={species} onChange={e=>setSpecies(e.target.value as SpeciesId)}><option value="human">Humano</option><option value="dwarf">Enano</option><option value="elf">Elfo</option></select></label>
            {species==='human'&&<><label className="field"><span>Tamaño</span><select value={humanSize} onChange={e=>setHumanSize(e.target.value as 'small'|'medium')}><option value="medium">Mediano</option><option value="small">Pequeño</option></select></label><label className="field"><span>Dote de origen adicional (selección provisional)</span><select value={humanFeat} onChange={e=>setHumanFeat(e.target.value as typeof humanFeat)}>{HUMAN_FEATS.filter(f=>f!==bg.feat).map(f=><option key={f} value={f}>{FEATS[f]}</option>)}</select></label></>}
            {species==='elf'&&<><label className="field"><span>Linaje élfico</span><select value={lineage} onChange={e=>setLineage(e.target.value as ElfLineage)}><option value="drow">Drow</option><option value="high_elf">Alto elfo</option><option value="wood_elf">Elfo de los bosques</option></select></label><label className="field"><span>Característica para conjuros del linaje</span><select value={elfSpell} onChange={e=>setElfSpell(e.target.value as typeof elfSpell)}>{(['intelligence','wisdom','charisma'] as const).map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label></>}
            {species==='dwarf'&&<div className="info-line">Robustez enana: +1 PG máximo por nivel (automatizado).</div>}
          </>}
          {step===2&&<>
            <div className="section-label"><h3>Matriz estándar</h3><span>15, 14, 13, 12, 10, 8</span></div>
            <div className="ability-inputs">{ABILITIES.map(a=><label className="ability-input" key={a}><span>{NAMES[a].slice(0,3).toUpperCase()}</span><select aria-label={NAMES[a]} value={scores[a]} onChange={e=>setScores(prev=>({...prev,[a]:Number(e.target.value)}))}>{[15,14,13,12,10,8].map(v=><option key={v} value={v}>{v}</option>)}</select><small>{NAMES[a]}</small></label>)}</div>
            <p className="muted-note">Asigna cada valor una sola vez. Si repites alguno, se mostrará el error y no se calculará la hoja.</p>
            <div className="divider"/><div className="section-label"><h3>Mejoras del trasfondo</h3></div>
            <label className="field"><span>Distribución</span><select value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="two_plus_one">+2 y +1 a características distintas</option><option value="three_ones">+1 a las tres características</option></select></label>
            {mode==='two_plus_one'&&<><label className="field"><span>Característica que recibe +2</span><select value={two} onChange={e=>setTwo(e.target.value as Ability)}>{allowed.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label><label className="field"><span>Característica que recibe +1</span><select value={one} onChange={e=>setOne(e.target.value as Ability)}>{allowed.map(a=><option key={a} value={a}>{NAMES[a]}</option>)}</select></label></>}
            <p className="muted-note">Opciones del trasfondo: {allowed.map(a=>NAMES[a]).join(', ')}.</p>
          </>}
          {step===3&&<>
            <p className="muted-note">El Guerrero elige dos habilidades. El trasfondo ya concede dos competencias adicionales.</p>
            {([0,1] as const).map(i=><label key={i} className="field"><span>Habilidad del Guerrero {i+1}</span><select value={fighterSkills[i]} onChange={e=>setSkillAt(i,e.target.value as Skill)}>{validSkills(background).map(s=><option key={s} value={s}>{SKILL_NAMES[s]}</option>)}</select></label>)}
            {species==='human'&&<label className="field"><span>Habilidad adicional del Humano</span><select value={humanSkill} onChange={e=>setHumanSkill(e.target.value as Skill)}>{[humanSkill,...humanCandidates].filter((s,i,arr)=>arr.indexOf(s)===i).map(s=><option key={s} value={s}>{SKILL_NAMES[s]}</option>)}</select></label>}
            {species==='elf'&&<label className="field"><span>Sentidos agudos (Elfo)</span><select value={elfSkill} onChange={e=>setElfSkill(e.target.value as typeof elfSkill)}>{[elfSkill,...elfCandidates].filter((s,i,arr)=>arr.indexOf(s)===i).map(s=><option key={s} value={s}>{SKILL_NAMES[s]}</option>)}</select></label>}
            <div className="origin-detail"><strong>Salvaciones del Guerrero</strong><small>Fuerza y Constitución</small></div>
          </>}
          {step===4&&<>
            <label className="field"><span>Armadura equipada</span><select value={armor??'none'} onChange={e=>setArmor(e.target.value==='none'?null:e.target.value as ArmorId)}>{ARMOR_OPTIONS.map(a=><option key={a.id??'none'} value={a.id??'none'}>{a.name}</option>)}</select></label>
            <label className="switch-field"><span><strong>Escudo equipado</strong><small>El Guerrero tiene entrenamiento</small></span><input type="checkbox" checked={shield} onChange={e=>setShield(e.target.checked)}/></label>
            <p className="muted-note">Este paso permite probar el equipo. Todavía no valida los paquetes iniciales A/B/C del Guerrero ni los objetos del trasfondo.</p>
          </>}
          <div className="wizard-actions"><button type="button" disabled={step===0} onClick={()=>setStep(x=>Math.max(0,x-1))}>Anterior</button><button type="button" disabled={step===STEPS.length-1} onClick={()=>setStep(x=>Math.min(STEPS.length-1,x+1))}>Siguiente</button></div>
          <div className="editor-footnote">Creación parcial y sin guardado. Los contenidos no automatizados aparecen identificados en la hoja.</div>
        </aside>
        <section className="preview panel" aria-live="polite">
          <div className="panel-heading"><div><span className="eyebrow">HOJA EN VIVO</span><h2>{name.trim()||'Sin nombre'}</h2><p>Guerrero {level}{level===3?' · Campeón':''} · {bg.name} · {species==='human'?'Humano':species==='dwarf'?'Enano':'Elfo'}</p></div><span className="roundel">{level}</span></div>
          {output.error&&<div className="error" role="alert"><strong>Revisa tus elecciones.</strong><p>{output.error}</p></div>}
          {sheet&&output.result&&<>
            <div className="stat-cards"><div className="stat-card"><span>PG MÁXIMOS</span><strong>{sheet.maximumHitPoints}</strong><small>{sheet.hitDice.total}d{sheet.hitDice.die} dados de golpe</small></div><div className="stat-card"><span>CLASE DE ARMADURA</span><strong>{sheet.armorClass}</strong><small>{sheet.armorClassDetails.formula}</small></div><div className="stat-card"><span>INICIATIVA</span><strong>{signed(sheet.initiative)}</strong><small>{sheet.initiativeRollMode==='advantage'?'Ventaja':sheet.initiativeRollMode==='disadvantage'?'Desventaja':'Normal'}</small></div></div>
            <div className="preview-section"><div className="section-label"><h3>Características finales</h3><span>Competencia {signed(sheet.proficiencyBonus)}</span></div><div className="ability-grid">{ABILITIES.map(a=><div className="ability-stat" key={a}><span>{NAMES[a].slice(0,3).toUpperCase()}</span><strong>{sheet.abilityScores[a]}</strong><small>{signed(sheet.abilityModifiers[a])}</small></div>)}</div></div>
            <div className="two-col"><div className="preview-section"><div className="section-label"><h3>Habilidades</h3><span>Competencias elegidas</span></div><div className="data-list">{SKILLS.map(k=><div className="data-row" key={k}><span>{SKILL_NAMES[k]} {taken.includes(k)||((species==='human'&&humanSkill===k)||(species==='elf'&&elfSkill===k))?'•':''}</span><span><strong>{signed(sheet.skillBonuses[k])}</strong>{sheet.skillRollModes[k]!=='normal'&&<b className="mode-chip">{sheet.skillRollModes[k]==='advantage'?'Ventaja':'Desventaja'}</b>}</span></div>)}</div></div><div className="preview-section"><div className="section-label"><h3>Origen y rasgos</h3><span>PHB 2024</span></div><div className="resource-grid">{Object.entries(sheet.resources).map(([id,r])=>r&&<div className="resource-card" key={id}><span>{id==='second_wind'?'Segundo aliento':'Acción súbita'}</span><strong>{r.current}/{r.maximum}</strong></div>)}</div><p className="muted-note">Tamaño: {output.result.origin.size==='medium'?'Mediano':'Pequeño'} · Velocidad: {output.result.origin.speedFeet} pies</p><p className="muted-note">Dote del trasfondo: {originFeatName(bg.feat)}{output.result.origin.additionalFeat?` · Dote humana: ${FEATS[output.result.origin.additionalFeat]}`:''}</p><ul className="feature-list">{sheet.features.map(f=><li key={f}>{FEATURES[f]??f}</li>)}</ul></div></div>
            <div className="preview-section pending-section"><div className="section-label"><h3>Automatizaciones pendientes</h3><span>{output.result.pendingAutomation.length}</span></div><ul className="feature-list">{output.result.pendingAutomation.map((p,i)=><li key={i}>{p}</li>)}</ul></div>
            {sheet.warnings.length>0&&<div className="warning" role="status">{sheet.warnings.includes('heavy_armor_strength_requirement_unmet')&&<p>La armadura pesada no cumple el requisito de Fuerza.</p>}{sheet.warnings.includes('armor_stealth_disadvantage')&&<p>La armadura impone desventaja en Sigilo.</p>}</div>}
          </>}
        </section>
      </div><footer className="footer">Prototipo local, sin persistencia. No equivale a una hoja completa y validada de D&D 2024.</footer>
    </div>
  </main>;
}
