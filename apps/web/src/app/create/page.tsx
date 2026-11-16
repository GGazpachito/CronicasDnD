import Link from "next/link";

export default function CreatePage(){
 return <main className="app-shell front-page">
  <header className="topbar"><Link className="wizard-class-link" href="/">← Menú principal</Link><div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Nuevo personaje</span></div></div></header>
  <div className="front-content"><span className="eyebrow">NUEVA AVENTURA</span><h1>Elige tu clase</h1><p>La creación comienza en el nivel 1. El avance de nivel se realiza desde la propia hoja cuando su clase tiene la progresión implementada.</p>
   <div className="front-action-grid">
    <Link className="front-action-card" href="/fighter?new=1"><span className="front-action-symbol" aria-hidden="true">⚔</span><h2>Guerrero</h2><p>Clase y Campeón disponibles hasta nivel 20. Editor completo, equipo y recursos.</p><strong>Crear Guerrero</strong></Link>
    <Link className="front-action-card" href="/wizard?new=1"><span className="front-action-symbol" aria-hidden="true">✧</span><h2>Mago</h2><p>Creación y guardado disponibles a nivel 1. Los niveles superiores y Evocación siguen en desarrollo.</p><strong>Crear Mago</strong></Link>
   </div>
  </div>
 </main>;
}
