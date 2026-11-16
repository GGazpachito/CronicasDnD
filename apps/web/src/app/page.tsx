import Link from "next/link";

export default function Home(){
 return <main className="app-shell front-page">
  <header className="topbar"><div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Hojas de personaje · D&D 2024</span></div></div><div className="status"><span className="status-dot"/> Desarrollo local</div></header>
  <div className="front-content"><span className="eyebrow">BIENVENIDO A TU AVENTURA</span><h1>Gestor de personajes</h1><p>Selecciona si quieres comenzar un personaje desde cero o continuar con uno guardado.</p>
   <div className="front-action-grid">
    <Link href="/create" className="front-action-card"><span className="front-action-symbol" aria-hidden="true">✦</span><h2>Crear personaje</h2><p>Elige una clase y empieza en el nivel 1.</p><strong>Empezar creación</strong></Link>
    <Link href="/load" className="front-action-card"><span className="front-action-symbol" aria-hidden="true">▣</span><h2>Cargar personaje</h2><p>Recupera tus aventureros de PostgreSQL con su retrato y sus datos.</p><strong>Ver personajes</strong></Link>
   </div>
   <p className="front-smallprint">Los personajes se guardan únicamente cuando confirmas «Guardar» o «Actualizar guardado» en su hoja.</p>
  </div>
 </main>;
}
