import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRÓNICAS · Editor de personajes compatible con 5E",
  description: "Proyecto independiente de hoja de personaje digital basado en el SRD 5.2.1",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>
    {children}
    <footer aria-label="Información legal de CRÓNICAS" style={{padding:"1rem 1.5rem",textAlign:"center",borderTop:"1px solid var(--line)",fontSize:"0.85rem",color:"var(--muted)"}}>
      <span>CRÓNICAS · Proyecto independiente basado en el SRD 5.2.1</span>
      <span aria-hidden="true"> · </span>
      <Link href="/atribuciones" style={{color:"var(--gold)",textDecoration:"underline"}}>Atribuciones y licencias</Link>
    </footer>
  </body></html>;
}
