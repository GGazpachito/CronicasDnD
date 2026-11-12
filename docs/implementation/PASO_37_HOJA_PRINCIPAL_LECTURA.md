# Actualización 37 · Nueva hoja principal de consulta

**Proyecto:** DndEditor / D&D Character Builder 2024  
**Fecha de preparación:** 12/11/2026  
**Estado:** entregada para validación local; no se considera aceptada hasta comprobar lint, test, build y navegación en el equipo del autor.

## Objetivo

Hacer que «Principal» muestre de inmediato una hoja de personaje legible, en lugar de abrir directamente el asistente de creación y múltiples módulos técnicos. Esta fase es **de lectura**; las tiradas en cada fila se implementarán en la fase 38 y los controles directos de PG y recursos en la fase 39.

## Situación previa

La actualización 36 incorporó las seis pestañas y la cabecera, pero Principal aún exponía como contenido dominante las herramientas heredadas, el editor de cinco pasos y la proyección técnica de `page.tsx`. Los datos mecánicos ya los calcula `packages/rules-engine`, mediante `calculateGuidedFighter` y la instantánea de estado de partida (`sessionCheck`).

## Decisiones técnicas

- **ADR-021: Proyección única, múltiples vistas.** `PrincipalOverview` recibe `result`, `input` y `adventure` calculados en `page.tsx`. No calcula de nuevo la hoja ni introduce recursos mutables paralelos.
- **ADR-022: Introducción progresiva de interfaz.** El editor y la proyección anteriores siguen montados, pero dentro de un `<details>` colapsado; el botón de edición en cabecera, los atajos de otras pestañas y «Gestionar nivel» abren el editor automáticamente y llevan al campo correspondiente.
- **ADR-023: No simular funcionalidades futuras.** La hoja muestra estadísticas y bonificadores, pero no botones de dados ficticios. Inspiración y resistencias automáticas quedan identificadas como pendientes. El inventario actual aún no registra qué armas se empuñan, por lo que se etiquetan como «armas disponibles», no «equipadas».
- **ADR-024: Integridad del estado de partida.** Si el nivel/PG de partida no está sincronizado con la hoja calculada, PG actuales y recursos aparecen como «—» hasta corregirse. Se evita mostrar contadores antiguos como si fueran actuales.

## Archivos modificados

1. `apps/web/src/components/PrincipalOverview.tsx` (nuevo): renderiza PG, CA, iniciativa, 6 características, 18 habilidades, 6 salvaciones, armas en inventario, recursos de clase, percepción pasiva, velocidad, estado de muerte y avisos.
2. `apps/web/src/app/page.tsx`: integra la nueva vista, agrega referencias a los desplegables existentes, mejora atajos de edición y mantiene las pestañas intactas.
3. `apps/web/src/app/globals.css`: estilos de la nueva hoja con cuadrículas de escritorio y adaptación a tableta/móvil.
4. `docs/implementation/PASO_37_HOJA_PRINCIPAL_LECTURA.md`: registro de decisiones y verificación.

No se modifican dependencias, rutas API, Prisma, persistencia ni reglas del motor.

## Fuentes de cada cifra

| Dato mostrado | Fuente |
|---|---|
| PG máximo, CA, iniciativa, puntuaciones y modificadores | `result.sheet` |
| Habilidades y salvaciones | `result.sheet.skillBonuses` / `savingThrowBonuses` |
| Competencia de habilidades | Trasfondo, elecciones del Guerrero, especie y dote Competente registradas en `input` |
| PG actuales, temporales y dados disponibles | `sessionCheck.state` validado contra la hoja |
| Usos disponibles | `sessionCheck.state.fighter.resources` y máximos de `result.sheet.resources` |
| Armas disponibles | `result.inventory`, filtrando IDs del catálogo `WEAPONS` |
| Velocidad y tamaño | `result.origin` |
| Percepción pasiva | 10 + bonificador de Percepción, ±5 si el modo calculado aplica ventaja/desventaja |
| Tiradas de muerte | `sessionCheck.state.survival?.death` |

## Pruebas automatizadas realizadas durante la preparación

- **Chequear tipos de interfaz:** superado usando TypeScript **5.8.3** disponible en el entorno de preparación, compilando `page.tsx` y todos los componentes. Se usó una configuración temporal de chequeo; no forma parte de los archivos a entregar.
- **Renderizado aislado de la portada con React:** superado con una prueba temporal de servidor; se comprobaron 6 características, 18 habilidades, contenido de recursos y armas, error de ficha y aviso de desincronización. Esta prueba no sustituye a pruebas de integración en el navegador.
- **Suite Vitest, ESLint y `pnpm build` completos:** no ejecutados aquí. La copia de código disponible no incluye el cliente Prisma generado y sus binarios de dependencias de destino, por lo que deben comprobarse en la instalación local del autor, que ya dispone de TypeScript 5.9.3 y ESLint 9.39.1.

## Verificación local para aceptar la actualización

Desde la raíz del repositorio:

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

En `http://localhost:3000`:

1. Crear/abrir un Guerrero y consultar la portada Principal: deben aparecer los 3 valores superiores, seis características, 18 habilidades y seis salvaciones.
2. Equipar/desequipar armadura desde «Editar personaje» -> Equipo y volver a la portada: la CA debe actualizarse sin recargar.
3. Gastar un recurso en «Herramientas existentes» y volver a la portada: el contador debe mostrar exactamente el estado de la partida.
4. Hacer clic en «Gestionar nivel»: debe abrir el editor en el paso 1, enfocado en el control de nivel. Probar la navegación y la progresión validada.
5. Abrir/cargar un personaje desde «Mis personajes»: deben sincronizarse los números sin que cambie la pestaña inesperadamente.
6. Verificar que el panel de ataques existente sigue operativo, que es accesible desde la portada y que el editor anterior no ha desaparecido.
7. Probar la ventana de escritorio y una anchura móvil de 390 px: sin desplazamiento horizontal estructural ni campos cortados.
8. Probar un estado de partida fuera de sincronía: no deben mostrarse PG/recursos de la sesión antigua como vigentes.

## Limitaciones expresas

- Las tiradas interactivas y sus desgloses se incorporan en la actualización 38.
- PG, inspiración y recursos no se manipulan todavía desde la nueva portada; se utiliza el panel de partida existente.
- Armas en inventario no equivale a armas efectivamente empuñadas; su gestión se abordará con Equipo.
- Las resistencias, inmunidades y la inspiración requieren datos derivados o persistidos que el nuevo componente aún no recibe como una proyección normalizada. Se muestran como pendientes.
- El editor original se conserva íntegramente para reducir regresiones y facilitar el contraste con los resultados anteriores.

## Evidencia pendiente para el TFG

Anotar rama, SHA del commit, fecha del commit, logs de `pnpm lint/test/build`, capturas de portada en escritorio/móvil y resultados de la batería manual. No declarar esta fase cerrada sin estas evidencias.
