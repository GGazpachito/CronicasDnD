# Actualización 45. Integración, recuperación de guardados y verificación general

**Proyecto:** Crónicas: hoja digital de D&D 2024 como herramienta de apoyo, no videojuego.  
**Fecha de preparación:** 13 de noviembre de 2026.  
**Base:** actualización 44.1 validada por el usuario.  
**Estado:** implementado en paquete de entrega; pendiente de comprobación integral en el ordenador del usuario y commit Git.

## 1. Motivación

El proyecto acumula seis pestañas y módulos compartidos desde las actualizaciones 36–44.1: Principal, Rasgos, Equipo, Hechizos, Personaje y Combate (marcador provisional). La integración debe demostrar que el valor representado en una pestaña procede del mismo estado que las demás, y que la subida de nivel y el guardado no desincronizan los datos.

Se identificaron dos problemas de experiencia de uso en el panel de personajes:

1. Tras una conexión fallida o un arranque tardío de PostgreSQL, la lista de personajes se consultaba solo al montar el componente. Había que recargar toda la página para volver a consultarla. Ya se había reportado en el proyecto una incidencia de lista de personajes no visible, sin pérdida en PostgreSQL.
2. El usuario no disponía de un indicador general de cambios pendientes de guardar, aparte de la diferencia entre el nivel visible y el nivel persistido. Cambios de PG, inventario, retrato o notas podían perderse al cerrar la pestaña sin advertencia específica.

## 2. Alcance y decisiones

### 2.1. Recuperación del listado sin reiniciar la aplicación

`SaveLoadPanel.tsx` incorpora **Actualizar lista**, que realiza de nuevo `GET /api/characters` con `cache: 'no-store'`. Presenta el estado de consulta, mantiene el listado anterior si falla una actualización y muestra el error sin borrar los datos de la pantalla. La operación no modifica personajes.

La selección se limpia si la API deja de devolver el personaje seleccionado. Esta medida evita intentar borrar o cargar un identificador obsoleto. La conexión sigue siendo local y depende del servidor PostgreSQL existente.

### 2.2. Detección de cambios sin guardar

Tras un `POST`, `PUT` o `GET` exitoso de un personaje, el panel conserva en memoria una **huella textual de la instantánea validada**. No es un hash criptográfico ni una copia persistente adicional. En cada cambio de `input` o `adventure`, calcula mediante `makeCharacterSnapshot` qué documento se enviaría a PostgreSQL y compara sus representaciones JSON.

Se comparan elecciones, perfil narrativo, historial del inventario y estado de partida. No se comparan los textos renderizados de las pestañas ni resultados de tiradas de dados que no formen parte del estado persistente.

- **Guardado al día:** no se han detectado diferencias respecto a la última instantánea confirmada.
- **Cambios sin guardar:** hay una diferencia, o la ficha ya no es válida para generar un guardado.
- Al intentar cerrar/recargar una pestaña con cambios pendientes se activa la advertencia nativa `beforeunload`. Cada navegador decide su texto.
- Al cargar otro personaje con cambios pendientes, la confirmación advierte expresamente del descarte.
- Las navegaciones entre pestañas de la propia hoja **no** disparan un aviso: se conservan montados sus paneles, por diseño.

Esta funcionalidad **no guarda automáticamente** en PostgreSQL. Solo informa y ayuda a evitar pérdidas. Los personajes aún no guardados por primera vez siguen necesitando «Guardar como nuevo».

### 2.3. Confirmación real de escrituras

Se distingue entre **escritura confirmada por la API** y **recarga posterior del listado**. Si `POST`, `PUT` o `DELETE` terminó correctamente pero falla la consulta posterior de personajes, ya no se anuncia erróneamente que la escritura falló. El mensaje confirma lo que el servidor sí verificó e invita a actualizar el listado manualmente.

### 2.4. Claridad de versión y diseño responsive

Se elimina de la cabecera de la web el rótulo de una fase anterior («Actualización 44») y se sustituye por una denominación estable de la hoja. Se añaden estilos del estado de guardado y del botón de recarga con distribución adaptable, foco visible y espacio suficiente para pantallas estrechas.

**Límites:** no hay cambios en las reglas, los objetos mágicos, la API, el modelo Prisma ni `schemaVersion` de personajes. La pestaña Combate sigue siendo una reserva para trabajo futuro. No se instala infraestructura adicional de pruebas de navegador.

## 3. Pruebas de regresión entre módulos

Nuevo archivo `packages/rules-engine/tests/integration-45.test.ts`. Con cinco pruebas, cruza mecanismos que antes se verificaban mayoritariamente de forma separada:

1. **Guardar y recuperar** un personaje con perfil, monedas, arma equipada, PG perdidos, inspiración y marcas manuales de muerte. Verifica que no se mutan los datos de origen.
2. **Equipo → Principal:** el inventario y el calculador de armas utilizan la misma selección de equipamiento; el daño crítico duplica los dados; desequipar hace desaparecer el arma.
3. **Rasgos y Hechizos:** ambas proyecciones son de lectura, no duplican rasgos ni crean ranuras inexistentes, y no modifican la ficha calculada.
4. **Subida de nivel + guardado:** la transición de Guerrero 1→2 conserva daño, marcas, inventario y perfil, sin rasgos duplicados.
5. **Integridad del guardado:** se rechazan inconsistencias de nivel o reglas sin alterar el documento original.

Estas pruebas son complementarias a las suites específicas de las fases anteriores, no las sustituyen.

## 4. Verificaciones realizadas en el entorno de preparación

| Comprobación | Resultado y alcance |
|---|---|
| Compilación estricta del componente modificado `SaveLoadPanel.tsx`, TypeScript 5.8.3 | Superada en aislamiento |
| Compilación estricta de las dependencias requeridas por las cinco pruebas | Superada |
| Cinco pruebas de integración ejecutadas con un comprobador local de aserciones | **5/5 superadas**; no equivale a ejecutar Vitest |
| Renderizado estático React del panel de guardados, con controles accesibles | Superado |
| `pnpm lint`, `pnpm test`, `pnpm build` sobre el repositorio del usuario | **Pendientes** |
| Operaciones reales contra PostgreSQL del usuario | **Pendientes** |
| Navegación y responsive reales en el navegador | **Pendientes** |

No afirmar que los guardados de PostgreSQL reales han sido revisados desde este entorno. La evidencia definitiva deberá recogerse en el equipo de desarrollo.

## 5. Matriz de aceptación manual

Ver `docs/qa/ACTUALIZACION_45_MATRIZ_PRUEBAS.md`. Este archivo propone pasos, resultados esperados y campos para recoger evidencia de cada escenario.

**Criterios de cierre:** sin errores de TypeScript/build/lint, tests oficiales superados, conservación de los dos personajes previamente confirmados, sin pérdidas entre pestañas, recuperación del listado después de iniciar PostgreSQL y advertencias de cambios pendientes coherentes.

## 6. Decisiones alternativas descartadas

- **Autoguardado en cada pulsación:** descartado por riesgo de sobrescribir sesiones, necesitar reconciliación de conflictos y modificar el contrato explícito de persistencia que conoce el usuario.
- **Duplicar inventario/perfil en cada pestaña:** descartado; aumentaría la divergencia entre interfaces.
- **Crear nuevas tablas o elevar la versión de snapshot:** innecesario. El estado necesario ya se guarda en el documento v2.
- **Instalar una nueva suite de E2E sin entorno de ejecución conocido:** se pospone a una fase posterior; se entregan pruebas de motor y una matriz manual verificable.

## 7. Riesgos y limitaciones conocidos

- La huella utiliza serialización de JSON. En una reconstrucción de entrada con distinto orden de claves pero mismos datos podría producir un **falso positivo** de cambios pendientes; no provoca escrituras ni pérdidas de datos. Una mejora posterior podría usar una comparación canónica por claves.
- `beforeunload` depende del navegador y no garantiza alertas en todos los dispositivos, especialmente móviles.
- La implementación muestra el estado de guardado del **personaje cargado y confirmado**. Una ficha nueva sin guardado todavía no cuenta con comparación respecto a PostgreSQL.
- Los campos temporales de formularios aún en modo «Editar» (antes de pulsar «Guardar» en la tarjeta) no forman parte de la instantánea persistible y requieren confirmar esa tarjeta primero.
- El rendimiento de serializar documentos JSON grandes con retratos puede mejorar con memoización adicional o indicadores por acción si el proyecto crece significativamente.

## 8. Archivos afectados

| Ruta | Modificación |
|---|---|
| `apps/web/src/components/SaveLoadPanel.tsx` | Recarga, estados, huella de cambios, protección al cerrar y confirmación de operaciones |
| `apps/web/src/app/globals.css` | Diseño del estado de guardado, botón de actualizar y mobile |
| `apps/web/src/app/page.tsx` | Rótulo estable de interfaz |
| `packages/rules-engine/tests/integration-45.test.ts` | Pruebas transversales de integración |
| `docs/implementation/PASO_45_INTEGRACION_Y_CALIDAD.md` | Registro de esta fase |
| `docs/qa/ACTUALIZACION_45_MATRIZ_PRUEBAS.md` | Protocolo reproducible de aceptación y evidencias |

## 9. Control de versiones y trazabilidad del TFG

Crear commit exclusivo de estos seis archivos, sin `git add -A`. Registrar fecha, rama, hash y resultados de los comandos oficiales en la matriz. No incluir archivos `.env`, imágenes privadas ni documentos de partidas en el repositorio.

### Relación con el Manual del Jugador de 2024

No se introducen reglas de juego nuevas. La revisión se ocupa de la infraestructura de presentación y persistencia de la hoja. El manual del jugador es la fuente de referencia para las reglas verificadas por pruebas previas; las decisiones de API, UX y base de datos son decisiones de ingeniería del proyecto, no reglas del libro.
