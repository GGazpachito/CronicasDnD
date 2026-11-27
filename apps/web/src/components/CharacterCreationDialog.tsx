"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/** Marco compartido para la creación y edición de cualquier clase, presente o futura.
 * El formulario vive en la ventana y el padre confirma las elecciones al pulsar Guardar.
 * La persistencia en PostgreSQL sigue siendo una operación explícita de SaveLoadPanel.
 */
export default function CharacterCreationDialog({
  characterClass, isNew, valid, error, onSave, onCancel, children,
}: Readonly<{
  characterClass: string;
  isNew: boolean;
  valid: boolean;
  error?: string | null;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
}>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!element.open) element.showModal();
    return () => { if (element.open) element.close(); };
  }, []);

  return <dialog ref={dialog} className="character-creation-dialog" aria-labelledby={titleId}
    aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); onCancel(); }}>
    <div className="character-creation-frame">
      <header className="character-creation-heading">
        <div>
          <span className="eyebrow">CRÓNICASDND · {characterClass.toLocaleUpperCase("es")}</span>
          <h2 id={titleId}>{isNew ? `Crear ${characterClass}` : `Editar ${characterClass}`}</h2>
          <p id={descriptionId}>Completa las elecciones del personaje. Los cambios se aplican a su hoja al pulsar «Guardar elecciones».</p>
        </div>
        <button type="button" className="character-creation-close" onClick={onCancel} aria-label={isNew ? "Volver a las clases" : "Cancelar edición"}>×</button>
      </header>
      <div className="character-creation-body">{children}</div>
      <footer className="character-creation-footer">
        <div className="character-creation-status" role="status">
          {error ? <span className="error">{error}</span> : valid ? "Elecciones válidas. Puedes guardar." : "Completa las elecciones obligatorias antes de continuar."}
          <small>Para conservar el personaje en tu cuenta, utiliza «Guardar personaje» desde la hoja.</small>
        </div>
        <div className="character-creation-actions">
          <button type="button" onClick={onCancel}>{isNew ? "Volver a las clases" : "Cancelar"}</button>
          <button type="button" className="primary" onClick={onSave} disabled={!valid}>Guardar elecciones</button>
        </div>
      </footer>
    </div>
  </dialog>;
}
