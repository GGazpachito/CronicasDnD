# Paso 86 · Cambio de nombre visible a CrónicasDnD

Se adopta **CrónicasDnD** como nombre público del proyecto antes de hacer visible el repositorio. El renombrado afecta únicamente a la marca presentada al usuario y a las referencias generales de la documentación.

## Alcance

- Menú principal, creación y carga de personajes, fichas de Guerrero/Mago/Brujo y cabecera del Bestiario.
- Título del navegador, pie legal y página de atribuciones.
- README, aviso de atribución y documentos de arquitectura vigentes.

No cambian el comportamiento, los identificadores persistentes ni las rutas de la aplicación. Se mantienen los nombres técnicos de paquetes (`@dnd/...`) y el nombre interno del workspace para no modificar innecesariamente el archivo de bloqueo ni romper importaciones o scripts.

El repositorio remoto conserva por ahora la dirección `GGazpachito/dnd-character-builder`. Su cambio de nombre en GitHub debe realizarlo el propietario de forma explícita, si lo desea, después de integrar y verificar esta actualización.

Las actas de pasos históricos no se reescriben retrospectivamente: documentan el nombre que tenía el proyecto en el momento de cada implementación.
