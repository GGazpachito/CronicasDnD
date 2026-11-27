# Paso 85 · Preparación del repositorio público y atribuciones

**Fecha:** 27 de noviembre de 2026.

## Decisión

El titular del repositorio decide conservar el historial Git existente y acepta el riesgo residual derivado de material no-SRD eliminado del catálogo activo en el paso 84. **La visibilidad del repositorio no se modifica en esta entrega**: el cambio a público corresponde al propietario, después de incorporar y verificar el parche.

La publicación del código fuente para consulta no implica elegir una licencia de software libre. Hasta que los autores adopten expresamente una, se mantiene una separación entre los derechos del código propio y la licencia CC-BY-4.0 que permite utilizar el material del SRD 5.2.1.

## Cambios introducidos

- `NOTICE.md`: incorpora la declaración de atribución del SRD 5.2.1 oficial en español, fuentes y aclaraciones sobre adaptaciones y derechos.
- `README.md`: refleja las tres clases realmente implementadas, remite a la documentación modular y deja explícita la situación de licencia y entorno de desarrollo.
- `apps/web/src/app/atribuciones/page.tsx`: página accesible de atribuciones, adaptaciones y alcance de las licencias.
- `apps/web/src/app/layout.tsx`: enlace permanente a las atribuciones desde todas las páginas de la aplicación.
- `apps/web/src/app/page.tsx`: enlace visible en el menú principal a la página legal.
- `docs/licenses/README.md`: distingue el SRD bajo CC-BY-4.0 de los derechos del código y de otras referencias documentales.

## Verificación y límites

El propietario ha comunicado que el proyecto supera las verificaciones funcionales y de producción **antes de esta actualización documental y visual**. Tras integrarla, la compilación y las pruebas han de repetirse en el repositorio completo; en el entorno de preparación del parche solo hay una copia parcial de los archivos.

La auditoría de contenido activo realizada en el paso 84 sigue vigente. Esta entrega no modifica el motor de reglas, el estado del personaje ni la base de datos, y no constituye una garantía jurídica sobre la totalidad del historial anterior ni sobre recursos de terceros. En el árbol actual de GitHub se comprobaron archivos `.env.example` y la ausencia de `.env` reales, pero no se ha efectuado una auditoría exhaustiva de secretos de todos los commits.
