"use client";

import { useSyncExternalStore } from "react";

type CharacterRouteMode = "pending" | "creation" | "existing";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function clientSnapshot(): CharacterRouteMode {
  return new URLSearchParams(window.location.search).has("character") ? "existing" : "creation";
}

function serverSnapshot(): CharacterRouteMode {
  // Evita discrepancias durante la hidratación: la URL se lee en el cliente.
  return "pending";
}

/** Distingue creación de carga por enlace sin actualizar estado en useEffect. */
export default function useCharacterRouteMode(): CharacterRouteMode {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
