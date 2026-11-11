# Corrección del paso 27: selección automática de Ataque adicional

## Causa

El motor ya podía registrar dos golpes de la acción Atacar de un Guerrero de nivel 5, pero el panel mantenía la selección «Acción Atacar» tras registrar el primero. La segunda confirmación intentaba gastar una **segunda acción**, que normalmente no existe.

## Solución

- El panel recomienda automáticamente **Ataque adicional de nivel 5** una vez registrado el primer ataque de esa acción.
- La selección se recalcula después de registrar un golpe, cambiar de turno o cambiar de arma. También se puede seleccionar manualmente otra modalidad para situaciones como Acción súbita, Mella o Tajo.
- Una nota muestra **1 de 2 ataques** y aclara que disponer de **0 acciones restantes** es correcto tras gastar la acción Atacar: el segundo golpe pertenece a la misma acción.
- Los cálculos ya preparados quedan invalidados cuando cambia la modalidad o el estado del turno, para no confirmar un ataque con un modo obsoleto.
- El motor sigue impidiendo un tercer ataque de la misma acción.
- Se añaden dos casos de regresión para las modalidades sugeridas y el comienzo del turno siguiente.

## Instalar

Copia las carpetas `apps`, `packages` y `docs` del ZIP sobre las del proyecto, **sin eliminar los archivos existentes**. Después, desde la raíz:

```powershell
pnpm test
pnpm build
pnpm dev
```

Se mantiene el comando de Vitest compatible con la versión 5 (`--maxWorkers=2`), sin `--minWorkers`. No cambia el formato del guardado ni requiere migraciones Prisma.

## Comprobación manual

1. Carga un Guerrero nivel 5, inicia un turno y realiza el primer ataque.
2. En «Tu turno de combate», acciones disponibles = 0 y ataques de la acción Atacar = 1.
3. En «Ataques con armas», el desplegable debe seleccionar automáticamente «Ataque adicional de nivel 5».
4. Calcula y confirma el segundo ataque: acciones disponibles = 0; ataques de la acción = 2.
5. Un tercer ataque debe quedar bloqueado al intentar gastar otra acción, salvo que exista otra acción disponible legalmente.
6. Termina el turno e inicia uno nuevo: el desplegable vuelve a «Acción Atacar».

## Limitación conocida

El registro sigue siendo manual; no interpreta enemigos ni tiradas por sí solo. El gestor de Ataque adicional continúa limitado a los niveles 1–5 implementados.
