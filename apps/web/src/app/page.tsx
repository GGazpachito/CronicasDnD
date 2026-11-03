"use client";

import { useMemo, useState } from "react";
import { calculateFighterSheet } from "../../../../packages/rules-engine/src/sheet";
import type { Ability, AbilityScores } from "../../../../packages/rules-engine/src/abilities";
import type { ArmorId } from "../../../../packages/rules-engine/src/defense";

const INITIAL_SCORES: AbilityScores = {
  strength: 16, dexterity: 14, constitution: 14,
  intelligence: 10, wisdom: 12, charisma: 8,
};
const ABILITIES: ReadonlyArray<{ key: Ability; label: string; abbreviation: string }> = [
  { key: "strength", label: "Fuerza", abbreviation: "FUE" },
  { key: "dexterity", label: "Destreza", abbreviation: "DES" },
  { key: "constitution", label: "Constitución", abbreviation: "CON" },
  { key: "intelligence", label: "Inteligencia", abbreviation: "INT" },
  { key: "wisdom", label: "Sabiduría", abbreviation: "SAB" },
  { key: "charisma", label: "Carisma", abbreviation: "CAR" },
];
const ARMOR_OPTIONS: ReadonlyArray<{ value: ArmorId | "none"; label: string }> = [
  { value: "none", label: "Sin armadura" },
  { value: "leather", label: "Armadura de cuero" },
  { value: "studded_leather", label: "Cuero tachonado" },
  { value: "hide", label: "Armadura de pieles" },
  { value: "chain_shirt", label: "Camisa de malla" },
  { value: "scale_mail", label: "Cota de escamas" },
  { value: "breastplate", label: "Coraza" },
  { value: "half_plate", label: "Media armadura" },
  { value: "ring_mail", label: "Cota de anillas" },
  { value: "chain_mail", label: "Cota de malla" },
  { value: "splint", label: "Armadura de bandas" },
  { value: "plate", label: "Armadura de placas" },
];
const FEATURE_LABELS: Record<string, string> = {
  fighting_style: "Estilo de combate (elección pendiente)",
  second_wind: "Segundo aliento",
  weapon_mastery: "Maestría con armas (elección pendiente)",
  action_surge: "Acción súbita",
  tactical_mind: "Mente táctica",
  champion_improved_critical: "Crítico mejorado (19–20)",
  champion_remarkable_athlete: "Atleta extraordinario",
};
const SKILLS = [
  ["athletics", "Atletismo"], ["acrobatics", "Acrobacias"],
  ["perception", "Percepción"], ["insight", "Perspicacia"],
  ["stealth", "Sigilo"], ["investigation", "Investigación"],
  ["survival", "Supervivencia"], ["intimidation", "Intimidación"],
] as const;

function signed(value: number) { return value >= 0 ? `+${value}` : String(value); }
function modeLabel(mode: string) { return mode === "advantage" ? "Ventaja" : mode === "disadvantage" ? "Desventaja" : "Normal"; }

export default function Home() {
  const [name, setName] = useState("Aldric");
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [scores, setScores] = useState<AbilityScores>(INITIAL_SCORES);
  const [armor, setArmor] = useState<ArmorId | "none">("chain_mail");
  const [shield, setShield] = useState(true);

  const result = useMemo(() => {
    try {
      const sheet = calculateFighterSheet({
        id: "preview-fighter", name: name.trim() || "Sin nombre", ruleset: "dnd-2024",
        fighterLevel: level, baseAbilities: scores,
        baseProficiencies: {
          // Perfil de demostración: salvaciones del Guerrero y dos competencias fijas.
          savingThrows: ["strength", "constitution"], skills: ["athletics", "perception"],
        },
        hpMethod: "fixed", equipment: {
          armor: armor === "none" ? null : armor, shieldEquipped: shield, shieldTrained: true,
        },
        ...(level === 3 ? { subclass: "champion" as const } : {}),
      });
      return { sheet, error: null };
    } catch (error) {
      return { sheet: null, error: error instanceof Error ? error.message : "Entrada no válida" };
    }
  }, [name, level, scores, armor, shield]);

  function setAbility(key: Ability, value: number) {
    // La pantalla es un laboratorio de atributos, no un validador de compra por puntos.
    setScores(previous => ({ ...previous, [key]: value }));
  }

  const sheet = result.sheet;
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Character Builder · D&D 2024</span></div></div>
        <div className="status"><span className="status-dot" /> Motor conectado · Vista local</div>
      </header>

      <div className="content">
        <div className="intro"><div><span className="eyebrow">PROTOTIPO 01 / HOJA EN VIVO</span><h1>Tu personaje, <em>en números.</em></h1><p>Cambia los datos de la izquierda. La hoja se recalcula con el motor TypeScript que ya has probado.</p></div><span className="edition">5.5e · Reglas 2024</span></div>
        <div className="workspace">
          <aside className="editor panel">
            <div className="panel-heading"><div><span className="eyebrow">01 / EDITOR</span><h2>Configurar personaje</h2></div><span className="step-marker">MVP</span></div>
            <label className="field"><span>Nombre</span><input value={name} maxLength={120} onChange={e => setName(e.target.value)} placeholder="Nombre del aventurero" /></label>
            <div className="field"><span className="field-label">Nivel de Guerrero</span><div className="level-picker">{([1, 2, 3] as const).map(n => <button type="button" key={n} aria-pressed={level === n} className={level === n ? "active" : ""} onClick={() => setLevel(n)}>Nivel {n}</button>)}</div></div>
            {level === 3 && <div className="info-line">Subclase fija para este prototipo: <strong>Campeón</strong>.</div>}
            <div className="divider" />
            <div className="section-label"><h3>Características</h3><span>Valores de prueba · 1–20</span></div>
            <div className="ability-inputs">{ABILITIES.map(a => <label className="ability-input" key={a.key}><span>{a.abbreviation}</span><input type="number" min={1} max={20} step={1} value={scores[a.key]} onChange={e => setAbility(a.key, e.target.value === "" ? 0 : Number(e.target.value))} aria-label={a.label} /><small>{a.label}</small></label>)}</div>
            <div className="divider" />
            <div className="section-label"><h3>Equipamiento</h3><span>CA automática</span></div>
            <label className="field"><span>Armadura equipada</span><select value={armor} onChange={e => setArmor(e.target.value as ArmorId | "none")}>{ARMOR_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="switch-field"><span><strong>Escudo equipado</strong><small>Guerrero entrenado con escudos</small></span><input type="checkbox" checked={shield} onChange={e => setShield(e.target.checked)} /></label>
            <div className="editor-footnote">Competencias de demostración: Atletismo, Percepción, salvaciones de Fuerza y Constitución. El trasfondo, las dotes y las elecciones guiadas llegarán más adelante.</div>
          </aside>

          <section className="preview panel" aria-live="polite">
            <div className="panel-heading"><div><span className="eyebrow">02 / HOJA CALCULADA</span><h2>{name.trim() || "Sin nombre"}</h2><p>Guerrero · Nivel {level}{level === 3 ? " · Campeón" : ""}</p></div><span className="roundel">{level}</span></div>
            {result.error && <div className="error" role="alert"><strong>No se puede calcular la hoja.</strong><p>{result.error}</p><p>Corrige las características para continuar.</p></div>}
            {sheet && <>
              <div className="stat-cards"><div className="stat-card"><span>PG MÁXIMOS</span><strong>{sheet.maximumHitPoints}</strong><small>{sheet.hitDice.total}d{sheet.hitDice.die} dados de golpe</small></div><div className="stat-card"><span>CLASE DE ARMADURA</span><strong>{sheet.armorClass}</strong><small>{sheet.armorClassDetails.formula.replace("armor:", "Armadura: ")}</small></div><div className="stat-card"><span>INICIATIVA</span><strong>{signed(sheet.initiative)}</strong><small>{modeLabel(sheet.initiativeRollMode)}</small></div></div>
              <div className="preview-section"><div className="section-label"><h3>Características</h3><span>Bonif. competencia {signed(sheet.proficiencyBonus)}</span></div><div className="ability-grid">{ABILITIES.map(a => <div className="ability-stat" key={a.key}><span>{a.abbreviation}</span><strong>{sheet.abilityScores[a.key]}</strong><small>{signed(sheet.abilityModifiers[a.key])}</small></div>)}</div></div>
              <div className="two-col"><div className="preview-section"><div className="section-label"><h3>Habilidades</h3><span>Selección de muestra</span></div><div className="data-list">{SKILLS.map(([key, label]) => <div className="data-row" key={key}><span>{label}</span><span><strong>{signed(sheet.skillBonuses[key])}</strong>{sheet.skillRollModes[key] !== "normal" && <b className="mode-chip">{modeLabel(sheet.skillRollModes[key])}</b>}</span></div>)}</div></div><div className="preview-section"><div className="section-label"><h3>Recursos y rasgos</h3><span>Según nivel</span></div><div className="resource-grid">{Object.entries(sheet.resources).map(([id, resource]) => resource && <div className="resource-card" key={id}><span>{id === "second_wind" ? "Segundo aliento" : "Acción súbita"}</span><strong>{resource.current} / {resource.maximum}</strong></div>)}</div><ul className="feature-list">{sheet.features.map(feature => <li key={feature}>{FEATURE_LABELS[feature] ?? feature}</li>)}</ul></div></div>
              {sheet.warnings.length > 0 && <div className="warning" role="status">{sheet.warnings.includes("heavy_armor_strength_requirement_unmet") && <p>No cumples el requisito de Fuerza de esta armadura pesada: puede reducir tu velocidad.</p>}{sheet.warnings.includes("armor_stealth_disadvantage") && <p>La armadura equipada impone desventaja en Sigilo.</p>}</div>}
            </>}
          </section>
        </div>
        <footer className="footer">Prototipo local sin cuentas ni persistencia. No calcula automáticamente origen, equipo inicial, progresión por tiradas ni elecciones de estilo de combate.</footer>
      </div>
    </main>
  );
}
