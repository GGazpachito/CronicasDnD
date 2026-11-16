# Actualización 49. Menú de acceso y hoja Principal compartida

**Estado:** implementación preparada; aceptación pendiente de ESLint, Vitest, compilación Next.js y pruebas en navegador en el entorno del proyecto.  
**Normativa:** Manual del Jugador D&D 2024. No se introducen reglas nuevas.  
**Alcance:** navegación, presentación, restauración y consulta de guardados; pequeñas ampliaciones de persistencia de la ficha inicial del Mago.

## 1. Contexto y problema

Hasta la actualización 48.2, la raíz `/` abría directamente el editor y la hoja del Guerrero, mientras que `/wizard` contenía una hoja de Mago visual y funcionalmente diferente. Aunque los dos formatos ya se podían guardar en PostgreSQL, el usuario tenía que conocer cómo llegar a cada uno y gestionar los guardados desde pantallas distintas.

La nueva decisión de producto es: el primer contacto será un **menú con Crear personaje y Cargar personaje**; ambas clases compartirán la misma composición visual de la pestaña Principal; las capacidades dependientes de clase se mostrarán como módulos específicos. Los personajes se eligen mediante tarjetas con retrato, nombre, nivel, especie, clase y subclase.

## 2. Alternativas consideradas

- **Duplicar las dos hojas y mantenerlas parecidas manualmente:** descartado; acabarían divergendo otra vez, duplicaría la lógica de UI y dificultaría sumar clases.
- **Convertir el estado del Mago en el tipo AdventureState del Guerrero:** descartado; inventaría recursos de Guerrero y pondría en riesgo los guardados.
- **Crear rutas de ficha por clase y un componente de presentación común:** **seleccionado**. Dos modelos de reglas independientes alimentan `SharedPrincipalSheet` con las estadísticas de su propio motor.
- **Añadir una tabla SQL para tarjetas:** descartado. Los metadatos derivan de las instantáneas ya validadas, alojadas en `Character.selection`.

## 3. Organización de rutas

| Ruta | Función |
|---|---|
| `/` | Menú principal: Crear personaje y Cargar personaje |
| `/create` | Selección de clase para un personaje nuevo |
| `/load` | Galería de personajes guardados, consulta a PostgreSQL |
| `/fighter?new=1` | Editor de Guerrero nivel 1 con identidad sin nombre |
| `/wizard?new=1` | Editor de Mago nivel 1 con identidad sin nombre |
| `/fighter?character=<uuid>` | Hoja del Guerrero recuperado (ficha real) |
| `/wizard?character=<uuid>` | Hoja del Mago recuperado (ficha real) |

El fichero anterior `apps/web/src/app/page.tsx` se mueve a `apps/web/src/app/fighter/page.tsx` y se reemplaza en raíz por el menú. Se actualizan también los imports relativos y el import dinámico del módulo de combate. Las pestañas y las herramientas de Guerrero se mantienen en su ruta.

## 4. Arquitectura de la hoja

`SharedPrincipalSheet.tsx` es un componente común con una distribución uniforme de:

- controles globales de ventaja y desventaja;
- PG normales y temporales, CA e iniciativa;
- seis características y competencia;
- 18 habilidades y seis salvaciones, con tiradas de d20;
- ataques, recursos, estadísticas auxiliares y marcadores de muerte.

Acepta estadísticas **calculadas** y callbacks **específicos de clase**, evitando que el componente conozca el esquema del Guerrero o del Mago. Guerrero mantiene sus ataques equipados, inventario y recursos marciales. Mago presenta los mismos bloques y añade un único módulo visual de espacios de conjuro; el inventario equipable del Mago aún no está integrado, por lo que su bloque de armas informa de esa limitación, sin atribuirle armas o bonificadores inexistentes.

Los valores de `abilityScores`, `skillBonuses`, `savingThrowBonuses`, CA e iniciativa proceden del motor propio de cada clase. Los resultados de las tiradas son efímeros y no se guardan. No se añaden automatismos de combate.

## 5. Galería, API y seguridad de datos

`GET /api/characters` ahora consulta la columna JSON `selection` junto con los metadatos actuales. Se utiliza el validador existente de guardados y `getCharacterCardDetails` para extraer solo **especie, subclase y retrato**. Cuando una entrada de la galería contiene datos que no se pueden validar, la lista no bloquea a las demás; se muestran metadatos mínimos para ese registro, que deberá revisarse al cargar.

Las imágenes de las tarjetas solo proceden de `profile.portraitDataUrl` validado previamente como JPEG optimizado en base64. Se mantiene la restricción actual del servidor: API accesible únicamente desde localhost y en desarrollo.

Al pulsar una tarjeta:

1. Se navega a la ruta de su clase con su ID persistente.
2. La página GET obtiene el guardado original.
3. Se valida su versión, clase y nivel antes de aplicarlo.
4. Se restaura el estado del personaje y la revisión de PostgreSQL.
5. El siguiente «Actualizar guardado» modifica el registro cargado, no crea una nueva fila.

El panel `SaveLoadPanel` del Guerrero conserva sus herramientas y ahora también soporta carga directa desde un enlace de la galería. La ruta del Mago ya lo hacía, y se conserva. No hay migraciones Prisma ni cambios de `schemaVersion`.

## 6. Retrato e historia del Mago

El Mago reutiliza ahora `CharacterProfilePanel`, el mismo editor de retrato, apariencia e historia que el Guerrero, con guardado y cancelación independientes por sección. El retrato se muestra en `CharacterHeader` y en la galería. Los datos siguen dentro del campo `input.profile` del guardado de Mago versión 3, sin nuevas columnas SQL.

Se incorporan marcadores manuales de muerte al estado de Mago como campo **opcional** `manualDeathMarks`. Los antiguos guardados de Mago no contienen ese campo y permanecen compatibles. Los marcadores no cambian PG, ranuras, estabilización ni el resultado de la partida.

## 7. Pruebas y comprobaciones de preparación

- TypeScript estricto del motor completo `src/*.ts`: superado en el entorno de preparación.
- Comprobación de sintaxis TypeScript/TSX de los componentes y rutas cambiados: superada.
- Cinco aserciones directas: tarjetas de Guerrero y Mago, recuperación y validación de marcas, compatibilidad de un guardado anterior de Mago: superadas.
- Pruebas automatizadas nuevas en `character-navigation-49.test.ts`: pendientes de ejecutarse dentro de la suite Vitest del proyecto.
- **No afirmamos haber ejecutado** el conjunto de ESLint, el build de Next ni PostgreSQL real en este entorno.

### Matriz de aceptación manual

| Prueba | Resultado esperado |
|---|---|
| Abrir `http://localhost:3000` | Muestra Crear personaje y Cargar personaje |
| Crear Guerrero | Selector de clase y editor a nivel 1; identidad sin nombre previo |
| Crear Mago | Editor de nivel 1; no se desbloquean niveles aún sin implementar |
| Abrir Cargar personaje | Tarjetas con retrato, nombre, nivel, especie, clase y subclase cuando exista |
| Entrar a Guerrero guardado | Hoja Principal del personaje exacto con PG, equipo y recursos originales |
| Entrar a Mago guardado | Hoja Principal con los mismos módulos y el contador de ranuras |
| Modificar y actualizar un guardado | Se actualiza la misma fila, sin duplicar personaje |
| Subir de nivel un Guerrero | Sigue operativa la transición y conservan los datos |
| Cambiar retrato de Mago y guardar | La imagen reaparece en cabecera y galería tras cargar |
| Activar marcas de Mago y guardar | Las marcas persisten sin modificar ranuras |
| Volver de ficha a menú | No aparecen errores de ruta; se avisa de cambios pendientes cuando corresponda |
| Móviles | Tarjetas y módulos en una columna sin desbordamientos |

**Comandos:** `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm dev`. Antes del commit se deben corregir errores, ejecutar la matriz y comprobar la lista de archivos preparados.

## 8. Limitaciones y siguiente fase

- El Mago solo tiene **creación y hoja funcional a nivel 1**. La progresión superior y la subclase de Evocación están preparadas parcialmente en el motor desde el paso 47, pero no se pueden seleccionar en el editor todavía.
- El inventario equipable y las tiradas de arma del Mago siguen pendientes de conexión. El módulo común expone esta limitación en lugar de asignar equipo falso.
- La pestaña de hechizos se ampliará después de consolidar el modelo de Mago.
- No se ha introducido guardado automático. Se conserva la actualización manual para no confundir edición de ficha con persistencia.

**Actualización 50 propuesta:** implementar progresión guiada del Mago a través de sus siguientes niveles sobre la estructura común, con preparación de conjuros y gestión de ranuras reutilizables. Priorizar la progresión y persistencia antes de añadir más especies o nuevas clases.
