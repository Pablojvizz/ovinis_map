const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const csvFile = path.join(__dirname, 'balnearios_mina_clavero.csv');

// Función para parsear CSV
function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        rows.push(row);
    }
    
    return { headers, rows };
}

// Función para leer eventos desde CSV
function leerEventos() {
    try {
        if (fs.existsSync(csvFile)) {
            const data = fs.readFileSync(csvFile, 'utf8');
            const { headers, rows } = parseCSV(data);
            
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
        }
        return { eventos: [] };
    } catch (error) {
        console.error('Error leyendo eventos:', error);
        return { eventos: [] };
    }
}

// Función para guardar evento en CSV
function guardarEvento(evento) {
    try {
        let csvContent = '';
        let headersExist = false;
        
        // Leer archivo existente si existe
        if (fs.existsSync(csvFile)) {
            csvContent = fs.readFileSync(csvFile, 'utf8').trim();
            headersExist = csvContent.includes('fecha') && csvContent.includes('hora');
        }
        
        // Si no tiene headers con fecha y hora, agregarlos
        if (!headersExist) {
            const lines = csvContent ? csvContent.split('\n') : [];
            
            if (lines.length > 0) {
                const firstLine = lines[0];
                if (firstLine.includes('Provincia') && !firstLine.includes('fecha')) {
                    lines[0] = firstLine + ',fecha,hora';
                    csvContent = lines.join('\n');
                } else if (!firstLine.includes('Provincia')) {
                    csvContent = 'Provincia,Ciudad/Localidad,Latitud,Longitud,Enlace a la Noticia,tipo,fecha,hora\n' + csvContent;
                }
            } else {
                csvContent = 'Provincia,Ciudad/Localidad,Latitud,Longitud,Enlace a la Noticia,tipo,fecha,hora';
            }
        }
        
        // Agregar nueva línea para el evento
        const nuevaLinea = [
            'Mina Clavero',
            evento.nombre,
            evento.latitud,
            evento.longitud,
            evento.descripcion,
            'evento',
            evento.fecha,
            evento.hora
        ].map(v => String(v)).join(',');
        
        csvContent += '\n' + nuevaLinea;
        
        // Guardar archivo
        fs.writeFileSync(csvFile, csvContent, 'utf8');
        return true;
    } catch (error) {
        console.error('Error guardando evento:', error);
        return false;
    }
}

// Función para eliminar evento
function eliminarEvento(index) {
    try {
        if (!fs.existsSync(csvFile)) {
            return false;
        }

        const data = fs.readFileSync(csvFile, 'utf8');
        const lines = data.trim().split('\n');
        
        if (lines.length <= 1) {
            return false;
        }

        // Separar eventos de otros registros
        const eventosLines = [];
        const otrosLines = [];
        const header = lines[0];
        
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            if (row.length >= 6) {
                const tipo = row[5] ? row[5].trim() : '';
                if (tipo.toLowerCase() === 'evento') {
                    eventosLines.push({ line: lines[i], originalIndex: i });
                } else {
                    otrosLines.push(lines[i]);
                }
            } else {
                otrosLines.push(lines[i]);
            }
        }

        if (index < 0 || index >= eventosLines.length) {
            return false;
        }

        // Eliminar el evento del índice especificado
        eventosLines.splice(index, 1);

        // Reconstruir el archivo CSV
        let nuevoContenido = header + '\n';
        
        // Agregar líneas que no son eventos
        otrosLines.forEach(line => {
            nuevoContenido += line + '\n';
        });
        
        // Agregar eventos restantes
        eventosLines.forEach(item => {
            nuevoContenido += item.line + '\n';
        });

        fs.writeFileSync(csvFile, nuevoContenido.trim() + '\n', 'utf8');
        return true;
    } catch (error) {
        console.error('Error eliminando evento:', error);
        return false;
    }
}

// Validar autenticación
function validarAuth(req) {
    const token = req.headers['x-admin-token'];
    return token === 'labrujula2026';
}

// Crear servidor
const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Token');
    res.setHeader('Content-Type', 'application/json');

    const parsedUrl = url.parse(req.url, true);
    const method = req.method;

    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // GET: obtener todos los eventos
    if (method === 'GET' && parsedUrl.pathname === '/api/eventos') {
        const eventos = leerEventos();
        res.writeHead(200);
        res.end(JSON.stringify(eventos));
        return;
    }

    // POST: agregar evento
    if (method === 'POST' && parsedUrl.pathname === '/api/eventos') {
        if (!validarAuth(req)) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'No autorizado' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                if (!data.fecha || !data.hora || !data.nombre || 
                    !data.descripcion || !data.latitud || !data.longitud) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Faltan campos requeridos' }));
                    return;
                }

                const evento = {
                    fecha: data.fecha,
                    hora: data.hora,
                    nombre: data.nombre,
                    descripcion: data.descripcion,
                    latitud: parseFloat(data.latitud),
                    longitud: parseFloat(data.longitud),
                    enlace: data.enlace || ''
                };

                if (guardarEvento(evento)) {
                    res.writeHead(201);
                    res.end(JSON.stringify({ success: true, evento }));
                } else {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: 'Error al guardar el evento' }));
                }
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Error al parsear JSON' }));
            }
        });
        return;
    }

    // DELETE: eliminar evento
    if (method === 'DELETE' && parsedUrl.pathname === '/api/eventos') {
        if (!validarAuth(req)) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'No autorizado' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                if (data.index === undefined) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Índice requerido' }));
                    return;
                }

                if (eliminarEvento(data.index)) {
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: 'Error al eliminar el evento' }));
                }
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Error al parsear JSON' }));
            }
        });
        return;
    }

    // Método no permitido
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Método no permitido' }));
});

server.listen(PORT, () => {
    console.log(`Servidor Node.js corriendo en http://localhost:${PORT}`);
    console.log('API disponible en http://localhost:' + PORT + '/api/eventos');
});
