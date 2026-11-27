"use client";

import Image from "next/image";

type CharacterHeaderProps = {
  name: string;
  portraitDataUrl?: string;
  level: number;
  background: string;
  species: string;
  valid: boolean;
  className?: string;
  subclass?: string;
  onEdit: () => void;
  onLevelUp?: () => void;
  onLevelDown?: () => void;
};

export default function CharacterHeader({ name, portraitDataUrl, level, background, species, valid, onEdit, onLevelUp, onLevelDown, className="Guerrero", subclass }: CharacterHeaderProps) {
  const displayName = name.trim() || "Personaje sin nombre";
  return (
    <section className="character-header panel" aria-label="Identificación del personaje">
      <div className="character-portrait">
        {portraitDataUrl ? <Image src={portraitDataUrl} width={78} height={88} unoptimized alt={`Retrato de ${displayName}`} />
          : <span aria-hidden="true">{displayName[0]?.toLocaleUpperCase("es") ?? "?"}</span>}
      </div>
      <div className="character-identity">
        <span className="eyebrow">HOJA DE PERSONAJE · D&D 2024</span>
        <h1>{displayName}</h1>
        <p>{className}{subclass ? ` · ${subclass}` : className === "Guerrero" && level >= 3 ? " · Campeón" : ""} · Nivel {level} · {species} · {background}</p>
        <span className={`character-validity${valid ? "" : " is-invalid"}`} role="status">
          {valid ? "Hoja calculada" : "Revisar elecciones de la hoja"}
        </span>
      </div>
      <div className="character-header-actions">
        <button type="button" onClick={onEdit}>Editar personaje</button>
        <button type="button" onClick={onLevelDown} disabled={!onLevelDown} title={!onLevelDown?"No se puede bajar del nivel 1":undefined}>Bajar un nivel</button>
        <button type="button" className="primary" onClick={onLevelUp} disabled={!onLevelUp} title={!onLevelUp?"Subida de nivel pendiente de implementación para esta clase o nivel":undefined}>Subir de nivel</button>
      </div>
    </section>
  );
}
