"use client";

import { useState } from "react";
import { type D20Mode } from "../../../../packages/rules-engine/src/d20";
import { type Ability } from "../../../../packages/rules-engine/src/abilities";
import { SKILLS, type Skill } from "../../../../packages/rules-engine/src/proficiencies";
import { BACKGROUNDS, type GuidedFighterInput, type GuidedFighterResult } from "../../../../packages/rules-engine/src/guided";
import { applyAdventureAction, setManualDeathSaveMark, type AdventureAction, type AdventureState } from "../../../../packages/rules-engine/src/adventure";
import { PrincipalHealthControls, PrincipalResourceControls, PrincipalInspirationControls } from "./PrincipalSessionControls";
import PrincipalEquippedAttacks from "./PrincipalEquippedAttacks";
import SharedPrincipalSheet from "./SharedPrincipalSheet";

const signed=(n:number)=>n>=0?`+${n}`:String(n);
export function passivePerception(bonus:number,mode:"normal"|"advantage"|"disadvantage"){
  return 10+bonus+(mode==="advantage"?5:mode==="disadvantage"?-5:0);
}

type Props = {
  result: GuidedFighterResult | null;
  error: string | null;
  input: GuidedFighterInput;
  adventure: AdventureState | null;
  outOfSync: boolean;
  onAdventureChange: (state: AdventureState) => void;
  onEdit: (step: number) => void;
  onOpenTools: (target: "attacks" | "resources") => void;
};

/** Lectura pura de la misma hoja calculada y la misma sesión que usa el editor. */
export default function PrincipalOverview({ result, error, input, adventure, outOfSync, onAdventureChange, onEdit, onOpenTools }: Props) {
  // Solo resultados efímeros de tiradas. Ninguna característica, PG o recurso se duplica aquí.
  const [circumstanceMode, setCircumstanceMode] = useState<D20Mode>("normal");
  const [criticalDamage, setCriticalDamage] = useState(false);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!result) {
    return <section className="overview-unavailable panel" role="alert">
      <h3>La hoja todavía no se puede calcular</h3>
      <p>{error ?? "Revisa las elecciones de creación."}</p>
      <button type="button" onClick={() => onEdit(0)}>Revisar personaje</button>
    </section>;
  }

  const { sheet, inventory, origin } = result;
  const current = !outOfSync ? adventure : null;
  const diceLeft = current ? sheet.hitDice.total - current.spentHitDice : null;
  const trained = new Set<Skill>([
    ...input.fighterSkills,
    ...(BACKGROUNDS[input.background].skills as readonly Skill[]),
    ...(input.species === "human" && input.humanSkill ? [input.humanSkill] : []),
    ...(input.species === "elf" && input.elfSenseSkill ? [input.elfSenseSkill] : []),
    ...(input.species === "human" && input.humanFeat === "skilled" ? input.humanFeatDetails?.skilledProficiencies?.filter((s): s is Skill => SKILLS.includes(s as Skill)) ?? [] : []),
  ]);

  function runAdventureAction(action: AdventureAction): boolean {
    if (!current) return false;
    try {
      const updated = applyAdventureAction(current, action, sheet);
      onAdventureChange(updated.state);
      setActionError(null);
      setActionNote(updated.description);
      return true;
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "No se ha podido registrar la acción");
      setActionNote(null);
      return false;
    }
  }

  function toggleDeathMark(kind: "successes" | "failures", index: number) {
    if (!current) return;
    try {
      const selected = !(current.manualDeathMarks?.[kind][index] ?? false);
      onAdventureChange(setManualDeathSaveMark(current, sheet, kind, index, selected));
      setActionError(null);
      setActionNote("Marcadores de muerte actualizados manualmente.");
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "No se pudo cambiar el marcador");
      setActionNote(null);
    }
  }

  const footer = <>
    <section className="overview-panel panel"><h3>Percepción pasiva</h3><strong className="overview-spotlight">{passivePerception(sheet.skillBonuses.perception,sheet.skillRollModes.perception)}</strong><p className="overview-panel-note">10 + Percepción {signed(sheet.skillBonuses.perception)}</p></section>
    <section className="overview-panel panel"><h3>Movimiento y origen</h3><strong className="overview-spotlight">{origin.speedFeet} <small>pies</small></strong><p className="overview-panel-note">Tamaño {origin.size==="medium"?"mediano":"pequeño"} · Guerrero nivel {sheet.level}</p></section>
    <section className="overview-panel panel overview-death-panel" aria-label="Marcadores manuales de salvaciones de muerte">
      <h3>Salvaciones de muerte</h3>
      <div className="overview-death-markers">{(["successes","failures"] as const).map(kind=>{
        const count=current?.manualDeathMarks?.[kind].filter(Boolean).length??0;
        const isSuccess=kind==="successes";
        return <div className={`overview-death-track ${isSuccess?"is-success":"is-failure"}`} key={kind}>
          <div className="overview-death-track-heading"><span>{isSuccess?"Éxitos":"Fallos"}</span><small>{current?`${count}/3`:"—/3"}</small></div>
          <div className="overview-death-marks" role="group" aria-label={isSuccess?"Salvaciones de muerte superadas":"Salvaciones de muerte fallidas"}>
            {([0,1,2] as const).map(index=>{
              const checked=current?.manualDeathMarks?.[kind][index]??false;
              return <button type="button" key={index} className={`overview-death-mark${checked?" is-marked":""}`} aria-pressed={checked} aria-label={`${isSuccess?"Éxito":"Fallo"} ${index+1} de 3`} disabled={!current} onClick={()=>toggleDeathMark(kind,index)}><span aria-hidden="true">{checked?(isSuccess?"✓":"×"):""}</span></button>;
            })}
          </div>
        </div>;
      })}</div>
      <p className="overview-panel-note">Marca o desmarca manualmente. Los marcadores no aplican reglas automáticas.</p>
    </section>
    <PrincipalInspirationControls state={current} sheet={sheet} onAction={runAdventureAction}/>
  </>;
  return <>
    {outOfSync&&<div className="overview-warning" role="status">La partida no está sincronizada con la hoja. Revísala en el editor.</div>}
    <SharedPrincipalSheet
      abilityScores={sheet.abilityScores} abilityModifiers={sheet.abilityModifiers}
      proficiencyBonus={sheet.proficiencyBonus} skillBonuses={sheet.skillBonuses}
      savingThrowBonuses={sheet.savingThrowBonuses}
      trainedSkills={trained} trainedSaves={new Set<Ability>(["strength","constitution"])}
      skillModes={sheet.skillRollModes} saveModes={sheet.savingThrowRollModes}
      initiative={sheet.initiative} initiativeMode={sheet.initiativeRollMode}
      armorClass={sheet.armorClass} armorDescription={sheet.armorClassDetails.formula}
      hpContent={<PrincipalHealthControls state={current} sheet={sheet} onAction={runAdventureAction} onError={message=>{setActionError(message);setActionNote(null);}}/>}
      hitDiceDescription={`Dados: ${diceLeft??"—"}/${sheet.hitDice.total} d${sheet.hitDice.die}`}
      mode={circumstanceMode} onModeChange={setCircumstanceMode}
      attacksContent={<PrincipalEquippedAttacks sheet={sheet} inventory={inventory??null} martial={input.martial} combat={current?.combat??null}
        circumstanceMode={circumstanceMode} criticalDamage={criticalDamage} onCriticalDamageChange={setCriticalDamage} onOpenAdvanced={()=>onOpenTools("attacks")}/>}
      resourcesContent={<PrincipalResourceControls state={current} sheet={sheet} onAction={runAdventureAction} onOpenTools={()=>onOpenTools("resources")} onError={setActionError}/>}
      footerContent={footer}
      warningContent={<>{actionError&&<div className="overview-action-message is-error" role="alert">{actionError}</div>}{actionNote&&!outOfSync&&<div className="overview-action-message" role="status">{actionNote} Guarda los cambios en «Mis personajes» cuando quieras conservarlos.</div>}</>}
    />
    {sheet.warnings.length>0&&<div className="overview-warning" role="status">{sheet.warnings.includes("heavy_armor_strength_requirement_unmet")&&<p>No se cumple el requisito de Fuerza de la armadura.</p>}{sheet.warnings.includes("armor_stealth_disadvantage")&&<p>La armadura impone desventaja en Sigilo.</p>}</div>}
  </>;
}
