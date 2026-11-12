"use client";

import { useState, type ChangeEvent } from "react";
import { rollD20, type D20Mode, type D20Result } from "../../../../packages/rules-engine/src/d20";
import { ABILITIES, type Ability } from "../../../../packages/rules-engine/src/abilities";
import { SKILLS, SKILL_ABILITIES, type Skill } from "../../../../packages/rules-engine/src/proficiencies";
import { BACKGROUNDS, type GuidedFighterInput, type GuidedFighterResult } from "../../../../packages/rules-engine/src/guided";
import { applyAdventureAction, type AdventureAction, type AdventureState } from "../../../../packages/rules-engine/src/adventure";
import { PrincipalHealthControls, PrincipalResourceControls, PrincipalInspirationControls } from "./PrincipalSessionControls";
import { WEAPONS } from "../../../../packages/rules-engine/src/martial";
import type { WeaponId } from "../../../../packages/rules-engine/src/martial";

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
  const hp = current?.fighter.hitPoints.current;
  const diceLeft = current ? sheet.hitDice.total - current.spentHitDice : null;
  const trained = new Set<Skill>([
    ...input.fighterSkills,
    ...(BACKGROUNDS[input.background].skills as readonly Skill[]),
    ...(input.species === "human" && input.humanSkill ? [input.humanSkill] : []),
    ...(input.species === "elf" && input.elfSenseSkill ? [input.elfSenseSkill] : []),
    ...(input.species === "human" && input.humanFeat === "skilled" ? input.humanFeatDetails?.skilledProficiencies?.filter((s): s is Skill => SKILLS.includes(s as Skill)) ?? [] : []),
  ]);
  const weapons = inventory?.items.filter(item => Object.hasOwn(WEAPONS, item.id)) ?? [];
  const magicalWeapons = inventory?.magicItems.filter(item => item.itemId === "weapon_enhancement" && item.worn) ?? [];
  const death = current?.survival?.death;
  const perceptionMode = sheet.skillRollModes.perception;
  // Invalidar visualmente tiradas anteriores al cambiar la proyección del personaje.
  const sheetKey = JSON.stringify([
    sheet.name, sheet.level, sheet.abilityScores, sheet.skillBonuses, sheet.skillRollModes,
    sheet.savingThrowBonuses, sheet.savingThrowRollModes, sheet.initiative, sheet.initiativeRollMode,
  ]);

  function runAdventureAction(action: AdventureAction) {
    if (!current) return;
    try {
      const updated = applyAdventureAction(current, action, sheet);
      onAdventureChange(updated.state);
      setActionError(null);
      setActionNote(updated.description);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "No se ha podido registrar la acción");
      setActionNote(null);
    }
  }

  function throwD20(area: RollArea, label: string, modifier: number, sheetMode: D20Mode) {
    try {
      const rolled = rollD20(modifier, sheetMode, circumstanceMode);
      setRolls(previous => ({ ...previous, [area]: { label, sheetKey, result: rolled } }));
      setRollError(null);
      setCircumstanceMode("normal"); // La circunstancia es para una tirada, no una regla permanente.
    } catch (reason) {
      setRollError(reason instanceof Error ? reason.message : "No se ha podido lanzar el dado");
    }
  }

  return <div className="principal-overview" aria-label="Resumen calculado del personaje">
    {outOfSync && <div className="overview-warning" role="status">La partida no está sincronizada con la hoja. Los recursos y PG actuales se ocultan hasta resolverlo desde el editor.</div>}
    <div className="overview-dice-toolbar panel">
      <div><h3>Tiradas de d20</h3><p>Pulsa «Tirar» en iniciativa, una habilidad o una salvación. La hoja aporta su bonificador y sus efectos.</p></div>
      <label htmlFor="overview-circumstance"><span>Circunstancia de la próxima tirada</span>
        <select id="overview-circumstance" value={circumstanceMode} onChange={(event: ChangeEvent<HTMLSelectElement>) => setCircumstanceMode(event.target.value as D20Mode)}>
          <option value="normal">Sin efecto adicional</option>
          <option value="advantage">Ventaja circunstancial</option>
          <option value="disadvantage">Desventaja circunstancial</option>
        </select>
      </label>
      <p className="overview-dice-help">Ventaja y desventaja opuestas se anulan. Tras cada tirada, la circunstancia vuelve a «sin efecto». El DM determina si la prueba tiene éxito; la tirada no modifica la partida.</p>
      {rollError && <p className="overview-dice-error" role="alert">{rollError}</p>}
    </div>
    <div className="overview-vitals" aria-label="Valores principales">
      <section className="overview-vital overview-vital-hp">
        <span>PUNTOS DE GOLPE</span><strong>{hp ?? "—"}<small> / {sheet.maximumHitPoints}</small></strong>
        <p>PG actuales / máximos</p>
        <div className="overview-mini-info"><span>Temporales: {current?.temporaryHitPoints ?? "—"}</span><span>Dados: {diceLeft ?? "—"}/{sheet.hitDice.total} d{sheet.hitDice.die}</span></div>
      </section>
      <section className="overview-vital"><span>CLASE DE ARMADURA</span><strong>{sheet.armorClass}</strong><p>{sheet.armorClassDetails.formula}</p></section>
      <section className="overview-vital overview-vital-initiative"><span>INICIATIVA</span><strong>{signed(sheet.initiative)}</strong><p>{modeName(sheet.initiativeRollMode)}</p>
        <button className="overview-roll-button overview-roll-init" type="button" onClick={() => throwD20("initiative", "Iniciativa", sheet.initiative, sheet.initiativeRollMode)}>Tirar d20</button>
        <RollSummary record={rolls.initiative} sheetKey={sheetKey}/>
      </section>
    </div>

    <PrincipalHealthControls state={current} sheet={sheet} onAction={runAdventureAction}/>
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
        <section className="overview-panel panel" aria-label="Armas disponibles">
          <div className="overview-panel-heading"><h3>Ataques y armas</h3><span>Inventario</span></div>
          {weapons.length === 0 && magicalWeapons.length === 0 ? <p className="overview-panel-note">No hay armas registradas en el inventario.</p> : <div className="overview-records">
            {weapons.map(item => <div className="overview-record" key={item.id}><span>{item.name}</span><strong>×{item.quantity}</strong></div>)}
            {magicalWeapons.map(item => <div className="overview-record" key={item.instanceId}><span>{item.weaponId ? WEAPONS[item.weaponId as WeaponId]?.name ?? "Arma mágica" : "Arma mágica"}</span><strong>+{item.enhancement ?? 0}</strong></div>)}
          </div>}
          <p className="overview-panel-note">El inventario aún no distingue armas empuñadas. Ataques y daño siguen disponibles en las herramientas existentes.</p>
          <button className="overview-link" type="button" onClick={() => onOpenTools("attacks")}>Abrir panel de ataques</button>
        </section>
        <PrincipalResourceControls state={current} sheet={sheet} onAction={runAdventureAction} onOpenTools={() => onOpenTools("resources")} onError={setActionError}/>
      </div>
    </div>

    <div className="overview-foot-grid">
      <section className="overview-panel panel"><h3>Percepción pasiva</h3><strong className="overview-spotlight">{passivePerception(sheet.skillBonuses.perception, perceptionMode)}</strong><p className="overview-panel-note">10 + Percepción {signed(sheet.skillBonuses.perception)}{perceptionMode !== "normal" ? ` · ${modeName(perceptionMode)} ${perceptionMode === "advantage" ? "+5" : "−5"}` : ""}</p></section>
      <section className="overview-panel panel"><h3>Movimiento y origen</h3><strong className="overview-spotlight">{origin.speedFeet} <small>pies</small></strong><p className="overview-panel-note">Tamaño {origin.size === "medium" ? "mediano" : "pequeño"} · Guerrero nivel {sheet.level}</p></section>
      <section className="overview-panel panel"><h3>Salvaciones de muerte</h3><div className="overview-death-counts"><span>Éxitos: {death?.successes ?? "—"}/3</span><span>Fallos: {death?.failures ?? "—"}/3</span></div><p className="overview-panel-note">{death?.dead ? "Personaje fallecido" : death?.stable ? "Personaje estable" : "Registro disponible en Supervivencia"}</p></section>
      <PrincipalInspirationControls state={current} sheet={sheet} onAction={runAdventureAction}/>
    </div>
    {sheet.warnings.length > 0 && <div className="overview-warning" role="status">{sheet.warnings.includes("heavy_armor_strength_requirement_unmet") && <p>No se cumple el requisito de Fuerza de la armadura pesada.</p>}{sheet.warnings.includes("armor_stealth_disadvantage") && <p>La armadura impone desventaja en Sigilo.</p>}</div>}
  </div>;
}
