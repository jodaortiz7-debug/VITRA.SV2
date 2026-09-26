<?php
declare(strict_types=1);

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Robots-Tag: noindex, nofollow');

require_once __DIR__ . '/../../src/db.php';

function getBasicCredentials(): array
{
    $user = $_SERVER['PHP_AUTH_USER'] ?? null;
    $pass = $_SERVER['PHP_AUTH_PW'] ?? null;

    if ($user !== null && $pass !== null) {
        return [$user, $pass];
    }

    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (stripos($auth, 'Basic ') === 0) {
        $decoded = base64_decode(substr($auth, 6), true);
        if (is_string($decoded) && str_contains($decoded, ':')) {
            return explode(':', $decoded, 2);
        }
    }

    return ['', ''];
}

$adminUser = envValue('ADMIN_USER');
$adminPassword = envValue('ADMIN_PASSWORD');

if (!$adminUser || !$adminPassword) {
    http_response_code(503);
    exit('Configura ADMIN_USER y ADMIN_PASSWORD en las variables de entorno de Vercel.');
}

[$providedUser, $providedPassword] = getBasicCredentials();
$authorized = hash_equals($adminUser, (string)$providedUser)
    && hash_equals($adminPassword, (string)$providedPassword);

if (!$authorized) {
    header('WWW-Authenticate: Basic realm="VITRA - Estadisticas privadas", charset="UTF-8"');
    http_response_code(401);
    exit('Acceso privado.');
}

try {
    $pdo = getDatabaseConnection();

    $stats = $pdo->query(
        "SELECT
            COUNT(*) AS visitas_totales,
            COUNT(DISTINCT visitor_hash) AS visitantes_unicos,
            SUM(DATE(creado_en) = CURRENT_DATE()) AS visitas_hoy,
            COUNT(DISTINCT CASE WHEN DATE(creado_en) = CURRENT_DATE() THEN visitor_hash END) AS unicos_hoy
         FROM visitas"
    )->fetch() ?: [];

    $ultimosDias = $pdo->query(
        "SELECT DATE(creado_en) AS fecha,
                COUNT(*) AS visitas,
                COUNT(DISTINCT visitor_hash) AS unicos
         FROM visitas
         WHERE creado_en >= CURRENT_DATE() - INTERVAL 6 DAY
         GROUP BY DATE(creado_en)
         ORDER BY fecha DESC"
    )->fetchAll();

    $paginas = $pdo->query(
        "SELECT pagina,
                COUNT(*) AS visitas,
                COUNT(DISTINCT visitor_hash) AS unicos
         FROM visitas
         GROUP BY pagina
         ORDER BY visitas DESC
         LIMIT 20"
    )->fetchAll();
} catch (Throwable $e) {
    error_log('VITRA admin visitas: ' . $e->getMessage());
    http_response_code(500);
    exit('No se pudieron cargar las estadísticas. Revisa la conexión MySQL y que hayas actualizado database/vitra.sql.');
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function num(mixed $value): string
{
    return number_format((int)$value, 0, ',', '.');
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>VITRA | Estadísticas privadas</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, system-ui, Arial, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #070b14; color: #eef4ff; }
    main { width: min(1100px, calc(100% - 32px)); margin: 40px auto 70px; }
    h1 { margin-bottom: 6px; }
    .muted { color: #9fb0c7; margin-top: 0; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; margin: 28px 0; }
    .card, .panel { background: #0e1625; border: 1px solid #1c2b43; border-radius: 18px; }
    .card { padding: 20px; }
    .label { color: #9fb0c7; font-size: .88rem; }
    .value { font-size: clamp(1.8rem, 5vw, 2.7rem); font-weight: 800; margin-top: 7px; }
    .panel { padding: 20px; margin-top: 18px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 520px; }
    th, td { text-align: left; padding: 12px 10px; border-bottom: 1px solid #1c2b43; }
    th { color: #9fb0c7; font-size: .85rem; }
    tr:last-child td { border-bottom: 0; }
    a { color: #8ec5ff; }
    @media (max-width: 800px) { .cards { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px) { .cards { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
<main>
  <h1>Estadísticas privadas de VITRA</h1>
  <p class="muted">Este panel no aparece en el menú público. Los visitantes únicos se calculan por navegador, sin guardar direcciones IP.</p>

  <section class="cards">
    <article class="card"><div class="label">Visitas totales</div><div class="value"><?= num($stats['visitas_totales'] ?? 0) ?></div></article>
    <article class="card"><div class="label">Visitantes únicos</div><div class="value"><?= num($stats['visitantes_unicos'] ?? 0) ?></div></article>
    <article class="card"><div class="label">Visitas hoy</div><div class="value"><?= num($stats['visitas_hoy'] ?? 0) ?></div></article>
    <article class="card"><div class="label">Únicos hoy</div><div class="value"><?= num($stats['unicos_hoy'] ?? 0) ?></div></article>
  </section>

  <section class="panel">
    <h2>Últimos 7 días</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Visitas</th><th>Visitantes únicos</th></tr></thead>
      <tbody>
      <?php if (!$ultimosDias): ?>
        <tr><td colspan="3">Todavía no hay visitas registradas.</td></tr>
      <?php else: foreach ($ultimosDias as $dia): ?>
        <tr><td><?= e((string)$dia['fecha']) ?></td><td><?= num($dia['visitas']) ?></td><td><?= num($dia['unicos']) ?></td></tr>
      <?php endforeach; endif; ?>
      </tbody>
    </table>
  </section>

  <section class="panel">
    <h2>Páginas más visitadas</h2>
    <table>
      <thead><tr><th>Página</th><th>Visitas</th><th>Visitantes únicos</th></tr></thead>
      <tbody>
      <?php if (!$paginas): ?>
        <tr><td colspan="3">Todavía no hay visitas registradas.</td></tr>
      <?php else: foreach ($paginas as $pagina): ?>
        <tr><td><?= e((string)$pagina['pagina']) ?></td><td><?= num($pagina['visitas']) ?></td><td><?= num($pagina['unicos']) ?></td></tr>
      <?php endforeach; endif; ?>
      </tbody>
    </table>
  </section>
</main>
</body>
</html>
