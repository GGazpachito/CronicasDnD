# Actualización 42.1. Edición por secciones y modo lectura de Personaje

**Proyecto:** Crónicas, hoja de personaje digital D&D 2024/5.5; documentación TFG.  
**Fecha:** 13-11-2026.  
**Base:** actualización 42 funcional confirmada por el desarrollador.  
**Estado:** entrega preparada; validación integral en equipo Windows y commit pendientes.

## 1. Necesidad detectada

Hasta la versión 42, la sección Personaje mostraba todos los campos narrativos como `textarea` e `input` de manera permanente. Esto hacía que la ficha pareciera un editor en lugar de un documento legible. El requisito es que el usuario pueda visualizar los datos como texto normal y activar la edición únicamente cuando lo solicite.

## 2. Requisitos y criterios de aceptación

1. Por defecto, los apartados Historia, Personalidad y motivaciones, Notas de aventura y Detalles físicos presentan **texto no editable** (o una indicación si están vacíos).
2. Cada tarjeta tiene su propio botón **Editar**. El texto cambia entonces a controles editables pre-rellenados.
3. **Guardar** confirma el contenido de esa tarjeta en el estado compartido del personaje y vuelve a modo lectura.
4. **Cancelar** descarta el borrador de la tarjeta y restaura su texto anterior.
5. Los saltos de línea se conservan en los textos narrativos. Se muestran mediante React como texto ordinario, sin interpretar HTML del usuario.
6. El retrato tiene el mismo ciclo de edición. Seleccionar/quitar una imagen solo actualiza el borrador; se confirma con Guardar. La cabecera no cambia antes de confirmar.
7. Se permite editar más de una tarjeta a la vez sin que confirmar una sobrescriba el contenido actualizado de otras.
8. Los datos de identidad (nombre, clase, especie, trasfondo) siguen viniendo del creador original; su botón redirige a ese editor. No se duplican campos mecánicos.
9. **Guardar tarjeta no significa persistir en servidor**: la confirmación local actualiza el perfil compartido, y el jugador todavía debe pulsar «Actualizar guardado» o «Guardar como nuevo» desde «Mis personajes» para persistir en PostgreSQL.
10. No modificar motor de reglas, API, esquema de base de datos ni versión del guardado.

## 3. Cambios de archivos

- `apps/web/src/components/CharacterProfilePanel.tsx` (modificado): ciclo de edición por tarjeta, borradores temporales, visualización de texto, control de edición del retrato y acciones accesibles.
- `apps/web/src/app/globals.css` (modificado): estilos para texto de lectura, campos de detalles, botones Editar/Guardar/Cancelar, adaptación móvil y foco de teclado.
- `docs/implementation/PASO_42_1_LECTURA_Y_EDICION_PERSONAJE.md` (nuevo): este documento.

**No se modifican** archivos del motor, migraciones, API, dependencias, Prisma ni estructura de instantáneas.

## 4. Decisiones técnicas

### D42.1.1. Borradores locales sin crear otra fuente persistente

`CharacterProfilePanel` recibe `profile` como propiedad del estado de la página. Para cada sección en modo edición guarda temporalmente una copia de ese perfil en `drafts`. Mientras el usuario escribe, **no** modifica `profile` ni desencadena guardados.

Al pulsar Guardar, se genera una actualización con **solo las propiedades correspondientes a esa sección** (`SECTION_KEYS[section]`) y se combina con el perfil actual. El componente llama una vez a `onChange({...profile, ...updatedFields})`, elimina el borrador y vuelve a mostrar texto. Esto es importante si se están editando dos secciones simultáneamente: finalizar una no debe borrar lo introducido o confirmado en otra.

El uso de borradores es exclusivamente local a la interfaz. El dato confirmado sigue teniendo una única fuente de verdad en la página principal.

### D42.1.2. «Guardar tarjeta» frente a «Actualizar guardado»

Se distinguen dos ámbitos:

- **Guardar** (dentro de una tarjeta): confirma una edición en la ficha visible, sin escribir en PostgreSQL.
- **Actualizar guardado** (módulo Mis personajes): conserva en PostgreSQL la ficha completa mediante el mecanismo existente.

Se añade una nota visible en la pestaña para evitar ambigüedad. **No se añade autosalvado** porque cambiaría el contrato de persistencia de las fases anteriores y podría sobrescribir datos involuntariamente.

### D42.1.3. Retrato con confirmación y cancelación

Se conserva el procesamiento de imagen JPG/PNG/WebP, limitación original a 5 MB, reducción a JPEG y el límite de 60 000 caracteres. Al seleccionar una imagen, la versión optimizada se mantiene en el borrador del retrato hasta pulsar Guardar. Cancelar invalida también cualquier procesamiento asíncrono pendiente, para que la imagen no reaparezca después de cancelar.

La cabecera mantiene el retrato **confirmado**, no el borrador. Esto permite deshacer la elección antes de aplicarla.

### D42.1.4. Presentación y accesibilidad

Las vistas no editables se componen de elementos de texto (`p`, `dl`, `dt`, `dd`). `white-space: pre-wrap` conserva los saltos de línea; `overflow-wrap: anywhere` evita que cadenas largas rompan la tarjeta.

Todos los botones utilizan `type="button"`; incorporan nombres accesibles específicos de su apartado (`aria-label`) y estilo `focus-visible` para teclado. Los campos vuelven a ser `textarea`/`input` únicamente cuando la tarjeta está en edición.

## 5. Verificaciones realizadas en el entorno de preparación

- **TypeScript estricto** del nuevo componente y el motor que importa, con declaraciones provisionales de `next/image`: superado con TypeScript 5.8.3. No equivale a `pnpm build` de Next.js.
- **Renderizado estático React** con datos de personaje: se muestran 5 botones Editar y ningún `textarea` o `input type="text"` en modo lectura. Datos y secciones correctos.
- **Prueba de interacción aislada** de los callbacks del componente: pasar de lectura a edición, modificar historia, confirmar, cancelar notas, editar simultáneamente personalidad y detalles físicos y guardar en orden inverso sin sobrescribir campos.
- **Prueba de borrador de retrato**: eliminar y cancelar conserva el retrato original; eliminar y guardar confirma su retirada.
- **No ejecutados en este entorno**: suite completa de Vitest, ESLint, compilación real de Next.js, interacción real de carga de imágenes y pruebas de navegador. Deben ejecutarse en Windows antes de subir.

## 6. Plan de pruebas en el equipo del desarrollador

Desde la raíz del repositorio:

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Pruebas manuales:

1. Cargar un personaje antiguo que tenga textos y retrato. Abrir Personaje: comprobar que se muestra texto de lectura sin cuadros editables.
2. Abrir Editar en Historia, modificar dos párrafos y Guardar. Comprobar que los saltos de línea se conservan.
3. Editar Notas y pulsar Cancelar: comprobar que recupera su versión anterior.
4. Editar a la vez Personalidad y Detalles físicos; confirmar ambos y comprobar que se mantienen.
5. Editar retrato, seleccionar imagen y Cancelar: no debe cambiar el retrato de cabecera. Repetir, confirmar y comprobar cabecera.
6. Pulsar «Actualizar guardado», recargar y abrir de nuevo el personaje: deben conservarse todos los cambios confirmados.
7. Comprobar que los campos vacíos muestran un texto discreto, que el diseño se adapta a móvil y que los botones se usan con el teclado.
8. Probar que editar identidad y origen sigue abriendo el editor habitual.
9. Al cambiar de pestaña, cualquier **borrador sin confirmar** se perderá. Esta limitación está deliberadamente documentada, y los cambios ya confirmados permanecen en el estado compartido.

## 7. Riesgos y próximos pasos

- **Pérdida de edición sin confirmar al cambiar de pestaña:** los borradores viven dentro del componente, que puede desmontarse. Mejora futura posible: advertir de cambios pendientes al abandonar o mantener temporalmente borradores fuera de la pestaña.
- **Persistencia:** pulsar Guardar tarjeta no persiste en servidor, por diseño existente. Recomendable estudiar un indicador global de «cambios sin guardar» en una fase posterior.
- **Imagen:** no se ha alterado la política actual de recorte y compresión; sigue siendo necesario verificar el tratamiento de imágenes grandes en navegadores reales.

## 8. Subida selectiva a GitHub

```powershell
git add -- "apps/web/src/components/CharacterProfilePanel.tsx" "apps/web/src/app/globals.css" "docs/implementation/PASO_42_1_LECTURA_Y_EDICION_PERSONAJE.md"
git diff --cached --name-only
git diff --cached --check
git commit -m "ux: actualizacion 42.1 - modo lectura y edicion por secciones"
git push -u origin HEAD
git status
```

No deben incluirse ZIP temporales, dependencias ni archivos ajenos a esta fase. Tras la subida, anotar hash del commit, fecha y salidas reales de validación para la memoria del TFG.
