"use client";

import type { KeyboardEvent } from "react";

export const SHEET_TABS = [
  { id: "principal", label: "Principal", shortLabel: "Hoja", number: "01" },
  { id: "rasgos", label: "Rasgos", shortLabel: "Rasgos", number: "02" },
  { id: "equipo", label: "Equipo", shortLabel: "Equipo", number: "03" },
  { id: "hechizos", label: "Hechizos", shortLabel: "Hechizos", number: "04" },
  { id: "personaje", label: "Personaje", shortLabel: "Historia", number: "05" },
  { id: "companions", label: "Compañeros", shortLabel: "Compañeros", number: "06" },
  { id: "combate", label: "Combate", shortLabel: "Combate", number: "07" },
] as const;

export type SheetTab = (typeof SHEET_TABS)[number]["id"];

type CharacterTabsProps = {
  activeTab: SheetTab;
  onChange: (tab: SheetTab) => void;
};

/**
 * Navegación de la hoja. La página padre conserva montados los siete paneles
 * para no reiniciar formularios ni estados de los módulos al cambiar de pestaña.
 */
export default function CharacterTabs({ activeTab, onChange }: CharacterTabsProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = SHEET_TABS.findIndex(tab => tab.id === activeTab);
    const next = event.key === "Home" ? 0
      : event.key === "End" ? SHEET_TABS.length - 1
      : (current + (event.key === "ArrowRight" ? 1 : -1) + SHEET_TABS.length) % SHEET_TABS.length;
    onChange(SHEET_TABS[next].id);
    // El contenido de la página no se desmonta: el botón existe antes del render.
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='tab']");
    buttons[next]?.focus();
  }

  return (
    <nav className="sheet-tabs" role="tablist" aria-label="Secciones de la hoja de personaje" onKeyDown={handleKeyDown}>
      {SHEET_TABS.map(tab => (
        <button
          type="button"
          role="tab"
          key={tab.id}
          id={`sheet-tab-${tab.id}`}
          aria-controls={`sheet-panel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={`sheet-tab${activeTab === tab.id ? " is-active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="sheet-tab-number" aria-hidden="true">{tab.number}</span>
          <span className="sheet-tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
