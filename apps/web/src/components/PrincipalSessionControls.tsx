"use client";

import { useState, type ChangeEvent } from "react";
import type { AdventureAction, AdventureState } from "../../../../packages/rules-engine/src/adventure";
import type { CalculatedFighterSheet } from "../../../../packages/rules-engine/src/sheet";
import { rollDie } from "../../../../packages/rules-engine/src/dice";

type SessionProps = {
  state: AdventureState | null;
  sheet: CalculatedFighterSheet;
  onAction: (action: AdventureAction) => void;
};

/** Controles manuales: no replican ningún valor persistente de PG ni de recursos. */
export function PrincipalHealthControls({ state, sheet, onAction }: SessionProps) {
  const [amount, setAmount] = useState(5);
  const [critical, setCritical] = useState(false);
  const [fortitude, setFortitude] = useState(false);
  const hasFortitude = sheet.features.includes("epic_boon_fortitude");
  const canUseFortitude = hasFortitude && !state?.combat.fortitudeHealUsed &&
    (state?.fighter.hitPoints.current ?? 0) < sheet.maximumHitPoints;
  const ready = Boolean(state);

  return <section className="overview-panel overview-quick-health panel" aria-label="Gestionar puntos de golpe">
    <div className="overview-panel-heading"><h3>Gestionar puntos de golpe</h3><span>Registro manual</span></div>
    <p className="overview-panel-note">Las cantidades afectan a la partida al pulsar una acción. El daño se aplica primero a los PG temporales; la curación nunca supera los PG máximos.</p>
    <div className="overview-quick-fields">
      <label><span>Cantidad de PG</span><input type="number" min="1" max="100000" step="1" value={amount} onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(Number(e.target.value))} disabled={!ready}/></label>
      <label className="overview-quick-check"><input type="checkbox" checked={critical} onChange={(e: ChangeEvent<HTMLInputElement>) => setCritical(e.target.checked)} disabled={!ready}/><span>Daño crítico (si ya estás a 0 PG)</span></label>
      {hasFortitude && <label className="overview-quick-check"><input type="checkbox" checked={canUseFortitude && fortitude} onChange={(e: ChangeEvent<HTMLInputElement>) => setFortitude(e.target.checked)} disabled={!ready || !canUseFortitude}/><span>Aplicar Fortaleza épica a esta curación</span></label>}
    </div>
    <div className="overview-quick-actions">
      <button type="button" disabled={!ready} onClick={() => onAction({ type: "damage", amount, critical })}>Registrar daño</button>
      <button type="button" disabled={!ready} onClick={() => onAction({ type: "heal", amount, fortitudeBonus: canUseFortitude && fortitude })}>Curar</button>
      <button type="button" disabled={!ready} onClick={() => onAction({ type: "temporary_hp", amount })}>Recibir PG temporales</button>
      <button type="button" className="overview-quick-subtle" disabled={!ready || state!.temporaryHitPoints === 0} onClick={() => onAction({ type: "clear_temporary_hp" })}>Retirar temporales</button>
    </div>
    <p className="overview-panel-note">Los efectos de muerte, concentración y Fortaleza se resuelven con el motor existente. La decisión de aplicar cada efecto es del jugador.</p>
  </section>;
}

type ResourceProps = SessionProps & { onOpenTools: () => void; onError: (message: string) => void };

export function PrincipalResourceControls({ state, sheet, onAction, onOpenTools, onError }: ResourceProps) {
  const [d10, setD10] = useState(6);
  const [fortitude, setFortitude] = useState(false);
  const ready = Boolean(state);
  const conscious = ready && state!.fighter.hitPoints.current > 0 && !state!.survival?.death.dead;
  const second = sheet.resources.second_wind;
  const surge = sheet.resources.action_surge;
  const indomitable = sheet.resources.indomitable;
  const hasFortitude = sheet.features.includes("epic_boon_fortitude");
  const canUseFortitude = hasFortitude && !state?.combat.fortitudeHealUsed &&
    (state?.fighter.hitPoints.current ?? 0) < sheet.maximumHitPoints;

  return <section className="overview-panel panel" aria-label="Gestionar recursos de clase">
    <div className="overview-panel-heading"><h3>Recursos</h3><span>Usos disponibles</span></div>
    <div className="overview-records">
      {second && <div className="overview-record"><span>Segundo aliento</span><strong>{state?.fighter.resources.second_wind?.current ?? "—"}/{second.maximum}</strong></div>}
      {surge && <div className="overview-record"><span>Acción súbita</span><strong>{state?.fighter.resources.action_surge?.current ?? "—"}/{surge.maximum}</strong></div>}
      {indomitable && <div className="overview-record"><span>Indomable</span><strong>{state?.fighter.resources.indomitable?.current ?? "—"}/{indomitable.maximum}</strong></div>}
    </div>
    <div className="overview-quick-resource-fields">
      <label><span>Segundo aliento · resultado d10</span><input type="number" min="1" max="10" step="1" value={d10} onChange={(e: ChangeEvent<HTMLInputElement>) => setD10(Number(e.target.value))} disabled={!ready}/></label>
      <button type="button" disabled={!ready} onClick={() => { try { setD10(rollDie(10)); onError(""); } catch (reason) { onError(reason instanceof Error ? reason.message : "Error al tirar d10"); } }}>Tirar d10</button>
    </div>
    {hasFortitude && <label className="overview-quick-check"><input type="checkbox" disabled={!conscious || !canUseFortitude} checked={canUseFortitude && fortitude} onChange={(e: ChangeEvent<HTMLInputElement>) => setFortitude(e.target.checked)}/><span>Aplicar Fortaleza épica a Segundo aliento</span></label>}
    <div className="overview-quick-actions">
      <button type="button" disabled={!conscious || (state?.fighter.resources.second_wind?.current ?? 0) === 0} onClick={() => onAction({ type: "second_wind", d10, fortitudeBonus: canUseFortitude && fortitude })}>Usar Segundo aliento</button>
      {surge && <button type="button" disabled={!conscious || (state?.fighter.resources.action_surge?.current ?? 0) === 0} onClick={() => onAction({ type: "action_surge" })}>Gastar Acción súbita</button>}
    </div>
    <p className="overview-panel-note">La tirada del d10 no gasta el recurso. Pulsa «Usar Segundo aliento» para aplicar la curación. El movimiento táctico y las acciones del turno siguen siendo decisiones del jugador.</p>
    {indomitable && <p className="overview-panel-note">Indomable requiere una salvación fallida y su repetición: utiliza el panel completo para no eludir esas reglas.</p>}
    <button className="overview-link" type="button" onClick={onOpenTools}>Descansos, Indomable y más recursos</button>
  </section>;
}

export function PrincipalInspirationControls({ state, sheet, onAction }: SessionProps) {
  const inspiration = state?.combat.heroicInspiration === true;
  return <section className="overview-panel panel" aria-label="Inspiración heroica">
    <h3>Inspiración heroica</h3>
    <strong className="overview-inspiration-value">{state ? (inspiration ? "Disponible" : "Sin inspiración") : "—"}</strong>
    <div className="overview-quick-actions">
      <button type="button" disabled={!state || inspiration} onClick={() => onAction({ type: "gain_heroic_inspiration" })}>Anotar inspiración</button>
      <button type="button" disabled={!state || !inspiration} onClick={() => onAction({ type: "spend_heroic_inspiration" })}>Gastar inspiración</button>
    </div>
    <p className="overview-panel-note">El jugador o DM decide cuándo se recibe. Al gastarla, repite el dado y usa el nuevo resultado. No se lanza automáticamente.</p>
    {sheet.features.includes("champion_heroic_warrior") && <p className="overview-panel-note">Guerrero heroico: la inspiración se recupera al iniciar tu turno mediante el panel de turnos existente.</p>}
    <p className="overview-panel-note">Resistencias e inmunidades: resumen pendiente de integración.</p>
  </section>;
}
