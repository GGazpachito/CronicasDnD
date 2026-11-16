"use client";

import { useState, type ReactNode } from "react";
import { ABILITIES, type Ability, type AbilityScores } from "../../../../packages/rules-engine/src/abilities";
import { SKILLS, SKILL_ABILITIES, type Skill } from "../../../../packages/rules-engine/src/proficiencies";
import { rollD20, type D20Mode, type D20Result } from "../../../../packages/rules-engine/src/d20";

const ABILITY_NAMES: Record<Ability,string> = {strength:"Fuerza",dexterity:"Destreza",constitution:"Constitución",intelligence:"Inteligencia",wisdom:"Sabiduría",charisma:"Carisma"};
const SKILL_NAMES: Record<Skill,string> = {acrobatics:"Acrobacias",animal_handling:"Trato con animales",arcana:"Arcanos",athletics:"Atletismo",deception:"Engaño",history:"Historia",insight:"Perspicacia",intimidation:"Intimidación",investigation:"Investigación",medicine:"Medicina",nature:"Naturaleza",perception:"Percepción",performance:"Interpretación",persuasion:"Persuasión",religion:"Religión",sleight_of_hand:"Juego de manos",stealth:"Sigilo",survival:"Supervivencia"};
const signed=(n:number)=>n>=0?`+${n}`:String(n);
const modeLabel=(m:D20Mode)=>m==="advantage"?"Ventaja":m==="disadvantage"?"Desventaja":"Normal";
const normalSkills=Object.fromEntries(SKILLS.map(skill=>[skill,"normal"])) as Record<Skill,D20Mode>;
const normalSaves=Object.fromEntries(ABILITIES.map(a=>[a,"normal"])) as Record<Ability,D20Mode>;

type RecordOfRoll=ReadOnlyRoll;
type ReadOnlyRoll=Readonly<{label:string;signature:string;result:D20Result}>;

type Props={
  abilityScores:AbilityScores;
  abilityModifiers:Record<Ability,number>;
  proficiencyBonus:number;
  skillBonuses:Record<Skill,number>;
  savingThrowBonuses:Record<Ability,number>;
  trainedSkills:ReadonlySet<Skill>;
  trainedSaves:ReadonlySet<Ability>;
  skillModes?:Record<Skill,D20Mode>;
  saveModes?:Record<Ability,D20Mode>;
  initiative:number;
  initiativeMode?:D20Mode;
  armorClass:number;
  armorDescription:string;
  hpContent:ReactNode;
  hitDiceDescription:string;
  mode:D20Mode;
  onModeChange:(mode:D20Mode)=>void;
  attacksContent:ReactNode;
  resourcesContent:ReactNode;
  footerContent:ReactNode;
  /** Exclusivo de las clases lanzadoras que disponen de espacios. */
  spellSlotsContent?:ReactNode;
  warningContent?:ReactNode;
};

function RollOutput({record,signature}:{record?:RecordOfRoll;signature:string}){
 if(!record||record.signature!==signature)return null;
 const {result}=record;
 return <div className="overview-roll-result" role="status" aria-live="polite">
  <div className="overview-roll-result-heading"><strong>{record.label}</strong><span>{modeLabel(result.mode)}</span></div>
  <div className="overview-roll-equation"><span className="overview-roll-dice">{result.dice.map((die,i)=><span key={i} className={`overview-die${die===result.chosen?" is-chosen":""}`}>{die}</span>)}</span><span className="overview-roll-formula">Dado {result.chosen} {signed(result.modifier)} = <strong>{result.total}</strong></span></div>
  {(result.sheetMode!=="normal"||result.circumstanceMode!=="normal")&&<small>Hoja: {modeLabel(result.sheetMode)} · Circunstancia: {modeLabel(result.circumstanceMode)}</small>}
 </div>;
}

/** Estructura y estilos idénticos para cualquier clase. Solo el contenido específico cambia. */
export default function SharedPrincipalSheet(props:Props){
 const [rolls,setRolls]=useState<Partial<Record<"initiative"|"skills"|"saves",RecordOfRoll>>>({});
 const [rollError,setRollError]=useState("");
 const skillModes=props.skillModes??normalSkills;
 const saveModes=props.saveModes??normalSaves;
 const initiativeMode=props.initiativeMode??"normal";
 const signature=JSON.stringify([props.abilityScores,props.skillBonuses,props.savingThrowBonuses,skillModes,saveModes,props.initiative,props.armorClass]);
 function throwDie(area:"initiative"|"skills"|"saves",label:string,bonus:number,sheetMode:D20Mode){
  try{setRolls(prev=>({...prev,[area]:{label,signature,result:rollD20(bonus,sheetMode,props.mode)}}));setRollError("");}
  catch(e){setRollError(e instanceof Error?e.message:"No se ha podido lanzar el dado");}
 }
 return <div className="principal-overview" aria-label="Hoja principal del personaje">
  <section className="overview-dice-toolbar panel">
   <div><h3>Tiradas de d20</h3><p>Aplica los bonificadores y las circunstancias del personaje al lanzar iniciativa, habilidades, salvaciones y ataques.</p></div>
   <div className="overview-dice-mode" role="group" aria-label="Circunstancias de la tirada">
    <span>Circunstancia de las tiradas</span>
    <div className="overview-dice-mode-buttons">
     <button type="button" className={props.mode==="advantage"?"is-active":""} aria-pressed={props.mode==="advantage"} onClick={()=>props.onModeChange(props.mode==="advantage"?"normal":"advantage")}>Ventaja</button>
     <button type="button" className={props.mode==="disadvantage"?"is-active":""} aria-pressed={props.mode==="disadvantage"} onClick={()=>props.onModeChange(props.mode==="disadvantage"?"normal":"disadvantage")}>Desventaja</button>
    </div>
   </div>
   <p className="overview-dice-help">Los botones son excluyentes; pulsa el seleccionado para volver a una tirada normal. El director de juego decide el resultado de la acción.</p>
   {rollError&&<p className="overview-dice-error" role="alert">{rollError}</p>}
  </section>
  <div className="overview-vitals" aria-label="Valores principales">
   <section className="overview-vital overview-vital-hp"><span>PUNTOS DE GOLPE</span>{props.hpContent}<div className="overview-mini-info"><span>{props.hitDiceDescription}</span></div></section>
   <section className="overview-vital"><span>CLASE DE ARMADURA</span><strong>{props.armorClass}</strong><p>{props.armorDescription}</p></section>
   <section className="overview-vital overview-vital-initiative"><span>INICIATIVA</span><strong>{signed(props.initiative)}</strong><p>{modeLabel(initiativeMode)}</p><button type="button" className="overview-roll-button overview-roll-init" onClick={()=>throwDie("initiative","Iniciativa",props.initiative,initiativeMode)}>Tirar d20</button><RollOutput record={rolls.initiative} signature={signature}/></section>
  </div>
  {props.warningContent}
  <section className="overview-abilities panel" aria-label="Características">
   <div className="overview-panel-heading"><h3>Características</h3><span>Competencia <b>{signed(props.proficiencyBonus)}</b></span></div>
   <div className="overview-ability-grid">{ABILITIES.map(a=><div className="overview-ability" key={a}><span>{ABILITY_NAMES[a]}</span><strong>{signed(props.abilityModifiers[a])}</strong><small>Puntuación {props.abilityScores[a]}</small></div>)}</div>
  </section>
  <div className="overview-columns">
   <section className="overview-panel panel" aria-label="Habilidades">
    <div className="overview-panel-heading"><h3>Habilidades</h3><span>Bonificadores actuales</span></div>
    <div className="overview-records">{SKILLS.map(skill=><div className="overview-record" key={skill}><span><i className={props.trainedSkills.has(skill)?"overview-proficient":"overview-untrained"} aria-hidden="true"/>{SKILL_NAMES[skill]} <small>({ABILITY_NAMES[SKILL_ABILITIES[skill]].slice(0,3)})</small></span><span className="overview-roll-actions"><strong>{signed(props.skillBonuses[skill])}</strong>{skillModes[skill]!=="normal"&&<em>{modeLabel(skillModes[skill])}</em>}<button type="button" className="overview-roll-button" aria-label={`Tirar ${SKILL_NAMES[skill]}`} onClick={()=>throwDie("skills",SKILL_NAMES[skill],props.skillBonuses[skill],skillModes[skill])}>Tirar</button></span></div>)}</div>
    <RollOutput record={rolls.skills} signature={signature}/>
    <p className="overview-panel-note">Punto dorado: competencia. Los modificadores proceden del motor de reglas.</p>
   </section>
   <div className="overview-right-stack">
    <section className="overview-panel panel" aria-label="Tiradas de salvación"><div className="overview-panel-heading"><h3>Tiradas de salvación</h3><span>Bonificadores</span></div><div className="overview-records">{ABILITIES.map(a=><div className="overview-record" key={a}><span><i className={props.trainedSaves.has(a)?"overview-proficient":"overview-untrained"} aria-hidden="true"/>{ABILITY_NAMES[a]}</span><span className="overview-roll-actions"><strong>{signed(props.savingThrowBonuses[a])}</strong>{saveModes[a]!=="normal"&&<em>{modeLabel(saveModes[a])}</em>}<button type="button" className="overview-roll-button" aria-label={`Tirar salvación de ${ABILITY_NAMES[a]}`} onClick={()=>throwDie("saves",`Salvación de ${ABILITY_NAMES[a]}`,props.savingThrowBonuses[a],saveModes[a])}>Tirar</button></span></div>)}</div><RollOutput record={rolls.saves} signature={signature}/></section>
    {props.attacksContent}
    {props.resourcesContent}
    {props.spellSlotsContent}
   </div>
  </div>
  <div className="overview-foot-grid">{props.footerContent}</div>
 </div>;
}
