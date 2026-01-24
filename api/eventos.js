const fs = require('fs');
const path = require('path');

// Ruta del archivo de eventos
const eventosFile = path.join(process.cwd(), 'eventos.json');

// Función para leer eventos
function leerEventos() {
    try {
        if (fs.existsSync(eventosFile)) {
            const data = fs.readFileSync(eventosFile, 'utf8');
            return JSON.parse(data);
        }
        return { eventos: [] };
    } catch (error) {
        console.error('Error leyendo eventos:', error);
        return { eventos: [] };
    }
}

// Función para guardar eventos
function guardarEventos(datos) {
    try {
        fs.writeFileSync(eventosFile, JSON.stringify(datos, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error guardando eventos:', error);
        return false;
    }
}

// Validar autenticación
function validarAuth(req) {
    const token = req.headers['x-admin-token'];
    return token === 'labrujula2026';
}

export default function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Token');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // GET: obtener todos los eventos
    if (req.method === 'GET') {
        const eventos = leerEventos();
        return res.status(200).json(eventos);
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
        const datos = leerEventos();
        datos.eventos.push(evento);

        if (guardarEventos(datos)) {
            return res.status(201).json({ success: true, evento });
        } else {
            return res.status(500).json({ error: 'Error al guardar el evento' });
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

        const datos = leerEventos();
        if (index < 0 || index >= datos.eventos.length) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }

        datos.eventos.splice(index, 1);

        if (guardarEventos(datos)) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(500).json({ error: 'Error al eliminar el evento' });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
