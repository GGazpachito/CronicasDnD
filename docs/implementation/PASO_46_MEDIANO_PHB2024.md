# Paso 46. Primera ampliación del catálogo oficial: Mediano (PHB 2024)

**Fase:** 46 · **Fecha de preparación:** 16 de noviembre de 2026  
**Producto:** hoja de personaje digital de D&D 2024, creador de Guerrero/Campeón niveles 1–20  
**Origen del código de esta entrega:** archivos del proyecto proporcionados y entregas incrementales 36–45 reconstruidas en orden. La instalación local del usuario es la fuente final de aceptación.

## 1. Problema y objetivo

Tras consolidar las seis pestañas y la calidad general en el paso 45, el creador seguía limitado a Humano, Enano y Elfo. El paso 46 inaugura una ampliación **incremental** de contenido del *Manual del Jugador 2024*, incorporando la especie **Mediano (Halfling)** sin añadir todavía clases, bases de datos ni automatizaciones de combate nuevas.

Criterios:

1. Elegir Mediano durante la creación y editar un personaje que lo tenga.
2. Aplicar automáticamente tamaño **Pequeño** y velocidad base **30 pies**.
3. Mostrar en Rasgos sus cuatro capacidades, con resúmenes originales en español.
4. No falsear reglas situacionales no implementadas.
5. Admitir Mediano en la validación de defensas frente al daño.
6. Conservar guardados v2 y personajes existentes sin migraciones.

## 2. Fuente y decisiones de reglas

**Fuente principal:** *Dungeons & Dragons Player's Handbook* (2024), capítulo 4, **página impresa 193**, apartado *Halfling Traits* del PDF proporcionado por el usuario. Las descripciones incluidas en la aplicación son paráfrasis breves, no reproducciones extensas del manual.

| Rasgo | Regla considerada | Implementación de esta fase |
|---|---|---|
| Tipo y tamaño | Humanoide, tamaño Pequeño | Tamaño calculado automáticamente; el tipo se documenta, sin otro efecto |
| Velocidad | 30 pies | Calculada y visible en hoja |
| Valentía (*Brave*) | Ventaja al evitar o finalizar el estado Asustado | Explicación en Rasgos; se usa manualmente el selector existente de ventaja al darse la condición |
| Agilidad de mediano (*Halfling Nimbleness*) | Pasar por el espacio de una criatura de tamaño superior, sin terminar ahí | Explicación; adjudicación y movimiento manuales |
| Suerte (*Luck*) | Ante un 1 en el d20 de una prueba, posibilidad de repetir **ese dado**, obligándose al resultado nuevo | Explicación; repetición opcional **pendiente** en los controles de tirada |
| Sigilo natural (*Naturally Stealthy*) | Opción de Esconderse si una criatura al menos un tamaño mayor es la única cobertura visual | Explicación; circunstancia decidida en mesa |

**Diferencia importante:** *Suerte del Mediano* no es la dote de origen *Afortunado*. No concede puntos de suerte y no comparte el contador de esa dote. Tampoco otorga una ventaja permanente a las pruebas de d20. La ventaja de *Valentía* se limita al estado Asustado: no debe aplicarse indiscriminadamente a todas las salvaciones.

El Mediano no obtiene la resistencia a veneno propia del Enano. La validación del motor defensivo se amplió para que pueda participar en las operaciones de daño habituales sin errores de «especie desconocida».

## 3. Cambios de arquitectura

### Fuente única de datos de especie

En `guided.ts` se declara `SPECIES_NAMES`, un mapa tipado de identificadores a nombres, del que se deriva `SpeciesId`. De este modo, el creador y Rasgos comparten una etiqueta estable; se elimina la cascada de condicionales que daba por supuesto que toda especie distinta de Humano o Enano era Elfo.

### Proyección mecánica

`calculateGuidedFighter` reconoce `halfling` como especie válida; establece tamaño Pequeño y conserva velocidad de 30 pies. Las habilidades condicionales se añaden a `pendingAutomation` con su alcance exacto. No se altera la progresión del Guerrero/Campeón.

### Proyección descriptiva

`collectCharacterTraits` añade cuatro entradas `species:halfling_*`, con títulos, fuente, resúmenes, detalles y `explanation` del catálogo compartido `rules-explanations.ts`. Estas entradas son de **automatización manual**. La pantalla Rasgos ya puede renderizarlas sin cambios adicionales, pues trabaja con `CharacterTrait`.

### Interfaz y defensas

`page.tsx` añade la opción al selector y muestra tamaño/velocidad y una indicación de las reglas situacionales. La cabecera y el resumen usan la misma etiqueta tipada. `damage-defenses.ts` reconoce el nuevo ID pero solo asigna resistencia automática al Enano.

### Persistencia

No se crean campos nuevos, ni tablas, ni versión de esquema adicional. El valor de `species` es `halfling` en el `GuidedFighterInput` existente y se almacena en el JSON de guardado `schemaVersion: 2`. La recuperación ejecuta la validación de reglas actualizada. El botón **Actualizar guardado** continúa siendo necesario para escribir los cambios en PostgreSQL.

## 4. Archivos de la entrega

1. `packages/rules-engine/src/guided.ts`: catálogo, validación y cálculo de la especie.
2. `packages/rules-engine/src/traits.ts`: rasgos descriptivos de Mediano.
3. `packages/rules-engine/src/rules-explanations.ts`: explicaciones compartidas.
4. `packages/rules-engine/src/damage-defenses.ts`: validación de especie para ataques entrantes.
5. `apps/web/src/app/page.tsx`: selector y etiquetas del creador/hoja.
6. `packages/rules-engine/tests/halfling-46.test.ts`: nueve pruebas de regresión.
7. `docs/implementation/PASO_46_MEDIANO_PHB2024.md`: este registro.

## 5. Pruebas y evidencias

**Preparación local:**

- Chequeo de tipos **estricto**, TypeScript 5.8.3, sobre los módulos de motor afectados: superado. Esta versión fue la disponible para la comprobación de preparación, no cambia las dependencias del proyecto del usuario.
- Comprobación de sintaxis TSX de `page.tsx`: sin errores de análisis.
- Nueve pruebas nuevas ejecutadas con aserciones equivalentes en Node como comprobación aislada: **9/9 superadas**.
- Comprobaciones directas de ejecución y persistencia v2: superadas en el entorno de preparación.

**Pendiente en el entorno del usuario:** `pnpm lint`, `pnpm test` (Vitest completo), `pnpm build`, y pruebas manuales en navegador de creación, guardado/recuperación, cambio de especie y ataques recibidos.

**Matriz mínima de aceptación:**

| Caso | Esperado |
|---|---|
| Crear Guerrero Mediano de nivel 1 | Tamaño Pequeño, 30 pies, sin dote humana gratuita |
| Abrir Rasgos | Valentía, Agilidad de mediano, Suerte, Sigilo natural; sin duplicados |
| Abrir Principal | Sin ventaja global de salvaciones ni aumento espurio de PG |
| Registrar daño de veneno | No conceder resistencia enana ni lanzar error de especie |
| Guardar y cargar | Mantener `halfling` y datos de sesión en guardado v2 |
| Cargar Humano, Enano y Elfo anteriores | Mantener etiquetas y reglas previas |
| Subir un Mediano de nivel | Mantener especie y rasgos, sin duplicarlos |

## 6. Riesgos y trabajo posterior

- **Suerte todavía es manual:** incorporar un botón contextual «Repetir el 1» con preservación del desglose, especialmente en pruebas con ventaja/desventaja y repeticiones simultáneas. No debe repetirse automáticamente sin decisión del jugador.
- **Valentía es situacional:** requerirá una indicación explícita del estado Asustado o un selector contextual; hasta entonces, usar los controles manuales de ventaja.
- **Movimiento y sigilo:** requieren interpretación de posiciones por jugadores/DM, fuera del alcance de una hoja digital no orientada a combates automáticos.
- **Otros linajes/clases:** incorporarlos en pasos separados con pruebas por combinación y validación de orígenes.
- En caso de que existan erratas oficiales que modifiquen el manual impreso, registrarlas como fuente separada antes de cambiar las reglas.

## 7. Instalación y commit selectivo

Descomprimir el ZIP en la **raíz del repositorio** y fusionar carpetas, sin borrar carpetas existentes. El archivo ZIP contiene únicamente los siete archivos de este paso.

Desde PowerShell:

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Después de verificar la interfaz:

```powershell
git add -- "apps/web/src/app/page.tsx" "packages/rules-engine/src/guided.ts" "packages/rules-engine/src/traits.ts" "packages/rules-engine/src/rules-explanations.ts" "packages/rules-engine/src/damage-defenses.ts" "packages/rules-engine/tests/halfling-46.test.ts" "docs/implementation/PASO_46_MEDIANO_PHB2024.md"
git diff --cached --name-only
git diff --cached --check
git commit -m "feat: actualizacion 46 - especie Mediano PHB 2024"
git push -u origin HEAD
git status
```

**Estado:** implementación preparada; la aceptación definitiva requiere las verificaciones y el commit en el repositorio del usuario. No asumir que la subida a GitHub ya se ha efectuado.
