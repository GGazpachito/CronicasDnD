# Parche 88.1 · Corrección de lint en creación y edición

**Proyecto:** CrónicasDnD · interfaz para contenido SRD 5.2.1. **Antecedente:** actualización 88, ventana común de creación/edición.

## Incidencia

El `pnpm lint` de la actualización 88 identificó **3 errores y 6 advertencias** en Guerrero, Mago y Brujo:

- Tres llamadas síncronas a `setState` dentro de `useEffect` para decidir si la ruta era una creación o un personaje guardado.
- Dos dependencias incompletas en efectos encargados de reconciliar los PG máximos al editar.
- Tres navegaciones internas mediante `window.location.assign()`.
- Una importación de `ABILITIES` sin usar en Guerrero.

## Solución

1. Nuevo hook común `useCharacterRouteMode`, basado en `useSyncExternalStore`. Lee el parámetro `character` de la URL y proporciona tres estados: `pending` durante renderización inicial, `creation` para un personaje nuevo y `existing` para una carga por enlace. El servidor y la hidratación inicial ven el mismo estado; no hay escrituras de estado en un efecto para abrir el diálogo.
2. Las tres páginas derivan directamente la visibilidad del editor cuando es una creación nueva o cuando el usuario pulsa «Editar». El panel de carga continúa disponible para enlaces a personajes guardados y puede mostrar los errores del servidor.
3. Los dos efectos de conciliación de PG dependen de la hoja calculada completa, cumpliendo la regla de dependencias de React.
4. «Volver a las clases» usa `useRouter().push('/create')`, respetando la navegación cliente de Next.js.
5. Se elimina la importación no utilizada en Guerrero.

No cambian el catálogo de reglas SRD, los asistentes de progresión, los contratos de persistencia ni los formatos de guardado.

## Comprobación

- Diagnóstico local del motor de reglas: 1.095 casos correctos en 95 archivos.
- Pendiente de ejecutar en el repositorio completo del desarrollador: `pnpm lint`, `pnpm test` y `pnpm build`. El entorno de preparación no contiene la instalación completa de Next.js/ESLint.
- Comprobación manual: nueva creación para las tres clases, edición/cancelación, enlace con `?character=...`, botón de retorno y subida de nivel.
