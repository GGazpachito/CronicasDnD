"use client";

import { useState } from "react";
import { rollD20, type D20Mode, type D20Result } from "../../../../packages/rules-engine/src/d20";
import { ABILITIES, type Ability } from "../../../../packages/rules-engine/src/abilities";
import { SKILLS, SKILL_ABILITIES, type Skill } from "../../../../packages/rules-engine/src/proficiencies";
import { BACKGROUNDS, type GuidedFighterInput, type GuidedFighterResult } from "../../../../packages/rules-engine/src/guided";
import { applyAdventureAction, setManualDeathSaveMark, type AdventureAction, type AdventureState } from "../../../../packages/rules-engine/src/adventure";
import { PrincipalHealthControls, PrincipalResourceControls, PrincipalInspirationControls } from "./PrincipalSessionControls";
import PrincipalEquippedAttacks from "./PrincipalEquippedAttacks";

const ABILITY_NAMES: Record<Ability, string> = {
  strength: "Fuerza", dexterity: "Destreza", constitution: "Constitución",
  intelligence: "Inteligencia", wisdom: "Sabiduría", charisma: "Carisma",
};
const SKILL_NAMES: Record<Skill, string> = {
  acrobatics: "Acrobacias", animal_handling: "Trato con animales", arcana: "Arcanos",
  athletics: "Atletismo", deception: "Engaño", history: "Historia", insight: "Perspicacia",
  intimidation: "Intimidación", investigation: "Investigación", medicine: "Medicina",
  nature: "Naturaleza", perception: "Percepción", performance: "Interpretación",
  persuasion: "Persuasión", religion: "Religión", sleight_of_hand: "Juego de manos",
  stealth: "Sigilo", survival: "Supervivencia",
};
const signed = (n: number) => n >= 0 ? `+${n}` : String(n);
const modeName = (m: D20Mode) => m === "advantage" ? "Ventaja" : m === "disadvantage" ? "Desventaja" : "Normal";

export function passivePerception(bonus: number, mode: "normal" | "advantage" | "disadvantage") {
  return 10 + bonus + (mode === "advantage" ? 5 : mode === "disadvantage" ? -5 : 0);
}

type RollArea = "initiative" | "skills" | "saves";
type RollRecord = Readonly<{ label: string; sheetKey: string; result: D20Result }>;

function RollSummary({ record, sheetKey }: { record?: RollRecord; sheetKey: string }) {
  if (!record || record.sheetKey !== sheetKey) return null;
  const { result } = record;
  return <div className="overview-roll-result" role="status" aria-live="polite" aria-atomic="true">
    <div className="overview-roll-result-heading"><strong>{record.label}</strong><span>{modeName(result.mode)}</span></div>
    <div className="overview-roll-equation">
      <span className="overview-roll-dice">{result.dice.map((value, index) =>
        <span className={`overview-die${value === result.chosen ? " is-chosen" : ""}`} key={index} aria-label={`Dado ${index + 1}: ${value}`}>{value}</span>
      )}</span>
      <span className="overview-roll-formula">Dado {result.chosen} {signed(result.modifier)} = <strong>{result.total}</strong></span>
    </div>
    {result.sheetMode !== "normal" || result.circumstanceMode !== "normal" ?
      <small>Hoja: {modeName(result.sheetMode)} · Circunstancia: {modeName(result.circumstanceMode)}</small> : null}
  </div>;
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
  const [rolls, setRolls] = useState<Partial<Record<RollArea, RollRecord>>>({});
  const [rollError, setRollError] = useState<string | null>(null);
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
  const perceptionMode = sheet.skillRollModes.perception;
  // Invalidar visualmente tiradas anteriores al cambiar la proyección del personaje.
  const sheetKey = JSON.stringify([
    sheet.name, sheet.level, sheet.abilityScores, sheet.skillBonuses, sheet.skillRollModes,
    sheet.savingThrowBonuses, sheet.savingThrowRollModes, sheet.initiative, sheet.initiativeRollMode,
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

  function throwD20(area: RollArea, label: string, modifier: number, sheetMode: D20Mode) {
    try {
      const rolled = rollD20(modifier, sheetMode, circumstanceMode);
      setRolls(previous => ({ ...previous, [area]: { label, sheetKey, result: rolled } }));
      setRollError(null);
    } catch (reason) {
      setRollError(reason instanceof Error ? reason.message : "No se ha podido lanzar el dado");
    }
  }

  return <div className="principal-overview" aria-label="Resumen calculado del personaje">
    {outOfSync && <div className="overview-warning" role="status">La partida no está sincronizada con la hoja. Los recursos y PG actuales se ocultan hasta resolverlo desde el editor.</div>}
    <div className="overview-dice-toolbar panel">
      <div><h3>Tiradas de d20</h3><p>Pulsa «Tirar» en iniciativa, una habilidad o una salvación. La hoja aporta su bonificador y sus efectos.</p></div>
      <div className="overview-dice-mode" role="group" aria-label="Circunstancia para tiradas de d20">
        <span>Circunstancia de las tiradas</span>
        <div className="overview-dice-mode-buttons">
          <button type="button" className={circumstanceMode === "advantage" ? "is-active" : ""}
            aria-pressed={circumstanceMode === "advantage"}
            onClick={() => setCircumstanceMode(current => current === "advantage" ? "normal" : "advantage")}>Ventaja</button>
          <button type="button" className={circumstanceMode === "disadvantage" ? "is-active" : ""}
            aria-pressed={circumstanceMode === "disadvantage"}
            onClick={() => setCircumstanceMode(current => current === "disadvantage" ? "normal" : "disadvantage")}>Desventaja</button>
        </div>
      </div>
      <p className="overview-dice-help">Estos botones afectan a iniciativa, habilidades, salvaciones y ataques con armas. Solo uno puede estar activo; pulsa otra vez el marcado para quitarlo. La selección se mantiene hasta que la cambies. Los efectos contrarios del personaje pueden anularla. El DM determina el éxito; no se modifica la partida.</p>
      {rollError && <p className="overview-dice-error" role="alert">{rollError}</p>}
    </div>
    <div className="overview-vitals" aria-label="Valores principales">
      <section className="overview-vital overview-vital-hp">
        <span>PUNTOS DE GOLPE</span>
        <PrincipalHealthControls state={current} sheet={sheet} onAction={runAdventureAction}
          onError={(message) => { setActionError(message); setActionNote(null); }}/>
        <div className="overview-mini-info"><span>Dados: {diceLeft ?? "—"}/{sheet.hitDice.total} d{sheet.hitDice.die}</span></div>
      </section>
      <section className="overview-vital"><span>CLASE DE ARMADURA</span><strong>{sheet.armorClass}</strong><p>{sheet.armorClassDetails.formula}</p></section>
      <section className="overview-vital overview-vital-initiative"><span>INICIATIVA</span><strong>{signed(sheet.initiative)}</strong><p>{modeName(sheet.initiativeRollMode)}</p>
        <button className="overview-roll-button overview-roll-init" type="button" onClick={() => throwD20("initiative", "Iniciativa", sheet.initiative, sheet.initiativeRollMode)}>Tirar d20</button>
        <RollSummary record={rolls.initiative} sheetKey={sheetKey}/>
      </section>
    </div>

    {actionError && <div className="overview-action-message is-error" role="alert">{actionError}</div>}
    {actionNote && !outOfSync && <div className="overview-action-message" role="status">{actionNote} Guarda los cambios desde «Mis personajes» cuando quieras conservarlos en PostgreSQL.</div>}

    <section className="overview-abilities panel" aria-label="Características">
      <div className="overview-panel-heading"><h3>Características</h3><span>Competencia <b>{signed(sheet.proficiencyBonus)}</b></span></div>
      <div className="overview-ability-grid">
        {ABILITIES.map(ability => <div className="overview-ability" key={ability}>
          <span>{ABILITY_NAMES[ability]}</span>
          <strong>{signed(sheet.abilityModifiers[ability])}</strong>
          <small>Puntuación {sheet.abilityScores[ability]}</small>
        </div>)}
      </div>
    </section>

    <div className="overview-columns">
      <section className="overview-panel panel" aria-label="Habilidades">
        <div className="overview-panel-heading"><h3>Habilidades</h3><span>Bonificadores actuales</span></div>
        <div className="overview-records">
          {SKILLS.map(skill => <div className="overview-record" key={skill}>
            <span><i className={trained.has(skill) ? "overview-proficient" : "overview-untrained"} aria-hidden="true" />{SKILL_NAMES[skill]} <small>({ABILITY_NAMES[SKILL_ABILITIES[skill]].slice(0, 3)})</small></span>
            <span className="overview-roll-actions"><strong>{signed(sheet.skillBonuses[skill])}</strong>{sheet.skillRollModes[skill] !== "normal" && <em>{modeName(sheet.skillRollModes[skill])}</em>}
              <button type="button" className="overview-roll-button" aria-label={`Tirar ${SKILL_NAMES[skill]}, bonificador ${signed(sheet.skillBonuses[skill])}`} title={`Tirar ${SKILL_NAMES[skill]}`} onClick={() => throwD20("skills", SKILL_NAMES[skill], sheet.skillBonuses[skill], sheet.skillRollModes[skill])}>Tirar</button>
            </span>
          </div>)}
        </div>
        <RollSummary record={rolls.skills} sheetKey={sheetKey}/>
        <p className="overview-panel-note">Punto dorado: competencia. Cada habilidad usa su bonificador y ventaja/desventaja calculados.</p>
      </section>
      <div className="overview-right-stack">
        <section className="overview-panel panel" aria-label="Tiradas de salvación">
          <div className="overview-panel-heading"><h3>Tiradas de salvación</h3><span>Bonificadores</span></div>
          <div className="overview-records">{ABILITIES.map(ability => <div className="overview-record" key={ability}>
            <span><i className={ability === "strength" || ability === "constitution" ? "overview-proficient" : "overview-untrained"} aria-hidden="true" />{ABILITY_NAMES[ability]}</span>
            <span className="overview-roll-actions"><strong>{signed(sheet.savingThrowBonuses[ability])}</strong>{sheet.savingThrowRollModes[ability] !== "normal" && <em>{modeName(sheet.savingThrowRollModes[ability])}</em>}
              <button type="button" className="overview-roll-button" aria-label={`Tirar salvación de ${ABILITY_NAMES[ability]}, bonificador ${signed(sheet.savingThrowBonuses[ability])}`} title={`Tirar salvación de ${ABILITY_NAMES[ability]}`} onClick={() => throwD20("saves", `Salvación de ${ABILITY_NAMES[ability]}`, sheet.savingThrowBonuses[ability], sheet.savingThrowRollModes[ability])}>Tirar</button>
            </span>
          </div>)}</div>
          <RollSummary record={rolls.saves} sheetKey={sheetKey}/>
        </section>
        <PrincipalEquippedAttacks sheet={sheet} inventory={inventory??null} martial={input.martial} combat={current?.combat ?? null}
          circumstanceMode={circumstanceMode} criticalDamage={criticalDamage} onCriticalDamageChange={setCriticalDamage}
          onOpenAdvanced={() => onOpenTools("attacks")}/>
        <PrincipalResourceControls state={current} sheet={sheet} onAction={runAdventureAction} onOpenTools={() => onOpenTools("resources")} onError={setActionError}/>
      </div>
    </div>

    <div className="overview-foot-grid">
      <section className="overview-panel panel"><h3>Percepción pasiva</h3><strong className="overview-spotlight">{passivePerception(sheet.skillBonuses.perception, perceptionMode)}</strong><p className="overview-panel-note">10 + Percepción {signed(sheet.skillBonuses.perception)}{perceptionMode !== "normal" ? ` · ${modeName(perceptionMode)} ${perceptionMode === "advantage" ? "+5" : "−5"}` : ""}</p></section>
      <section className="overview-panel panel"><h3>Movimiento y origen</h3><strong className="overview-spotlight">{origin.speedFeet} <small>pies</small></strong><p className="overview-panel-note">Tamaño {origin.size === "medium" ? "mediano" : "pequeño"} · Guerrero nivel {sheet.level}</p></section>
      <section className="overview-panel panel overview-death-panel" aria-label="Marcadores manuales de salvaciones de muerte">
        <h3>Salvaciones de muerte</h3>
        <div className="overview-death-markers">
          {(["successes", "failures"] as const).map(kind => {
            const count = current?.manualDeathMarks?.[kind].filter(Boolean).length ?? 0;
            const isSuccess = kind === "successes";
            return <div className={`overview-death-track ${isSuccess ? "is-success" : "is-failure"}`} key={kind}>
              <div className="overview-death-track-heading"><span>{isSuccess ? "Éxitos" : "Fallos"}</span><small>{current ? `${count}/3` : "—/3"}</small></div>
              <div className="overview-death-marks" role="group" aria-label={isSuccess ? "Salvaciones de muerte superadas" : "Salvaciones de muerte fallidas"}>
                {([0, 1, 2] as const).map(index => {
                  const checked = current?.manualDeathMarks?.[kind][index] ?? false;
                  return <button type="button" key={index}
                    className={`overview-death-mark${checked ? " is-marked" : ""}`}
                    aria-label={`${isSuccess ? "Éxito" : "Fallo"} ${index + 1} de 3`}
                    aria-pressed={checked} disabled={!current}
                    onClick={() => toggleDeathMark(kind, index)}>
                    <span aria-hidden="true">{checked ? (isSuccess ? "✓" : "×") : ""}</span>
                  </button>;
                })}
              </div>
            </div>;
          })}
        </div>
        <p className="overview-panel-note">Marca o desmarca cada círculo manualmente. No aplica efectos automáticos ni modifica el sistema de Supervivencia. Usa «Actualizar guardado» para conservarlos.</p>
      </section>
      <PrincipalInspirationControls state={current} sheet={sheet} onAction={runAdventureAction}/>
    </div>
    {sheet.warnings.length > 0 && <div className="overview-warning" role="status">{sheet.warnings.includes("heavy_armor_strength_requirement_unmet") && <p>No se cumple el requisito de Fuerza de la armadura pesada.</p>}{sheet.warnings.includes("armor_stealth_disadvantage") && <p>La armadura impone desventaja en Sigilo.</p>}</div>}
  </div>;
}
