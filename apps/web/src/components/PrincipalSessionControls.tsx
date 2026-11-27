"use client";

import { useId, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from "react";
import type { AdventureAction, AdventureState } from "../../../../packages/rules-engine/src/adventure";
import type { CalculatedFighterSheet } from "../../../../packages/rules-engine/src/sheet";
import { rollDie } from "../../../../packages/rules-engine/src/dice";

type SessionProps = {
  state: AdventureState | null;
  sheet: CalculatedFighterSheet;
  /** Devuelve true únicamente si el motor acepta el cambio. */
  onAction: (action: AdventureAction) => boolean;
};

type SignedAdjusterProps = {
  title: string;
  current: number | null;
  maximum?: number;
  disabled: boolean;
  onAdjust: (delta: number) => boolean;
  onError: (message: string) => void;
};

/** Campo temporal: jamás almacena una segunda copia de los PG del personaje. */
function SignedHitPointAdjuster({ title, current, maximum, disabled, onAdjust, onError }: SignedAdjusterProps) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const ready = !disabled && current !== null;

  function adjust(delta: number) {
    if (!ready) return;
    if (delta === 0) { setDraft(""); return; }
    if (onAdjust(delta)) setDraft("");
  }

  function commit() {
    const text = draft.trim();
    if (!text || !ready) return;
    if (!/^[+-]?\d+$/.test(text)) {
      onError(`Introduce un número entero para ${title.toLowerCase()}, por ejemplo +5 o -3.`);
      return;
    }
    const delta = Number(text);
    if (!Number.isSafeInteger(delta) || Math.abs(delta) > 100_000) {
      onError("El cambio debe estar entre -100000 y +100000 PG.");
      return;
    }
    adjust(delta);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDraft("");
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      // También funcionan las flechas del teclado sin necesitar confirmar nada.
      event.preventDefault();
      adjust(event.key === "ArrowUp" ? 1 : -1);
    }
  }

  return <div className="overview-hp-stat">
    <label htmlFor={id} className="overview-hp-label">{title}</label>
    <div className="overview-hp-reading" aria-live="polite" aria-atomic="true">
      <strong>{current ?? "—"}</strong>{maximum !== undefined && <small> / {maximum}</small>}
    </div>
    <div className="overview-hp-input-group">
      <input id={id} type="text" inputMode="numeric" autoComplete="off" spellCheck={false}
        placeholder="+5 / -5" value={draft} disabled={!ready}
        aria-label={`Variación de ${title.toLowerCase()}: positivo suma, negativo resta`}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
        onKeyDown={onInputKeyDown} onBlur={commit}/>
      <div className="overview-hp-stepper">
        <button type="button" disabled={!ready || (maximum !== undefined && current! >= maximum) || (maximum === undefined && current! >= 100_000)}
          aria-label={`Aumentar ${title.toLowerCase()} en 1`}
          onPointerDown={(event: PointerEvent<HTMLButtonElement>) => event.preventDefault()}
          onClick={() => adjust(1)}>▲</button>
        <button type="button" disabled={!ready || (maximum === undefined && current === 0)}
          aria-label={`Reducir ${title.toLowerCase()} en 1`}
          onPointerDown={(event: PointerEvent<HTMLButtonElement>) => event.preventDefault()}
          onClick={() => adjust(-1)}>▼</button>
      </div>
    </div>
  </div>;
}

type HealthProps = SessionProps & { onError: (message: string) => void };

/** Los PG y los PG temporales se ajustan desde la cabecera, sin un panel separado. */
export function PrincipalHealthControls({ state, sheet, onAction, onError }: HealthProps) {
  const [critical, setCritical] = useState(false);
  const current = state?.fighter.hitPoints.current ?? null;
  const temporary = state?.temporaryHitPoints ?? null;

  function updateHealth(delta: number) {
    if (delta < 0) return onAction({ type: "damage", amount: -delta, critical: current === 0 && critical });
    return onAction({ type: "heal", amount: delta });
  }

  return <div className="overview-health-inline" aria-label="Ajustar puntos de golpe">
    <div className="overview-health-pair">
      <SignedHitPointAdjuster title="PG actuales" current={current} maximum={sheet.maximumHitPoints}
        disabled={!state} onAdjust={updateHealth} onError={onError}/>
      <SignedHitPointAdjuster title="PG temporales" current={temporary}
        disabled={!state} onAdjust={(delta) => onAction({ type: "adjust_temporary_hp", amount: delta })} onError={onError}/>
    </div>
    <p className="overview-health-hint">Escribe <b>+5</b> o <b>-5</b> y pulsa Intro, o usa las flechas para cambiar 1 PG al instante. El daño consume primero los temporales.</p>
    {state && current === 0 && <label className="overview-quick-check overview-hp-option"><input type="checkbox" checked={critical} onChange={(event: ChangeEvent<HTMLInputElement>) => setCritical(event.target.checked)}/><span>Daño crítico mientras estás a 0 PG</span></label>}
  </div>;
}

type ResourceProps = SessionProps & { onOpenTools: () => void; onError: (message: string) => void };

export function PrincipalResourceControls({ state, sheet, onAction, onOpenTools, onError }: ResourceProps) {
  const [d10, setD10] = useState(6);
  const ready = Boolean(state);
  const conscious = ready && state!.fighter.hitPoints.current > 0 && !state!.survival?.death.dead;
  const second = sheet.resources.second_wind;
  const surge = sheet.resources.action_surge;
  const indomitable = sheet.resources.indomitable;

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
    <div className="overview-quick-actions">
      <button type="button" disabled={!conscious || (state?.fighter.resources.second_wind?.current ?? 0) === 0} onClick={() => onAction({ type: "second_wind", d10 })}>Usar Segundo aliento</button>
      {surge && <button type="button" disabled={!conscious || (state?.fighter.resources.action_surge?.current ?? 0) === 0} onClick={() => onAction({ type: "action_surge" })}>Gastar Acción súbita</button>}
    </div>
    <p className="overview-panel-note">La tirada del d10 no gasta el recurso. Pulsa «Usar Segundo aliento» para aplicar la curación. El movimiento táctico y las acciones del turno siguen siendo decisiones del jugador.</p>
    {indomitable && <p className="overview-panel-note">Indomable requiere una salvación fallida y su repetición: utiliza el panel completo para no eludir esas reglas.</p>}
    <button className="overview-link" type="button" onClick={onOpenTools}>Descansos, Indomable y más recursos</button>
  </section>;
}

export function PrincipalInspirationControls({ state, sheet, onAction }: SessionProps) {
  const inspiration = state?.combat.heroicInspiration === true;
  return <section className="overview-panel panel overview-inspiration-panel" aria-label="Inspiración heroica">
    <h3>Inspiración heroica</h3>
    <label className={`overview-inspiration-toggle${inspiration?" is-active":""}${!state?" is-disabled":""}`}>
      <input type="checkbox" checked={inspiration} disabled={!state}
        onChange={event=>onAction({type:event.target.checked?"gain_heroic_inspiration":"spend_heroic_inspiration"})}/>
      <span className="overview-inspiration-symbol" aria-hidden="true">✦</span>
      <span className="overview-inspiration-label"><strong>{!state?"Partida no disponible":inspiration?"Inspiración disponible":"Sin inspiración"}</strong>
        <small>{inspiration?"Marcada · pulsa para gastar":"Márcala cuando la consigas"}</small></span>
      <span className="overview-inspiration-check" aria-hidden="true">{inspiration?"✓":""}</span>
    </label>
    <p className="overview-panel-note">El jugador o DM decide cuándo se recibe. Al gastarla, repite el dado y usa el nuevo resultado. No se lanza automáticamente.</p>
    {sheet.features.includes("champion_heroic_warrior") && <p className="overview-panel-note">Guerrero heroico: la inspiración se recupera al iniciar tu turno mediante el panel de turnos existente.</p>}
    <p className="overview-panel-note">Resistencias e inmunidades: resumen pendiente de integración.</p>
  </section>;
}
