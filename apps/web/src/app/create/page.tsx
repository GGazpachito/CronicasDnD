import Link from "next/link";

export default function CreatePage(){
 return <main className="app-shell front-page">
  <header className="topbar"><Link className="wizard-class-link" href="/">← Menú principal</Link><div className="brand"><span className="brand-mark">D20</span><div><strong>CrónicasDnD</strong><span>Nuevo personaje</span></div></div></header>
  <div className="front-content"><span className="eyebrow">NUEVA AVENTURA</span><h1>Elige tu clase</h1><p>Primero completarás las elecciones de nivel 1 en una ventana independiente. Al guardar tus elecciones se mostrará la hoja principal. Los niveles posteriores se gestionan desde «Subir de nivel».</p>
   <div className="front-action-grid">
    <Link className="front-action-card" href="/fighter?new=1"><span className="front-action-symbol" aria-hidden="true">⚔</span><h2>Guerrero</h2><p>Clase y Campeón disponibles hasta nivel 20. Editor completo, equipo y recursos.</p><strong>Crear Guerrero</strong></Link>
    <Link className="front-action-card" href="/wizard?new=1"><span className="front-action-symbol" aria-hidden="true">✧</span><h2>Mago</h2><p>Progresión hasta nivel 20, con tradición de Evocación, hechizos y guardado completo.</p><strong>Crear Mago</strong></Link>
    <Link className="front-action-card" href="/warlock?new=1"><span className="front-action-symbol" aria-hidden="true">✺</span><h2>Brujo</h2><p>Progresión disponible hasta nivel 16. Invocaciones, Magia de Pacto y Patrón Infernal a partir del nivel 3.</p><strong>Crear Brujo</strong></Link>
   </div>
  </div>
 </main>;
}
