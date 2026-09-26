<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['ok' => false, 'message' => 'Método no permitido.'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../../src/db.php';

function visitRespond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '{}', true);

if (!is_array($data)) {
    visitRespond(400, ['ok' => false, 'message' => 'Solicitud inválida.']);
}

$visitorId = trim((string)($data['visitor_id'] ?? ''));
$pagina = trim((string)($data['pagina'] ?? '/'));

// Acepta UUID/random IDs generados por el navegador, sin datos personales.
if ($visitorId === '' || strlen($visitorId) > 100 || !preg_match('/^[A-Za-z0-9._:-]+$/', $visitorId)) {
    visitRespond(422, ['ok' => false, 'message' => 'Identificador inválido.']);
}

if ($pagina === '' || strlen($pagina) > 255 || $pagina[0] !== '/') {
    $pagina = '/';
}

// Quita query string por privacidad y para agrupar correctamente la misma página.
$pagina = parse_url($pagina, PHP_URL_PATH) ?: '/';
$salt = envValue('VISIT_HASH_SALT', 'vitra-change-this-salt');
$visitorHash = hash('sha256', $visitorId . '|' . $salt);

try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare(
        'INSERT INTO visitas (visitor_hash, pagina) VALUES (:visitor_hash, :pagina)'
    );
    $stmt->execute([
        ':visitor_hash' => $visitorHash,
        ':pagina' => $pagina,
    ]);

    visitRespond(201, ['ok' => true]);
} catch (Throwable $e) {
    error_log('VITRA registrar_visita: ' . $e->getMessage());
    visitRespond(500, ['ok' => false]);
}
