# Actualización 40 · Rediseño de la pestaña Rasgos

**Proyecto:** DndEditor, hoja de personaje de D&D 2024 (5.5).  
**Fecha de preparación:** 12 de noviembre de 2026.  
**Estado del documento:** entrega preparada para validación local, pruebas completas, commit y push del autor.  
**Versión anterior confirmada por el usuario:** 39.1, con los personajes guardados recuperados y los cambios subidos al repositorio.

## 1. Necesidad y objetivo

La pestaña Rasgos era un marcador de posición con una lista de etiquetas de `sheet.features`. La información completa estaba dispersa en el editor original, no distinguía procedencia, no incluía de forma clara los rasgos raciales ni las dotes del origen, y podía inducir a interpretar la presencia de un rasgo como una automatización total. Se solicita una hoja de apoyo al jugador, **no un videojuego**, que muestre lo que el personaje posee y permita consultar los efectos pasivos/las acciones disponibles sin decidir ni ejecutar por sí sola las acciones del jugador.

**Criterios de aceptación para la actualización 40:**

1. Una pestaña Rasgos real y adaptable que clasifique por **Guerrero**, **Campeón**, **especie** y **dotes y origen**.
2. Mostrar solo los rasgos realmente disponibles para el nivel y las elecciones actuales, con detalles breves en español, procedencia y nivel de desbloqueo cuando corresponda.
3. Distinguir explícitamente entre **Calculado**, **Apoyo parcial** y **Manual**, sin atribuir al motor acciones aún inexistentes.
4. Mostrar elecciones concretas, como estilos de combate, maestrías, aumentos de características, dotes y beneficios épicos.
5. Incluir búsqueda, filtro por sección, lectura mediante teclado y avisos de automatizaciones pendientes.
6. No duplicar estado del personaje ni modificar Prisma, snapshots, recursos, dados, PG o ataques.
7. Incorporar pruebas de proyección y dar comandos para verificar la aplicación y subir **solo los archivos afectados**.

## 2. Diseño de la solución

### ADR-040. El motor mantiene la autoridad sobre la existencia de cada rasgo

Se incorpora `packages/rules-engine/src/traits.ts` como **proyección pura de lectura**. La función `collectCharacterTraits(input, result)` recibe los datos validados por `calculateGuidedFighter` y construye tarjetas sin mutar ninguno de sus argumentos. **Clase y subclase** proceden de `result.sheet.features`: no se vuelve a implementar la tabla de desbloqueo por nivel. **Especie** procede de `input.species` y de sus elecciones validadas. **Dotes** proceden de `result.origin`, de la dote del trasfondo y de la elección épica validada. Los conjuros que se muestran como detalle proceden exclusivamente de `result.spells`.

Flujo:

```text
Estado de edición y personaje guardado
              |
              v
       GuidedFighterInput
              |
      calculateGuidedFighter
              |
    GuidedFighterResult (sheet,
    origin, martial, spells,
    pendingAutomation)
              |
     collectCharacterTraits
              |
    Catálogo de solo lectura
              |
         <TraitsPanel />
```

Esto evita almacenar nuevas características, estados de uso o copias de recursos dentro de Rasgos. Los únicos estados locales de `TraitsPanel` son el texto de búsqueda y el filtro visual. Al cambiar el nivel o cargar otro personaje, la vista se vuelve a derivar de los datos actuales.

### ADR-041. Catálogo con identificación estable y separación de responsabilidades

Cada tarjeta se identifica por una clave estable, por ejemplo `feature:champion_improved_critical`, `species:skillful`, `feat:background:alert` o `feat:epic:speed`. Los IDs no se basan en índices. Se ignoran duplicados exactos de `sheet.features`; si apareciese una ID de clase no catalogada, se muestra como rasgo registrado pero con descripción pendiente, sin ocultarla. Las entradas de clase y subclase se ordenan según su nivel de adquisición.

Se muestran dos conceptos distintos al nivel 19: **acceso al beneficio épico** (rasgo de clase) y **beneficio elegido** (dote). El identificador técnico de la elección épica presente en `sheet.features` se excluye de la primera categoría para no repetir su tarjeta.

El nuevo catálogo está declarado con tipos explícitos (`TraitGroup`, `TraitAutomation`, `CharacterTrait`, `TraitCollection`). Esto permite ampliar más adelante el catálogo sin acoplarlo a React.

### ADR-042. Estado de automatización realista

- **Calculado**: la elección o efecto pasivo ya se refleja en puntuaciones, modificadores o modelos. Ejemplos: bonificación de PG enanos, dote Duro, mejora de característica, ventaja de Atleta extraordinario.
- **Apoyo parcial**: el motor ayuda con registros, tiradas, recursos u opciones, pero quedan decisiones o activaciones manuales. Ejemplos: Segundo aliento, estilos marciales, conjuros de origen, Superviviente.
- **Manual**: rasgos contextuales o efectos que no disponen todavía de resolución implementada, como la visión especial o rasgos de supervivencia situacionales.

Las etiquetas indican el **grado de soporte de la web**, no el carácter pasivo/activo de la regla oficial. El sistema nunca lanza dados o gasta recursos al entrar en Rasgos. La lista `result.pendingAutomation` se conserva y se presenta desplegable, sin sustituirla por una lista inventada.

### ADR-043. Separar descripción de aplicación de reglas

Las descripciones son **resúmenes originales y breves**, redactados para navegación; no reproducen párrafos del Player's Handbook. Las fórmulas, opciones y valores específicos se toman de la proyección del motor: niveles, máximo de usos, estilos, maestrías, habilidades y velocidad. Los detalles advierten cuando un efecto se resuelve en otro panel o necesita intervención del DM.

No se incorporan nuevos modificadores, reglas de combate, tiradas ni recursos en esta fase. No se cambian `sheet.ts`, `guided.ts`, `adventure.ts` ni persistencia.

### ADR-044. Navegación y accesibilidad

`TraitsPanel.tsx` sustituye el antiguo `SheetPlaceholder` solo dentro del panel `rasgos`, preservando la navegación de seis pestañas y el montaje de los módulos existentes. Se diseñan tarjetas con `<details>/<summary>` para expansión sin estado mecánico, búsqueda `<input type=search>`, selector de categoría, conteo visible y mensajes cuando no hay coincidencias. Los elementos interactivos tienen etiquetas, foco visual y dimensiones adaptadas a móvil.

Se mantiene un botón para abrir el editor de origen y elecciones mediante `openEditorAt(1)`, reutilizando el flujo existente. No se crean controles para activar capacidades cuyo seguimiento todavía no esté implementado.

## 3. Alcance funcional exacto

- **Clase (Guerrero):** rasgos de nivel 1–20, incluyendo estilos, maestrías, Acción súbita, Segundo aliento, mejoras de características, Indomable, ataques adicionales y acceso a beneficio épico. Se muestra el valor elegido donde existe.
- **Subclase (Campeón):** solo si el personaje ha alcanzado el nivel pertinente; crítico mejorado/superior, Atleta extraordinario, segundo estilo, Guerrero heroico y Superviviente.
- **Especie:** Humano (habilidad, versatilidad, inspiración), Enano (PG, visión, resiliencia, piedra) y Elfo (sentidos, trance, ascendencia, visión y linaje). Los efectos situacionales sin motor están marcados como manuales.
- **Dotes:** dote de trasfondo, dote de origen humana cuando corresponde, beneficio épico si se ha elegido al nivel 19. Las selecciones de conjuros, herramientas o competencias se muestran desde los datos validados, sin simular su uso.
- **Estados especiales:** si el personaje no se puede calcular, la pestaña presenta un error y acceso al editor. Si se cambia de personaje, las tarjetas se actualizan; los filtros pueden permanecer porque no forman parte de la sesión.

## 4. Archivos de la entrega (solo seis)

| Ruta | Tipo | Propósito |
|---|---|---|
| `packages/rules-engine/src/traits.ts` | Nuevo | Proyección tipada y catálogo de lectura. |
| `packages/rules-engine/tests/traits.test.ts` | Nuevo | Pruebas de casos humanos/enanos/elfos, Campeón y nivel 19; ausencia de duplicados y pureza. |
| `apps/web/src/components/TraitsPanel.tsx` | Nuevo | Vista filtrable con tarjetas accesibles y estados de automatización. |
| `apps/web/src/app/page.tsx` | Modificado | Sustitución de placeholder de Rasgos por nuevo componente, sin tocar Principal ni API. |
| `apps/web/src/app/globals.css` | Modificado | Reglas visuales de Rasgos y responsive, al final de CSS existente. |
| `docs/implementation/PASO_40_PESTANA_RASGOS.md` | Nuevo | Registro técnico, decisiones, validaciones y criterios de aceptación. |

**Fuera de alcance:** `package.json`, `pnpm-lock.yaml`, las APIs de guardado, PostgreSQL, migraciones, formato de snapshots, pestaña de Equipo y pestaña de Hechizos. No borres carpetas existentes al instalar el ZIP.

## 5. Comprobaciones ejecutadas durante la preparación

1. Chequeo TypeScript 5.8.3 con opción estricta del motor nuevo: **superado**.
2. Chequeo de TypeScript de la página y componentes web con `tsconfig` de verificación aislada: **superado**. No se comprobó la API porque el cliente de Prisma generado no existe en este contenedor; dicho archivo temporal de verificación **no se distribuye**.
3. Tipos de `traits.test.ts` bajo TypeScript estricto: **superado**.
4. Compilación temporal del módulo y dependencias a CommonJS y cinco comprobaciones directas sobre personajes humanos, enanos, elfos, Campeón nivel 7 y Campeón nivel 19: **superadas**. Son verificaciones de humo, no sustituyen la suite de Vitest.
5. Renderizado aislado de React en servidor: **superado** para la vista con datos válidos y la vista de error (sin depender del navegador).
6. Verificación directa adicional de **los 20 niveles** del Guerrero/Campeón: **superada**, con comprobación de identificadores únicos, adquisición de rasgos y desbloqueo épico en su nivel.
7. `vitest run` completo: **no se ha podido ejecutar aquí** porque falta `std-env` en las dependencias del entorno de preparación. Las pruebas permanecen incluidas para ejecutarse con las dependencias instaladas en el equipo del autor.
8. ESLint, Next.js `build`, integración real con navegador, responsive y base de datos: **pendientes de ejecutar localmente**.

El repositorio del usuario usa TypeScript 5.9.3 y ESLint 9.39.1 según las actualizaciones anteriores. Este ZIP **no cambia** esas dependencias.

## 6. Protocolo de verificación local

En la raíz de `DndEditor`, después de copiar únicamente los seis archivos del ZIP:

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Comprobaciones en navegador:

1. Entrar en Rasgos con el Guerrero nivel 1. Deben aparecer rasgos de Guerrero, especie y dotes, **sin rasgos de Campeón**.
2. Buscar `Segundo aliento`, luego elegir «Rasgos de especie» y comprobar que la lista de resultados cambia correctamente; limpiar filtros.
3. Desplegar una tarjeta con clic, Tab e Intro/espacio; comprobar que aparecen los detalles y la etiqueta de automatización.
4. Subir a nivel 3 y comprobar que aparecen Crítico mejorado y Atleta extraordinario exactamente una vez.
5. Subir a niveles 7, 10, 15, 18 y 19, comprobar segundo estilo, inspiración, crítico superior, Superviviente y elección épica; revisar que no aparecen antes de tiempo.
6. Cargar un personaje humano guardado y verificar su dote de origen. Cargar uno enano o elfo y verificar sus rasgos específicos. La carga no debe cambiar el número de personajes en PostgreSQL.
7. Comprobar que los valores de iniciativa, PG máximos, maestrías y velocidad coinciden con Principal. Abrir el editor con el botón de Rasgos y verificar que continúa funcionando.
8. Repetir en móvil. Verificar que los paneles de Principal, Equipo, Hechizos y Combate siguen accesibles.
9. Guardar, recargar y comprobar que los guardados anteriores siguen presentes. La pestaña Rasgos no introduce cambios de datos persistidos.

## 7. Subida selectiva a GitHub

Desde la raíz del repositorio, añadir **solo**:

```powershell
git add -- "apps/web/src/app/page.tsx" "apps/web/src/app/globals.css" "apps/web/src/components/TraitsPanel.tsx" "packages/rules-engine/src/traits.ts" "packages/rules-engine/tests/traits.test.ts" "docs/implementation/PASO_40_PESTANA_RASGOS.md"
git diff --cached --name-only
git diff --cached --check
git commit -m "feat: actualizacion 40 - catalogo de rasgos clase especie y dotes"
git push -u origin HEAD
git status
```

No usar `git add -A`. Si ya hubiera archivos preparados de otra fase, comprobarlos y retirarlos del *staging* antes de este commit.

## 8. Riesgos y trabajo pendiente

- Un rasgo descrito en el catálogo **no equivale** a su automatización completa: los efectos contextuales y decisiones de combate continúan en manos del jugador y del DM.
- El catálogo es intencionalmente limitado a los rasgos que la aplicación soporta para Guerrero/Campeón, los tres tipos de especie y las dotes implementadas. Incorporar nuevas clases o rasgos requerirá ampliar los datos, sin replicar el motor de progreso.
- No se reproduce literalmente el texto oficial de los libros. La descripción es un resumen para consulta, y las reglas oficiales deben consultarse en las fuentes reglamentarias utilizadas por la mesa.
- La prueba local del usuario es imprescindible antes del commit: en esta fase no se ha ejercitado el navegador real ni el servidor de producción.

**Siguiente fase planificada:** actualización 41, inventario y equipo. Se aborda solo después de validar y subir esta entrega de Rasgos.
