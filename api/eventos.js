// Configuración de GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const CSV_FILE_PATH = 'balnearios_mina_clavero.csv';
const GITHUB_API_BASE = 'https://api.github.com';

// Log para debugging (sin mostrar el token completo)
console.log('Verificando variables de entorno:');
console.log('GITHUB_TOKEN:', GITHUB_TOKEN ? `${GITHUB_TOKEN.substring(0, 10)}...` : 'NO DEFINIDO');
console.log('GITHUB_OWNER:', GITHUB_OWNER || 'NO DEFINIDO');
console.log('GITHUB_REPO:', GITHUB_REPO || 'NO DEFINIDO');

// Función para hacer peticiones a GitHub API
async function githubRequest(endpoint, method = 'GET', body = null) {
    const url = `${GITHUB_API_BASE}${endpoint}`;
    const headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Eventos-API'
    };
    
    if (body) {
        headers['Content-Type'] = 'application/json';
    }
    
    const options = {
        method,
        headers
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `GitHub API error: ${response.status}`);
    }
    
    if (response.status === 204) {
        return null;
    }
    
    return await response.json();
}

// Función para obtener el contenido del CSV desde GitHub
async function obtenerCSVDesdeGitHub() {
    try {
        const endpoint = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CSV_FILE_PATH}`;
        const file = await githubRequest(endpoint);
        
        // Decodificar contenido base64
        const content = Buffer.from(file.content, 'base64').toString('utf8');
        return { content, sha: file.sha };
    } catch (error) {
        if (error.message.includes('404')) {
            // Archivo no existe, retornar contenido vacío
            return { content: 'Provincia,Ciudad/Localidad,Latitud,Longitud,Enlace a la Noticia,tipo,fecha,hora\n', sha: null };
        }
        throw error;
    }
}

// Función para actualizar el CSV en GitHub
async function actualizarCSVEnGitHub(contenido, sha, mensaje = 'Actualizar eventos') {
    const endpoint = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CSV_FILE_PATH}`;
    
    // Codificar contenido a base64
    const content = Buffer.from(contenido, 'utf8').toString('base64');
    
    const body = {
        message: mensaje,
        content: content,
        sha: sha
    };
    
    return await githubRequest(endpoint, 'PUT', body);
}

// Función para parsear CSV (maneja campos entre comillas y saltos de línea)
function parseCSV(text) {
    const lines = [];
    let currentLine = '';
    let inQuotes = false;
    
    // Procesar el texto carácter por carácter para manejar comillas correctamente
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Comilla escapada (""), agregar una comilla
                currentLine += '"';
                i++; // Saltar la siguiente comilla
            } else {
                // Toggle del estado de comillas
                inQuotes = !inQuotes;
            }
        } else if (char === '\n' && !inQuotes) {
            // Fin de línea (fuera de comillas)
            if (currentLine.trim()) {
                lines.push(currentLine);
            }
            currentLine = '';
        } else {
            currentLine += char;
        }
    }
    
    // Agregar la última línea si existe
    if (currentLine.trim()) {
        lines.push(currentLine);
    }
    
    if (lines.length === 0) return [];
    
    // Parsear headers
    const headers = parseCSVLine(lines[0]);
    const rows = [];
    
    // Parsear cada línea de datos
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        rows.push(row);
    }
    
    return rows;
}

// Función para parsear una línea CSV individual
function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Comilla escapada
                currentValue += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Fin del campo
            values.push(currentValue.trim());
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    // Agregar el último valor
    values.push(currentValue.trim());
    
    return values;
}

// Función para escapar un campo CSV (maneja comillas y saltos de línea)
function escaparCampoCSV(campo) {
    if (campo === null || campo === undefined) {
        return '';
    }
    const str = String(campo);
    // Si el campo contiene comillas, comas o saltos de línea, necesita estar entre comillas
    // Verificar saltos de línea reales (\n) y también el string "\n"
    const tieneSaltoLinea = str.includes('\n') || str.includes('\r') || str.includes('\r\n');
    if (str.includes('"') || str.includes(',') || tieneSaltoLinea) {
        // Escapar comillas dobles duplicándolas y envolver en comillas
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// Función para convertir objeto a línea CSV
function toCSVLine(obj) {
    return [
        escaparCampoCSV(obj['Provincia'] || 'Mina Clavero'),
        escaparCampoCSV(obj['Ciudad/Localidad'] || ''),
        escaparCampoCSV(obj['Latitud'] || ''),
        escaparCampoCSV(obj['Longitud'] || ''),
        escaparCampoCSV(obj['Enlace a la Noticia'] || ''),
        escaparCampoCSV(obj['tipo'] || ''),
        escaparCampoCSV(obj['fecha'] || ''),
        escaparCampoCSV(obj['hora'] || '')
    ].join(',');
}

// Función para leer eventos desde CSV
async function leerEventos() {
    try {
        const { content } = await obtenerCSVDesdeGitHub();
        const rows = parseCSV(content);
        
        // Filtrar solo eventos
        const eventos = rows
            .filter(row => row.tipo && row.tipo.toLowerCase() === 'evento')
            .map(row => ({
                fecha: row.fecha || '',
                hora: row.hora || '',
                nombre: row['Ciudad/Localidad'] || '',
                descripcion: row['Enlace a la Noticia'] || '',
                latitud: parseFloat(row.Latitud) || 0,
                longitud: parseFloat(row.Longitud) || 0,
                enlace: row['Enlace a la Noticia'] || ''
            }));
        
        return { eventos };
    } catch (error) {
        console.error('Error leyendo eventos:', error);
        return { eventos: [] };
    }
}

// Función para reconstruir CSV correctamente desde datos parseados
function reconstruirCSV(rows, headers) {
    let csv = headers.map(h => escaparCampoCSV(h)).join(',') + '\n';
    
    rows.forEach(row => {
        const line = headers.map(header => {
            const value = row[header] || '';
            return escaparCampoCSV(value);
        }).join(',');
        csv += line + '\n';
    });
    
    return csv;
}

// Función para guardar evento en CSV
async function guardarEvento(evento) {
    try {
        // Obtener CSV actual desde GitHub
        const { content: csvContent, sha } = await obtenerCSVDesdeGitHub();
        
        // Parsear el CSV correctamente (esto maneja CSV rotos también)
        const rows = parseCSV(csvContent);
        const headers = rows.length > 0 ? Object.keys(rows[0]) : 
            ['Provincia', 'Ciudad/Localidad', 'Latitud', 'Longitud', 'Enlace a la Noticia', 'tipo', 'fecha', 'hora'];
        
        // Asegurar que los headers incluyan fecha y hora
        if (!headers.includes('fecha')) {
            headers.push('fecha');
        }
        if (!headers.includes('hora')) {
            headers.push('hora');
        }
        
        // Agregar columnas faltantes a las filas existentes
        rows.forEach(row => {
            if (!row.hasOwnProperty('fecha')) row.fecha = '';
            if (!row.hasOwnProperty('hora')) row.hora = '';
        });
        
        // Agregar nuevo evento - asegurar que la descripción se maneje correctamente
        // La descripción puede venir con saltos de línea reales del textarea HTML
        
        const nuevoEvento = {
            'Provincia': 'Mina Clavero',
            'Ciudad/Localidad': String(evento.nombre || ''),
            'Latitud': String(evento.latitud || ''),
            'Longitud': String(evento.longitud || ''),
            'Enlace a la Noticia': String(evento.descripcion || ''),
            'tipo': 'evento',
            'fecha': String(evento.fecha || ''),
            'hora': String(evento.hora || '')
        };
        
        rows.push(nuevoEvento);
        
        // Reconstruir CSV correctamente con todos los campos escapados
        // La función reconstruirCSV usará escaparCampoCSV que detectará los \n y los envolverá en comillas
        const contenidoFinal = reconstruirCSV(rows, headers);
        
        // Actualizar en GitHub
        await actualizarCSVEnGitHub(contenidoFinal, sha, `Agregar evento: ${evento.nombre}`);
        return true;
    } catch (error) {
        console.error('Error guardando evento:', error);
        return false;
    }
}

// Validar autenticación
function validarAuth(req) {
    const token = req.headers['x-admin-token'];
    return token === 'labrujula2026';
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Token');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Verificar configuración de GitHub
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        const errorDetails = {
            hasToken: !!GITHUB_TOKEN,
            owner: GITHUB_OWNER || 'NO DEFINIDO',
            repo: GITHUB_REPO || 'NO DEFINIDO'
        };
        console.error('Configuración de GitHub faltante:', errorDetails);
        
        const missingVars = [];
        if (!GITHUB_TOKEN) missingVars.push('GITHUB_TOKEN');
        if (!GITHUB_OWNER) missingVars.push('GITHUB_OWNER');
        if (!GITHUB_REPO) missingVars.push('GITHUB_REPO');
        
        return res.status(500).json({ 
            error: `Faltan variables de entorno: ${missingVars.join(', ')}. Configúralas en Vercel Settings > Environment Variables`,
            details: errorDetails
        });
    }

    // GET: obtener todos los eventos
    if (req.method === 'GET') {
        try {
            const eventos = await leerEventos();
            return res.status(200).json(eventos);
        } catch (error) {
            console.error('Error en GET:', error);
            return res.status(500).json({ error: 'Error al leer eventos: ' + error.message });
        }
    }

    // POST: agregar evento
    if (req.method === 'POST') {
        if (!validarAuth(req)) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const { fecha, hora, nombre, descripcion, latitud, longitud, enlace } = req.body;

        if (!fecha || !hora || !nombre || !descripcion || !latitud || !longitud) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const evento = { fecha, hora, nombre, descripcion, latitud, longitud, enlace };

        try {
            if (await guardarEvento(evento)) {
                return res.status(201).json({ success: true, evento });
            } else {
                return res.status(500).json({ error: 'Error al guardar el evento' });
            }
        } catch (error) {
            console.error('Error en POST:', error);
            return res.status(500).json({ error: 'Error al guardar el evento: ' + error.message });
        }
    }

    // DELETE: eliminar evento
    if (req.method === 'DELETE') {
        if (!validarAuth(req)) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const { index } = req.body;

        if (index === undefined) {
            return res.status(400).json({ error: 'Índice requerido' });
        }

        try {
            // Obtener CSV actual desde GitHub
            const { content: csvContent, sha } = await obtenerCSVDesdeGitHub();
            
            // Parsear el CSV correctamente para reconstruirlo
            const rows = parseCSV(csvContent);
            let headers = rows.length > 0 ? Object.keys(rows[0]) : 
                ['Provincia', 'Ciudad/Localidad', 'Latitud', 'Longitud', 'Enlace a la Noticia', 'tipo', 'fecha', 'hora'];
            
            // Asegurar que los headers incluyan fecha y hora
            if (!headers.includes('fecha')) {
                headers.push('fecha');
            }
            if (!headers.includes('hora')) {
                headers.push('hora');
            }
            
            // Obtener solo eventos
            const eventosRows = rows.filter(row => row.tipo && row.tipo.toLowerCase() === 'evento');
            const otrosRows = rows.filter(row => !row.tipo || row.tipo.toLowerCase() !== 'evento');
            
            if (index < 0 || index >= eventosRows.length) {
                return res.status(404).json({ error: 'Evento no encontrado' });
            }
            
            // Obtener nombre del evento antes de eliminarlo
            const nombreEvento = eventosRows[index]['Ciudad/Localidad'] || 'evento';
            
            // Eliminar el evento
            eventosRows.splice(index, 1);
            
            // Combinar todos los rows (otros primero, luego eventos)
            const todosLosRows = [...otrosRows, ...eventosRows];
            
            // Reconstruir CSV correctamente con todos los campos escapados
            const nuevoContenido = reconstruirCSV(todosLosRows, headers);

            // Actualizar en GitHub
            await actualizarCSVEnGitHub(nuevoContenido, sha, `Eliminar evento: ${nombreEvento}`);
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error eliminando evento:', error);
            return res.status(500).json({ error: 'Error al eliminar el evento: ' + error.message });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
