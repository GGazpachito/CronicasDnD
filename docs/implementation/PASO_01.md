# Implementación 01 — Núcleo matemático del motor

## Instalación

Esta actualización sustituye `packages/rules-engine/src/index.ts`, añade `abilities.ts`, `proficiencies.ts` y `tests/core.test.ts`. Conservar los demás archivos.

En la raíz del repositorio:

```powershell
pnpm install
pnpm test
pnpm build
```

Comprobar que todas las pruebas pasan y que la web sigue compilando. Los resultados de pruebas tienen que ejecutarse en el equipo local; este paquete se preparó sin instalar dependencias del proyecto.

## Funcionalidades

- Seis características con puntuación válida de 1 a 30 y cálculo de modificadores.
- Competencia de personaje entre nivel 1 y 20.
- Las 18 habilidades con característica habitual y posibilidad de sustituirla cuando el DM lo indique.
- Competencias y pericia en habilidades sin duplicar fuentes.
- Salvaciones con competencias.
- Validación básica en tiempo de ejecución de las seis características.

## Fuera de este paso

No se han implementado aún esquemas Zod generales, efectos, condiciones, cálculos de CA/PG, clases, bases de datos, ni la interfaz de creación. `Ruleset` se limita a marcar edición y aún no selecciona progresiones.

## Próxima implementación

Introducir Zod y definiciones discriminadas para `Effect`, `Condition` y `CharacterInput`, con validadores de límites y pruebas. Después construir el evaluador de efectos sin ejecutar código de usuarios.
