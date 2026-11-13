# Matriz de aceptación: actualización 45

**Proyecto:** Crónicas · D&D 2024  
**Fecha de prueba:** __________________  
**Rama:** __________________  
**Commit:** __________________  
**Windows / Node / pnpm:** __________________

## A. Pruebas automatizadas (ejecutar en la raíz del repositorio)

| ID | Comando | Esperado | Obtenido | Evidencia |
|---|---|---|---|---|
| A-01 | `pnpm lint` | Sin errores; documentar advertencias | Pendiente | |
| A-02 | `pnpm test` | Todas las pruebas, incluidas las 5 de integración, superadas | Pendiente | |
| A-03 | `pnpm build` | Compilación Next.js sin errores | Pendiente | |
| A-04 | `git diff --cached --check` | Sin errores de espacios o cambios conflictivos | Pendiente | |

## B. Pruebas manuales con datos existentes

**Preparación:** arrancar Docker/PostgreSQL y `pnpm dev`. No ejecutar `prisma migrate reset` ni eliminar volúmenes. Crear una copia adicional de un personaje antes de pruebas destructivas.

| ID | Procedimiento | Resultado esperado | Resultado real / capturas |
|---|---|---|---|
| M-01 | Abrir **Mis personajes** y pulsar **Actualizar lista** | Se muestra el listado real sin recargar toda la web | Pendiente |
| M-02 | Detener temporalmente PostgreSQL, pulsar **Actualizar lista**, iniciarlo otra vez y repetir | Mensaje de error recuperable; aparecen los personajes tras reintentar | Pendiente |
| M-03 | Cargar personaje guardado y no modificar nada | Estado «Guardado al día» | Pendiente |
| M-04 | Modificar PG desde Principal | Estado «Cambios sin guardar» | Pendiente |
| M-05 | Cambiar a Equipo, modificar monedas y equipar arma; volver a Principal | Se mantiene PG modificado; el arma aparece con sus bonificadores, sin duplicarse | Pendiente |
| M-06 | Cambiar a Personaje y editar + guardar una nota; abrir Rasgos y Hechizos | El contenido se mantiene y no se alteran los cálculos | Pendiente |
| M-07 | Intentar actualizar/recargar pestaña del navegador con cambios pendientes | Advertencia de salida, si el navegador lo admite | Pendiente |
| M-08 | Intentar cargar otro personaje con cambios pendientes y cancelar el cuadro | Se conserva el personaje actual y sus cambios | Pendiente |
| M-09 | Pulsar **Actualizar guardado** y volver a cargar ese personaje | Estado al día, PG, monedas, arma, nota y recursos recuperados | Pendiente |
| M-10 | Subir un nivel desde el asistente y cancelar la revisión | No cambia el nivel, las estadísticas ni la partida | Pendiente |
| M-11 | Subir un nivel, confirmar, guardar y recuperar | Se mantienen las elecciones, marcas de salvación, perfil, inventario y daño | Pendiente |
| M-12 | Cambiar entre las seis pestañas y comprobar foco de teclado | Cambios de pestaña sin pérdida de datos; teclas ← → Inicio Fin en barra | Pendiente |
| M-13 | Probar 375 px, 768 px y 1280 px de ancho; comprobar botones y lista | Sin cortes u obstáculos para usar controles críticos | Pendiente |
| M-14 | Abrir Combate | Sigue siendo módulo futuro; no hay automatización de combate accidental | Pendiente |

## C. Resultados y registro de incidencia

**Estado final:** ☐ Aceptada ☐ Requiere corrección  
**N.º pruebas aprobadas:** ______ / ______  
**Incidencias encontradas:** __________________________________________  
**Acción correctora y commit:** __________________________________________

## D. Evidencia para memoria TFG

Guardar capturas de **estado al día**, **cambios sin guardar**, **actualizar lista** y de la navegación responsive; conservar salidas de terminal de `pnpm lint`, `pnpm test`, `pnpm build` y el hash de Git. No subir capturas que incluyan credenciales ni datos privados de personajes reales.
