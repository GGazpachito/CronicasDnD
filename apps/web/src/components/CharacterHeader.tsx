"use client";

type CharacterHeaderProps = {
  name: string;
  level: number;
  background: string;
  species: string;
  valid: boolean;
  onEdit: () => void;
  onLevelUp: () => void;
};

export default function CharacterHeader({ name, level, background, species, valid, onEdit, onLevelUp }: CharacterHeaderProps) {
  const displayName = name.trim() || "Personaje sin nombre";
  return (
    <section className="character-header panel" aria-label="Identificación del personaje">
      <div className="character-portrait" aria-hidden="true">{displayName[0]?.toLocaleUpperCase("es") ?? "?"}</div>
      <div className="character-identity">
        <span className="eyebrow">HOJA DE PERSONAJE · D&D 2024</span>
        <h1>{displayName}</h1>
        <p>Guerrero {level >= 3 ? "· Campeón " : ""}· Nivel {level} · {species} · {background}</p>
        <span className={`character-validity${valid ? "" : " is-invalid"}`} role="status">
          {valid ? "Hoja calculada" : "Revisar elecciones de la hoja"}
        </span>
      </div>
      <div className="character-header-actions">
        <button type="button" onClick={onEdit}>Editar personaje</button>
        <button type="button" className="primary" onClick={onLevelUp}>Gestionar nivel</button>
      </div>
    </section>
  );
}
