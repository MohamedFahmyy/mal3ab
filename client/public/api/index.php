<?php
/**
 * Malaeb (مَلعبك) - Direct PHP/MySQL & SQLite Universal REST API Bridge
 * Compatible with Apache/LiteSpeed, Hostinger Web Hosting & Laragon
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ----------------------------------------------------
// 1. Database Connection (MySQL with SQLite Auto-Fallback)
// ----------------------------------------------------
$dbHost = '127.0.0.1';
$dbPort = '3306';
$dbUser = 'root';
$dbPass = '';
$dbName = 'malaeb_db';

// Try loading environment files from known locations
$possibleEnvs = [
    __DIR__ . '/config.php',
    __DIR__ . '/.env',
    __DIR__ . '/../../server/.env',
    __DIR__ . '/../.env',
    dirname(__DIR__, 2) . '/server/.env'
];

foreach ($possibleEnvs as $env) {
    if (file_exists($env)) {
        if (substr($env, -4) === '.php') {
            require_once $env;
        } else {
            $lines = @file($env, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || $line[0] === '#') continue;
                if (strpos($line, '=') !== false) {
                    list($k, $v) = explode('=', $line, 2);
                    $k = trim($k);
                    $v = trim($v, " \t\n\r\0\x0B\"'");
                    if ($k === 'DB_HOST') $dbHost = $v;
                    if ($k === 'DB_PORT') $dbPort = $v;
                    if ($k === 'DB_USER') $dbUser = $v;
                    if ($k === 'DB_PASSWORD') $dbPass = $v;
                    if ($k === 'DB_NAME') $dbName = $v;
                }
            }
        }
    }
}

$pdo = null;
$dbDriver = 'mysql';

// Attempt MySQL connection
try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);
} catch (PDOException $e) {
    // Graceful fallback to SQLite so the website NEVER goes down or shows 0 pitches
    try {
        $sqlitePath = __DIR__ . '/malaeb_local.sqlite';
        $pdo = new PDO("sqlite:{$sqlitePath}", null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        $dbDriver = 'sqlite';
    } catch (Exception $sqle) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'تعذر الاتصال بقاعدة البيانات',
            'mysql_error' => $e->getMessage(),
            'sqlite_error' => $sqle->getMessage()
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ----------------------------------------------------
// 2. Schema Auto-Initialization & Default Seeding
// ----------------------------------------------------
function initSchemaAndSeed($pdo, $driver) {
    $isSqlite = ($driver === 'sqlite');

    $sqlPitches = $isSqlite ? "
        CREATE TABLE IF NOT EXISTS pitches (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            nameAr TEXT NOT NULL,
            area TEXT NOT NULL,
            city TEXT NOT NULL,
            type TEXT NOT NULL,
            pricePerHour REAL NOT NULL,
            rating REAL DEFAULT 5.0,
            reviewsCount INTEGER DEFAULT 1,
            image TEXT,
            address TEXT,
            surface TEXT,
            facilities TEXT,
            description TEXT,
            ownerPhone TEXT,
            availableSlots TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
    " : "
        CREATE TABLE IF NOT EXISTS `pitches` (
            `id` VARCHAR(50) PRIMARY KEY,
            `name` VARCHAR(255) NOT NULL,
            `nameAr` VARCHAR(255) NOT NULL,
            `area` VARCHAR(100) NOT NULL,
            `city` VARCHAR(100) NOT NULL,
            `type` VARCHAR(50) NOT NULL,
            `pricePerHour` DECIMAL(10, 2) NOT NULL,
            `rating` DECIMAL(3, 2) DEFAULT 5.00,
            `reviewsCount` INT DEFAULT 1,
            `image` TEXT,
            `address` TEXT,
            `surface` VARCHAR(100),
            `facilities` JSON,
            `description` TEXT,
            `ownerPhone` VARCHAR(50),
            `availableSlots` JSON,
            `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $sqlCustomers = $isSqlite ? "
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT NOT NULL UNIQUE,
            notes TEXT,
            status TEXT DEFAULT 'active',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
    " : "
        CREATE TABLE IF NOT EXISTS `customers` (
            `id` VARCHAR(50) PRIMARY KEY,
            `name` VARCHAR(255) NOT NULL,
            `phone` VARCHAR(50) NOT NULL UNIQUE,
            `notes` TEXT,
            `status` ENUM('active', 'inactive', 'vip') DEFAULT 'active',
            `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $sqlBookings = $isSqlite ? "
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            pitchId TEXT NOT NULL,
            pitchName TEXT,
            pitchArea TEXT,
            customerId TEXT,
            customerName TEXT NOT NULL,
            customerPhone TEXT NOT NULL,
            date TEXT NOT NULL,
            timeSlots TEXT NOT NULL,
            hours INTEGER NOT NULL,
            pricePerHour REAL NOT NULL,
            totalAmount REAL NOT NULL,
            discountType TEXT DEFAULT 'none',
            discountValue REAL DEFAULT 0,
            discountAmount REAL DEFAULT 0,
            discountNotes TEXT,
            netAmount REAL NOT NULL,
            paidAmount REAL DEFAULT 0,
            remainingAmount REAL NOT NULL,
            paymentStatus TEXT DEFAULT 'unpaid',
            paymentMethod TEXT DEFAULT 'cash',
            notes TEXT,
            status TEXT DEFAULT 'confirmed',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
    " : "
        CREATE TABLE IF NOT EXISTS `bookings` (
            `id` VARCHAR(50) PRIMARY KEY,
            `pitchId` VARCHAR(50) NOT NULL,
            `pitchName` VARCHAR(255),
            `pitchArea` VARCHAR(100),
            `customerId` VARCHAR(50),
            `customerName` VARCHAR(255) NOT NULL,
            `customerPhone` VARCHAR(50) NOT NULL,
            `date` DATE NOT NULL,
            `timeSlots` JSON NOT NULL,
            `hours` INT NOT NULL,
            `pricePerHour` DECIMAL(10, 2) NOT NULL,
            `totalAmount` DECIMAL(10, 2) NOT NULL,
            `discountType` VARCHAR(20) DEFAULT 'none',
            `discountValue` DECIMAL(10, 2) DEFAULT 0,
            `discountAmount` DECIMAL(10, 2) DEFAULT 0,
            `discountNotes` TEXT,
            `netAmount` DECIMAL(10, 2) NOT NULL,
            `paidAmount` DECIMAL(10, 2) DEFAULT 0,
            `remainingAmount` DECIMAL(10, 2) NOT NULL,
            `paymentStatus` ENUM('paid', 'partial', 'unpaid') DEFAULT 'unpaid',
            `paymentMethod` VARCHAR(50) DEFAULT 'cash',
            `notes` TEXT,
            `status` VARCHAR(20) DEFAULT 'confirmed',
            `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $sqlPayments = $isSqlite ? "
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            bookingId TEXT NOT NULL,
            customerId TEXT,
            customerName TEXT,
            customerPhone TEXT,
            amount REAL NOT NULL,
            paymentMethod TEXT DEFAULT 'cash',
            type TEXT DEFAULT 'payment',
            notes TEXT,
            createdBy TEXT DEFAULT 'مدير النظام',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
    " : "
        CREATE TABLE IF NOT EXISTS `payments` (
            `id` VARCHAR(50) PRIMARY KEY,
            `bookingId` VARCHAR(50) NOT NULL,
            `customerId` VARCHAR(50),
            `customerName` VARCHAR(255),
            `customerPhone` VARCHAR(50),
            `amount` DECIMAL(10, 2) NOT NULL,
            `paymentMethod` VARCHAR(50) DEFAULT 'cash',
            `type` VARCHAR(20) DEFAULT 'payment',
            `notes` TEXT,
            `createdBy` VARCHAR(100) DEFAULT 'مدير النظام',
            `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($sqlPitches);
    $pdo->exec($sqlCustomers);
    $pdo->exec($sqlBookings);
    $pdo->exec($sqlPayments);

    // Auto Seed default pitches if empty
    $count = $pdo->query("SELECT COUNT(*) FROM pitches")->fetchColumn();
    if ($count == 0) {
        $defaultPitches = [
            [
                'id' => 'pitch-1',
                'name' => 'Prime Football Arena',
                'nameAr' => 'برايم فوت بول أرينا',
                'area' => 'مدينة نصر',
                'city' => 'القاهرة',
                'type' => 'ملعب خماسي',
                'pricePerHour' => 250,
                'rating' => 4.9,
                'reviewsCount' => 128,
                'image' => 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1000&q=80',
                'address' => 'شارع الطيران - بجوار النادي الأهلي، مدينة نصر',
                'surface' => 'نجيل صناعي معتمد FIFA',
                'facilities' => json_encode(['إضاءة كشافات LED', 'غرف تغيير ملابس وشاور', 'كافيه ومشروبات', 'موقف سيارات مجاني'], JSON_UNESCAPED_UNICODE),
                'description' => 'ملعب خماسي مجهز بأحدث أرضيات النجيل الصناعي التركي مع كشافات إضاءة قوية ورؤية واضحة في اللعب الليلي.',
                'ownerPhone' => '01012345678',
                'availableSlots' => json_encode(['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00'])
            ],
            [
                'id' => 'pitch-2',
                'name' => 'Champions Stadium',
                'nameAr' => 'ستاد الأبطال',
                'area' => 'التجمع الخامس',
                'city' => 'القاهرة الجديده',
                'type' => 'ملعب سباعي',
                'pricePerHour' => 350,
                'rating' => 4.8,
                'reviewsCount' => 96,
                'image' => 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1000&q=80',
                'address' => 'شارع التسعين الجنوبي - خلف الأنابلس، التجمع الخامس',
                'surface' => 'نجيل صناعي درجة أولى',
                'facilities' => json_encode(['إضاءة ليلية احترافية', 'غرف ملابس مكيفة', 'شاشة عرض المباريات', 'كرة رسمية هدية مع كل حجز'], JSON_UNESCAPED_UNICODE),
                'description' => 'ملعب سباعي واسع ومناسب للمباريات القوية والبطولات الودية مع خدمات ضيافة متكاملة.',
                'ownerPhone' => '01198765432',
                'availableSlots' => json_encode(['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'])
            ],
            [
                'id' => 'pitch-3',
                'name' => 'Goal Arena October',
                'nameAr' => 'جول أرينا أكتوبر',
                'area' => '6 أكتوبر',
                'city' => 'الجيزة',
                'type' => 'ملعب خماسي',
                'pricePerHour' => 220,
                'rating' => 4.7,
                'reviewsCount' => 84,
                'image' => 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80',
                'address' => 'الحي المتميز - بالقرب من جامعة مصر للعلوم والتكنولوجيا',
                'surface' => 'نجيل صناعي فاخر',
                'facilities' => json_encode(['إضاءة ليلية', 'مكان انتظار سيارات', 'شاور ساخن', 'مشروبات باردة وسريعة'], JSON_UNESCAPED_UNICODE),
                'description' => 'أفضل سعر خماسي في أكتوبر مع صيانة دورية للنجيل وكرات نايكي معتمدة.',
                'ownerPhone' => '01234567890',
                'availableSlots' => json_encode(['17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'])
            ],
            [
                'id' => 'pitch-4',
                'name' => 'El-Maadi Sports Park',
                'nameAr' => 'سبورتس بارك المعادي',
                'area' => 'المعادي',
                'city' => 'القاهرة',
                'type' => 'ملعب قانوني',
                'pricePerHour' => 550,
                'rating' => 4.95,
                'reviewsCount' => 150,
                'image' => 'https://images.unsplash.com/photo-1459865264668-b258efc4783d?auto=format&fit=crop&w=1000&q=80',
                'address' => 'شارع النصر - المعادي الجديدة',
                'surface' => 'نجيل طبيعي ممتازة',
                'facilities' => json_encode(['مدرجات جماهيرية', 'غرف حكام وفريقين', 'تصوير فيديو للماتش', 'منطقة كافيهات'], JSON_UNESCAPED_UNICODE),
                'description' => 'ملعب 11 ضد 11 قانوني بنجيل طبيعي هائل، مناسب جداً للمباريات الرسمية والأكاديميات.',
                'ownerPhone' => '01055544332',
                'availableSlots' => json_encode(['14:00', '16:00', '18:00', '20:00', '22:00'])
            ],
            [
                'id' => 'pitch-5',
                'name' => 'Pyramids View Pitch',
                'nameAr' => 'ملعب إطلالة الأهرامات',
                'area' => 'الهرم',
                'city' => 'الجيزة',
                'type' => 'ملعب خماسي',
                'pricePerHour' => 200,
                'rating' => 4.6,
                'reviewsCount' => 65,
                'image' => 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=80',
                'address' => 'شارع الهرم الرئيسي - بالقرب من محطة مشعل',
                'surface' => 'نجيل صناعي high density',
                'facilities' => json_encode(['إضاءة ليلية', 'أماكن جلوس للمشاهدين', 'غرف ملابس'], JSON_UNESCAPED_UNICODE),
                'description' => 'أجواء حماسية ولعب ممتع في قلب الهرم بأسعار مناسبة لجميع الشباب.',
                'ownerPhone' => '01122334455',
                'availableSlots' => json_encode(['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'])
            ],
            [
                'id' => 'pitch-6',
                'name' => 'Zayed Star Complex',
                'nameAr' => 'مجمع نجم زايد',
                'area' => 'الشيخ زايد',
                'city' => 'الجيزة',
                'type' => 'ملعب سباعي',
                'pricePerHour' => 400,
                'rating' => 4.9,
                'reviewsCount' => 110,
                'image' => 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1000&q=80',
                'address' => 'المحور المركزي - الشيخ زايد - أركان بلازا بجوارنا',
                'surface' => 'نجيل هجين Hybrid Turf',
                'facilities' => json_encode(['كشافات LED متطورة', 'غرف تبديل ملابسVIP', 'بلايستيشن كورنر', 'موقف واسع'], JSON_UNESCAPED_UNICODE),
                'description' => 'تجربة كروية فخمة في الشيخ زايد مع أفضل جودة أرضيات وخدمات استقبال VIP.',
                'ownerPhone' => '01099887766',
                'availableSlots' => json_encode(['17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00'])
            ],
            [
                'id' => 'pitch-7',
                'name' => 'Smouha Green Field',
                'nameAr' => 'سموحة الجرين فيلد',
                'area' => 'سموحة',
                'city' => 'الإسكندرية',
                'type' => 'ملعب خماسي',
                'pricePerHour' => 280,
                'rating' => 4.85,
                'reviewsCount' => 92,
                'image' => 'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=1000&q=80',
                'address' => 'شارع فوزي معاذ - سموحة، الإسكندرية',
                'surface' => 'نجيل صناعي مستورد',
                'facilities' => json_encode(['إضاءة ليلية ممتاز', 'غرف دُش', 'كافيه عصائر طبيعية', 'أمان وحراسة 24 ساعة'], JSON_UNESCAPED_UNICODE),
                'description' => 'أرقى ملاعب الإسكندرية الخماسية بخدمة ممتازة وأجواء كروية ساحلية رائعة.',
                'ownerPhone' => '01211223344',
                'availableSlots' => json_encode(['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'])
            ]
        ];

        $ins = $pdo->prepare("INSERT INTO pitches (id, name, nameAr, area, city, type, pricePerHour, rating, reviewsCount, image, address, surface, facilities, description, ownerPhone, availableSlots) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        foreach ($defaultPitches as $p) {
            $ins->execute([
                $p['id'], $p['name'], $p['nameAr'], $p['area'], $p['city'], $p['type'],
                $p['pricePerHour'], $p['rating'], $p['reviewsCount'], $p['image'],
                $p['address'], $p['surface'], $p['facilities'], $p['description'],
                $p['ownerPhone'], $p['availableSlots']
            ]);
        }
    }
}

initSchemaAndSeed($pdo, $dbDriver);

// ----------------------------------------------------
// 3. Routing & Helpers
// ----------------------------------------------------
function normalizePhone($phone) {
    if (!$phone) return '';
    $cleaned = preg_replace('/[^\d]/', '', (string)$phone);
    if (str_starts_with($cleaned, '20') && strlen($cleaned) === 12) {
        $cleaned = '0' . substr($cleaned, 2);
    }
    return trim($cleaned);
}

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

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$parsedPath = parse_url($requestUri, PHP_URL_PATH);
// Robust path extraction for /api/*
$path = preg_replace('#^.*?(/api(?:/.*)?)$#', '$1', $parsedPath);
$path = rtrim($path, '/');
if ($path === '' || $path === '/api') $path = '/api';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = json_decode(file_get_contents('php://input'), true) ?? [];

// ----------------------------------------------------
// 4. API Endpoints
// ----------------------------------------------------

// GET /api/health
if ($path === '/api/health' || $path === '/api') {
    echo json_encode([
        'success' => true,
        'status' => 'ok',
        'service' => 'Malaeb Universal API Bridge',
        'database' => "connected ({$dbDriver})",
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/pitches
if ($path === '/api/pitches' && $method === 'GET') {
    $area = $_GET['area'] ?? ($_GET['city'] ?? null);
    $type = $_GET['type'] ?? null;
    $search = $_GET['search'] ?? null;
    $maxPrice = $_GET['maxPrice'] ?? null;
    $sortBy = $_GET['sortBy'] ?? null;

    $sql = "SELECT * FROM pitches WHERE 1=1";
    $params = [];

    if ($area && $area !== 'الكل' && $area !== 'all') {
        $sql .= " AND (area = ? OR city = ?)";
        $params[] = $area;
        $params[] = $area;
    }
    if ($type && $type !== 'الكل' && $type !== 'all') {
        $sql .= " AND type = ?";
        $params[] = $type;
    }
    if ($search) {
        $sql .= " AND (name LIKE ? OR nameAr LIKE ? OR area LIKE ? OR city LIKE ?)";
        $s = "%" . trim($search) . "%";
        $params[] = $s; $params[] = $s; $params[] = $s; $params[] = $s;
    }
    if ($maxPrice) {
        $sql .= " AND pricePerHour <= ?";
        $params[] = (float)$maxPrice;
    }

    if ($sortBy === 'price-asc') {
        $sql .= " ORDER BY pricePerHour ASC";
    } elseif ($sortBy === 'price-desc') {
        $sql .= " ORDER BY pricePerHour DESC";
    } elseif ($sortBy === 'rating') {
        $sql .= " ORDER BY rating DESC";
    } else {
        $sql .= " ORDER BY createdAt DESC";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $pitches = array_map('decodePitch', $stmt->fetchAll());
    echo json_encode([
        'success' => true,
        'count' => count($pitches),
        'data' => $pitches
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/pitches/:id
if (preg_match('#^/api/pitches/([^/]+)$#', $path, $m) && $method === 'GET') {
    $id = $m[1];
    $targetDate = $_GET['date'] ?? date('Y-m-d');

    $stmt = $pdo->prepare("SELECT * FROM pitches WHERE id = ?");
    $stmt->execute([$id]);
    $pitch = $stmt->fetch();
    if (!$pitch) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'الملعب غير موجود'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $pitch = decodePitch($pitch);

    // Fetch bookings for this pitch on targetDate to calculate available slots
    $bStmt = $pdo->prepare("SELECT id, customerName, timeSlots, paymentStatus, discountAmount FROM bookings WHERE pitchId = ? AND date = ? AND status NOT IN ('cancelled', 'ملغي')");
    $bStmt->execute([$id, $targetDate]);
    $bookings = $bStmt->fetchAll();

    $parsedBookings = array_map(function($b) {
        $b['timeSlots'] = is_array($b['timeSlots']) ? $b['timeSlots'] : (json_decode($b['timeSlots'], true) ?: []);
        return $b;
    }, $bookings);

    $defaultSlots = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'];
    $availableSlotsList = !empty($pitch['availableSlots']) ? $pitch['availableSlots'] : $defaultSlots;

    $slotsStatus = array_map(function($time) use ($parsedBookings) {
        $activeBooking = null;
        foreach ($parsedBookings as $b) {
            if (in_array($time, $b['timeSlots'])) {
                $activeBooking = $b;
                break;
            }
        }
        return [
            'time' => $time,
            'isAvailable' => !$activeBooking,
            'booking' => $activeBooking ? [
                'id' => $activeBooking['id'],
                'customerName' => $activeBooking['customerName'] ?: 'عميل غير مسجل',
                'paymentStatus' => $activeBooking['paymentStatus'] ?: 'unpaid',
                'discountAmount' => (float)($activeBooking['discountAmount'] ?? 0)
            ] : null
        ];
    }, $availableSlotsList);

    $pitch['selectedDate'] = $targetDate;
    $pitch['slots'] = $slotsStatus;

    echo json_encode([
        'success' => true,
        'data' => $pitch
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// POST /api/pitches
if ($path === '/api/pitches' && $method === 'POST') {
    $name = $body['name'] ?? null;
    $nameAr = $body['nameAr'] ?? $name;
    $area = $body['area'] ?? null;
    $city = $body['city'] ?? $area;
    $type = $body['type'] ?? null;
    $pricePerHour = $body['pricePerHour'] ?? null;
    $ownerPhone = $body['ownerPhone'] ?? null;

    if (!$name || !$area || !$type || !$pricePerHour || !$ownerPhone) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'يرجى إكمال البيانات الأساسية للملعب'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $newPitch = [
        'id' => 'pitch-' . round(microtime(true) * 1000),
        'name' => $name,
        'nameAr' => $nameAr,
        'area' => $area,
        'city' => $city,
        'type' => $type,
        'pricePerHour' => (float)$pricePerHour,
        'rating' => 5.0,
        'reviewsCount' => 1,
        'image' => $body['image'] ?? 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1000&q=80',
        'address' => $body['address'] ?? 'عنوان الملعب',
        'surface' => $body['surface'] ?? 'نجيل صناعي ممتاز',
        'facilities' => json_encode($body['facilities'] ?? ['إضاءة ليلية', 'غرف تغيير ملابس'], JSON_UNESCAPED_UNICODE),
        'description' => 'ملعب مميز مضاف جديداً عبر المنصة.',
        'ownerPhone' => $ownerPhone,
        'availableSlots' => json_encode(['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'])
    ];

    $stmt = $pdo->prepare("INSERT INTO pitches (id, name, nameAr, area, city, type, pricePerHour, rating, reviewsCount, image, address, surface, facilities, description, ownerPhone, availableSlots) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $newPitch['id'], $newPitch['name'], $newPitch['nameAr'], $newPitch['area'], $newPitch['city'],
        $newPitch['type'], $newPitch['pricePerHour'], $newPitch['rating'], $newPitch['reviewsCount'],
        $newPitch['image'], $newPitch['address'], $newPitch['surface'], $newPitch['facilities'],
        $newPitch['description'], $newPitch['ownerPhone'], $newPitch['availableSlots']
    ]);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'تم إضافة الملعب بنجاح! 🎉',
        'data' => decodePitch($newPitch)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/bookings
if ($path === '/api/bookings' && $method === 'GET') {
    $pitchId = $_GET['pitchId'] ?? null;
    $date = $_GET['date'] ?? null;
    $customerId = $_GET['customerId'] ?? null;
    $phone = $_GET['phone'] ?? null;
    $paymentStatus = $_GET['paymentStatus'] ?? null;

    $sql = "SELECT * FROM bookings WHERE 1=1";
    $params = [];
    if ($phone) {
        $sql .= " AND customerPhone = ?";
        $params[] = normalizePhone($phone);
    }
    if ($pitchId && $pitchId !== 'all') {
        $sql .= " AND pitchId = ?";
        $params[] = $pitchId;
    }
    if ($date) {
        $sql .= " AND date = ?";
        $params[] = $date;
    }
    if ($customerId) {
        $sql .= " AND customerId = ?";
        $params[] = $customerId;
    }
    if ($paymentStatus && $paymentStatus !== 'all') {
        $sql .= " AND paymentStatus = ?";
        $params[] = $paymentStatus;
    }
    $sql .= " ORDER BY createdAt DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $bookings = array_map('decodeBooking', $stmt->fetchAll());
    echo json_encode([
        'success' => true,
        'count' => count($bookings),
        'data' => $bookings
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/bookings/:id
if (preg_match('#^/api/bookings/([^/]+)$#', $path, $m) && $method === 'GET') {
    $id = $m[1];
    $stmt = $pdo->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->execute([$id]);
    $booking = $stmt->fetch();
    if (!$booking) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'الحجز غير موجود'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $pStmt = $pdo->prepare("SELECT * FROM payments WHERE bookingId = ? ORDER BY createdAt DESC");
    $pStmt->execute([$id]);
    $payments = array_map(function($p) {
        $p['amount'] = (float)$p['amount'];
        return $p;
    }, $pStmt->fetchAll());

    $data = decodeBooking($booking);
    $data['payments'] = $payments;

    echo json_encode([
        'success' => true,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// POST /api/bookings
if ($path === '/api/bookings' && $method === 'POST') {
    $pitchId = $body['pitchId'] ?? null;
    $customerName = trim($body['customerName'] ?? '');
    $customerPhone = normalizePhone($body['customerPhone'] ?? '');
    $date = $body['date'] ?? null;
    $timeSlots = $body['timeSlots'] ?? [];

    if (!$pitchId || !$customerName || !$customerPhone || !$date || empty($timeSlots)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'جميع بيانات الحجز الأساسية مطلوبة'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM pitches WHERE id = ?");
    $stmt->execute([$pitchId]);
    $pitch = $stmt->fetch();
    if (!$pitch) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'الملعب المحدد غير موجود'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Customer CRM auto-linking
    $cStmt = $pdo->prepare("SELECT id FROM customers WHERE phone = ?");
    $cStmt->execute([$customerPhone]);
    $customer = $cStmt->fetch();
    if ($customer) {
        $customerId = $customer['id'];
    } else {
        $customerId = 'cust-' . round(microtime(true) * 1000);
        $insC = $pdo->prepare("INSERT INTO customers (id, name, phone, notes, status) VALUES (?, ?, ?, '', 'active')");
        $insC->execute([$customerId, $customerName, $customerPhone]);
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
    $stmt = $pdo->prepare("INSERT INTO bookings (
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

    if ($paidAmount > 0) {
        $payId = 'pay-' . round(microtime(true) * 1000);
        $pIns = $pdo->prepare("INSERT INTO payments (
            id, bookingId, customerId, customerName, customerPhone, amount, paymentMethod, type, notes, createdBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'initial', ?, 'مدير النظام')");
        $pIns->execute([
            $payId, $bookingId, $customerId, $customerName, $customerPhone,
            $paidAmount, $paymentMethod, $body['paymentNotes'] ?? 'دفعة أولى عند الحجز'
        ]);
    }

    $bFetch = $pdo->prepare("SELECT * FROM bookings WHERE id = ?");
    $bFetch->execute([$bookingId]);
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'تم تأكيد الحجز بنجاح! 🎉',
        'data' => decodeBooking($bFetch->fetch())
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// POST /api/bookings/:id/payments
if (preg_match('#^/api/bookings/([^/]+)/payments$#', $path, $m) && $method === 'POST') {
    $bookingId = $m[1];
    $stmt = $pdo->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->execute([$bookingId]);
    $booking = $stmt->fetch();
    if (!$booking) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'الحجز غير موجود'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $amount = (float)($body['amount'] ?? 0);
    $paymentMethod = $body['paymentMethod'] ?? 'cash';
    $notes = $body['notes'] ?? '';
    $createdBy = $body['createdBy'] ?? 'مدير النظام';

    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'يجب إدخال مبلغ دفع صالح أكبر من الصفر'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $currentRemaining = (float)$booking['remainingAmount'];
    if ($amount > $currentRemaining) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "المبلغ المدخل ({$amount} ج.م) أكبر من المبلغ المتبقي ({$currentRemaining} ج.م)"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $newPaidAmount = (float)$booking['paidAmount'] + $amount;
    $newRemainingAmount = max(0, (float)$booking['netAmount'] - $newPaidAmount);
    $newPaymentStatus = ($newRemainingAmount <= 0) ? 'paid' : 'partial';

    $upd = $pdo->prepare("UPDATE bookings SET paidAmount = ?, remainingAmount = ?, paymentStatus = ? WHERE id = ?");
    $upd->execute([$newPaidAmount, $newRemainingAmount, $newPaymentStatus, $bookingId]);

    $paymentId = 'pay-' . round(microtime(true) * 1000);
    $insP = $pdo->prepare("INSERT INTO payments (
        id, bookingId, customerId, customerName, customerPhone, amount, paymentMethod, type, notes, createdBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'payment', ?, ?)");
    $insP->execute([
        $paymentId, $bookingId, $booking['customerId'], $booking['customerName'],
        $booking['customerPhone'], $amount, $paymentMethod, $notes, $createdBy
    ]);

    $stmt->execute([$bookingId]);
    $updatedBooking = decodeBooking($stmt->fetch());

    $pStmt = $pdo->prepare("SELECT * FROM payments WHERE id = ?");
    $pStmt->execute([$paymentId]);
    $paymentRecord = $pStmt->fetch();

    echo json_encode([
        'success' => true,
        'message' => 'تم تسجيل الدفعة بنجاح',
        'booking' => $updatedBooking,
        'payment' => $paymentRecord
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// PUT /api/bookings/:id/cancel
if (preg_match('#^/api/bookings/([^/]+)/cancel$#', $path, $m) && $method === 'PUT') {
    $bookingId = $m[1];
    $stmt = $pdo->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->execute([$bookingId]);
    $booking = $stmt->fetch();
    if (!$booking) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'الحجز غير موجود'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $upd = $pdo->prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?");
    $upd->execute([$bookingId]);

    $stmt->execute([$bookingId]);
    echo json_encode([
        'success' => true,
        'message' => 'تم إلغاء الحجز بنجاح',
        'data' => decodeBooking($stmt->fetch())
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/customers
if ($path === '/api/customers' && $method === 'GET') {
    $search = $_GET['search'] ?? null;
    $status = $_GET['status'] ?? null;
    $sql = "SELECT c.*, 
            COUNT(b.id) AS totalBookings,
            COALESCE(SUM(b.netAmount), 0) AS totalSpent,
            COALESCE(SUM(b.remainingAmount), 0) AS totalDebt,
            MAX(b.date) AS lastBookingDate
            FROM customers c
            LEFT JOIN bookings b ON c.id = b.customerId
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
    echo json_encode([
        'success' => true,
        'count' => count($customers),
        'data' => $customers
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/customers/:id
if (preg_match('#^/api/customers/([^/]+)$#', $path, $m) && $method === 'GET') {
    $id = $m[1];
    $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
    $stmt->execute([$id]);
    $customer = $stmt->fetch();
    if (!$customer) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'العميل غير موجود'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $bStmt = $pdo->prepare("SELECT * FROM bookings WHERE customerId = ? ORDER BY createdAt DESC");
    $bStmt->execute([$id]);
    $bookings = array_map('decodeBooking', $bStmt->fetchAll());

    $pStmt = $pdo->prepare("SELECT * FROM payments WHERE customerId = ? ORDER BY createdAt DESC");
    $pStmt->execute([$id]);
    $payments = array_map(function($p) {
        $p['amount'] = (float)$p['amount'];
        return $p;
    }, $pStmt->fetchAll());

    $customer['bookings'] = $bookings;
    $customer['payments'] = $payments;
    $customer['totalBookings'] = count($bookings);
    $customer['totalSpent'] = array_sum(array_column($bookings, 'netAmount'));
    $customer['totalDebt'] = array_sum(array_column($bookings, 'remainingAmount'));

    echo json_encode([
        'success' => true,
        'data' => $customer
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// POST /api/customers
if ($path === '/api/customers' && $method === 'POST') {
    $name = trim($body['name'] ?? '');
    $phone = normalizePhone($body['phone'] ?? '');
    $notes = $body['notes'] ?? '';
    $status = $body['status'] ?? 'active';

    if (!$name || !$phone) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'الاسم ورقم الهاتف مطلوبان'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $cCheck = $pdo->prepare("SELECT id FROM customers WHERE phone = ?");
    $cCheck->execute([$phone]);
    if ($cCheck->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'رقم الهاتف مسجل بالفعل لعميل آخر'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $id = 'cust-' . round(microtime(true) * 1000);
    $ins = $pdo->prepare("INSERT INTO customers (id, name, phone, notes, status) VALUES (?, ?, ?, ?, ?)");
    $ins->execute([$id, $name, $phone, $notes, $status]);

    $cFetch = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
    $cFetch->execute([$id]);
    $newCust = $cFetch->fetch();
    $newCust['totalBookings'] = 0;
    $newCust['totalSpent'] = 0;
    $newCust['totalDebt'] = 0;
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'data' => $newCust
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// PUT /api/customers/:id
if (preg_match('#^/api/customers/([^/]+)$#', $path, $m) && $method === 'PUT') {
    $id = $m[1];
    $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'العميل غير موجود'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $name = trim($body['name'] ?? $existing['name']);
    $phone = isset($body['phone']) ? normalizePhone($body['phone']) : $existing['phone'];
    $notes = $body['notes'] ?? $existing['notes'];
    $status = $body['status'] ?? $existing['status'];

    if ($phone !== $existing['phone']) {
        $cCheck = $pdo->prepare("SELECT id FROM customers WHERE phone = ? AND id != ?");
        $cCheck->execute([$phone, $id]);
        if ($cCheck->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'رقم الهاتف مستخدم لعميل آخر'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $upd = $pdo->prepare("UPDATE customers SET name = ?, phone = ?, notes = ?, status = ? WHERE id = ?");
    $upd->execute([$name, $phone, $notes, $status, $id]);

    $stmt->execute([$id]);
    echo json_encode([
        'success' => true,
        'data' => $stmt->fetch()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/payments
if ($path === '/api/payments' && $method === 'GET') {
    $bookingId = $_GET['bookingId'] ?? null;
    $customerId = $_GET['customerId'] ?? null;
    $sql = "SELECT * FROM payments WHERE 1=1";
    $params = [];
    if ($bookingId) { $sql .= " AND bookingId = ?"; $params[] = $bookingId; }
    if ($customerId) { $sql .= " AND customerId = ?"; $params[] = $customerId; }
    $sql .= " ORDER BY createdAt DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $payments = array_map(function($p) {
        $p['amount'] = (float)$p['amount'];
        return $p;
    }, $stmt->fetchAll());
    echo json_encode([
        'success' => true,
        'count' => count($payments),
        'data' => $payments
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/finances
if ($path === '/api/finances' && $method === 'GET') {
    $period = $_GET['period'] ?? 'all';
    $dateCondition = "";
    if ($period === 'today') {
        $dateCondition = " AND date = '" . date('Y-m-d') . "'";
    } elseif ($period === 'week') {
        $dateCondition = " AND date >= '" . date('Y-m-d', strtotime('-7 days')) . "'";
    } elseif ($period === 'month') {
        $dateCondition = " AND date >= '" . date('Y-m-d', strtotime('-30 days')) . "'";
    }

    $totals = $pdo->query("
        SELECT 
            COUNT(id) AS bookingsCount,
            COALESCE(SUM(totalAmount), 0) AS grossTotal,
            COALESCE(SUM(discountAmount), 0) AS totalDiscounts,
            COALESCE(SUM(netAmount), 0) AS netTotal,
            COALESCE(SUM(paidAmount), 0) AS collectedTotal,
            COALESCE(SUM(remainingAmount), 0) AS dueTotal
        FROM bookings 
        WHERE status NOT IN ('cancelled', 'ملغي') {$dateCondition}
    ")->fetch();

    $paymentBreakdown = $pdo->query("
        SELECT 
            paymentMethod,
            COALESCE(SUM(amount), 0) as total
        FROM payments
        GROUP BY paymentMethod
    ")->fetchAll();

    $byMethod = ['cash' => 0, 'vodafone' => 0, 'card' => 0];
    foreach ($paymentBreakdown as $pb) {
        $mKey = strtolower($pb['paymentMethod']);
        if (isset($byMethod[$mKey])) {
            $byMethod[$mKey] = (float)$pb['total'];
        }
    }

    $statusRows = $pdo->query("
        SELECT paymentStatus, COUNT(id) as count
        FROM bookings
        WHERE status NOT IN ('cancelled', 'ملغي') {$dateCondition}
        GROUP BY paymentStatus
    ")->fetchAll();

    $statusCounts = ['paid' => 0, 'partial' => 0, 'unpaid' => 0];
    foreach ($statusRows as $sr) {
        if (isset($statusCounts[$sr['paymentStatus']])) {
            $statusCounts[$sr['paymentStatus']] = (int)$sr['count'];
        }
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'bookingsCount' => (int)$totals['bookingsCount'],
            'grossTotal' => (float)$totals['grossTotal'],
            'totalDiscounts' => (float)$totals['totalDiscounts'],
            'netTotal' => (float)$totals['netTotal'],
            'collectedTotal' => (float)$totals['collectedTotal'],
            'dueTotal' => (float)$totals['dueTotal'],
            'byPaymentMethod' => $byMethod,
            'statusCounts' => $statusCounts
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// POST /api/auth/login
if ($path === '/api/auth/login' && $method === 'POST') {
    $phone = $body['phone'] ?? null;
    $role = $body['role'] ?? 'player';
    if (!$phone) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'يرجى إدخال رقم الهاتف'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $user = [
        'id' => 'user-' . rand(1000, 9999),
        'phone' => normalizePhone($phone),
        'name' => $role === 'owner' ? 'صاحب ملعب' : 'لاعب كرة',
        'role' => $role,
        'token' => 'jwt-token-demo-' . time()
    ];

    echo json_encode([
        'success' => true,
        'message' => 'تم تسجيل الدخول بنجاح',
        'data' => $user
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Fallback: 404
http_response_code(404);
echo json_encode(['success' => false, 'message' => 'API endpoint not found', 'path' => $path], JSON_UNESCAPED_UNICODE);
