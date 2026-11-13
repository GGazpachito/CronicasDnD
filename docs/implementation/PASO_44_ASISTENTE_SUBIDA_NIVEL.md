# Paso 44 · Asistente transaccional de subida de nivel

**Proyecto:** Crónicas, hoja de personaje D&D 2024 y apoyo al jugador.  
**Fecha de preparación:** 13 de noviembre de 2026.  
**Alcance:** Guerrero 1–20 y subclase Campeón actualmente implementada.  
**Estado:** código preparado y comprobado de manera aislada; pendiente de Vitest completo, ESLint, build Next.js y comprobación en la instalación de desarrollo.

## 1. Contexto y problema

Hasta el paso 43, las mejoras de característica, nuevas maestrías, segundo estilo de combate y beneficios épicos se elegían en distintos apartados del editor. La flecha de progreso intentaba validar esas elecciones y avanzar la partida, pero no había una experiencia unificada que permitiera **ver, elegir, revisar y confirmar**. Esto aumentaba los errores de uso y hacía difícil entender qué se estaba consolidando al subir de nivel.

No se desea automatizar el combate: la aplicación debe calcular efectos pasivos, asistir tiradas y dejar las decisiones activas al jugador y al director de juego.

## 2. Objetivos y criterios de aceptación

1. Abrir el asistente desde la cabecera de la ficha y la flecha derecha del selector de nivel.
2. Mostrar los hitos del siguiente nivel del Guerrero/Campeón, sin ofrecer clases o dotes todavía sin motor.
3. Recoger en una única pantalla, según el nivel, las decisiones obligatorias: Mejora de característica (4, 6, 8, 12, 14, 16), maestría nueva (4, 10, 16), segundo estilo (7), beneficio épico y atributo (19).
4. Construir una ficha candidata en **borrador** sin alterar el nivel, inventario ni sesión compartida.
5. Comprobar que las elecciones son legales, que no hay rasgos duplicados y que la hoja resultante se puede calcular.
6. Mostrar previsualización de PG máximos, competencia, CA, iniciativa, características, maestrías, recursos y nuevos rasgos.
7. Confirmar mediante **una sola transición validada** con el motor ya disponible. Mantener la sesión y el daño acumulado en una subida normal.
8. Ante desincronización, solicitar autorización explícita. Si la transición no puede conservar la sesión, ofrecer una recuperación por reinicio **también explícita**.
9. Conservar el esquema de guardado existente y exigir «Actualizar guardado» para persistir en PostgreSQL.
10. No añadir cambios no relacionados al commit.

## 3. Referencias del Manual del Jugador (2024)

La fuente principal es el PDF facilitado por el propietario del proyecto:

- **Capítulo 2, «Gaining a Level», página impresa 42**: nueva clase/nivel, ajuste de PG y dados de golpe, rasgos nuevos, competencia y modificadores de característica.
- **Capítulo 3, Guerrero, tabla «Fighter Features», página impresa 91**: progresión del Guerrero, máximos de Segundo aliento, maestrías y competencia por nivel.
- **Capítulo 3, Campeón, página impresa 96**: desbloqueos de la subclase (niveles 3, 7, 10, 15 y 18).
- **Capítulo 5, dotes y beneficios épicos**: la aplicación ofrece solo las opciones cuya lógica está implementada, no todas las disponibles en el manual.

**Límite editorial y funcional:** el asistente presenta resúmenes propios de los hitos y no incorpora extensas transcripciones del manual. Las reglas de progresión ya implementadas están en `sheet.ts`, `guided.ts`, `martial.ts`, `progression.ts` y `level-up.ts`.

## 4. Cambios de arquitectura

### 4.1. Capa pura de borradores

Nuevo módulo `packages/rules-engine/src/level-up-wizard.ts`:

- `fighterLevelUpRequirements(level)`: indica qué elecciones exige el nivel siguiente.
- `buildFighterLevelUpCandidate(current, choices)`: crea **nuevo objeto** con el nivel siguiente y sus elecciones, sin mutar `current`.
- `previewFighterLevelUp(current, choices)`: calcula con `calculateGuidedFighter` tanto la ficha anterior como la candidata, determina los rasgos nuevos por identificador estable y rechaza duplicados.
- `FIGHTER_LEVEL_MILESTONES`: resúmenes en español de los hitos implementados, asociados a su nivel.

No hay `setState` ni llamadas de red ni acceso a base de datos en esta capa.

### 4.2. Capa de interfaz

Nuevo componente `apps/web/src/components/LevelUpWizard.tsx`:

1. **Novedades:** presenta los rasgos del nivel próximo y advierte cuando existen opciones oficiales aún no programadas.
2. **Elecciones:** formularios únicamente para las elecciones del nivel que se intenta ganar. La siguiente pantalla se bloquea hasta que el motor acepta la ficha candidata.
3. **Confirmación:** diferencia de estadísticas, lista de rasgos obtenidos, condiciones de la sesión y confirmación final.

Las elecciones usan `useState` **local al asistente**. Al pulsar Cancelar no se transmite ningún cambio al padre. Al confirmar se invoca `prepareFighterLevelUp`, que genera `CharacterSnapshot` validado; el padre recibe una única instantánea mediante `onConfirmed` y vuelca nivel, elecciones y sesión a React dentro del mismo evento.

El componente `page.tsx` elimina la ruta antigua de avance mediante múltiples mensajes y controles dispersos antes de subir. La acción de **bajar** de nivel mantiene su comportamiento existente de reiniciar la sesión tras confirmación.

### 4.3. Persistencia

La instantánea sigue empleando el formato existente de `persistence.ts`. No cambia `schemaVersion`, no se modifica Prisma y no se ejecutan migraciones. El usuario debe pulsar «Actualizar guardado» para persistir la nueva ficha; hasta entonces PostgreSQL conserva el guardado anterior.

### 4.4. Sesiones desincronizadas

1. Se intenta la transición normal y se conservan PG perdidos, recursos usados y la sesión compatible.
2. Si el máximo de PG de la sesión no coincide con la hoja, el asistente requiere la autorización de sincronización antes de confirmar.
3. Si falla la transición, se puede elegir explícitamente la recuperación con sesión nueva, que **descarta únicamente el estado de partida local** después de aceptar la advertencia.
4. La recuperación nunca se ejecuta en silencio.

## 5. Alternativas estudiadas

| Alternativa | Decisión | Motivo |
|---|---|---|
| Modificar el nivel inmediatamente y deshacer si falla | Descartada | Puede introducir valores transitorios inválidos y alterar el estado compartido |
| Seguir exigiendo elecciones en varias pestañas | Descartada | Dificulta descubrir qué falta y hace la progresión poco legible |
| Implementar una segunda lógica de reglas en el componente | Descartada | Generaría discrepancias con el motor probado |
| Calcular ficha candidata sin efectos y confirmar mediante `prepareFighterLevelUp` | **Elegida** | Reutiliza validación, preserva sesión y crea una única instantánea |
| Guardado automático a PostgreSQL al confirmar | Pospuesto | Cambiaría el contrato de guardado manual existente |

## 6. Archivos de la entrega

- `apps/web/src/app/page.tsx`: punto de entrada, apertura del asistente, confirmación transaccional y retirada de campos anticipados de nivel.
- `apps/web/src/components/LevelUpWizard.tsx`: interfaz y borradores locales.
- `apps/web/src/app/globals.css`: diseño adaptable y estados visuales.
- `packages/rules-engine/src/level-up-wizard.ts`: validación y previsualización puras.
- `packages/rules-engine/tests/level-up-wizard.test.ts`: pruebas de niveles, decisiones, no mutación y transición.
- `docs/implementation/PASO_44_ASISTENTE_SUBIDA_NIVEL.md`: presente documento.

## 7. Comprobaciones de preparación (reales)

- **TypeScript estricto del motor nuevo:** superado con TypeScript 5.8.3 del entorno de preparación.
- **TypeScript estricto de la página web y sus componentes:** superado con declaraciones provisionales para `next/image`; no equivale a build de Next.js.
- **Diez pruebas de lógica del nuevo archivo:** superadas mediante ejecución compilada y un ejecutor de aserciones local. Incluyen una progresión completa 1→20, requisitos en niveles especiales, rechazo de elecciones inválidas, preservación del input original, daño, recursos, marcadores manuales de muerte y ausencia de rasgos duplicados. **No equivalen a ejecutar la suite oficial de Vitest.**
- **Renderizado de servidor aislado del asistente:** superado para el salto 3→4, con React y `react-dom/server` disponibles en el entorno.

**Pendiente y obligatorio en la instalación del usuario:**

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Criterios de prueba manual:

1. Crear o cargar personaje nivel 3, abrir asistente, comprobar lista del nivel 4, elegir mejora y cuarta maestría, cancelar, verificar que sigue en nivel 3.
2. Reabrir, confirmar el salto 3→4, comprobar CA, PG máximos, rasgos y maestrías.
3. Probar nivel 6→7: no permitir el mismo estilo de combate dos veces.
4. Probar 9→10, 15→16 y 18→19: el asistente solicita las elecciones esperadas.
5. Conservar daño y usos de Acción súbita tras confirmar un avance válido.
6. Verificar la recuperación excepcional únicamente tras consentimiento expreso.
7. Guardar y recargar un personaje; comprobar que nivel, elecciones, inventario y perfil siguen presentes.
8. Revisar tamaño pequeño de pantalla, scroll del modal y cierre mediante Escape.

## 8. Límites y riesgos pendientes

- La aplicación solo incluye Guerrero y subclase Campeón; el nivel 3 no presenta elecciones de otras subclases.
- El motor implementa Mejora de característica en sus hitos, pero todavía **no** permite escoger todas las dotes generales del PHB 2024.
- El nivel 19 ofrece solo los tres beneficios épicos que ya están implementados.
- La hoja usa el método de PG fijos existente. No se introduce una pantalla para elegir tiradas de PG al subir.
- Aún no se han implementado multiclase ni subida por experiencia.
- La edición directa de mejoras de un nivel ya adquirido sigue disponible en el editor técnico y puede desincronizar la sesión. El asistente gestiona esa situación al intentar la siguiente subida.
- La compatibilidad con snapshots antiguos debe verificarse en navegador con personajes reales y copias de seguridad disponibles.
- La versión local del usuario (TypeScript 5.9.3, ESLint 9.39.1) debe realizar la validación definitiva; las pruebas aisladas de preparación no sustituyen esa verificación.

## 9. Registro de versión / Git

**Identificador:** Paso 44.  
**Commit recomendado:** `feat: actualizacion 44 - asistente transaccional de subida de nivel`.  
**Commit real:** pendiente de obtener de `git log -1 --oneline` después de subir.  
**Estado final:** pendiente de pruebas en la instalación y commit de aceptación.

Comando selectivo de preparación:

```powershell
git add -- "apps/web/src/app/page.tsx" "apps/web/src/app/globals.css" "apps/web/src/components/LevelUpWizard.tsx" "packages/rules-engine/src/level-up-wizard.ts" "packages/rules-engine/tests/level-up-wizard.test.ts" "docs/implementation/PASO_44_ASISTENTE_SUBIDA_NIVEL.md"
```
