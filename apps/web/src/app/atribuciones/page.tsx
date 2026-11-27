import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Atribuciones y licencias · CrónicasDnD",
  description: "Origen y condiciones de uso del contenido del SRD 5.2.1 en CrónicasDnD",
};

const linkStyle = { color: "var(--gold)", textDecoration: "underline" } as const;

export default function AttributionPage() {
  return <main className="app-shell" style={{maxWidth:960,margin:"0 auto",padding:"2rem 1.5rem"}}>
    <p><Link href="/" style={linkStyle}>← Volver al menú principal</Link></p>
    <header style={{margin:"1.8rem 0"}}>
      <span className="eyebrow">INFORMACIÓN LEGAL</span>
      <h1>Atribuciones y licencias</h1>
      <p>Origen del contenido y separación de derechos de CrónicasDnD.</p>
    </header>
    <section className="panel" aria-labelledby="srd-heading" style={{padding:"1.5rem",marginBottom:"1rem"}}>
      <h2 id="srd-heading">System Reference Document 5.2.1</h2>
      <p>Esta obra incluye material procedente del documento de referencia del sistema 5.2.1 (“SRD 5.2.1”) de Wizards of the Coast LLC, disponible en <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noopener noreferrer" style={linkStyle}>https://www.dndbeyond.com/srd</a>. La licencia sobre el SRD 5.2.1 se concede de acuerdo con la licencia internacional de atribución/reconocimiento 4.0 de Creative Commons, disponible en <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener noreferrer" style={linkStyle}>https://creativecommons.org/licenses/by/4.0/legalcode</a>.</p>
      <p>Esta es la declaración indicada en el <a href="https://media.dndbeyond.com/compendium-images/srd/5.2/SP_SRD_CC_v5.2.1.pdf" target="_blank" rel="noopener noreferrer" style={linkStyle}>SRD 5.2.1 oficial en español</a>.</p>
    </section>
    <section className="panel" aria-labelledby="changes-heading" style={{padding:"1.5rem",marginBottom:"1rem"}}>
      <h2 id="changes-heading">Adaptaciones e independencia</h2>
      <p>El proyecto reorganiza el contenido SRD como catálogos y cálculos de una hoja digital, con presentación propia, traducciones de interfaz y resúmenes. No es una reproducción oficial del SRD.</p>
      <p>CrónicasDnD no está afiliado ni respaldado por Wizards of the Coast.</p>
    </section>
    <section className="panel" aria-labelledby="rights-heading" style={{padding:"1.5rem"}}>
      <h2 id="rights-heading">Código fuente y módulos</h2>
      <p>El material del SRD 5.2.1 se rige por CC-BY-4.0. Esa licencia no se extiende automáticamente al código y a los recursos originales del proyecto ni a sus dependencias. Sus autores mantienen sus derechos y, de momento, no se concede una licencia general para reutilizar el software.</p>
      <p>Los módulos futuros deberán identificar por separado su fuente, licencia y autorización de distribución. El funcionamiento modular no autoriza a reproducir libros comerciales fuera del SRD.</p>
    </section>
  </main>;
}
