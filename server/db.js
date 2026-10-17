import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'malaeb_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

export async function initDatabase() {
  try {
    // 1. Ensure database exists
    const adminConnection = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password
    });

    await adminConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await adminConnection.end();

    // 2. Initialize connection pool with target database
    pool = mysql.createPool(DB_CONFIG);

    // 3. Create tables with proper constraints & utf8mb4 charset
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`pitches\` (
        \`id\` VARCHAR(50) PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`nameAr\` VARCHAR(255) NOT NULL,
        \`area\` VARCHAR(100) NOT NULL,
        \`city\` VARCHAR(100) NOT NULL,
        \`type\` VARCHAR(50) NOT NULL,
        \`pricePerHour\` DECIMAL(10, 2) NOT NULL,
        \`rating\` DECIMAL(3, 2) DEFAULT 5.00,
        \`reviewsCount\` INT DEFAULT 1,
        \`image\` TEXT,
        \`address\` TEXT,
        \`surface\` VARCHAR(100),
        \`facilities\` JSON,
        \`description\` TEXT,
        \`ownerPhone\` VARCHAR(50),
        \`availableSlots\` JSON,
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure availableSlots exists for older tables
    try {
      await pool.query('ALTER TABLE `pitches` ADD COLUMN `availableSlots` JSON;');
    } catch (_) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`customers\` (
        \`id\` VARCHAR(50) PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`phone\` VARCHAR(50) NOT NULL UNIQUE,
        \`notes\` TEXT,
        \`status\` ENUM('active', 'inactive', 'vip') DEFAULT 'active',
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`bookings\` (
        \`id\` VARCHAR(50) PRIMARY KEY,
        \`pitchId\` VARCHAR(50) NOT NULL,
        \`pitchName\` VARCHAR(255),
        \`pitchArea\` VARCHAR(100),
        \`customerId\` VARCHAR(50),
        \`customerName\` VARCHAR(255) NOT NULL,
        \`customerPhone\` VARCHAR(50) NOT NULL,
        \`date\` DATE NOT NULL,
        \`timeSlots\` JSON NOT NULL,
        \`hours\` INT NOT NULL,
        \`pricePerHour\` DECIMAL(10, 2) NOT NULL,
        \`totalAmount\` DECIMAL(10, 2) NOT NULL,
        \`discountType\` VARCHAR(20) DEFAULT 'none',
        \`discountValue\` DECIMAL(10, 2) DEFAULT 0,
        \`discountAmount\` DECIMAL(10, 2) DEFAULT 0,
        \`discountNotes\` TEXT,
        \`netAmount\` DECIMAL(10, 2) NOT NULL,
        \`paidAmount\` DECIMAL(10, 2) DEFAULT 0,
        \`remainingAmount\` DECIMAL(10, 2) NOT NULL,
        \`paymentStatus\` ENUM('paid', 'partial', 'unpaid') DEFAULT 'unpaid',
        \`paymentMethod\` VARCHAR(50) DEFAULT 'cash',
        \`notes\` TEXT,
        \`status\` VARCHAR(20) DEFAULT 'confirmed',
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`pitchId\`) REFERENCES \`pitches\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`payments\` (
        \`id\` VARCHAR(50) PRIMARY KEY,
        \`bookingId\` VARCHAR(50) NOT NULL,
        \`customerId\` VARCHAR(50),
        \`customerName\` VARCHAR(255),
        \`customerPhone\` VARCHAR(50),
        \`amount\` DECIMAL(10, 2) NOT NULL,
        \`paymentMethod\` VARCHAR(50) DEFAULT 'cash',
        \`type\` VARCHAR(20) DEFAULT 'payment',
        \`notes\` TEXT,
        \`createdBy\` VARCHAR(100) DEFAULT 'مدير النظام',
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`bookingId\`) REFERENCES \`bookings\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Auto-seed from JSON files if database tables are empty
    await autoSeedFromFiles();

    console.log(`✅ MySQL Database & Tables initialized successfully on ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
    return pool;
  } catch (err) {
    console.error('❌ Failed to initialize MySQL Database:', err);
    throw err;
  }
}

async function autoSeedFromFiles() {
  const dataDir = path.join(__dirname, 'data');
  const pitchesFile = path.join(dataDir, 'pitches.json');
  const customersFile = path.join(dataDir, 'customers.json');
  const bookingsFile = path.join(dataDir, 'bookings.json');
  const paymentsFile = path.join(dataDir, 'payments.json');

  // Seed Pitches
  const [[{ pitchCount }]] = await pool.query('SELECT COUNT(*) AS pitchCount FROM `pitches`;');
  if (pitchCount === 0 && fs.existsSync(pitchesFile)) {
    const pitches = JSON.parse(fs.readFileSync(pitchesFile, 'utf8'));
    for (const p of pitches) {
      await pool.query(
        `INSERT INTO \`pitches\` 
         (id, name, nameAr, area, city, type, pricePerHour, rating, reviewsCount, image, address, surface, facilities, description, ownerPhone, availableSlots)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name);`,
        [
          p.id,
          p.name,
          p.nameAr || p.name,
          p.area,
          p.city || p.area,
          p.type,
          p.pricePerHour,
          p.rating || 5.0,
          p.reviewsCount || 1,
          p.image,
          p.address,
          p.surface,
          JSON.stringify(p.facilities || []),
          p.description,
          p.ownerPhone,
          JSON.stringify(p.availableSlots || [])
        ]
      );
    }
    console.log(`🌱 Seeded ${pitches.length} pitches into MySQL.`);
  }

  // Seed Customers
  const [[{ customerCount }]] = await pool.query('SELECT COUNT(*) AS customerCount FROM `customers`;');
  if (customerCount === 0 && fs.existsSync(customersFile)) {
    const customers = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
    for (const c of customers) {
      await pool.query(
        `INSERT INTO \`customers\` (id, name, phone, notes, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name);`,
        [
          c.id,
          c.name,
          c.phone,
          c.notes || '',
          c.status || 'active',
          c.createdAt ? new Date(c.createdAt) : new Date(),
          c.updatedAt ? new Date(c.updatedAt) : new Date()
        ]
      );
    }
    console.log(`🌱 Seeded ${customers.length} customers into MySQL.`);
  }

  // Seed Bookings
  const [[{ bookingCount }]] = await pool.query('SELECT COUNT(*) AS bookingCount FROM `bookings`;');
  if (bookingCount === 0 && fs.existsSync(bookingsFile)) {
    const bookings = JSON.parse(fs.readFileSync(bookingsFile, 'utf8'));
    for (const b of bookings) {
      await pool.query(
        `INSERT INTO \`bookings\` 
         (id, pitchId, pitchName, pitchArea, customerId, customerName, customerPhone, date, timeSlots, hours, pricePerHour, totalAmount, discountType, discountValue, discountAmount, discountNotes, netAmount, paidAmount, remainingAmount, paymentStatus, paymentMethod, notes, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE customerName=VALUES(customerName);`,
        [
          b.id,
          b.pitchId,
          b.pitchName,
          b.pitchArea,
          b.customerId || null,
          b.customerName,
          b.customerPhone,
          b.date,
          JSON.stringify(b.timeSlots || []),
          b.hours || 1,
          b.pricePerHour || 0,
          b.totalAmount || 0,
          b.discountType || 'none',
          b.discountValue || 0,
          b.discountAmount || 0,
          b.discountNotes || '',
          b.netAmount || b.totalAmount || 0,
          b.paidAmount || 0,
          b.remainingAmount || 0,
          b.paymentStatus || 'unpaid',
          b.paymentMethod || 'cash',
          b.notes || '',
          b.status || 'confirmed',
          b.createdAt ? new Date(b.createdAt) : new Date()
        ]
      );
    }
    console.log(`🌱 Seeded ${bookings.length} bookings into MySQL.`);
  }

  // Seed Payments
  const [[{ paymentCount }]] = await pool.query('SELECT COUNT(*) AS paymentCount FROM `payments`;');
  if (paymentCount === 0 && fs.existsSync(paymentsFile)) {
    const payments = JSON.parse(fs.readFileSync(paymentsFile, 'utf8'));
    for (const p of payments) {
      await pool.query(
        `INSERT INTO \`payments\` 
         (id, bookingId, customerId, customerName, customerPhone, amount, paymentMethod, type, notes, createdBy, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount=VALUES(amount);`,
        [
          p.id,
          p.bookingId,
          p.customerId || null,
          p.customerName || '',
          p.customerPhone || '',
          p.amount,
          p.paymentMethod || 'cash',
          p.type || 'payment',
          p.notes || '',
          p.createdBy || 'مدير النظام',
          p.createdAt ? new Date(p.createdAt) : new Date()
        ]
      );
    }
    console.log(`🌱 Seeded ${payments.length} payments into MySQL.`);
  }
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDatabase() first.');
  }
  return pool;
}
