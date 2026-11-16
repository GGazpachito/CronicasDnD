# Paso 48. Incorporación inicial del Mago al creador y guardado local

**Proyecto:** Crónicas, hoja de personaje de D&D 2024.  
**Fase:** desarrollo incremental de las clases lanzadoras.  
**Alcance implementado:** creación y persistencia de **Mago de nivel 1**.  
**Referencias de reglas:** *Player's Handbook* (2024), pp. impresas **33–38, 165–168**.  
**Estado:** propuesta de instalación. El usuario debe validar ESLint, Vitest, `pnpm build` y el uso real en navegador antes del commit.

## 1. Problema que resuelve

Hasta el paso 47, el motor `wizard.ts` tenía una progresión y recursos de Mago 1–20, pero la interfaz y las instantáneas de personaje presuponían que todo era un Guerrero. Un cambio cosmético en el selector de clase habría mezclado modelos incompatibles: `AdventureState.fighter`, recursos marciales, equipamiento de Guerrero y un guardado de versión 2.

La actualización 48 introduce un primer recorrido de creación y recuperación de Mago sin alterar los cálculos del Guerrero ni convertirlo artificialmente en la clase nueva. **No completa todavía el Mago 1–20 en la interfaz**; esa es la meta de las siguientes entregas.

## 2. Decisiones de arquitectura

### 2.1. Dos creadores y una base de datos

La ruta principal `/` conserva el creador de Guerrero, ahora con un selector de clase para acceder a `/wizard`. La ruta `/wizard` tiene un componente exclusivo de Mago. Se comparte el módulo `CharacterTabs` y el estilo de la hoja, pero no se comparte el estado `AdventureState.fighter`.

Se evaluaron tres alternativas:

1. **Reutilizar `GuidedFighterInput` cambiando solo el nombre de clase.** Descartado por dar estadísticas, PG y recursos equivocados al Mago.
2. **Reescribir de inmediato la aplicación completa como un modelo multiclase.** Descartado para esta fase porque afectaría a muchos componentes existentes y pondría en riesgo guardados de años de progresión implementada.
3. **Ruta y estado específicos de Mago sobre validación y API comunes.** **Elegido** para reducir regresiones. Deja pendiente una unificación progresiva mediante interfaces discriminadas en fases posteriores.

### 2.2. Modelo discriminado de persistencia

- **Guerrero:** sigue utilizando `schemaVersion: 2`, `input: GuidedFighterInput`, `adventure: AdventureState`. Los guardados v1 también mantienen su migración de lectura a v2.
- **Mago:** utiliza `schemaVersion: 3`, `input.classId: 'wizard'` y `wizardState`, con PG actuales, PG temporales, inspiración y ranuras mágicas independientes.
- `validateStoredSnapshot` valida cada formato **en el servidor** según versión. El validador previo `validateCharacterSnapshot` del Guerrero no se reemplaza.
- Se conserva la misma columna JSON `selection` y la columna **ya existente** `characterClass`; los endpoints POST, GET y PUT identifican y devuelven la clase.
- No se modifica `schema.prisma`, ni se incorporan migraciones SQL, ni se resetean bases de datos.
- En la interfaz del Guerrero, «Mis personajes» identifica los Magos y redirige a `/wizard?character=<uuid>` para cargarlos con su validador. No pasa un `WizardSnapshot` al motor del Guerrero.

**Límite deliberado:** `schemaVersion: 3` se usa únicamente para documentos de Mago en esta fase. La semántica de versiones de personaje deberá normalizarse en la futura arquitectura común y migraciones de clases.

### 2.3. Cálculos y elecciones de nivel 1

El Mago dispone de:

- Dado de golpe **d6**; PG iniciales `max(1, 6 + CON)` más bonificadores raciales o de dote admitidos.
- Competencia en salvaciones de **Inteligencia** y **Sabiduría**.
- Elección de dos habilidades entre **Arcanos, Historia, Perspicacia, Investigación, Medicina, Naturaleza y Religión**, sin elegir de nuevo las dadas por el trasfondo.
- Sin entrenamiento en armaduras. CA sin armadura `10 + modificador de Destreza`.
- **Tres trucos**, **seis conjuros de nivel 1 en el libro**, **cuatro preparados** y **dos ranuras de nivel 1**.
- Ataque mágico `competencia + modificador de Inteligencia` y CD `8 + competencia + modificador de Inteligencia`.
- **Adepto ritual**: los conjuros del libro que tengan la etiqueta Ritual pueden lanzarse como ritual aunque no estén preparados. No consume ranura.
- **Recuperación arcana**: una ranura de nivel 1 tras un descanso corto, una vez por descanso largo. La aplicación registra su uso; no presupone que el jugador haya descansado.
- Dos opciones de equipo inicial de clase: lote de Mago y 5 po, o 55 po. En esta entrega solo se muestra y persiste la elección.

El catálogo inicial de conjuros de Mago nivel 0 y nivel 1 está basado en la lista del PHB 2024, y los identificadores se validan en servidor. Las descripciones individuales y efectos activos se añadirán posteriormente. Se muestran conjuros por nombre sin reproducir su texto completo.

### 2.4. Orígenes y límites honestos

Se reutilizan las opciones de especie y trasfondo ya disponibles, con sus aumentos de características. Se aplican los efectos numéricos ya identificados de enano (PG), elfo silvano (velocidad) y Alerta (iniciativa). Para el humano se admiten en este prototipo dos dotes adicionales sin nuevas elecciones (Alerta y Duro). Los demás efectos raciales situacionales, la magia obtenida por especies, el uso de dotes de Iniciado en la Magia y las demás elecciones internas de dotes **todavía no quedan integrados al Mago**. Se documentan como trabajo pendiente y no se presentan como automatizados.

**Limitación de alcance:** los cuatro trasfondos disponibles proceden del catálogo implementado para Guerrero, no de todos los trasfondos oficiales. La creación es parcial respecto del origen completo del PHB. No debería utilizarse esta fase como validador integral de un personaje oficial de D&D 2024.

### 2.5. Interfaz y estado transaccional

La hoja del Mago mantiene seis pestañas: Principal, Rasgos, Equipo, Hechizos, Personaje y Combate. Principal presenta estadísticas y tiradas manuales d20, Hechizos permite visualizar y registrar consumos de ranuras; Personaje guarda biografía y notas. Las pestañas sin integración completa lo indican. Las operaciones de estado ocurren en memoria, y el guardado sigue siendo **manual** mediante «Actualizar guardado».

La API evita además que una actualización cambie accidentalmente la clase de un registro existente y comprueba la coherencia entre la columna `characterClass` y la instantánea recuperada.

El módulo «Mis Magos» lista los registros de clase `wizard`, permite crear uno nuevo, recuperar el seleccionado y actualizar su revisión; protege contra sobrescrituras concurrentes a través del número de revisión de la API actual. El cambio de clase solicita confirmación. La pantalla conserva la advertencia del navegador para cambios no guardados de un personaje ya persistido.

## 3. Archivos incluidos en el ZIP

| Archivo | Tipo de intervención |
|---|---|
| `packages/rules-engine/src/wizard-creation.ts` | Nuevo: validación de elecciones, cálculo inicial y estado/instantánea del Mago |
| `packages/rules-engine/tests/wizard-48.test.ts` | Nuevo: pruebas del Mago y guardados |
| `apps/web/src/app/wizard/page.tsx` | Nuevo: creador, hoja de Mago y módulo de guardados |
| `apps/web/src/app/page.tsx` | Modificado: selector de clase en el creador existente |
| `apps/web/src/app/globals.css` | Modificado: estilos de Mago y selector de clase |
| `apps/web/src/components/SaveLoadPanel.tsx` | Modificado: identificación y redirección al cargar Magos |
| `apps/web/src/lib/characters-api.ts` | Modificado: lector y validación discriminada de guardados |
| `apps/web/src/app/api/characters/route.ts` | Modificado: clase de personaje en listado y creación |
| `apps/web/src/app/api/characters/[id]/route.ts` | Modificado: clase de personaje en recuperación y actualización |
| `docs/implementation/PASO_48_CREACION_MAGO_NIVEL_1.md` | Nuevo: documentación del proceso y criterios de aceptación |

Se incluyen **solo los diez archivos**. Los ZIP no deben copiarse directamente dentro del repositorio como archivos de desarrollo.

## 4. Pruebas

### 4.1. Comprobaciones efectuadas durante la preparación

- `tsc` estricto del módulo `wizard-creation.ts`: sin errores.
- `tsc` estricto de la ruta `/wizard`, mediante declaraciones provisionales para React y JSX, sin errores. **No equivale al build de Next.js.**
- **13/13 pruebas** de `wizard-48.test.ts` ejecutadas con un harness local que implementa aserciones equivalentes de los casos utilizados. **No se ha ejecutado Vitest oficial**.
- **6/6 pruebas** anteriores de `persistence.test.ts` ejecutadas con el mismo harness: sin regresiones detectadas.
- Comprobación directa de snapshot v3: 2 ranuras, ataque mágico +5 y CD 13 para el caso de prueba.
- Ficheros de API revisados estáticamente; **no se ha conectado aquí PostgreSQL ni se ha arrancado el navegador**.

### 4.2. Verificación obligatoria en el equipo del usuario

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Pruebas funcionales manuales:

1. Crear Mago de nivel 1 y comprobar que la hoja muestra d6, salvaciones INT/SAB y 2 ranuras de nivel 1.
2. Modificar los seis valores base, con un error intencionado de puntuación repetida; se debe bloquear el guardado hasta corregir.
3. Elegir exactamente 3 trucos, 6 conjuros de nivel 1 del libro y 4 preparados; probar duplicados y un preparado fuera del libro.
4. Gastar una ranura, usar Recuperación arcana y verificar que un segundo uso se bloquea antes del descanso largo.
5. Guardar un Mago; modificar PG o gastar una ranura; actualizar el guardado; recargar la página y recuperar el mismo Mago; las modificaciones deben conservarse.
6. Intentar crear un Mago inválido y comprobar que el servidor no acepta el documento.
7. Volver al Guerrero, cargar los dos Guerreros antiguos y comprobar ataques, recursos, equipamiento, rasgos, conjuros y subida de nivel.
8. Desde «Mis personajes» del Guerrero, seleccionar un Mago guardado y verificar la redirección y su recuperación.
9. Comprobar el comportamiento de las seis pestañas en pantallas anchas y estrechas.
10. Verificar que `git diff --cached --name-only` muestre exactamente los diez archivos listados y que no incluya `.env`, datos ni dependencias temporales.

Guardar en la memoria del TFG fecha, versiones, resultados literales de ESLint/Vitest/build, observaciones del navegador y SHA del commit.

## 5. Riesgos y limitaciones reconocidas

1. **Paridad funcional incompleta del Mago:** la hoja de Mago solo admite nivel 1; no hereda automáticamente herramientas antiguas exclusivas del Guerrero.
2. **Catálogo de origen reducido:** cuatro trasfondos y especies con algunos rasgos pendientes de automatización.
3. **Magia incompleta:** dotes de Iniciado en la Magia, conjuros de especie, componentes, concentración, duración, alcance y efectos específicos siguen pendientes.
4. **Inventario no unificado:** se guarda la selección de equipo inicial, pero todavía no se incorpora a un inventario transaccional del Mago como el del Guerrero.
5. **Edición narrativa inicial:** biografía y notas están disponibles; retrato y demás campos estarán disponibles tras reutilizar el perfil completo.
6. **Validación en producción:** la API permanece intencionadamente limitada a desarrollo local. Falta sistema de usuarios y autenticación antes de despliegue público.
7. **Reglas como datos:** en fases posteriores conviene extraer orígenes, clases y conjuros a catálogos tipados comunes, evitando bifurcaciones crecientes en la interfaz.

## 6. Conclusión y objetivo del siguiente paso

El paso 48 prepara una **primera creación real, validada y persistente de Mago nivel 1**, manteniendo separadas las reglas del Guerrero. El siguiente paso, **actualización 49**, conectará el catálogo y las elecciones de conjuros de origen con el nuevo libro de Mago, mejorará su preparación y gestión de ranuras y avanzará hacia una pestaña Hechizos plenamente reutilizable por otras clases. La progresión posterior del Mago y Evocación se incorporará en incrementos con pruebas específicas.
