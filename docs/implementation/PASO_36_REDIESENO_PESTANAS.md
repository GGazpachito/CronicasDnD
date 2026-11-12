# Actualización 36 · Estructura de hoja digital y navegación

**Fecha del trabajo:** 12/11/2026
**Tipo de entrega:** interfaz / reorganización incremental
**Estado:** código preparado; validación visual y pruebas oficiales en el entorno del proyecto pendientes.

## Contexto y motivación

Tras las actualizaciones 1–35 (Guerrero/Campeón hasta nivel 20, según el historial), la aplicación presenta una columna de herramientas de partida y un asistente guiado de cinco pasos, con su hoja calculada al final. La especificación del rediseño requiere una hoja digital dividida en seis pestañas, con los mismos datos para todas las secciones, sin convertir la herramienta en un videojuego.

El archivo `apps/web/src/app/page.tsx` contiene el estado de creación, progresión, inventario y sesión. Extraer todo de golpe supondría una refactorización de alto riesgo.

## Decisión técnica

1. Mantener `Home` y sus estados en `page.tsx` durante esta primera fase.
2. Crear `CharacterTabs.tsx`, `CharacterHeader.tsx` y `SheetPlaceholder.tsx` para separar estructura de presentación.
3. Definir las pestañas Principal, Rasgos, Equipo, Hechizos, Personaje y Combate.
4. Mantener *montados* los seis paneles React y alternar el atributo HTML `hidden`, para no reiniciar los componentes al navegar. El CSS garantiza `[hidden]{display:none}`.
5. Conservar la hoja/editor original en Principal. Trasladar los ocho módulos anteriores de partida y combate a un desplegable dentro de Principal, sin retirar ninguno ni cambiar sus propiedades/callbacks.
6. Presentar las demás pestañas como vistas preliminares, mostrando únicamente datos calculados reales disponibles. No implementar todavía una hoja de hechizos completa, campos narrativos, ni el módulo de combate nuevo.
7. Mantener `SaveLoadPanel` fuera de las pestañas para acceder al guardado/carga desde cualquiera de ellas.
8. No modificar `packages/rules-engine`, rutas de API, Prisma, formato de instantáneas ni operaciones de subida de nivel.

## Archivos afectados

- `apps/web/src/app/page.tsx`: nueva composición de la pantalla, navegación y agrupación de componentes existentes.
- `apps/web/src/app/globals.css`: estilos de cabecera, pestañas, placeholders, herramientas heredadas y adaptaciones responsive.
- `apps/web/src/components/CharacterTabs.tsx`: componente nuevo de navegación accesible por teclado, con IDs estables y `aria-*`.
- `apps/web/src/components/CharacterHeader.tsx`: componente nuevo que muestra nombre, clase, subclase, nivel, especie y origen; enlaza con el editor vigente.
- `apps/web/src/components/SheetPlaceholder.tsx`: componente nuevo reutilizable para vistas todavía incompletas.
- `README.md`: actualización de documentación sobre el estado de la aplicación.
- `docs/implementation/PASO_36_REDIESENO_PESTANAS.md`: este registro.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Reescribir por completo `page.tsx` y separar todos sus estados | Rechazada en esta fase por riesgo de regresiones y falta de pruebas específicas de cada separación |
| Implementar rutas independientes de Next.js para cada pestaña | Aplazada: requiere un contexto compartido y preservación explícita de estados antes de navegar |
| Desmontar cada pestaña cuando no está seleccionada | Rechazada: podría reiniciar estados locales de los paneles existentes |
| Pestañas locales con paneles siempre montados | **Seleccionada**: cambio limitado, reversible y compatible con el estado actual |

## Funciones preservadas

- Creación del Guerrero/Campeón y selector de nivel existente.
- Cálculos de la hoja mediante `calculateGuidedFighter`.
- Guardado/carga de personajes a través de `SaveLoadPanel`.
- Transacciones de inventario y equipamiento.
- Estado de sesión y uso de recursos.
- Paneles `PlayPanel`, `SurvivalPanel`, `MagicWardsPanel`, `IncomingAttacksPanel`, `ConditionsPanel`, `TurnPanel`, `AttacksPanel` y `CombatPanel`.

## Pruebas ejecutadas durante la preparación

- Análisis sintáctico TypeScript/TSX de los cuatro archivos TSX nuevos o modificados: **sin errores**.
- `tsc --noEmit -p apps/web/tsconfig.json` con TypeScript 5.8.3 instalado en el entorno auxiliar: **sin errores**. No sustituye la verificación con la versión fijada para el proyecto.
- Render estático aislado con React de `CharacterTabs` y `CharacterHeader`: **correcto**. Se comprueban seis pestañas distintas, una sola seleccionada y datos principales de cabecera.
- No se ha ejecutado `pnpm test`, `pnpm build` ni una prueba en navegador en el entorno del usuario. El equipo auxiliar dispone de Node 22, mientras que el repositorio solicita Node 24 o superior, y no incluye todas las dependencias del workspace.

## Criterios de aceptación y prueba manual pendiente

1. Abrir Principal y comprobar que aparecen los cinco pasos de creación y la hoja calculada.
2. Ir a Rasgos y regresar; el nombre, nivel y elecciones deben seguir iguales.
3. Ir a Equipo, usar «Editar equipo actual» y comprobar que abre el paso 5 del editor.
4. Expandir «Herramientas existentes de partida y combate», comprobar que aparecen los ocho módulos y que su estado sigue activo después de cambiar de pestaña.
5. Equipar/desequipar un objeto, comprobar que el cálculo de CA y la vista preliminar de Equipo se actualizan sin recargar.
6. Guardar, cargar, cambiar de pestaña y comprobar que se mantienen los datos.
7. Comprobar que Hechizos no muestra espacios de conjuro ficticios y que Combate dice «Coming Soon».
8. Probar navegación con ratón, teclado (flechas, Inicio y Fin), móvil y lector de pantalla si está disponible.
9. Desde la raíz del repositorio y con Node 24, ejecutar:
   ```powershell
   pnpm install --frozen-lockfile
   pnpm test
   pnpm build
   pnpm lint
   ```
   Conservar las salidas y el commit Git como evidencia del TFG.

## Limitaciones y siguientes fases

Esta entrega **no** termina la migración visual. Principal mantiene el editor anterior y las pestañas secundarias son vistas preliminares. No existe persistencia de textos narrativos ni un selector completo de conjuros. La cabecera utiliza una inicial, no una imagen subida por el jugador.

**Siguiente fase:** actualización 37, hoja Principal centrada en la consulta de estadísticas, con componentes de presentación extraídos progresivamente y datos derivados reutilizados del motor.

## Trazabilidad

- ADR-001: hoja digital, no videojuego.
- ADR-004: motor separado de la presentación.
- ADR-013: seis pestañas.
- ADR-014: combate completo fuera del alcance actual.
- ADR-017: un estado compartido para el personaje.
- ADR-018: rediseño incremental sin reescribir el motor.

**Commit / fecha de aceptación / capturas de pantalla:** pendiente de registrar en el equipo del autor.
