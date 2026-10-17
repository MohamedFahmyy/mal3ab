-- =====================================================
-- ملاعب (Mal3abk) - MySQL Database Schema & Seed Data
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. جدول الملاعب (Pitches)
CREATE TABLE IF NOT EXISTS `pitches` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
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

-- 2. جدول العملاء (Customers CRM)
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL UNIQUE,
  `notes` TEXT,
  `status` ENUM('active', 'inactive', 'vip') DEFAULT 'active',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. جدول الحجوزات (Bookings)
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
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
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bookings_pitch` FOREIGN KEY (`pitchId`) REFERENCES `pitches`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookings_customer` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. جدول المدفوعات والتحصيلات (Payments Ledger)
CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `bookingId` VARCHAR(50) NOT NULL,
  `customerId` VARCHAR(50),
  `customerName` VARCHAR(255),
  `customerPhone` VARCHAR(50),
  `amount` DECIMAL(10, 2) NOT NULL,
  `paymentMethod` VARCHAR(50) DEFAULT 'cash',
  `type` VARCHAR(20) DEFAULT 'payment',
  `notes` TEXT,
  `createdBy` VARCHAR(100) DEFAULT 'مدير النظام',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payments_booking` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- البيانات التجريبية الأولية (Initial Seed Data)
-- =====================================================

-- الملاعب
INSERT INTO `pitches` (`id`, `name`, `nameAr`, `area`, `city`, `type`, `pricePerHour`, `rating`, `reviewsCount`, `image`, `address`, `surface`, `facilities`, `description`, `ownerPhone`, `availableSlots`) VALUES
('pitch-1', 'ملعب النجوم - المعادي', 'ملعب النجوم - المعادي', 'المعادي', 'القاهرة', 'خماسي', 350.00, 4.85, 24, 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800', 'شارع النصر، المعادي، القاهرة', 'نجيل صناعي تركي درجة أولى', '[\"إضاءة ليلية عالية الجودة\", \"غرف تبديل ملابس\", \"كافيتريا ومشروبات\", \"موقف سيارات\", \"كرة ومعدات رياضية\"]', 'ملعب خماسي مجهز بأعلى المواصفات القياسية الدولية ونجيل صناعي من الجيل الثالث مع إنارة ليلية ممتازة.', '01012345678', '[\"16:00 - 17:00\", \"17:00 - 18:00\", \"18:00 - 19:00\", \"19:00 - 20:00\", \"20:00 - 21:00\", \"21:00 - 22:00\", \"22:00 - 23:00\", \"23:00 - 00:00\"]')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

INSERT INTO `pitches` (`id`, `name`, `nameAr`, `area`, `city`, `type`, `pricePerHour`, `rating`, `reviewsCount`, `image`, `address`, `surface`, `facilities`, `description`, `ownerPhone`, `availableSlots`) VALUES
('pitch-2', 'ملعب الأبطال - مدينة نصر', 'ملعب الأبطال - مدينة نصر', 'مدينة نصر', 'القاهرة', 'سباعي', 450.00, 4.90, 38, 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800', 'مكرم عبيد، مدينة نصر، القاهرة', 'نجيل هجين معتمد من الفيفا', '[\"إضاءة LED دولية\", \"غرف استحمام\", \"مدرجات جماهير\", \"أمن وكاميرات مراقبة\", \"كافيه ومسجد\"]', 'ملعب سباعي متكامل مناسب للمباريات الكبيرة والبطولات الودية بأرضية ممتازة وتجهيزات فندقية.', '01123456789', '[\"16:00 - 17:00\", \"17:00 - 18:00\", \"18:00 - 19:00\", \"19:00 - 20:00\", \"20:00 - 21:00\", \"21:00 - 22:00\", \"22:00 - 23:00\", \"23:00 - 00:00\"]')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

INSERT INTO `pitches` (`id`, `name`, `nameAr`, `area`, `city`, `type`, `pricePerHour`, `rating`, `reviewsCount`, `image`, `address`, `surface`, `facilities`, `description`, `ownerPhone`, `availableSlots`) VALUES
('pitch-3', 'أرينا التجمع الخامس', 'أرينا التجمع الخامس', 'التجمع الخامس', 'القاهرة الجديدة', 'خماسي', 400.00, 4.75, 19, 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800', 'شارع التسعين الشمالي، التجمع الخامس', 'نجيل صناعي هولندي 50 ملم', '[\"إضاءة حديثة\", \"شاشات عرض نتائج\", \"تكييف في غرف الملابس\", \"مشروبات ووجبات خفيفة\"]', 'أحدث مجمع ملاعب خماسية في القاهرة الجديدة، خدمة VIP وعناية فائقة بنظافة وتجهيزات الملعب.', '01234567890', '[\"16:00 - 17:00\", \"17:00 - 18:00\", \"18:00 - 19:00\", \"19:00 - 20:00\", \"20:00 - 21:00\", \"21:00 - 22:00\", \"22:00 - 23:00\", \"23:00 - 00:00\"]')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- العملاء
INSERT INTO `customers` (`id`, `name`, `phone`, `notes`, `status`) VALUES
('cust-1', 'محمد أحمد', '01012345678', 'عميل مميز يحجز أسبوعياً', 'vip'),
('cust-2', 'أحمد محمود', '01123456789', 'كابتن فريق التجمع', 'active'),
('cust-3', 'محمود حسن', '01234567890', 'حجز منتظم يوم الجمعة', 'active')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- الحجوزات
INSERT INTO `bookings` (`id`, `pitchId`, `pitchName`, `pitchArea`, `customerId`, `customerName`, `customerPhone`, `date`, `timeSlots`, `hours`, `pricePerHour`, `totalAmount`, `discountType`, `discountValue`, `discountAmount`, `discountNotes`, `netAmount`, `paidAmount`, `remainingAmount`, `paymentStatus`, `paymentMethod`, `notes`, `status`) VALUES
('b-sample-1', 'pitch-1', 'ملعب النجوم - المعادي', 'المعادي', 'cust-1', 'محمد أحمد', '01012345678', CURDATE(), '[\"20:00 - 21:00\"]', 1, 350.00, 350.00, 'fixed', 50.00, 50.00, 'خصم عميل دائم', 300.00, 150.00, 150.00, 'partial', 'cash', 'مباراة أسبوعية', 'confirmed')
ON DUPLICATE KEY UPDATE `customerName`=VALUES(`customerName`);

-- المدفوعات
INSERT INTO `payments` (`id`, `bookingId`, `customerId`, `customerName`, `customerPhone`, `amount`, `paymentMethod`, `type`, `notes`, `createdBy`) VALUES
('pay-sample-1', 'b-sample-1', 'cust-1', 'محمد أحمد', '01012345678', 150.00, 'cash', 'payment', 'عربون حجز نقدي', 'مدير النظام')
ON DUPLICATE KEY UPDATE `amount`=VALUES(`amount`);
