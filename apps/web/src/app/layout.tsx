import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "D&D Character Builder", description: "Proyecto de creador de personajes D&D" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="es"><body>{children}</body></html>;
}
