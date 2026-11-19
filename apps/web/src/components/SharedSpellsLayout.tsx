'use client';

import type {ReactNode} from 'react';

/** Esqueleto único de Hechizos. Ranuras y reglas exclusivas se inyectan aparte. */
export default function SharedSpellsLayout({children,classSpecific,spellClass,description}:{
 children:ReactNode;
 classSpecific?:ReactNode;
 spellClass:string;
 description?:string;
}){
 return <div className="wizard-module panel shared-spells-layout" aria-label="Hoja de hechizos compartida">
  <div className="sheet-section-heading"><div><span className="eyebrow">HECHIZOS · HOJA COMÚN</span><h2>Hechizos</h2>
   <p>Biblioteca, búsqueda, filtros y fichas con la misma disposición para todas las clases. {description??''}</p>
  </div><span className="shared-spells-class">{spellClass}</span></div>
  {children}
  {classSpecific&&<section className="shared-spells-special" aria-label={`Opciones específicas de ${spellClass}`}>
   <div className="divider"/><h3>Opciones de {spellClass}</h3>{classSpecific}
  </section>}
 </div>;
}
