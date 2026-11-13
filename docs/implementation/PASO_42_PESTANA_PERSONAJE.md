# Actualización 42. Pestaña Personaje: historia, personalidad, apariencia y retrato

**Proyecto:** Crónicas, hoja digital de D&D 2024 (5.5) / trabajo de fin de grado.  
**Situación:** Implementación preparada sobre la versión 41.4; pendiente de verificación integral en el equipo del desarrollador y de commit a GitHub.  
**Fecha:** 13-11-2026.  
**Alcance:** únicamente pestaña Personaje y persistencia de campos narrativos, sin automatizaciones de combate.

## 1. Necesidad y contexto

Hasta la fase 41.4, la pestaña Personaje era un marcador de posición que mostraba nombre, trasfondo y especie. El usuario necesita un lugar para escribir su historia y notas, describir su apariencia y su interpretación, seleccionar un retrato, y conservarlo en los guardados actuales. La cabecera de la hoja ya disponía de un espacio de retrato que mostraba la inicial, por lo que se reutiliza ese espacio sin duplicar imágenes ni inventar un nuevo subsistema de archivos.

El proyecto se define como **apoyo al jugador**, no como videojuego. Estos campos no intervienen en características, tiradas, inventario ni reglas; se limitan a registrar información escrita por el jugador y a presentarla junto al resto de la ficha.

## 2. Requisitos funcionales y criterios de aceptación

| ID | Requisito | Criterio observable |
|---|---|---|
| P42-01 | Biografía editable | El jugador escribe y corrige la historia en una caja de texto. |
| P42-02 | Personalidad y motivaciones | Campos separados para personalidad, ideales, vínculos y defectos. |
| P42-03 | Apariencia física | Edad, altura, peso, ojos, cabello, piel y descripción libre. |
| P42-04 | Notas | Área libre para acontecimientos, pistas y objetivos. |
| P42-05 | Retrato | Selección de JPG/PNG/WebP; previsualización en Personaje y en cabecera. |
| P42-06 | Conservación | Guardar en PostgreSQL, volver a cargar y recuperar todos los textos y la imagen. |
| P42-07 | Compatibilidad | Abrir sin error los personajes anteriores que no tienen perfil. |
| P42-08 | Coherencia | Editar historia no cambia estadísticas, PG, inventario ni nivel. |
| P42-09 | Evolución | Conservar el perfil al subir un nivel. |
| P42-10 | Manejo de errores | Rechazar imágenes inválidas o excesivas con un mensaje visible; no perder el retrato anterior. |

## 3. Archivos creados y modificados

1. `packages/rules-engine/src/character-profile.ts` **nuevo**. Tipo `CharacterProfile`, valores iniciales, límites y validación pura.
2. `packages/rules-engine/src/guided.ts` **modificado**. Añade `profile?: CharacterProfile` a `GuidedFighterInput`; las reglas no utilizan ese campo.
3. `packages/rules-engine/src/persistence.ts` **modificado**. Valida y normaliza el perfil en el proceso de guardado/carga existente.
4. `packages/rules-engine/tests/character-profile.test.ts` **nuevo**. Pruebas de validación, persistencia, compatibilidad y nivel.
5. `apps/web/src/components/CharacterProfilePanel.tsx` **nuevo**. Editor narrativo, entrada de retrato y optimización de imagen local.
6. `apps/web/src/components/CharacterHeader.tsx` **modificado**. Muestra el retrato o, si falta, la inicial del nombre.
7. `apps/web/src/app/page.tsx` **modificado**. Estado narrativo compartido e integración en pestaña Personaje, carga y cabecera.
8. `apps/web/src/app/globals.css` **modificado**. Estética de la hoja y diseño adaptable.
9. `docs/implementation/PASO_42_PESTANA_PERSONAJE.md` **nuevo**. Este registro.

**No se han cambiado:** tablas SQL, migraciones Prisma, API HTTP, controles de combate, inventario, reglas de progresión ni versión de guardado.

## 4. Decisiones técnicas

### D42.1. Perfil narrativo como campo opcional de las elecciones

Se introduce `input.profile?: CharacterProfile` dentro del documento JSON de la instantánea de personaje versión 2. La API y PostgreSQL ya almacenan el `input` completo en una columna JSON. Esta decisión evita migraciones SQL innecesarias y mantiene compatibles los personajes previos. Al leer un personaje antiguo sin `profile`, el editor utiliza un perfil vacío; **no** altera el guardado de origen hasta que el jugador pulse Guardar.

**Alternativa descartada:** nueva tabla `CharacterBiography` con relación y URL de imagen. Añadiría migraciones, otra ruta API, sincronización y más posibilidades de inconsistencia, innecesarias para esta iteración local.

### D42.2. Una sola fuente de datos y cálculo desacoplado

`Home` mantiene un único estado `profile` y lo combina con el objeto mecánico `rulesInput` para generar el `input` que se guarda. El resultado de reglas `output` sigue dependiendo solo de `rulesInput`; escribir en un área de texto no solicita recalcular el motor. `CharacterProfilePanel` y `CharacterHeader` reciben el mismo estado como propiedades.

El nombre, la especie, la clase, el nivel y el trasfondo se muestran en Personaje pero proceden del creador original. El botón «Editar identidad y origen» conduce al editor existente en lugar de crear un formulario duplicado.

La subida de nivel usa `input`, que incluye el perfil. Así el documento nuevo conserva biografía e imagen junto a las elecciones mecánicas sin trasladar información al estado de combate.

### D42.3. Retrato compacto dentro del mismo documento

- El navegador acepta JPEG, PNG y WebP hasta 5 MB de tamaño original.
- Se decodifica en memoria, se hace un recorte cuadrado centrado y se convierte a JPEG sin metadatos originales de la imagen.
- Se prueban resoluciones y calidades decrecientes hasta obtener una URL de datos JPEG de un máximo de **60 000 caracteres**.
- Se guarda `portraitDataUrl` en el perfil. La cabecera y la pestaña leen el mismo valor.
- No se guardan rutas locales, ni se depende de servicios externos ni se aceptan SVG, URLs HTTP ni scripts.
- Si falla el procesamiento, se informa del error y se conserva la imagen anterior.
- Al cargar otro personaje, un procesamiento anterior pendiente queda invalidado para evitar contaminaciones entre personajes.

**Alternativa descartada:** guardar la ruta del archivo del ordenador. El navegador no puede recuperar de forma fiable esa ruta después de cerrar la sesión ni en otro dispositivo. **Alternativa pospuesta:** almacenamiento de imágenes independiente (blob/objeto), recomendable si más adelante se desean retratos de alta resolución o muchos jugadores.

**Límite y compromiso:** la miniatura optimizada pierde algo de calidad y queda incluida en el tamaño del documento JSON. La API existente admite hasta 130 000 caracteres de cuerpo y el validador del motor limita los datos `input` a 120 000, por lo que el límite de 60 000 para el retrato deja margen para texto y elecciones. Si el conjunto supera el límite general, el guardado dará un error; no se sobrescribirá silenciosamente.

### D42.4. Validación del dato tanto en cliente como servidor

Los campos tienen límites individuales; el servidor vuelve a validar longitudes, tipos, nombres de propiedades y formato permitido del retrato mediante `validateCharacterProfile`. La validación no confía exclusivamente en `maxLength` del navegador. Los datos introducidos se muestran como texto ordinario de React, no como HTML ejecutable.

### D42.5. Persistencia explícita, no automática

Se conserva el protocolo de guardado manual ya existente: el usuario edita y después pulsa **Actualizar guardado** o **Guardar como nuevo** en «Mis personajes». No se añade autoguardado: podría sobrescribir sin querer una versión de partida, o crear nuevas expectativas de sincronización que el producto todavía no satisface.

## 5. Funcionamiento y recorrido de datos

1. El usuario abre Personaje, escribe campos o selecciona una imagen.
2. `CharacterProfilePanel` llama a `onChange` y actualiza `profile` en `Home`.
3. React repinta el retrato compartido y la información narrativa, sin crear estado paralelo ni recalcular la hoja por escribir texto.
4. `SaveLoadPanel` recibe `input = {...rulesInput,profile}` y utiliza la misma rutina de guardado de fases anteriores.
5. `makeCharacterSnapshot` llama al validador del perfil y del personaje. La API vuelve a validar en el servidor.
6. PostgreSQL almacena el JSON como antes, sin cambios de tablas.
7. Al cargar, `loadSavedInput` inicializa el perfil desde el guardado o usa el perfil vacío si falta.
8. Si se sube de nivel, se conserva `profile` dentro de las elecciones que pasan al nuevo snapshot.

## 6. Pruebas preparadas

Archivo: `packages/rules-engine/tests/character-profile.test.ts`.

- Validación y normalización sin modificar el objeto original.
- Conservación de retrato, historia y notas tras serialización JSON / recuperación de snapshot v2.
- Compatibilidad con guardados sin perfil.
- Independencia de los cálculos de la ficha.
- Conservación al subir un nivel.
- Rechazo de campos desconocidos, números en lugar de texto y cadenas excesivas.
- Rechazo de retratos remotos, SVG, PNG sin conversión, contenidos no válidos y miniaturas demasiado grandes.
- Borrado del retrato sin eliminar otros textos.

**Verificaciones realizadas en el entorno de preparación (13-11-2026):**

- `tsc` estricto sobre motor y árbol de la interfaz web: **sin errores**. Esta comprobación de la interfaz utiliza una declaración provisional del componente `next/image`; no equivale al build real de Next.js.
- **13 comprobaciones directas** del comportamiento de validación, persistencia, versiones antiguas, estabilidad de estadísticas y subida de nivel: **superadas** mediante JavaScript compilado de TypeScript.
- Renderizado aislado con React del editor, la cabecera y la página principal: **superado**, utilizando un adaptador aislado de `next/image` para el entorno de prueba.
- **No ejecutados en este entorno:** `pnpm lint`, suite completa `pnpm test` en Vitest, `pnpm build` y pruebas visuales en navegador. Deben confirmarse en Windows antes del commit.

## 7. Plan de aceptación local

Desde la raíz `DndEditor`:

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Pruebas manuales:

1. Cargar uno de los personajes guardados antes de la versión 42. Comprobar que aparece su hoja, sin romper PG ni inventario.
2. Entrar en Personaje, introducir historia, personalidad, apariencia y notas.
3. Seleccionar un retrato JPG/PNG/WebP; comprobar que se muestra en la página y cabecera.
4. Cambiar de pestaña, volver a Personaje y confirmar que no desaparecen datos.
5. Pulsar «Actualizar guardado», recargar el navegador, volver a cargar el personaje y comprobar todos los campos y el retrato.
6. Quitar el retrato, guardar, recargar y comprobar que vuelve a mostrarse la inicial.
7. Probar una imagen SVG o de más de 5 MB; debe aparecer un error legible sin modificar el guardado anterior.
8. Subir un nivel mediante el flujo guiado, guardar y verificar que la historia persiste (solo si el personaje permite la subida).
9. Revisar diseño en escritorio y móvil, navegación con teclado y etiquetas accesibles.

## 8. Riesgos y tareas futuras

- El recorte centrado puede cortar parte de un retrato panorámico; un futuro editor permitirá reposicionar el encuadre.
- Los retratos en base64 aumentan el JSON. Si se habilitan múltiples personajes remotos o imágenes grandes, habrá que estudiar almacenamiento de archivos y políticas de privacidad.
- El guardado continúa siendo manual y no avisa al salir de la página sin guardar. Sería una mejora futura.
- Se permite texto libre, sin interpretarlo como órdenes ni convertirlo en mecánicas automáticas.
- No se realizan migraciones, por lo que conviene conservar copias de seguridad regulares de PostgreSQL aunque el cambio sea retrocompatible.

## 9. Git y trazabilidad

La fase 42 se debe subir mediante un **commit independiente** que contenga exclusivamente los nueve archivos enumerados en el apartado 3. Anotar posteriormente hash, fecha, resultados de `pnpm lint`, `pnpm test`, `pnpm build`, pruebas visuales e incidencias observadas.

**Estado final de documentación:** implementación propuesta y preparada; integración completa y subida pendientes de confirmación del desarrollador en su máquina. No afirmar que un comando pasó si no se dispone de su salida.
