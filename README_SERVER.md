# Servidor Node.js para Eventos

Este servidor permite modificar el archivo CSV directamente desde el navegador.

## Instalación

1. Asegúrate de tener Node.js instalado (versión 14 o superior)
   - Descarga desde: https://nodejs.org/

## Uso

1. Abre una terminal en la carpeta del proyecto
2. Ejecuta el servidor:
   ```
   node server.js
   ```

3. Verás un mensaje indicando que el servidor está corriendo:
   ```
   Servidor Node.js corriendo en http://localhost:3000
   API disponible en http://localhost:3000/api/eventos
   ```

4. Mantén esta terminal abierta mientras uses admin.html

5. Abre admin.html en tu navegador y podrás agregar/eliminar eventos directamente

## Notas

- El servidor debe estar corriendo para que admin.html funcione
- El servidor modifica directamente el archivo `balnearios_mina_clavero.csv`
- No necesitas reiniciar el servidor después de cada cambio
- Para detener el servidor, presiona `Ctrl+C` en la terminal
