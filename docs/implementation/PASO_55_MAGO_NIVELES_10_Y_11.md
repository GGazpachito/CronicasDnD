# PASO 55. Mago de Evocación: niveles 10 y 11

**Proyecto:** Crónicas — hoja digital para Dungeons & Dragons, Manual del Jugador 2024.  
**Fecha:** 17 de noviembre de 2026.  
**Entrega:** incremental acumulativa sobre la actualización 54; sustituir los archivos incluidos manteniendo sus rutas.  
**Estado:** implementación de código lista para integración; las pruebas reales de la aplicación completa y PostgreSQL requieren el repositorio del desarrollador.

## Objetivo

Extender el máximo interactivo de Mago del nivel 9 al **11** sin reescribir las interfaces compartidas de subida, bajada, hoja principal, rasgos, equipo o biblioteca. Conservar recursos gastados, selecciones manuales, perfil, inventario y guardado explícito. El usuario controla cuándo lanzar conjuros, qué tirada potenciar, y cuándo gastar y recuperar ranuras.

## Decisiones y reglas

| Dato | Nivel 9 | Nivel 10 | Nivel 11 |
| --- | ---: | ---: | ---: |
| Bonificador de competencia | +4 | +4 | +4 |
| Trucos conocidos | 4 | **5** | 5 |
| Preparados reglamentarios | 14 | **15** | **16** |
| Ranuras de nivel 1–4 | 4/3/3/3 | 4/3/3/3 | 4/3/3/3 |
| Ranuras de nivel 5 | 1 | **2** | 2 |
| Ranuras de nivel 6 | 0 | 0 | **1** |
| Conjuros ordinarios nuevos | — | +2 | +2 |
| Nuevo conjuro gratuito de Evocación | — | No | **+1** de nivel 1–6 |
| Rasgo de subclase | — | **Evocación Potenciada** | — |

Referencias: [Wizard 2024 y su tabla, D&D Beyond](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes), [catálogo ampliado del PHB 2024, Roll20](https://roll20.net/compendium/dnd5e/Classes%3AWizard?expansion=32231&iframe=true). Los datos de catálogo y los resúmenes descriptivos son redacción original de consulta y no sustituyen el texto legal completo del manual.

### Nivel 10

- El asistente exige elegir **un quinto truco distinto** de los cuatro existentes y los dos conjuros ordinarios del libro.
- **Evocación Potenciada:** el Mago de Evocación *puede* añadir su modificador de Inteligencia a **una única tirada de daño** de cada conjuro de Mago de Evocación que lance. No se aplica a cada dado ni a todas las tiradas de un conjuro de varios impactos. El valor calculado se muestra en el asistente, en Rasgos y en Hechizos. La elección sigue siendo del jugador; el control existente de dados no aplica esa bonificación automáticamente todavía.
- Al subir 9→10, el motor valida el truco y conserva la biblioteca manual, daño recibido, ranuras gastadas y retrato.

### Nivel 11

- El Mago gana **una ranura de nivel 6**, añade dos conjuros al libro y puede preparar 16 según la tabla (la biblioteca manual sigue sin cupos obligatorios).
- **Experto en Evocación:** se añade gratuitamente otro conjuro de Evocación elegible de nivel 1–6, distinto de los previamente concedidos y las elecciones ordinarias simultáneas. `evokerLevelSixSpellId` es opcional únicamente antes de llegar a 11 y obligatorio al validar personajes de 11.
- Los rombos de ranura 6 se muestran en Principal y Hechizos; se crean disponibles sin reiniciar los grupos existentes.
- **Recuperación arcana:** con nivel 11 puede restaurar hasta 6 niveles combinados de ranuras gastadas tras un descanso corto, pero cada ranura recuperada debe ser de nivel 5 o inferior.

## Catálogo de conjuros

Se añade `wizard-sixth-level.ts` con **22 conjuros de nivel 6** de la lista ampliada del Mago en el PHB 2024. Las entradas incluyen identificador estable, nombre en español, escuela, lanzamiento, alcance, componentes, duración, explicación jugable y fórmulas base de dado cuando corresponde. **No se genera una tirada ficticia** para invocaciones y conjuros cuya resolución depende de un bloque de estadísticas, decisiones o de una salvación sin daño.

El catálogo general crece de **180 a 202** hechizos (20 trucos y 182 de niveles 1–6). Las tres pestañas de Hechizos y los filtros preexistentes consumen el catálogo central, por lo que los nuevos conjuros quedan disponibles en «Todos» y pueden pasarse manualmente a Aprendidos y Preparados. El asistente reglamentario los ofrece solo al desbloquear nivel 6.

Ejemplos de tiradas: Relámpago en cadena `10d8`, Desintegrar `10d6+40`, Esfera congelante `10d6`, Rayo solar `6d8`, Muro de hielo `10d6` y `5d6`. La aplicación no lanza ni resuelve el efecto de forma automática al pulsar un dado.

## Diseño técnico

1. `wizard-creation.ts`: amplía el tipo de nivel hasta 11; el nivel máximo de conjuro se obtiene de `wizardProgression` en vez de una lista fija; comprueba el nuevo regalo gratuito en la validación y en la lista blanca de guardado.
2. `wizard-level-up.ts`: amplía subida y previsualización hasta 11, truco en nivel 10 y regalo único en nivel 11, con comprobación de duplicados y operaciones atómicas sobre marcas de ranura.
3. `level-down.ts`: permite 11→10 y 10→9, retira el nivel de conjuro 6 y su elección gratuita al bajar 11, y retira el quinto truco al bajar 10 sin tocar el del nivel 4. Ambos pasos previsualizan cambios y mantienen el guardado manual.
4. `wizard-spell-details.ts` y `wizard-spell-library.ts`: integran el nuevo catálogo y el regalo con la selección manual existente, sin imponer límites numéricos.
5. `wizard-traits.ts`: muestra el modificador de Inteligencia de Evocación Potenciada como valor pasivo opcional.
6. `wizard-slot-marks.ts`: contempla estados del Mago hasta nivel 11, manteniendo el máximo de recuperación en ranuras de nivel 5 o inferior.
7. `WizardLevelUpWizard.tsx` y `wizard/page.tsx`: presentan las elecciones y nuevos valores en los componentes compartidos; amplían ambas vistas de ranuras al nivel 6.

No se cambian la estructura JSON de snapshot (`schemaVersion: 3`), el esquema Prisma, los componentes compartidos ni los datos de Guerrero.

## Verificación y aceptación

Se ha incorporado `wizard-levels-10-11-55.test.ts` con casos de catálogo, quinto truco, Evocación Potenciada, libro, preparados, validación de regalos y duplicados, ranuras, recuperación arcana, retrocesos, recursos y guardado. Los tests de catálogo de los pasos 51–54 se actualizan al nuevo total de **202** y se corrige el test antiguo que esperaba que el nivel 9 fuese el máximo.

**Limitación de entorno:** el ZIP 54 de entrada contiene solo 15 archivos incrementales, no el monorepositorio completo; no incluye `wizard.ts`, `package.json`, los componentes compartidos ni sus dependencias. Por tanto, aquí no se puede declarar superado el tipado integral, las pruebas oficiales, el lint, la compilación de Next.js ni la persistencia PostgreSQL. Deben ejecutarse en el repositorio real:

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Pruebas manuales recomendadas:

1. Cargar un Mago de nivel 9 guardado, ascender a 10, confirmar que pide un quinto truco distinto y que Evocación Potenciada aparece con el modificador de Inteligencia correcto.
2. Verificar en Principal y Hechizos que hay dos ranuras de nivel 5 y ninguna de nivel 6. Gastar una ranura y comprobar el marcado.
3. Ascender a 11, elegir dos conjuros y un tercero gratuito de Evocación sin duplicados. Probar un error con un conjuro ajeno a Evocación.
4. Filtrar en «Todos los conjuros» por nivel 6 y verificar las 22 fichas, sus descripciones y botones de dados. Marcarlos como Aprendidos y Preparados, incluso superando los cupos reglamentarios.
5. Gastar la ranura 6 y comprobar que no se ofrece en Recuperación arcana. Guardar y recargar, comprobando nivel y recursos.
6. Bajar 11→10 y 10→9, comprobando ventana explicativa, la retirada exclusiva de los nuevos conjuros y trucos, las ranuras restauradas y la conservación de equipo, perfil y recursos compatibles.
7. Abrir un Guerrero de una entrega anterior y comprobar que sus menús, estadísticas y guardado no cambian.

## Próxima etapa

**Paso 56: Mago niveles 12–13**, nueva mejora de característica, ranuras y conjuros de nivel 7, regalo de Evocación correspondiente, retrocesos y pruebas de regresión. Seguir evitando automatizaciones de objetivos, combate y consumo involuntario de recursos.

## Entrega acumulativa y trazabilidad

Este paquete contiene todos los archivos de la entrega 54 actualizados, más un catálogo nuevo (`wizard-sixth-level.ts`), un test nuevo y este memorando, con rutas de monorepositorio. Se entrega además en un ZIP nuevo y persistente para continuar sin depender de descargas anteriores; al integrarlo en GitHub, el repositorio será la fuente de verdad y no hará falta conservar cada ZIP localmente. El ZIP **no equivale a un clon completo del proyecto**.
