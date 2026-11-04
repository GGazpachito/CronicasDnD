# Paso 08 · Creación guiada de Guerrero (versión parcial)

## Fuentes
Manual del Jugador 2024, capítulos 2, 3 y 4 (especialmente pp. 33–38, 91–92, 178–185, 188–190 y 194). Se mantiene el SRD 5.2.1 como referencia complementaria.

## Alcance implementado

- Asistente de cinco pantallas: identidad, origen, características, competencias y equipo.
- Cuatro trasfondos: Acólito, Criminal, Erudito y Soldado. Sus tres opciones de características, dos habilidades, herramienta y dote de origen se registran.
- Tres especies: Humano, Enano y Elfo. Elecciones de tamaño humano, dote humana (subconjunto), competencia humana, linaje y competencia élfica.
- Distribución de la matriz estándar, +2/+1 o +1/+1/+1 del trasfondo, sin superar 20.
- Guerrero niveles 1–3, Campeón en nivel 3, dos competencias de clase, armadura y escudo.
- Se aplican al cálculo: aumentos por trasfondo, habilidades y salvaciones, Alerta (+competencia a iniciativa), Duro (+2 PG por nivel), Robustez enana (+1 PG por nivel) y velocidad de elfo de los bosques.
- Resultado en tiempo real, sin modificar los datos originales.

## Limitaciones intencionadas

- **No** hay guardado ni integración con PostgreSQL.
- La asignación de características se limita a matriz estándar. Compra por puntos y tiradas, pendientes.
- Solo hay tres dotes humanas seleccionables, no el catálogo completo de dotes de origen.
- Se registran, pero no se automatizan, los conjuros de Iniciado en la Magia, Ataque salvaje, otras habilidades especiales de especies, inspiración heroica humana, tres maestrías y estilo de combate.
- No se validan todavía equipos iniciales A/B/C, inventario ni herramientas seleccionables.
- No se gestiona el estado persistido de PG y recursos, y no se reemplaza el sistema ya existente de estado.
- Al cambiar trasfondo se reinician las selecciones de competencias del Guerrero y aumentos de características para evitar elecciones incompatibles.

## Instalación

Copiar `apps`, `packages` y `docs` sobre la raíz del repositorio, manteniendo el resto de archivos. Se modifica `apps/web/src/app/page.tsx`, se amplía `apps/web/src/app/globals.css`, se añade `packages/rules-engine/src/guided.ts`, se amplía `packages/rules-engine/src/sheet.ts`, se exporta desde `index.ts` y se incorporan pruebas.

```powershell
pnpm test
pnpm build
pnpm dev
```

## Comprobaciones manuales

1. El trasfondo Soldado solo admite aumentar Fuerza, Destreza o Constitución.
2. El motor rechaza valores repetidos en la matriz estándar.
3. Humano con Duro gana +2 PG máximos por nivel.
4. Enano gana +1 PG máximos por nivel.
5. Criminal aplica Alerta a iniciativa.
6. Elfo de los bosques muestra velocidad de 35 pies.
7. Una competencia de trasfondo no se puede volver a elegir desde la clase.
8. Nivel 3 incorpora Campeón.
9. Los controles de equipo siguen recalculando CA.
10. El bloque de automatizaciones pendientes informa del alcance incompleto.
