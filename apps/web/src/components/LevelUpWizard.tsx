"use client";

import {useMemo,useRef,useState} from 'react';
import LevelUpDialogFrame from './LevelUpDialogFrame';
import {ABILITIES,type Ability} from '../../../../packages/rules-engine/src/abilities';
import {EPIC_BOONS,type EpicBoonId} from '../../../../packages/rules-engine/src/epic-boons';
import {type GuidedFighterInput} from '../../../../packages/rules-engine/src/guided';
import {initialAdventureState,type AdventureState} from '../../../../packages/rules-engine/src/adventure';
import {prepareFighterLevelUp,prepareFighterLevelUpWithFreshSession} from '../../../../packages/rules-engine/src/level-up';
import {FIGHTER_LEVEL_MILESTONES,fighterLevelUpRequirements,explainFighterMilestone,previewFighterLevelUp,type FighterLevelUpChoices} from '../../../../packages/rules-engine/src/level-up-wizard';
import {FIGHTING_STYLES,WEAPONS,type FightingStyleId,type WeaponId} from '../../../../packages/rules-engine/src/martial';
import {type CharacterSnapshot} from '../../../../packages/rules-engine/src/persistence';
import {type FighterAbilityImprovement} from '../../../../packages/rules-engine/src/progression';
import {FIGHTING_STYLE_EXPLANATIONS,MASTERY_EXPLANATIONS,EPIC_BOON_EXPLANATIONS} from '../../../../packages/rules-engine/src/rules-explanations';

const ABILITY_LABELS:Record<Ability,string>={
  strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',
  intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma',
};
const RESOURCE_LABELS={second_wind:'Segundo aliento',action_surge:'Acción súbita',indomitable:'Indomable'} as const;

function Explanation({text}:{text:string|undefined}){
  return text?<p className="level-wizard-explanation">{text}</p>:null;
}

type Props={
  input:GuidedFighterInput;
  adventure:AdventureState|null;
  outOfSync:boolean;
  onClose:()=>void;
  onConfirmed:(snapshot:CharacterSnapshot,synchronized:boolean,freshSession:boolean)=>void;
};

/** Las elecciones viven aquí hasta el botón final. No se escriben en React padre. */
export default function LevelUpWizard({input,adventure,outOfSync,onClose,onConfirmed}:Props){
  const [stage,setStage]=useState<0|1|2>(0);
  const [improvement,setImprovement]=useState<FighterAbilityImprovement>({mode:'plus_two',first:'strength'});
  const [mastery,setMastery]=useState<WeaponId|''>('');
  const [style,setStyle]=useState<FightingStyleId|''>('');
  const [boon,setBoon]=useState<EpicBoonId|''>('');
  const [boonAbility,setBoonAbility]=useState<Ability>('strength');
  const [allowSync,setAllowSync]=useState(false);
  const [allowFresh,setAllowFresh]=useState(false);
  const [showRecovery,setShowRecovery]=useState(false);
  const [commitError,setCommitError]=useState('');
  const submitting=useRef(false);
  const target=input.level+1;
  const requirements=fighterLevelUpRequirements(target);
  const choices=useMemo<FighterLevelUpChoices>(()=>({
    ...(requirements.improvement?{improvement}:{}),
    ...(requirements.mastery&&mastery?{newMastery:mastery}:{}),
    ...(requirements.additionalStyle&&style?{additionalFightingStyle:style}:{}),
    ...(requirements.epicBoon&&boon?{epicBoon:{id:boon,ability:boonAbility}}:{}),
  }),[requirements.improvement,requirements.mastery,requirements.additionalStyle,requirements.epicBoon,improvement,mastery,style,boon,boonAbility]);
  const assessment=useMemo(()=>{
    try{return {preview:previewFighterLevelUp(input,choices),error:''};}
    catch(e){return {preview:null,error:e instanceof Error?e.message:'Elecciones inválidas'};}
  },[input,choices]);
  const before=assessment.preview?.before.sheet;
  const after=assessment.preview?.after.sheet;
  const milestones=FIGHTER_LEVEL_MILESTONES[target]??['Progresión de nivel'];

  function changeImprovementMode(mode:FighterAbilityImprovement['mode']){
    setImprovement(mode==='plus_two'
      ?{mode:'plus_two',first:improvement.first}
      :{mode:'two_ones',first:improvement.first,second:improvement.first==='constitution'?'dexterity':'constitution'});
  }
  function changeFirst(first:Ability){
    setImprovement(prev=>prev.mode==='plus_two'
      ?{mode:'plus_two',first}
      :{mode:'two_ones',first,second:prev.second===first?(first==='constitution'?'dexterity':'constitution'):prev.second});
  }
  function confirm(){
    if(submitting.current||!assessment.preview)return;
    submitting.current=true;
    setCommitError('');
    try{
      const candidate=assessment.preview.input;
      if(outOfSync&&!allowSync&&!allowFresh)
        throw new RangeError('La partida está desincronizada. Debes autorizar la sincronización antes de avanzar.');
      if(allowFresh){
        const transition=prepareFighterLevelUpWithFreshSession(input,candidate);
        onConfirmed(transition.snapshot,false,true);
      }else{
        const source=adventure??initialAdventureState(assessment.preview.before.sheet);
        const transition=prepareFighterLevelUp(input,source,candidate,allowSync);
        onConfirmed(transition.snapshot,transition.synchronizedBeforeAdvance,false);
      }
    }catch(e){
      setCommitError(e instanceof Error?e.message:'No se ha podido completar la subida');
      setShowRecovery(true);
      submitting.current=false;
    }
  }
  if(input.level>=20)return null;
  return <LevelUpDialogFrame eyebrow="PROGRESIÓN · GUERRERO / CAMPEÓN" title={`Subir del nivel ${input.level} al ${target}`} subtitle="Las elecciones se aplicarán juntas al confirmar. Puedes cancelar sin alterar tu personaje." stage={stage} onClose={onClose} footer={<>
        <button type="button" className="level-wizard-cancel" onClick={onClose}>Cancelar</button>
        <div className="level-wizard-actions-right">
          {stage>0&&<button type="button" className="level-wizard-back" onClick={()=>{setStage(prev=>(prev-1) as 0|1|2);setCommitError('');}}>Atrás</button>}
          {stage<2?<button type="button" onClick={()=>setStage(prev=>(prev+1) as 0|1|2)} disabled={stage===1&&!assessment.preview}>Siguiente</button>
            :<button type="button" onClick={confirm} disabled={!assessment.preview||(outOfSync&&!allowSync&&!allowFresh)}>
              {allowFresh?'Confirmar con sesión nueva':'Confirmar subida a nivel '+target}
            </button>}
        </div>
</>}>

        {stage===0&&<div className="level-wizard-section">
          <h3>Qué recibes al alcanzar el nivel {target}</h3>
          <ul className="level-wizard-milestones">{milestones.map(item=><li key={item}><strong>{item}</strong><Explanation text={explainFighterMilestone(item)}/></li>)}</ul>
          <p className="muted-note">Las capacidades que dependen de decisiones tácticas siguen siendo manuales. Solo automatizamos sus efectos pasivos ya implementados.</p>
          {requirements.improvement&&<p className="level-wizard-note">Este nivel permite elegir otras dotes generales según el manual; el catálogo actual solo implementa <strong>Mejora de característica</strong>. No se simulan las demás opciones.</p>}
          {target===3&&<p className="level-wizard-note">El creador implementa por ahora únicamente la subclase <strong>Campeón</strong>. No se ofrecen subclases que todavía no tienen motor de reglas.</p>}
        </div>}
        {stage===1&&<div className="level-wizard-section">
          <h3>Decisiones de este nivel</h3>
          {!requirements.improvement&&!requirements.mastery&&!requirements.additionalStyle&&!requirements.epicBoon&&<p className="level-wizard-note">Este nivel no necesita elecciones adicionales en el sistema implementado.</p>}
          {requirements.improvement&&<fieldset className="level-wizard-fieldset">
            <legend>Mejora de característica</legend>
            <label className="field"><span>Cómo distribuir la mejora</span><select value={improvement.mode} onChange={e=>changeImprovementMode(e.target.value as FighterAbilityImprovement['mode'])}>
              <option value="plus_two">+2 en una característica</option><option value="two_ones">+1 en dos características distintas</option>
            </select></label>
            <label className="field"><span>Primera característica</span><select value={improvement.first} onChange={e=>changeFirst(e.target.value as Ability)}>
              {ABILITIES.map(id=><option key={id} value={id}>{ABILITY_LABELS[id]}</option>)}
            </select></label>
            {improvement.mode==='two_ones'&&<label className="field"><span>Segunda característica</span><select value={improvement.second} onChange={e=>setImprovement(prev=>({...prev,second:e.target.value as Ability}))}>
              {ABILITIES.filter(id=>id!==improvement.first).map(id=><option key={id} value={id}>{ABILITY_LABELS[id]}</option>)}
            </select></label>}
            <small>El motor valida el límite de 20 puntos y las mejoras acumuladas de otros niveles.</small>
          </fieldset>}
          {requirements.mastery&&<fieldset className="level-wizard-fieldset"><legend>Nueva maestría de armas</legend>
            <label className="field"><span>Arma elegida</span><select value={mastery} onChange={e=>setMastery(e.target.value as WeaponId|'')}>
              <option value="">Selecciona un arma distinta</option>
              {Object.entries(WEAPONS).filter(([id])=>!input.martial?.weaponMasteries.includes(id as WeaponId)).map(([id,weapon])=><option key={id} value={id}>{weapon.name} · {weapon.mastery}</option>)}
            </select></label>
            {mastery && <div className="level-wizard-choice-info"><strong>{WEAPONS[mastery].name} · {WEAPONS[mastery].mastery}</strong><Explanation text={MASTERY_EXPLANATIONS[WEAPONS[mastery].mastery]}/></div>}
            <details className="level-wizard-reference"><summary>Comparar las 8 propiedades de maestría</summary>
              <ul>{Object.entries(MASTERY_EXPLANATIONS).map(([name,text])=><li key={name}><strong>{name}:</strong> {text}</li>)}</ul>
            </details>
            <small>Puede ser un arma que aún no posees. La maestría no añade el arma al inventario.</small>
          </fieldset>}
          {requirements.additionalStyle&&<fieldset className="level-wizard-fieldset"><legend>Segundo estilo del Campeón</legend>
            <label className="field"><span>Nuevo estilo</span><select value={style} onChange={e=>setStyle(e.target.value as FightingStyleId|'')}>
              <option value="">Selecciona un estilo</option>
              {Object.entries(FIGHTING_STYLES).filter(([id])=>id!==input.martial?.fightingStyle).map(([id,label])=><option key={id} value={id}>{label}</option>)}
            </select></label>
            {style && <div className="level-wizard-choice-info"><strong>{FIGHTING_STYLES[style]}</strong><Explanation text={FIGHTING_STYLE_EXPLANATIONS[style]}/></div>}
            <details className="level-wizard-reference"><summary>Comparar los estilos de combate disponibles</summary>
              <ul>{Object.entries(FIGHTING_STYLES).filter(([id])=>id!==input.martial?.fightingStyle).map(([id,name])=><li key={id}><strong>{name}:</strong> {FIGHTING_STYLE_EXPLANATIONS[id as FightingStyleId]}</li>)}</ul>
            </details>
            <small>El nuevo estilo debe ser diferente del elegido en nivel 1.</small>
          </fieldset>}
          {requirements.epicBoon&&<fieldset className="level-wizard-fieldset"><legend>Beneficio épico</legend>
            <label className="field"><span>Beneficio</span><select value={boon} onChange={e=>setBoon(e.target.value as EpicBoonId|'')}>
              <option value="">Selecciona un beneficio épico</option>
              {Object.entries(EPIC_BOONS).map(([id,label])=><option key={id} value={id}>{label}</option>)}
            </select></label>
            {boon && <div className="level-wizard-choice-info"><strong>{EPIC_BOONS[boon]}</strong><Explanation text={EPIC_BOON_EXPLANATIONS[boon]}/></div>}
            <details className="level-wizard-reference"><summary>Comparar los beneficios épicos disponibles</summary>
              <ul>{Object.entries(EPIC_BOONS).map(([id,name])=><li key={id}><strong>{name}:</strong> {EPIC_BOON_EXPLANATIONS[id as EpicBoonId]}</li>)}</ul>
            </details>
            <label className="field"><span>Característica que aumenta +1</span><select value={boonAbility} onChange={e=>setBoonAbility(e.target.value as Ability)}>
              {ABILITIES.map(id=><option key={id} value={id}>{ABILITY_LABELS[id]}</option>)}
            </select></label>
          </fieldset>}
          {assessment.error?<p className="level-wizard-error" role="alert">{assessment.error}</p>:<p className="level-wizard-ok">Elecciones válidas. Puedes revisar los resultados antes de confirmarlas.</p>}
        </div>}
        {stage===2&&<div className="level-wizard-section">
          <h3>Revisión final del personaje</h3>
          {assessment.preview&&before&&after?<>
            <div className="level-wizard-stats">
              {[
                {label:'Nivel',old:before.level,newValue:after.level},
                {label:'PG máximos',old:before.maximumHitPoints,newValue:after.maximumHitPoints},
                {label:'Competencia',old:before.proficiencyBonus,newValue:after.proficiencyBonus},
                {label:'CA',old:before.armorClass,newValue:after.armorClass},
                {label:'Iniciativa',old:before.initiative,newValue:after.initiative},
                {label:'Maestrías',old:input.martial?.weaponMasteries.length??0,newValue:assessment.preview.input.martial?.weaponMasteries.length??0},
              ].map(item=><div className="level-wizard-stat" key={item.label}><span>{item.label}</span><strong>{item.old} <span aria-hidden="true">→</span> {item.newValue}</strong></div>)}
            </div>
            {ABILITIES.some(id=>before.abilityScores[id]!==after.abilityScores[id])&&<div><h4>Características modificadas</h4><ul className="level-wizard-small-list">{ABILITIES.filter(id=>before.abilityScores[id]!==after.abilityScores[id]).map(id=><li key={id}>{ABILITY_LABELS[id]}: {before.abilityScores[id]} → <strong>{after.abilityScores[id]}</strong></li>)}</ul></div>}
            <div><h4>Rasgos y dotes desbloqueados</h4>
              {assessment.preview.newTraits.length>0?<ul className="level-wizard-small-list">{assessment.preview.newTraits.map(trait=><li key={trait.id}><strong>{trait.title}</strong> <small>({trait.source})</small>
                {trait.explanation && !trait.id.startsWith('feature:ability_score_improvement') && <Explanation text={trait.explanation}/>}
                {trait.details.filter(detail=>!detail.startsWith('Usos máximos')&&!detail.startsWith('Mejora de ')).map((detail,index)=><p className="level-wizard-detail" key={`${trait.id}:${index}`}>{detail}</p>)}
              </li>)}</ul>:<p className="muted-note">Este nivel mejora recursos o capacidades existentes; no añade una entrada nueva de rasgo.</p>}
            </div>
            {requirements.mastery&&mastery&&<p className="level-wizard-choice-info"><strong>Nueva maestría: {WEAPONS[mastery].name} ({WEAPONS[mastery].mastery}).</strong> {MASTERY_EXPLANATIONS[WEAPONS[mastery].mastery]}</p>}
            {requirements.additionalStyle&&style&&<p className="level-wizard-choice-info"><strong>Estilo elegido: {FIGHTING_STYLES[style]}.</strong> {FIGHTING_STYLE_EXPLANATIONS[style]}</p>}
            {requirements.epicBoon&&boon&&<p className="level-wizard-choice-info"><strong>Beneficio épico: {EPIC_BOONS[boon]}.</strong> {EPIC_BOON_EXPLANATIONS[boon]}</p>}
            {Object.entries(RESOURCE_LABELS).some(([id])=>(before.resources[id as keyof typeof RESOURCE_LABELS]?.maximum??0)!==(after.resources[id as keyof typeof RESOURCE_LABELS]?.maximum??0))&&<div><h4>Recursos de clase</h4>
              <ul className="level-wizard-small-list">{Object.entries(RESOURCE_LABELS).filter(([id])=>(before.resources[id as keyof typeof RESOURCE_LABELS]?.maximum??0)!==(after.resources[id as keyof typeof RESOURCE_LABELS]?.maximum??0)).map(([id,label])=><li key={id}>{label}: {before.resources[id as keyof typeof RESOURCE_LABELS]?.maximum??0} → {after.resources[id as keyof typeof RESOURCE_LABELS]?.maximum??0} usos máximos</li>)}</ul>
            </div>}
            {outOfSync&&<label className="level-wizard-confirm"><input type="checkbox" checked={allowSync} disabled={allowFresh} onChange={e=>setAllowSync(e.target.checked)}/>
              <span>Autorizo sincronizar primero los PG máximos de la sesión con la hoja actual, intentando conservar daño y recursos.</span></label>}
            {showRecovery&&<div className="level-wizard-danger">
              <strong>Recuperación excepcional de sesión</strong>
              <p>Solo si la transición normal falla: se perderán los PG actuales, gastos, condiciones, turnos e historial <em>de la sesión en pantalla</em>. PostgreSQL no se modifica hasta «Actualizar guardado».</p>
              <label className="level-wizard-confirm"><input type="checkbox" checked={allowFresh} onChange={e=>setAllowFresh(e.target.checked)}/><span>Entiendo la pérdida de la sesión y autorizo crear una nueva.</span></label>
            </div>}
            {commitError&&<p className="level-wizard-error" role="alert">{commitError}</p>}
            <p className="muted-note">Al confirmar se actualizarán juntos el nivel, las elecciones y la sesión local. Después tendrás que pulsar «Actualizar guardado» para persistirlos en PostgreSQL.</p>
          </>:<p className="level-wizard-error" role="alert">{assessment.error}</p>}
        </div>}

  </LevelUpDialogFrame>;
}
