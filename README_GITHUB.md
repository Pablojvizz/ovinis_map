# Configuración de GitHub API para Eventos

Este proyecto usa GitHub API para modificar el archivo CSV directamente en el repositorio.

## Variables de Entorno en Vercel

Necesitas configurar las siguientes variables de entorno en Vercel:

### Variables Requeridas:

1. **GITHUB_TOKEN** o **github_key**
   - Tu token personal de GitHub
   - Ya lo tienes configurado como `github_key`

2. **GITHUB_OWNER** (opcional si usas Vercel)
   - El usuario u organización de GitHub que posee el repositorio
   - Ejemplo: `tu-usuario` o `tu-organizacion`
   - Si no se configura, Vercel intentará detectarlo automáticamente desde `VERCEL_GIT_REPO_OWNER`

3. **GITHUB_REPO** (opcional si usas Vercel)
   - El nombre del repositorio
   - Ejemplo: `ovinis_map`
   - Si no se configura, Vercel intentará detectarlo automáticamente desde `VERCEL_GIT_REPO_SLUG`

## Cómo Configurar en Vercel:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega las variables:
   - `GITHUB_OWNER`: Tu usuario de GitHub (ej: `vizzari`)
   - `GITHUB_REPO`: Nombre del repositorio (ej: `ovinis_map`)
   - `github_key`: Ya está configurado (tu token de GitHub)

## Notas:

- El token de GitHub debe tener permisos `public_repo` (si el repo es público) o `repo` (si es privado)
- Los cambios se hacen directamente en el repositorio de GitHub
- Cada modificación crea un commit automático en GitHub
- El archivo CSV se actualiza en tiempo real en el repositorio

## Desarrollo Local:

Para desarrollo local, puedes usar `server.js`:
```bash
node server.js
```

O configurar las variables de entorno localmente:
```bash
export GITHUB_TOKEN=tu_token
export GITHUB_OWNER=tu-usuario
export GITHUB_REPO=ovinis_map
```
