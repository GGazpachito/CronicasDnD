# Actualización 48.2: selector de clase dentro del creador

## Incidencia

Tras las actualizaciones 48 y 48.1, las comprobaciones automáticas pasaron, pero al abrir el apartado «Editar personaje y consultar la hoja técnica original», en **Identidad**, todavía figuraba la leyenda «Guerrero (única clase disponible en esta versión)». El nuevo Mago sí existía en la ruta `/wizard`, y ambas páginas ya incorporaban un selector general fuera del formulario. La creación dentro de la pestaña Identidad, sin embargo, mostraba información obsoleta. El problema era de **descubribilidad y coherencia de la interfaz**, no del cálculo de las reglas ni de la persistencia.

## Objetivo y solución

- En `apps/web/src/app/page.tsx`, sustituir la leyenda antigua de clase por un `<select>` dentro del paso «Identidad», con **Guerrero** y **Mago (nivel 1)**.
- En `apps/web/src/app/wizard/page.tsx`, colocar el selector recíproco dentro del formulario de Mago para que ambas rutas permitan cambiar de clase desde el creador.
- Reutilizar las funciones de navegación ya existentes con `useRouter().push()`, sin usar `window.location.assign`, y conservar las confirmaciones al descartar cambios.
- Explicar que cambiar de clase **abre otro creador** y no convierte el personaje actual ni reescribe sus datos. La conversión de clases y la multiclase no forman parte de esta iteración.
- Mantener el selector general de clase en la parte superior de cada hoja para seguir permitiendo la navegación cuando el editor está plegado.

## Arquitectura y límites

El Guerrero permanece en `/`; el Mago de nivel 1 en `/wizard`. Cada clase continúa usando sus validaciones, estados y operaciones de guardado existentes. Se modifican únicamente dos componentes de interfaz y se añade esta documentación. **No se modifica** el motor de reglas, el esquema ni la base de datos PostgreSQL, los endpoints, los guardados, las dependencias ni los tests anteriores.

## Verificaciones de preparación

1. Análisis sintáctico TSX de los dos componentes modificados.
2. Comprobación de que el selector en el paso «Identidad» incluye las dos clases y desaparece la indicación obsoleta de clase única.
3. Comprobación de que en el editor de Mago existe el selector recíproco y que las navegaciones internas emplean el router de Next.js.

## Pruebas de aceptación pendientes en el equipo de desarrollo

1. Ejecutar `pnpm lint`, `pnpm test` y `pnpm build`, registrando los resultados en el TFG.
2. Abrir `http://localhost:3000`, desplegar el editor de Guerrero y entrar en «Identidad»: seleccionar **Mago** y confirmar. Debe abrirse `/wizard`.
3. Repetir y cancelar la confirmación: debe permanecer en `/`, manteniendo el Guerrero.
4. En `/wizard`, abrir «Editar personaje» y cambiar la clase a **Guerrero**. Debe volver a `/` si se confirma la navegación.
5. Verificar que pueden cargarse y guardarse los dos personajes antiguos en PostgreSQL y que al cancelar el cambio no se alteran.

## Estado

**Corrección preparada. Pendiente de confirmación de ESLint, Vitest, build y prueba visual en el ordenador del usuario.**

## Siguiente actualización prevista

**49: módulo compartido de Hechizos**, con magia procedente del origen y especie, preparación de conjuros, ranuras y datos informativos, sin añadir todavía progresión superior al nivel 1 del Mago.
