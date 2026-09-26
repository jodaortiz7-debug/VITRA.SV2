<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode([
        'ok' => false,
        'message' => 'Método no permitido.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../../src/db.php';

function textLength(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
}

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$data = [];

if (str_contains(strtolower($contentType), 'application/json')) {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw ?: '{}', true);
    if (!is_array($decoded)) {
        respond(400, ['ok' => false, 'message' => 'JSON inválido.']);
    }
    $data = $decoded;
} else {
    $data = $_POST;
}

// Campo trampa opcional contra bots. Los usuarios reales no lo rellenan.
if (!empty($data['website'])) {
    respond(200, ['ok' => true, 'message' => 'Consulta recibida.']);
}

$nombre = trim((string)($data['nombre'] ?? ''));
$correo = trim((string)($data['correo'] ?? ''));
$interes = trim((string)($data['interes'] ?? ''));
$mensaje = trim((string)($data['mensaje'] ?? ''));

$interesesPermitidos = [
    'ZENITH S',
    'ZENITH D',
    'ZENITH X',
    'Información sobre VITRA',
];

$errores = [];

if (textLength($nombre) < 2 || textLength($nombre) > 100) {
    $errores['nombre'] = 'El nombre debe tener entre 2 y 100 caracteres.';
}

if ($correo !== '' && (textLength($correo) > 150 || !filter_var($correo, FILTER_VALIDATE_EMAIL))) {
    $errores['correo'] = 'Escribe un correo electrónico válido.';
}

if (!in_array($interes, $interesesPermitidos, true)) {
    $errores['interes'] = 'Selecciona una opción válida.';
}

if (textLength($mensaje) < 10 || textLength($mensaje) > 2000) {
    $errores['mensaje'] = 'El mensaje debe tener entre 10 y 2000 caracteres.';
}

if ($errores) {
    respond(422, [
        'ok' => false,
        'message' => 'Revisa los campos del formulario.',
        'errors' => $errores,
    ]);
}

try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare(
        'INSERT INTO consultas (nombre, correo, interes, mensaje)\n         VALUES (:nombre, :correo, :interes, :mensaje)'
    );

    $stmt->execute([
        ':nombre' => $nombre,
        ':correo' => $correo !== '' ? $correo : null,
        ':interes' => $interes,
        ':mensaje' => $mensaje,
    ]);

    respond(201, [
        'ok' => true,
        'message' => 'Tu consulta fue guardada correctamente.',
        'id' => (int)$pdo->lastInsertId(),
    ]);
} catch (Throwable $e) {
    error_log('VITRA guardar_consulta: ' . $e->getMessage());
    respond(500, [
        'ok' => false,
        'message' => 'No pudimos guardar tu consulta en este momento. Revisa la configuración de la base de datos.',
    ]);
}
