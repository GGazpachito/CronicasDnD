# Paso 65 — Revisión funcional de la hoja de Mago: descansos y guardado recargable

Fecha: **18/11/2026**. Repositorio: `GGazpachito/dnd-character-builder`, rama `main`.

**Prerrequisito:** instalar las actualizaciones hasta la **64** inclusive. Este ZIP es incremental; no incluye ni sustituye el código entregado en las fases anteriores.

## Objetivo

Tras completar la progresión de Mago 1–20 y auditar los invariantes del motor (paso 64), se revisa el recorrido del usuario en la web: consultar pestañas, registrar descansos, gestionar recursos y guardar o recuperar la sesión real de un personaje. Se mantiene la frontera de diseño establecida para Crónicas: la web calcula valores pasivos y facilita tiradas, pero no ejecuta decisiones del combate.

La copia de trabajo disponible aquí es **parcial**, sin el monorepo instalable ni una instancia de PostgreSQL. Por tanto, esta entrega incorpora dos correcciones concretas y un protocolo reproducible de **aceptación manual en navegador**; no afirma haber completado una sesión real de navegador.

## 1. Descanso corto accesible en los niveles 1–20

### Problema anterior

El botón explícito de descanso corto estaba vinculado exclusivamente al panel de **Conjuros de firma**, mostrado en nivel 20. En niveles inferiores, las instrucciones de Recuperación arcana y de Memorizar conjuro hablaban de un descanso corto, pero la hoja no permitía registrarlo como acción visible.

### Corrección

- La pestaña **Hechizos** incorpora un bloque común **Descansos**, con acciones **Confirmar descanso corto** y **Confirmar descanso largo** en cualquier nivel.
- El descanso corto utiliza `wizardShortRest`, ya presente en el motor. **No devuelve ranuras ni PG**, **no reinicia Recuperación arcana** ni **Sobrecarga**. En nivel 20 sí devuelve los usos gratuitos de los dos Conjuros de firma.
- El usuario recibe un mensaje accesible (`role="status"`) que explica qué se ha registrado.
- Se retira el botón redundante del bloque de Conjuros de firma para que el descanso se registre en un único lugar.
- Los mensajes temporales se limpian al cargar, cambiar nivel o descansar largo. Las elecciones y recursos persistentes continúan separados de los avisos visuales.
- Recuperación arcana y Memorizar conjuro siguen siendo decisiones **confirmadas manualmente** por el jugador. No se añade un contador ni una compuerta automática para exigir un descanso corto previo: exigirla correctamente requeriría ampliar el esquema persistente, asunto pendiente para una futura fase de reglas/estado.

## 2. Guardado persistente con URL recargable

### Problema anterior

Al guardar un personaje por primera vez, `SaveLoadPanel` recibía de PostgreSQL su ID y revisión, pero mantenía la URL de creación (`/wizard` o `/fighter`) sin el parámetro identificador. Una **recarga del navegador** podía volver al personaje de creación por defecto. Había que volver al menú para localizarlo y abrirlo.

### Corrección

Tras un **POST exitoso y validado**, el módulo compartido añade `?character=<id>` a la URL mediante `window.history.replaceState`. Este cambio no provoca un nuevo render por navegación ni crea una entrada extra de historial. Al recargar, el mismo componente ya existente lee el parámetro, consulta `GET /api/characters/:id` y valida la clase, el nivel y el snapshot antes de restaurarlo.

- **POST inicial**: fija la URL recargable y la revisión devuelta.
- **PUT posterior**: mantiene la URL y actualiza la revisión, sin cambiar la identidad del guardado.
- **Datos editados durante una petición**: la huella del snapshot asociado a esa petición permite detectar que todavía quedan cambios sin guardar.
- **Error de red/validación**: no se cambia la URL ni se informa de un guardado correcto.
- **Error excepcional al modificar el historial del navegador**: el guardado en servidor se reconoce como correcto, pero el aviso indica que hay que reabrir el personaje desde el menú antes de recargar; no se presenta erróneamente como un fallo de PostgreSQL.
- El cambio se introduce en el componente **compartido**. Se debe probar tanto Mago como Guerrero para descartar regresiones.

La documentación de Next.js permite el uso de `history.replaceState` desde componentes cliente en App Router: `https://nextjs.org/docs/app/getting-started/linking-and-navigating`.

## 3. Prueba automatizada añadida

`packages/rules-engine/tests/wizard-rest-flow-65.test.ts` verifica el contrato que utiliza el nuevo control visual:

- Descanso corto para niveles **1, 5, 14, 18, 19 y 20**.
- Persistencia de ranuras gastadas, Recuperación arcana usada y contador de Sobrecarga.
- Restitución de usos gratuitos de Conjuros de firma en nivel 20.
- Descanso largo posterior restaura ranuras y reinicia recursos de descanso largo.
- Repetir un descanso corto no concede ranuras adicionales.

Estos tests prueban la **semántica del motor**, no clics o navegación reales. La verificación de interfaz y PostgreSQL se realiza siguiendo la matriz siguiente.

## 4. Matriz de aceptación manual en navegador

Arrancar la aplicación con PostgreSQL configurado desde la raíz del monorepo. Utilizar un personaje de prueba para no interferir en partidas guardadas importantes. Ejecutar cada caso y anotar `PASA / FALLA`, nivel, navegador, comportamiento observado y capturas si procede.

| ID | Niveles / clase | Interacción | Resultado esperado |
| --- | --- | --- | --- |
| A01 | Mago 1 | Crear personaje válido, guardar | Aparece éxito, `?character=` en URL, estado «Guardado al día» |
| A02 | Mago 1 | Recargar (F5) inmediatamente tras A01 | Se restauran nombre, origen, PG y demás datos; no vuelve al editor inicial |
| A03 | Mago 1 | Navegar Principal → Rasgos → Equipo → Hechizos → Personaje → Combate → Principal | Pestañas coherentes, contenido visible solo en la pestaña elegida, Combate marcado como futuro |
| A04 | Mago 1 | Gastar ranura, confirmar descanso corto | Ranura sigue gastada, mensaje de descanso visible; no cambian PG |
| A05 | Mago 1 | Recuperación arcana tras A04, después descanso largo | La recuperación permite elegir ranura válida una vez; descanso largo repone ranuras y el recurso |
| A06 | Mago 4–5 | Subir nivel con asistente, cancelar una vez y después confirmar | Cancelar no cambia la hoja; confirmar aplica nivel, conjuros y recursos; en 5 aparece Memorizar |
| A07 | Mago 5 | Registrar descanso corto, sustituir un preparado por otro del libro | Solo cambia la elección confirmada; la pestaña mantiene la consistencia |
| A08 | Mago 10 | Revisar quinto truco y Evocación Potenciada | Están visibles según nivel; el bono de daño no se aplica a todos los dados |
| A09 | Mago 14 | Activar Sobrecarga dos veces; descanso corto y después largo | Corto conserva contador; largo lo reinicia; tirada de daño no resta PG automáticamente |
| A10 | Mago 18 | Elegir dos Maestrías, cambiar por descanso largo | Permanecen siempre preparadas sin ocupar las plazas normales; solo se sustituye mediante el diálogo |
| A11 | Mago 19 | Elegir Beneficio épico; usar acción de tirada si corresponde | Característica y acción visibles y correctas; la tirada no altera ranuras sola |
| A12 | Mago 20 | Gastar los dos usos gratuitos de firma; gastar una ranura; corto | Ambos usos vuelven a disponibles; la ranura sigue gastada |
| A13 | Mago 20 | Descanso largo | Recupera las ranuras y los usos de firma, permite revisar Maestría |
| A14 | Mago 20→19→18→17 | Deshacer niveles usando el diálogo | Los rasgos de cada nivel se retiran cuando corresponde, preservando el estado compatible |
| A15 | Mago 20 | Guardar recursos gastados, recargar, editar, Guardar cambios y recargar | Persisten estado y elecciones; URL conserva el mismo ID; no se duplica personaje |
| A16 | Mago 1 y 20 | Modificar datos sin guardar, intentar abandonar la página | El navegador o menú advierte de cambios pendientes; tras guardar deja de advertir |
| A17 | Guerrero | Crear, guardar, F5, modificar, Guardar cambios, F5 | Misma recarga por URL; no se confunden los datos con los de Mago |
| A18 | Mago/Guerrero | Abrir una URL de personaje de otra clase | Se rechaza la carga cruzada sin reinterpretar el snapshot |
| A19 | Mago | Navegar por pestañas con teclado (Tab, flechas, Inicio/Fin), abrir/cerrar asistente | Los controles son operables y el foco sigue una secuencia útil |

**Precauciones:** comprobar antes de guardar el personaje de prueba que el servidor y la base de datos están conectados. Si el navegador presenta datos distintos tras F5, conservar la salida de consola/red de `GET` y del último `POST/PUT` para localizar si el fallo está en API, serialización o interfaz. No modificar tablas manualmente.

## 5. Verificaciones técnicas

Desde la raíz del repositorio local, después de extraer el ZIP:

```cmd
pnpm --filter @dnd/rules-engine test
pnpm build
pnpm dev
```

Con `pnpm dev`, abrir la URL que indique Next.js y aplicar la matriz. Si Vitest o la compilación fallan, **no subir los cambios**; compartir el error completo para corregirlo.

**Verificado durante la generación:** inspección de los flujos de componente y regla, compatibilidad de la actualización de URL con la API de History de Next.js, análisis de sintaxis en los archivos compatibles y comprobación de integridad del ZIP.

**No verificado durante la generación:** suite Vitest real, `pnpm build`, interacción con navegador, persistencia en PostgreSQL ni comparación manual con el PHB. La copia local de preparación está incompleta y no permite presentarlos honestamente como aprobados.

## 6. Archivos que incluye el ZIP

**Modificados**

- `apps/web/src/app/wizard/page.tsx`
- `apps/web/src/components/SaveLoadPanel.tsx` (componente compartido por Mago y Guerrero)

**Nuevos**

- `packages/rules-engine/tests/wizard-rest-flow-65.test.ts`
- `docs/implementation/PASO_65_REVISION_FUNCIONAL_MAGO_DESCANSOS_GUARDADO.md`

## 7. Trazabilidad para el TFG

La actualización documenta el paso de pruebas de dominio a **pruebas de aceptación de usuario**: criterios reproducibles, persistencia después de cerrar y reabrir sesión, regresión entre dos clases que comparten UI, separación de acciones automáticas y manuales y delimitación explícita del entorno de validación. Las evidencias obtenidas en el navegador (capturas de los casos y salidas de los comandos) deben conservarse para el apartado de validación del TFG.

## 8. Próximo paso propuesto — 66

Si la matriz se supera, **cerrar formalmente la clase Mago** con un registro de resultados (capturas e incidencias) y continuar el calendario de clases según el plan técnico. Antes de desarrollar otra progresión, conviene decidir si el nuevo flujo de descansos requiere registrar la autorización de Recuperación arcana tras un corto dentro del snapshot o si continúa como acción supervisada por el jugador.
