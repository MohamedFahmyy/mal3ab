<?php
/**
 * Malaeb (مَلعبك) - Direct MySQL REST API Bridge
 * Compatible with Apache/LiteSpeed & Hostinger Web Hosting
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. Read Database Config from .env or default to local/hostinger
$envFile = __DIR__ . '/../../server/.env';
$dbHost = '127.0.0.1';
$dbPort = '3306';
$dbUser = 'root';
$dbPass = '';
$dbName = 'malaeb_db';

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val, " \t\n\r\0\x0B\"'");
            if ($key === 'DB_HOST') $dbHost = $val;
            if ($key === 'DB_PORT') $dbPort = $val;
            if ($key === 'DB_USER') $dbUser = $val;
            if ($key === 'DB_PASSWORD') $dbPass = $val;
            if ($key === 'DB_NAME') $dbName = $val;
        }
    }
}

// Also check local config if placed in api/config.php on server
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

// 2. Connect to MySQL via PDO
try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed',
        'details' => $e->getMessage(),
        'hint' => 'Ensure MySQL database is created and credentials in .env or api/config.php match.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Helper: normalize Egyptian phone number
function normalizePhone($phone) {
    if (!$phone) return '';
    $cleaned = preg_replace('/[^\d]/', '', (string)$phone);
    if (str_starts_with($cleaned, '20') && strlen($cleaned) === 12) {
        $cleaned = '0' . substr($cleaned, 2);
    }
    return trim($cleaned);
}

// 3. Routing
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$parsedPath = parse_url($requestUri, PHP_URL_PATH);
// Strip base subdirectories to find route starting with /api/
$path = preg_replace('#^.*?(/api/.*)$#', '$1', $parsedPath);
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];

// Helper to decode JSON fields
function decodePitch($p) {
    if (!$p) return $p;
    $p['pricePerHour'] = (float)$p['pricePerHour'];
    $p['rating'] = (float)($p['rating'] ?? 5.0);
    $p['reviewsCount'] = (int)($p['reviewsCount'] ?? 1);
    $facilities = [];
    if (!empty($p['facilities'])) {
        $facilities = is_array($p['facilities']) ? $p['facilities'] : (json_decode($p['facilities'], true) ?: []);
    }
    $p['facilities'] = $facilities;

    $slots = [];
    if (!empty($p['availableSlots'])) {
        $slots = is_array($p['availableSlots']) ? $p['availableSlots'] : (json_decode($p['availableSlots'], true) ?: []);
    }
    $p['availableSlots'] = $slots;
    return $p;
}

function decodeBooking($b) {
    if (!$b) return $b;
    $slots = [];
    if (!empty($b['timeSlots'])) {
        $slots = is_array($b['timeSlots']) ? $b['timeSlots'] : (json_decode($b['timeSlots'], true) ?: []);
    }
    $b['timeSlots'] = $slots;
    $b['hours'] = (int)($b['hours'] ?? 1);
    $b['pricePerHour'] = (float)($b['pricePerHour'] ?? 0);
    $b['totalAmount'] = (float)($b['totalAmount'] ?? 0);
    $b['discountValue'] = (float)($b['discountValue'] ?? 0);
    $b['discountAmount'] = (float)($b['discountAmount'] ?? 0);
    $b['netAmount'] = (float)($b['netAmount'] ?? $b['totalAmount']);
    $b['paidAmount'] = (float)($b['paidAmount'] ?? 0);
    $b['remainingAmount'] = (float)($b['remainingAmount'] ?? 0);
    return $b;
}

// --- ROUTES ---

// Health Check
if ($path === '/api/health' || $path === '/api/health/') {
    echo json_encode([
        'status' => 'ok',
        'service' => 'Malaeb MySQL PHP/Node Bridge',
        'database' => 'connected (MySQL)',
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/pitches
if (preg_match('#^/api/pitches/?$#', $path) && $method === 'GET') {
    $city = $_GET['city'] ?? null;
    $type = $_GET['type'] ?? null;
    $sortBy = $_GET['sortBy'] ?? null;

    $sql = "SELECT * FROM `pitches` WHERE 1=1";
    $params = [];
    if ($city) {
        $sql .= " AND (`city` = ? OR `area` = ?)";
        $params[] = $city;
        $params[] = $city;
    }
    if ($type) {
        $sql .= " AND `type` = ?";
        $params[] = $type;
    }
    if ($sortBy === 'price-asc') $sql .= " ORDER BY `pricePerHour` ASC";
    elseif ($sortBy === 'price-desc') $sql .= " ORDER BY `pricePerHour` DESC";
    else $sql .= " ORDER BY `rating` DESC, `createdAt` DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $pitches = array_map('decodePitch', $stmt->fetchAll());
    echo json_encode($pitches, JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/pitches/:id
if (preg_match('#^/api/pitches/([^/]+)/?$#', $path, $m) && $method === 'GET') {
    $stmt = $pdo->prepare("SELECT * FROM `pitches` WHERE `id` = ?");
    $stmt->execute([$m[1]]);
    $pitch = $stmt->fetch();
    if (!$pitch) {
        http_response_code(404);
        echo json_encode(['error' => 'Pitch not found'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode(decodePitch($pitch), JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/customers
if (preg_match('#^/api/customers/?$#', $path) && $method === 'GET') {
    $search = $_GET['search'] ?? null;
    $status = $_GET['status'] ?? null;
    $sql = "SELECT c.*, 
            COUNT(b.id) AS totalBookings,
            COALESCE(SUM(b.netAmount), 0) AS totalSpent,
            COALESCE(SUM(b.remainingAmount), 0) AS totalDebt,
            MAX(b.date) AS lastBookingDate
            FROM `customers` c
            LEFT JOIN `bookings` b ON c.id = b.customerId
            WHERE 1=1";
    $params = [];
    if ($search) {
        $sql .= " AND (c.name LIKE ? OR c.phone LIKE ?)";
        $params[] = "%{$search}%";
        $params[] = "%{$search}%";
    }
    if ($status && $status !== 'all') {
        $sql .= " AND c.status = ?";
        $params[] = $status;
    }
    $sql .= " GROUP BY c.id ORDER BY c.createdAt DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $customers = array_map(function($c) {
        $c['totalBookings'] = (int)$c['totalBookings'];
        $c['totalSpent'] = (float)$c['totalSpent'];
        $c['totalDebt'] = (float)$c['totalDebt'];
        return $c;
    }, $stmt->fetchAll());
    echo json_encode($customers, JSON_UNESCAPED_UNICODE);
    exit;
}

// POST /api/customers
if (preg_match('#^/api/customers/?$#', $path) && $method === 'POST') {
    $name = trim($body['name'] ?? '');
    $phone = normalizePhone($body['phone'] ?? '');
    $notes = $body['notes'] ?? '';
    $status = $body['status'] ?? 'active';

    if (!$name || !$phone) {
        http_response_code(400);
        echo json_encode(['error' => 'الاسم ورقم الهاتف مطلوبان'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id FROM `customers` WHERE `phone` = ?");
    $stmt->execute([$phone]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'رقم الهاتف مسجل بالفعل لعميل آخر'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $id = 'cust-' . round(microtime(true) * 1000);
    $stmt = $pdo->prepare("INSERT INTO `customers` (id, name, phone, notes, status) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$id, $name, $phone, $notes, $status]);

    $stmt = $pdo->prepare("SELECT * FROM `customers` WHERE id = ?");
    $stmt->execute([$id]);
    $newCust = $stmt->fetch();
    $newCust['totalBookings'] = 0;
    $newCust['totalSpent'] = 0;
    $newCust['totalDebt'] = 0;
    http_response_code(201);
    echo json_encode($newCust, JSON_UNESCAPED_UNICODE);
    exit;
}

// PUT /api/customers/:id
if (preg_match('#^/api/customers/([^/]+)/?$#', $path, $m) && $method === 'PUT') {
    $id = $m[1];
    $stmt = $pdo->prepare("SELECT * FROM `customers` WHERE id = ?");
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['error' => 'العميل غير موجود'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $name = trim($body['name'] ?? $existing['name']);
    $phone = isset($body['phone']) ? normalizePhone($body['phone']) : $existing['phone'];
    $notes = $body['notes'] ?? $existing['notes'];
    $status = $body['status'] ?? $existing['status'];

    if ($phone !== $existing['phone']) {
        $stmt = $pdo->prepare("SELECT id FROM `customers` WHERE phone = ? AND id != ?");
        $stmt->execute([$phone, $id]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'رقم الهاتف مستخدم لعميل آخر'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $stmt = $pdo->prepare("UPDATE `customers` SET name = ?, phone = ?, notes = ?, status = ? WHERE id = ?");
    $stmt->execute([$name, $phone, $notes, $status, $id]);

    $stmt = $pdo->prepare("SELECT * FROM `customers` WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode($stmt->fetch(), JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/bookings
if (preg_match('#^/api/bookings/?$#', $path) && $method === 'GET') {
    $pitchId = $_GET['pitchId'] ?? null;
    $date = $_GET['date'] ?? null;
    $customerId = $_GET['customerId'] ?? null;
    $status = $_GET['status'] ?? null;

    $sql = "SELECT * FROM `bookings` WHERE 1=1";
    $params = [];
    if ($pitchId) { $sql .= " AND `pitchId` = ?"; $params[] = $pitchId; }
    if ($date) { $sql .= " AND `date` = ?"; $params[] = $date; }
    if ($customerId) { $sql .= " AND `customerId` = ?"; $params[] = $customerId; }
    if ($status) { $sql .= " AND `status` = ?"; $params[] = $status; }
    $sql .= " ORDER BY `date` DESC, `createdAt` DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $bookings = array_map('decodeBooking', $stmt->fetchAll());
    echo json_encode($bookings, JSON_UNESCAPED_UNICODE);
    exit;
}

// POST /api/bookings
if (preg_match('#^/api/bookings/?$#', $path) && $method === 'POST') {
    $pitchId = $body['pitchId'] ?? null;
    $customerName = trim($body['customerName'] ?? '');
    $customerPhone = normalizePhone($body['customerPhone'] ?? '');
    $date = $body['date'] ?? null;
    $timeSlots = $body['timeSlots'] ?? [];

    if (!$pitchId || !$customerName || !$customerPhone || !$date || empty($timeSlots)) {
        http_response_code(400);
        echo json_encode(['error' => 'جميع بيانات الحجز الأساسية مطلوبة'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Verify pitch
    $stmt = $pdo->prepare("SELECT * FROM `pitches` WHERE id = ?");
    $stmt->execute([$pitchId]);
    $pitch = $stmt->fetch();
    if (!$pitch) {
        http_response_code(404);
        echo json_encode(['error' => 'الملعب المحدد غير موجود'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Customer CRM auto-linking
    $stmt = $pdo->prepare("SELECT id FROM `customers` WHERE phone = ?");
    $stmt->execute([$customerPhone]);
    $customer = $stmt->fetch();
    if ($customer) {
        $customerId = $customer['id'];
    } else {
        $customerId = 'cust-' . round(microtime(true) * 1000);
        $stmt = $pdo->prepare("INSERT INTO `customers` (id, name, phone, notes, status) VALUES (?, ?, ?, '', 'active')");
        $stmt->execute([$customerId, $customerName, $customerPhone]);
    }

    $hours = count($timeSlots);
    $pricePerHour = (float)$pitch['pricePerHour'];
    $totalAmount = $pricePerHour * $hours;

    // Discounts
    $discountType = $body['discountType'] ?? 'none';
    $discountValue = (float)($body['discountValue'] ?? 0);
    $discountNotes = $body['discountNotes'] ?? '';
    $discountAmount = 0;
    if ($discountType === 'percentage' && $discountValue > 0) {
        $discountAmount = ($totalAmount * min(100, $discountValue)) / 100;
    } elseif ($discountType === 'fixed' && $discountValue > 0) {
        $discountAmount = min($totalAmount, $discountValue);
    }
    $netAmount = max(0, $totalAmount - $discountAmount);

    // Payments
    $paidAmount = (float)($body['paidAmount'] ?? 0);
    $paidAmount = min($netAmount, max(0, $paidAmount));
    $remainingAmount = max(0, $netAmount - $paidAmount);
    $paymentStatus = ($paidAmount >= $netAmount && $netAmount > 0) ? 'paid' : (($paidAmount > 0) ? 'partial' : 'unpaid');
    $paymentMethod = $body['paymentMethod'] ?? 'cash';

    $bookingId = 'b-' . round(microtime(true) * 1000);
    $stmt = $pdo->prepare("INSERT INTO `bookings` (
        id, pitchId, pitchName, pitchArea, customerId, customerName, customerPhone,
        date, timeSlots, hours, pricePerHour, totalAmount, discountType, discountValue,
        discountAmount, discountNotes, netAmount, paidAmount, remainingAmount,
        paymentStatus, paymentMethod, notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $bookingId, $pitchId, $pitch['nameAr'] ?? $pitch['name'], $pitch['area'],
        $customerId, $customerName, $customerPhone, $date, json_encode($timeSlots, JSON_UNESCAPED_UNICODE),
        $hours, $pricePerHour, $totalAmount, $discountType, $discountValue, $discountAmount,
        $discountNotes, $netAmount, $paidAmount, $remainingAmount, $paymentStatus,
        $paymentMethod, $body['notes'] ?? '', 'confirmed'
    ]);

    // Record initial payment ledger entry if paidAmount > 0
    if ($paidAmount > 0) {
        $payId = 'pay-' . round(microtime(true) * 1000);
        $stmt = $pdo->prepare("INSERT INTO `payments` (
            id, bookingId, customerId, customerName, customerPhone, amount, paymentMethod, type, notes, createdBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'initial', ?, 'مدير النظام')");
        $stmt->execute([
            $payId, $bookingId, $customerId, $customerName, $customerPhone,
            $paidAmount, $paymentMethod, $body['paymentNotes'] ?? 'دفعة أولى عند الحجز'
        ]);
    }

    $stmt = $pdo->prepare("SELECT * FROM `bookings` WHERE id = ?");
    $stmt->execute([$bookingId]);
    http_response_code(201);
    echo json_encode(decodeBooking($stmt->fetch()), JSON_UNESCAPED_UNICODE);
    exit;
}

// POST /api/bookings/:id/payments
if (preg_match('#^/api/bookings/([^/]+)/payments/?$#', $path, $m) && $method === 'POST') {
    $bookingId = $m[1];
    $stmt = $pdo->prepare("SELECT * FROM `bookings` WHERE id = ?");
    $stmt->execute([$bookingId]);
    $booking = $stmt->fetch();
    if (!$booking) {
        http_response_code(404);
        echo json_encode(['error' => 'الحجز غير موجود'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $amount = (float)($body['amount'] ?? 0);
    $paymentMethod = $body['paymentMethod'] ?? 'cash';
    $notes = $body['notes'] ?? '';
    $createdBy = $body['createdBy'] ?? 'مدير النظام';

    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'يجب إدخال مبلغ دفع صالح أكبر من الصفر'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $currentRemaining = (float)$booking['remainingAmount'];
    if ($amount > $currentRemaining) {
        http_response_code(400);
        echo json_encode(['error' => "المبلغ المدخل ({$amount} ج.م) أكبر من المبلغ المتبقي ({$currentRemaining} ج.م)"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $newPaidAmount = (float)$booking['paidAmount'] + $amount;
    $newRemainingAmount = max(0, (float)$booking['netAmount'] - $newPaidAmount);
    $newPaymentStatus = ($newRemainingAmount <= 0) ? 'paid' : 'partial';

    // Update booking
    $stmt = $pdo->prepare("UPDATE `bookings` SET paidAmount = ?, remainingAmount = ?, paymentStatus = ? WHERE id = ?");
    $stmt->execute([$newPaidAmount, $newRemainingAmount, $newPaymentStatus, $bookingId]);

    // Insert payment
    $paymentId = 'pay-' . round(microtime(true) * 1000);
    $stmt = $pdo->prepare("INSERT INTO `payments` (
        id, bookingId, customerId, customerName, customerPhone, amount, paymentMethod, type, notes, createdBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'payment', ?, ?)");
    $stmt->execute([
        $paymentId, $bookingId, $booking['customerId'], $booking['customerName'],
        $booking['customerPhone'], $amount, $paymentMethod, $notes, $createdBy
    ]);

    $stmt = $pdo->prepare("SELECT * FROM `bookings` WHERE id = ?");
    $stmt->execute([$bookingId]);
    $updatedBooking = decodeBooking($stmt->fetch());

    $stmt = $pdo->prepare("SELECT * FROM `payments` WHERE id = ?");
    $stmt->execute([$paymentId]);
    $paymentRecord = $stmt->fetch();

    echo json_encode([
        'success' => true,
        'booking' => $updatedBooking,
        'payment' => $paymentRecord
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/payments
if (preg_match('#^/api/payments/?$#', $path) && $method === 'GET') {
    $bookingId = $_GET['bookingId'] ?? null;
    $customerId = $_GET['customerId'] ?? null;
    $sql = "SELECT * FROM `payments` WHERE 1=1";
    $params = [];
    if ($bookingId) { $sql .= " AND `bookingId` = ?"; $params[] = $bookingId; }
    if ($customerId) { $sql .= " AND `customerId` = ?"; $params[] = $customerId; }
    $sql .= " ORDER BY `createdAt` DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $payments = array_map(function($p) {
        $p['amount'] = (float)$p['amount'];
        return $p;
    }, $stmt->fetchAll());
    echo json_encode($payments, JSON_UNESCAPED_UNICODE);
    exit;
}

// Fallback: 404
http_response_code(404);
echo json_encode(['error' => 'API endpoint not found', 'path' => $path], JSON_UNESCAPED_UNICODE);
