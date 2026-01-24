<?php
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET,OPTIONS,PATCH,DELETE,POST,PUT');
header('Access-Control-Allow-Headers: X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Token');
header('Content-Type: application/json');

// Ruta del archivo de eventos
$eventosFile = dirname(__DIR__) . '/eventos.json';

// Función para leer eventos
function leerEventos() {
    global $eventosFile;
    try {
        if (file_exists($eventosFile)) {
            $data = file_get_contents($eventosFile);
            return json_decode($data, true);
        }
        return ['eventos' => []];
    } catch (Exception $error) {
        error_log('Error leyendo eventos: ' . $error->getMessage());
        return ['eventos' => []];
    }
}

// Función para guardar eventos
function guardarEventos($datos) {
    global $eventosFile;
    try {
        file_put_contents($eventosFile, json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
        return true;
    } catch (Exception $error) {
        error_log('Error guardando eventos: ' . $error->getMessage());
        return false;
    }
}

// Validar autenticación
function validarAuth() {
    $headers = getallheaders();
    $token = isset($headers['X-Admin-Token']) ? $headers['X-Admin-Token'] : '';
    return $token === 'labrujula2026';
}

// Manejo de métodos HTTP
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// GET: obtener todos los eventos
if ($method === 'GET') {
    $eventos = leerEventos();
    echo json_encode($eventos);
    exit;
}

// POST: agregar evento
if ($method === 'POST') {
    if (!validarAuth()) {
        http_response_code(401);
        echo json_encode(['error' => 'No autorizado']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['fecha']) || !isset($data['hora']) || !isset($data['nombre']) || 
        !isset($data['descripcion']) || !isset($data['latitud']) || !isset($data['longitud'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Faltan campos requeridos']);
        exit;
    }

    $evento = [
        'fecha' => $data['fecha'],
        'hora' => $data['hora'],
        'nombre' => $data['nombre'],
        'descripcion' => $data['descripcion'],
        'latitud' => (float)$data['latitud'],
        'longitud' => (float)$data['longitud'],
        'enlace' => isset($data['enlace']) ? $data['enlace'] : ''
    ];

    $datos = leerEventos();
    $datos['eventos'][] = $evento;

    if (guardarEventos($datos)) {
        http_response_code(201);
        echo json_encode(['success' => true, 'evento' => $evento]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al guardar el evento']);
    }
    exit;
}

// DELETE: eliminar evento
if ($method === 'DELETE') {
    if (!validarAuth()) {
        http_response_code(401);
        echo json_encode(['error' => 'No autorizado']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['index'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Índice requerido']);
        exit;
    }

    $index = (int)$data['index'];
    $datos = leerEventos();

    if ($index < 0 || $index >= count($datos['eventos'])) {
        http_response_code(404);
        echo json_encode(['error' => 'Evento no encontrado']);
        exit;
    }

    array_splice($datos['eventos'], $index, 1);

    if (guardarEventos($datos)) {
        http_response_code(200);
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar el evento']);
    }
    exit;
}

// Método no permitido
http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>
