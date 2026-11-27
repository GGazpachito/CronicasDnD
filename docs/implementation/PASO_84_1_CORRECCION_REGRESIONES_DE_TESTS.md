# Paso 84.1 · Corrección de regresiones de pruebas tras delimitar el SRD

**Fecha:** 27 de noviembre de 2026. **Alcance:** pruebas automatizadas; no se modifica el catálogo ni el motor de producción de la actualización 84.

## Incidencia

Al ejecutar la batería completa de Vitest después de aplicar la auditoría SRD 5.2.1, el usuario obtuvo un resumen de **414 pruebas fallidas de 1.092**, distribuidas en 46 archivos. El archivo de salida compartido incluye el tramo final de ese listado, con una gran cantidad de errores que remitían a `calculateGuidedFighter`.

La causa principal fue una **desincronización de los datos de prueba históricos**, no una regresión independiente por cada caso: muchas pruebas del Guerrero creaban un Humano con la dote adicional `tough` («Duro»), retirada del programa base porque no consta en el repertorio del SRD 5.2.1. El validador correctamente rechazaba esa elección. Se detectaron además referencias antiguas a los estilos `dueling` y `thrown_weapon_fighting`, beneficios épicos `fortitude` y `speed`, dotes de origen comerciales y recuentos de conjuros anteriores a la auditoría.

## Criterios de corrección

1. **No reintroducir contenido retirado para hacer pasar tests.** La validación estricta del catálogo SRD se mantiene.
2. Los *fixtures* de Humano/Soldado pasan de `tough` a `alert`: Soldado ya concede `savage_attacker` por trasfondo y elegirlo también como dote humana vulneraría la restricción de no duplicación.
3. Los casos puntuales de Humano/Criminal eligen `savage_attacker` como dote adicional porque Criminal ya concede `alert`.
4. Se actualizan cifras de PG que incluían indebidamente la antigua bonificación de Duro; por ejemplo, la creación normal de Guerrero nivel 1 pasa a 12 PG, nivel 3 a 28 PG y nivel 6 de la prueba de progresión a 58 PG.
5. Las pruebas de los estilos Duelo/Arrojadizas y de los beneficios Fortaleza/Velocidad se sustituyen por **pruebas de rechazo**, conservando las pruebas positivas de mecánicas incluidas en el SRD.
6. Los tests de los talentos Artesano, Músico y Afortunado verifican su rechazo, manteniendo la cobertura positiva de Alerta, Competente e Iniciado en la Magia.
7. Se corrigen las expectativas de la lista del Mago (217 conjuros; 65 disponibles en el grupo relevante de niveles 1–2) y la comprobación textual de un error de Brujo, sin alterar las reglas de negocio.

## Resultados de diagnóstico

- Los 94 archivos de pruebas presentes en la rama original y la nueva prueba SRD se cargaron en una copia de trabajo de diagnóstico.
- Se ejecutaron **1.090 casos con 0 fallos** mediante un **ejecutor local de compatibilidad de afirmaciones**, preparado para este análisis ante la ausencia de dependencias `pnpm` y Vitest en el entorno parcial. Es una comprobación de comportamiento, **no una ejecución oficial de Vitest**.
- Los archivos del ejecutor de diagnóstico y los archivos sin cambios obtenidos para completar el entorno **no forman parte del ZIP correctivo**.
- La aceptación definitiva requiere ejecutar `pnpm test` y `pnpm build` en la copia completa del usuario.

## Relación con la arquitectura modular

El incidente confirma que los *fixtures* de regresión son consumidores del mismo catálogo que la interfaz. Cuando un contenido migra desde el núcleo a un módulo futuro, sus pruebas de integración deben ejecutarse dentro del contexto del módulo **activado y autorizado**, mientras las pruebas del programa base han de comprobar que no pueda usarse sin él. La separación debe abarcar datos de prueba, validadores, interfaz, cálculos y persistencia, no solo los selectores visuales.
