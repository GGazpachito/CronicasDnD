# Paso 86.2 · Sincronización de pruebas históricas con GitHub Actions

## Hallazgo

La ejecución del commit remoto `2b6f5c171dc7c9456afeac00b2c4771b04f2e907` falló en pruebas de `background-equipment.test.ts` y `attacks.test.ts`. Las primeras aún utilizaban una dote humana retirada y las segundas esperaban bonificaciones de estilos de combate que ya no forman parte del catálogo SRD 5.2.1.

La comparación de los identificadores Git de los archivos del árbol remoto con los archivos de trabajo locales reveló que **42 de 94 archivos de pruebas** seguían distintos. Los **118 archivos de código fuente** contrastados entre `apps/web/src` y `packages/rules-engine/src` coincidían exactamente con el remoto. Por tanto, la desincronización estaba limitada a los tests históricos y no a la implementación.

## Decisión

Incorporar conjuntamente los 42 tests corregidos en la auditoría SRD previa, conservando las aserciones útiles y las pruebas que verifican el rechazo de contenidos no permitidos. No relajar validadores ni reintroducir opciones excluidas.

El archivo `adventure.test.ts`, corregido en la actualización 86.1, ya coincidía con el remoto y no necesita volver a enviarse. Tampoco se repiten cambios en los componentes de interfaz ni en el workflow.

## Verificación

La copia local del motor se había sometido a un diagnóstico de compatibilidad de **1.090 casos, 0 errores**, que no sustituye a Vitest. El usuario también informó de que sus comprobaciones con `pnpm` eran correctas. Solo una nueva ejecución del workflow tras integrar todos los tests puede confirmar la corrección en el repositorio remoto.
