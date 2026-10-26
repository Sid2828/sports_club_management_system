import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Real Database Configuration from Environment Variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sports_club_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  multipleStatements: true,
  dateStrings: true
};

let pool = null;
let isInitialized = false;

function createPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

/**
 * Initializes the real MySQL database:
 * 1. Ensures database sports_club_db exists
 * 2. Creates all tables (users, membership_plans, subscriptions, venues, venue_bookings, equipment, equipment_checkouts, maintenance_operations, payments)
 * 3. Creates SQL Views:
 *    - vw_member_active_checkouts
 *    - vw_venue_booking_details
 *    - vw_member_profiles_summary
 * 4. Creates SQL Triggers:
 *    - trg_prevent_venue_double_booking
 *    - trg_equipment_checkout_decrement
 *    - trg_equipment_checkout_return
 *    - trg_maintenance_status_sync
 * 5. Seeds default accounts (admin, member, monal) and initial club resources if empty
 */
export async function initDatabase() {
  if (isInitialized) return true;

  try {
    // Step 1: Connect to server without database to create database if not exists
    const rootConn = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();

    // Step 2: Connect with pool
    createPool();
    const conn = await pool.getConnection();

    try {
      // Step 3: Create Tables
      await conn.query(`
        CREATE TABLE IF NOT EXISTS users (
          user_id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          username VARCHAR(80) NOT NULL UNIQUE,
          email VARCHAR(120) NOT NULL UNIQUE,
          phone VARCHAR(20) DEFAULT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role ENUM('non_member', 'member', 'admin') NOT NULL DEFAULT 'non_member',
          wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          is_delinquent BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_role (role),
          INDEX idx_user_email (email),
          INDEX idx_user_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS sports (
          sport_id VARCHAR(20) PRIMARY KEY,
          sport_name VARCHAR(80) NOT NULL UNIQUE,
          category ENUM('Indoor', 'Outdoor') NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS membership_plans (
          plan_id INT AUTO_INCREMENT PRIMARY KEY,
          plan_code VARCHAR(20) NOT NULL UNIQUE,
          plan_name ENUM('Gold', 'Platinum') NOT NULL,
          monthly_fee DECIMAL(10,2) NOT NULL,
          yearly_fee DECIMAL(10,2) NOT NULL,
          equipment_discount_percent DECIMAL(5,2) NOT NULL,
          venue_discount_percent DECIMAL(5,2) NOT NULL,
          description TEXT,
          benefits JSON,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          subscription_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          plan_id INT NOT NULL,
          billing_cycle ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly',
          amount_paid DECIMAL(10,2) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          status ENUM('Active', 'Expired', 'Cancelled') NOT NULL DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (plan_id) REFERENCES membership_plans(plan_id) ON DELETE RESTRICT,
          INDEX idx_sub_user_status (user_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS venues (
          venue_id VARCHAR(20) PRIMARY KEY,
          venue_name VARCHAR(100) NOT NULL,
          venue_type VARCHAR(50) NOT NULL,
          base_hourly_fee DECIMAL(10,2) NOT NULL,
          parent_venue_id VARCHAR(20) DEFAULT NULL,
          sports JSON NOT NULL,
          status ENUM('Available', 'Booked', 'Under Maintenance') NOT NULL DEFAULT 'Available',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_venue_id) REFERENCES venues(venue_id) ON DELETE SET NULL,
          INDEX idx_venue_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS venue_bookings (
          booking_id INT AUTO_INCREMENT PRIMARY KEY,
          venue_id VARCHAR(20) NOT NULL,
          user_id INT NOT NULL,
          start_time DATETIME NOT NULL,
          end_time DATETIME NOT NULL,
          base_rate DECIMAL(10,2) NOT NULL,
          discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          total_cost DECIMAL(10,2) NOT NULL,
          status ENUM('Confirmed', 'Cancelled', 'Completed') NOT NULL DEFAULT 'Confirmed',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (venue_id) REFERENCES venues(venue_id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          INDEX idx_booking_venue_time (venue_id, start_time, end_time),
          INDEX idx_booking_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS equipment (
          asset_id VARCHAR(20) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          category VARCHAR(50) NOT NULL,
          total_quantity INT NOT NULL,
          available_quantity INT NOT NULL,
          daily_price DECIMAL(10,2) NOT NULL DEFAULT 50.00,
          status ENUM('Available', 'In Use', 'Under Maintenance') NOT NULL DEFAULT 'Available',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_equipment_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS equipment_checkouts (
          checkout_id INT AUTO_INCREMENT PRIMARY KEY,
          asset_id VARCHAR(20) NOT NULL,
          user_id INT NOT NULL,
          issue_date DATE NOT NULL,
          due_date DATE NOT NULL,
          return_date DATE DEFAULT NULL,
          daily_rate DECIMAL(10,2) NOT NULL,
          discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
          late_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          status ENUM('Active', 'Returned', 'Overdue') NOT NULL DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (asset_id) REFERENCES equipment(asset_id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          INDEX idx_checkout_user (user_id),
          INDEX idx_checkout_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS maintenance_operations (
          operation_id INT AUTO_INCREMENT PRIMARY KEY,
          target_type ENUM('venue', 'equipment') NOT NULL,
          target_id VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
          request_status ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
          scheduled_date DATE NOT NULL,
          completed_date DATE DEFAULT NULL,
          technician_notes TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_maint_status (request_status),
          INDEX idx_maint_target (target_type, target_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS payments (
          payment_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          booking_id INT DEFAULT NULL,
          checkout_id INT DEFAULT NULL,
          subscription_id INT DEFAULT NULL,
          amount DECIMAL(10,2) NOT NULL,
          payment_method ENUM('Wallet', 'Card', 'UPI', 'Cash') NOT NULL,
          payment_status ENUM('Paid', 'Pending', 'Failed') NOT NULL DEFAULT 'Paid',
          payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (booking_id) REFERENCES venue_bookings(booking_id) ON DELETE SET NULL,
          FOREIGN KEY (checkout_id) REFERENCES equipment_checkouts(checkout_id) ON DELETE SET NULL,
          FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Step 4: Create SQL Views
      // VIEW 1: vw_member_active_checkouts
      await conn.query(`
        CREATE OR REPLACE VIEW vw_member_active_checkouts AS
        SELECT 
            ec.checkout_id,
            ec.asset_id,
            eq.name AS equipment_name,
            eq.category AS equipment_category,
            eq.daily_price AS base_daily_price,
            ec.daily_rate AS charged_daily_rate,
            ec.discount_percent AS tier_discount_applied,
            u.user_id,
            u.name AS member_name,
            u.email AS member_email,
            u.phone AS member_phone,
            COALESCE(mp.plan_name, 'None') AS membership_tier,
            ec.issue_date,
            ec.due_date,
            ec.return_date,
            ec.status AS checkout_status,
            GREATEST(0, DATEDIFF(CURRENT_DATE(), ec.due_date)) AS days_overdue,
            CASE 
                WHEN CURRENT_DATE() > ec.due_date AND ec.return_date IS NULL 
                THEN GREATEST(0, DATEDIFF(CURRENT_DATE(), ec.due_date)) * 100.00
                ELSE ec.late_fee
            END AS computed_late_fee
        FROM equipment_checkouts ec
        INNER JOIN users u ON ec.user_id = u.user_id
        INNER JOIN equipment eq ON ec.asset_id = eq.asset_id
        LEFT JOIN subscriptions s ON u.user_id = s.user_id AND s.status = 'Active'
        LEFT JOIN membership_plans mp ON s.plan_id = mp.plan_id
        WHERE ec.return_date IS NULL;
      `);

      // VIEW 2: vw_venue_booking_details
      await conn.query(`
        CREATE OR REPLACE VIEW vw_venue_booking_details AS
        SELECT 
            b.booking_id,
            b.venue_id,
            v.venue_name,
            v.venue_type,
            v.base_hourly_fee,
            u.user_id,
            u.name AS member_name,
            u.email AS member_email,
            COALESCE(mp.plan_name, 'None') AS membership_tier,
            COALESCE(mp.venue_discount_percent, 0.00) AS tier_venue_discount_percent,
            b.start_time,
            b.end_time,
            TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time) / 60.0 AS duration_hours,
            b.base_rate,
            b.discount_amount,
            b.total_cost,
            b.status AS booking_status,
            p.payment_id,
            p.payment_method,
            p.payment_status,
            b.created_at
        FROM venue_bookings b
        INNER JOIN venues v ON b.venue_id = v.venue_id
        INNER JOIN users u ON b.user_id = u.user_id
        LEFT JOIN subscriptions s ON u.user_id = s.user_id AND s.status = 'Active'
        LEFT JOIN membership_plans mp ON s.plan_id = mp.plan_id
        LEFT JOIN payments p ON b.booking_id = p.booking_id;
      `);

      // VIEW 3: vw_member_profiles_summary
      await conn.query(`
        CREATE OR REPLACE VIEW vw_member_profiles_summary AS
        SELECT 
            u.user_id,
            u.name,
            u.username,
            u.email,
            u.phone,
            u.role,
            u.wallet_balance,
            u.is_delinquent,
            COALESCE(mp.plan_name, 'None') AS current_tier,
            s.billing_cycle,
            s.end_date AS membership_expiry,
            COUNT(DISTINCT b.booking_id) AS total_bookings_count,
            COUNT(DISTINCT ec.checkout_id) AS total_checkouts_count,
            COUNT(DISTINCT CASE WHEN ec.return_date IS NULL THEN ec.checkout_id END) AS active_checkouts_count
        FROM users u
        LEFT JOIN subscriptions s ON u.user_id = s.user_id AND s.status = 'Active'
        LEFT JOIN membership_plans mp ON s.plan_id = mp.plan_id
        LEFT JOIN venue_bookings b ON u.user_id = b.user_id
        LEFT JOIN equipment_checkouts ec ON u.user_id = ec.user_id
        GROUP BY u.user_id, u.name, u.username, u.email, u.phone, u.role, u.wallet_balance, u.is_delinquent, mp.plan_name, s.billing_cycle, s.end_date;
      `);

      // VIEW 4: Club operations dashboard sourced by the UI overview
      await conn.query(`
        CREATE OR REPLACE VIEW vw_club_operations_overview AS
        SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'member') AS active_member_count,
          (SELECT COUNT(*) FROM venues WHERE status = 'Available') AS available_venues,
          (SELECT COUNT(*) FROM venues) AS total_venues,
          (SELECT COUNT(*) FROM venue_bookings WHERE status = 'Confirmed' AND DATE(start_time) = CURRENT_DATE()) AS bookings_today,
          (SELECT COUNT(*) FROM maintenance_operations WHERE request_status <> 'Completed') AS pending_maintenance,
          (SELECT COALESCE(SUM(total_quantity), 0) FROM equipment) AS equipment_total_units,
          (SELECT COALESCE(SUM(available_quantity), 0) FROM equipment) AS equipment_available_units;
      `);

      // Step 5: Create SQL Triggers
      // TRIGGER 1: Double-booking prevention
      try {
        await conn.query(`DROP TRIGGER IF EXISTS trg_prevent_venue_double_booking;`);
        await conn.query(`
          CREATE TRIGGER trg_prevent_venue_double_booking
          BEFORE INSERT ON venue_bookings
          FOR EACH ROW
          BEGIN
              DECLARE conflict_count INT;
              SELECT COUNT(*) INTO conflict_count
              FROM venue_bookings
              WHERE venue_id = NEW.venue_id
                AND status = 'Confirmed'
                AND (
                    (NEW.start_time >= start_time AND NEW.start_time < end_time)
                    OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
                    OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
                );
              IF conflict_count > 0 THEN
                  SIGNAL SQLSTATE '45000'
                  SET MESSAGE_TEXT = 'Slot conflict error: The selected venue is already booked during this time interval.';
              END IF;
          END;
        `);
      } catch (e) {
        console.warn('Trigger 1 notice:', e.message);
      }

      // TRIGGER 2: Decrement equipment stock on checkout
      try {
        await conn.query(`DROP TRIGGER IF EXISTS trg_equipment_checkout_decrement;`);
        await conn.query(`
          CREATE TRIGGER trg_equipment_checkout_decrement
          AFTER INSERT ON equipment_checkouts
          FOR EACH ROW
          BEGIN
              UPDATE equipment
              SET available_quantity = available_quantity - 1,
                  status = CASE 
                      WHEN (available_quantity - 1) <= 0 THEN 'In Use' 
                      ELSE status 
                  END
              WHERE asset_id = NEW.asset_id;
          END;
        `);
      } catch (e) {
        console.warn('Trigger 2 notice:', e.message);
      }

      // TRIGGER 3: Increment equipment stock on return
      try {
        await conn.query(`DROP TRIGGER IF EXISTS trg_equipment_checkout_return;`);
        await conn.query(`
          CREATE TRIGGER trg_equipment_checkout_return
          AFTER UPDATE ON equipment_checkouts
          FOR EACH ROW
          BEGIN
              IF OLD.return_date IS NULL AND NEW.return_date IS NOT NULL THEN
                  UPDATE equipment
                  SET available_quantity = available_quantity + 1,
                      status = CASE 
                          WHEN status = 'In Use' THEN 'Available' 
                          ELSE status 
                      END
                  WHERE asset_id = NEW.asset_id;
              END IF;
          END;
        `);
      } catch (e) {
        console.warn('Trigger 3 notice:', e.message);
      }

      // TRIGGER 4: Sync venue/equipment status when maintenance scheduled
      try {
        await conn.query(`DROP TRIGGER IF EXISTS trg_maintenance_status_sync;`);
        await conn.query(`
          CREATE TRIGGER trg_maintenance_status_sync
          AFTER INSERT ON maintenance_operations
          FOR EACH ROW
          BEGIN
              IF NEW.request_status != 'Completed' THEN
                  IF NEW.target_type = 'venue' THEN
                      UPDATE venues 
                      SET status = 'Under Maintenance' 
                      WHERE venue_id = NEW.target_id;
                  ELSEIF NEW.target_type = 'equipment' THEN
                      UPDATE equipment 
                      SET status = 'Under Maintenance' 
                      WHERE asset_id = NEW.target_id;
                  END IF;
              END IF;
          END;
        `);
      } catch (e) {
        console.warn('Trigger 4 notice:', e.message);
      }

      // TRIGGER 5: Restore venue/equipment when maintenance is completed
      try {
        await conn.query(`DROP TRIGGER IF EXISTS trg_maintenance_complete_restore;`);
        await conn.query(`
          CREATE TRIGGER trg_maintenance_complete_restore
          AFTER UPDATE ON maintenance_operations
          FOR EACH ROW
          BEGIN
              DECLARE remaining_ops INT;
              IF OLD.request_status <> 'Completed' AND NEW.request_status = 'Completed' THEN
                  SELECT COUNT(*) INTO remaining_ops
                  FROM maintenance_operations
                  WHERE target_id = NEW.target_id
                    AND request_status <> 'Completed';
                  IF remaining_ops = 0 THEN
                      IF NEW.target_type = 'venue' THEN
                          UPDATE venues SET status = 'Available'
                          WHERE venue_id = NEW.target_id AND status = 'Under Maintenance';
                      ELSEIF NEW.target_type = 'equipment' THEN
                          UPDATE equipment SET status = 'Available'
                          WHERE asset_id = NEW.target_id AND status = 'Under Maintenance';
                      END IF;
                  END IF;
              END IF;
          END;
        `);
      } catch (e) {
        console.warn('Trigger 5 notice:', e.message);
      }

      // TRIGGER 6: Mark checkouts overdue when due date is already in the past
      try {
        await conn.query(`DROP TRIGGER IF EXISTS trg_checkout_mark_overdue;`);
        await conn.query(`
          CREATE TRIGGER trg_checkout_mark_overdue
          BEFORE INSERT ON equipment_checkouts
          FOR EACH ROW
          BEGIN
              IF NEW.return_date IS NULL AND NEW.due_date < CURRENT_DATE() THEN
                  SET NEW.status = 'Overdue';
              END IF;
          END;
        `);
      } catch (e) {
        console.warn('Trigger 6 notice:', e.message);
      }

      // Step 6: Populate catalog data if empty (club resources live in MySQL, not the UI)
      const [sportRows] = await conn.query('SELECT COUNT(*) as count FROM sports');
      if (sportRows[0].count === 0) {
        await conn.query(`
          INSERT INTO sports (sport_id, sport_name, category) VALUES
          ('S1', 'Badminton', 'Indoor'),
          ('S2', 'Squash', 'Indoor'),
          ('S3', 'Basketball', 'Indoor'),
          ('S4', 'Swimming', 'Indoor'),
          ('S5', 'Tennis', 'Outdoor'),
          ('S6', 'Football', 'Outdoor'),
          ('S7', 'Cricket', 'Outdoor');
        `);
      }

      const [planRows] = await conn.query('SELECT COUNT(*) as count FROM membership_plans');
      if (planRows[0].count === 0) {
        await conn.query(`
          INSERT INTO membership_plans (plan_code, plan_name, monthly_fee, yearly_fee, equipment_discount_percent, venue_discount_percent, description, benefits)
          VALUES
          ('PLAN_GOLD', 'Gold', 2000.00, 20000.00, 30.00, 10.00, 
           'Premium club membership offering 30% off equipment rentals and 10% off venue bookings.',
           '["30% discount on all equipment loans", "10% discount on venue court bookings", "Priority booking window (7 days in advance)", "Locker room access", "2 guest passes per month"]'),
          ('PLAN_PLAT', 'Platinum', 3000.00, 30000.00, 50.00, 20.00, 
           'Elite VIP membership offering 50% off equipment rentals and 20% off venue bookings.',
           '["50% discount on all equipment loans", "20% discount on venue court bookings", "Priority booking window (14 days in advance)", "Free court hours (4 hours/month)", "Unlimited guest passes", "Sauna & recovery lounge access"]');
        `);
      }

      const seedHash = '$2b$10$MSdbhEjRW8m5FqU7mw75aeW65sYdPEit22Dcasxm2cw8WSmcceFcq';
      const [userRows] = await conn.query('SELECT COUNT(*) as count FROM users');
      if (userRows[0].count === 0) {
        await conn.query(`
          INSERT INTO users (user_id, name, username, email, phone, password_hash, role, wallet_balance, is_delinquent)
          VALUES
          (1, 'Dana Lopez', 'Dana Lopez', 'dana.admin@arenaone.club', '+91 9888877771', ?, 'admin', 5000.00, FALSE),
          (5, 'Suresh Kumar', 'Suresh Kumar', 'suresh.guest@gmail.com', '+91 9777766665', ?, 'non_member', 0.00, FALSE),
          (6, 'Facility Admin', 'admin', 'admin@clubmail.com', '+91 9888877770', ?, 'admin', 5000.00, FALSE),
          (7, 'Active Member', 'member', 'member@clubmail.com', '+91 9820011220', ?, 'member', 2000.00, FALSE),
          (8, 'Monal Pingale', 'monal', 'pingalemonal5@gmail.com', '+91 9820011229', ?, 'member', 2500.00, FALSE);
        `, [seedHash, seedHash, seedHash, seedHash, seedHash]);

        await conn.query(`
          INSERT INTO subscriptions (user_id, plan_id, billing_cycle, amount_paid, start_date, end_date, status)
          VALUES
          (7, 1, 'monthly', 2000.00, DATE_SUB(CURRENT_DATE(), INTERVAL 10 DAY), DATE_ADD(CURRENT_DATE(), INTERVAL 20 DAY), 'Active'),
          (8, 1, 'monthly', 2000.00, DATE_SUB(CURRENT_DATE(), INTERVAL 5 DAY), DATE_ADD(CURRENT_DATE(), INTERVAL 25 DAY), 'Active');
        `);
      }

      const [venueRows] = await conn.query('SELECT COUNT(*) as count FROM venues');
      if (venueRows[0].count === 0) {
        await conn.query(`
          INSERT INTO venues (venue_id, venue_name, venue_type, base_hourly_fee, parent_venue_id, sports, status)
          VALUES
          ('V1', 'Main Multi-Sport Arena', 'Hall', 800.00, NULL, '["Badminton", "Basketball"]', 'Available'),
          ('V2', 'Badminton Court 1', 'Court', 300.00, 'V1', '["Badminton"]', 'Available'),
          ('V3', 'Badminton Court 2', 'Court', 300.00, 'V1', '["Badminton"]', 'Available'),
          ('V4', 'Squash Box Glass Court', 'Court', 350.00, NULL, '["Squash"]', 'Under Maintenance'),
          ('V5', 'Olympic Heated Pool', 'Pool', 600.00, NULL, '["Swimming"]', 'Available'),
          ('V6', 'Clay Tennis Court A', 'Court', 500.00, NULL, '["Tennis"]', 'Available'),
          ('V7', 'FIFA Standard Turf Field', 'Field', 1500.00, NULL, '["Football", "Cricket"]', 'Available'),
          ('V8', 'Cricket Practice Nets', 'Nets', 400.00, 'V7', '["Cricket"]', 'Available');
        `);
      }

      const [eqRows] = await conn.query('SELECT COUNT(*) as count FROM equipment');
      if (eqRows[0].count === 0) {
        await conn.query(`
          INSERT INTO equipment (asset_id, name, category, total_quantity, available_quantity, daily_price, status)
          VALUES
          ('EQ-201', 'Yonex Astrox 88D Pro Racquet', 'Racquets', 24, 17, 150.00, 'Available'),
          ('EQ-202', 'Head Cyber Pro Squash Racquet', 'Racquets', 10, 0, 120.00, 'In Use'),
          ('EQ-310', 'Wilson Evolution Basketball Size 7', 'Balls', 15, 11, 80.00, 'Available'),
          ('EQ-311', 'Nike Pitch Football Size 5', 'Balls', 20, 14, 70.00, 'Available'),
          ('EQ-420', 'SS Complete Cricket Kit Bag', 'Kits', 6, 2, 450.00, 'Available'),
          ('EQ-501', 'Spinshot Tennis Ball Machine', 'Machines', 2, 0, 600.00, 'Under Maintenance'),
          ('EQ-610', 'Speedo Ergonomic Kickboard', 'Aquatics', 30, 26, 40.00, 'Available');
        `);
      }

      await conn.query(
        `UPDATE users SET password_hash = ? WHERE password_hash LIKE '%w8k7r5D1J8c0eYF1wVjIje%'`,
        [seedHash]
      );

      console.log('Real MySQL database connected, initialized with tables, views, triggers, and seed accounts.');
      isInitialized = true;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('MySQL initialization error:', err.message);
  }
}

// Immediate attempt to initialize database
initDatabase().catch(() => {});

export async function getDbConnection() {
  createPool();
  try {
    const conn = await pool.getConnection();
    if (!isInitialized) {
      await initDatabase().catch(() => {});
    }
    return conn;
  } catch (err) {
    console.error('Database connection error:', err.message);
    throw err;
  }
}

export const db = {
  isMock: () => false,
  getPool: () => createPool(),
  async query(sql, params = []) {
    const conn = await getDbConnection();
    try {
      const [results] = await conn.query(sql, params);
      return results;
    } finally {
      conn.release();
    }
  }
};
