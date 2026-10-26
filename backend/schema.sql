-- =====================================================================
-- Sports Club Management System Database Schema
-- MySQL 8.0+ Compatible
-- Includes Tables, Constraints, Views, Triggers, and Seed Data
-- =====================================================================

CREATE DATABASE IF NOT EXISTS sports_club_db;
USE sports_club_db;

-- Drop views if existing
DROP VIEW IF EXISTS vw_member_active_checkouts;
DROP VIEW IF EXISTS vw_venue_booking_details;
DROP VIEW IF EXISTS vw_member_profiles_summary;

-- Drop triggers if existing
DROP TRIGGER IF EXISTS trg_prevent_venue_double_booking;
DROP TRIGGER IF EXISTS trg_equipment_checkout_decrement;
DROP TRIGGER IF EXISTS trg_equipment_checkout_return;
DROP TRIGGER IF EXISTS trg_maintenance_status_sync;

-- Drop tables in dependency order
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS equipment_checkouts;
DROP TABLE IF EXISTS venue_bookings;
DROP TABLE IF EXISTS maintenance_operations;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS venues;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS membership_plans;
DROP TABLE IF EXISTS users;

-- =====================================================================
-- 1. USERS & ROLES
-- Roles: 'non_member', 'member', 'admin'
-- =====================================================================
CREATE TABLE users (
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

-- =====================================================================
-- 2. MEMBERSHIP TIERS & PLANS
-- Gold: ₹2,000/mo or ₹20,000/yr, 30% equip discount, 10% venue discount
-- Platinum: ₹3,000/mo or ₹30,000/yr, 50% equip discount, 20% venue discount
-- =====================================================================
CREATE TABLE membership_plans (
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

-- =====================================================================
-- 3. USER SUBSCRIPTIONS
-- =====================================================================
CREATE TABLE subscriptions (
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

-- =====================================================================
-- 4. VENUES & FACILITIES
-- =====================================================================
CREATE TABLE venues (
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

-- =====================================================================
-- 5. VENUE BOOKINGS
-- =====================================================================
CREATE TABLE venue_bookings (
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

-- =====================================================================
-- 6. EQUIPMENT & INVENTORY
-- =====================================================================
CREATE TABLE equipment (
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

-- =====================================================================
-- 7. EQUIPMENT CHECKOUTS / ISSUES
-- =====================================================================
CREATE TABLE equipment_checkouts (
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

-- =====================================================================
-- 8. MAINTENANCE OPERATIONS
-- =====================================================================
CREATE TABLE maintenance_operations (
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

-- =====================================================================
-- 9. PAYMENTS & TRANSACTIONS
-- =====================================================================
CREATE TABLE payments (
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

-- =====================================================================
-- ADVANCED DATABASE FEATURES: SQL VIEWS
-- =====================================================================

-- VIEW 1: Combining member details with active checkouts & overdue calculations
CREATE VIEW vw_member_active_checkouts AS
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
    mp.plan_name AS membership_tier,
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

-- VIEW 2: Venue Booking Details with Member Tier, Applied Discounts & Venue Info
CREATE VIEW vw_venue_booking_details AS
SELECT 
    b.booking_id,
    b.venue_id,
    v.venue_name,
    v.venue_type,
    v.base_hourly_fee,
    u.user_id,
    u.name AS member_name,
    u.email AS member_email,
    mp.plan_name AS membership_tier,
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

-- VIEW 3: Member Profile & Aggregate Club Engagement Summary
CREATE VIEW vw_member_profiles_summary AS
SELECT 
    u.user_id,
    u.name,
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
GROUP BY u.user_id, u.name, u.email, u.phone, u.role, u.wallet_balance, u.is_delinquent, mp.plan_name, s.billing_cycle, s.end_date;

-- =====================================================================
-- ADVANCED DATABASE FEATURES: SQL TRIGGERS
-- =====================================================================

DELIMITER $$

-- TRIGGER 1: Prevent double-booking of venue slots
CREATE TRIGGER trg_prevent_venue_double_booking
BEFORE INSERT ON venue_bookings
FOR EACH ROW
BEGIN
    DECLARE conflict_count INT;
    
    -- Check for overlapping active bookings for the same venue
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
END$$

-- TRIGGER 2: Update equipment inventory status on checkout
CREATE TRIGGER trg_equipment_checkout_decrement
AFTER INSERT ON equipment_checkouts
FOR EACH ROW
BEGIN
    -- Decrement available stock
    UPDATE equipment
    SET available_quantity = available_quantity - 1,
        status = CASE 
            WHEN (available_quantity - 1) <= 0 THEN 'In Use' 
            ELSE status 
        END
    WHERE asset_id = NEW.asset_id;
END$$

-- TRIGGER 3: Update equipment inventory status on return
CREATE TRIGGER trg_equipment_checkout_return
AFTER UPDATE ON equipment_checkouts
FOR EACH ROW
BEGIN
    -- If item was just returned
    IF OLD.return_date IS NULL AND NEW.return_date IS NOT NULL THEN
        UPDATE equipment
        SET available_quantity = available_quantity + 1,
            status = CASE 
                WHEN status = 'In Use' THEN 'Available' 
                ELSE status 
            END
        WHERE asset_id = NEW.asset_id;
    END IF;
END$$

-- TRIGGER 4: Automatically sync venue/equipment status when maintenance operation is scheduled
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
END$$

DELIMITER ;

-- =====================================================================
-- SEED DATA INITIALIZATION
-- =====================================================================

-- 1. Insert Membership Plans
INSERT INTO membership_plans (plan_code, plan_name, monthly_fee, yearly_fee, equipment_discount_percent, venue_discount_percent, description, benefits)
VALUES
('PLAN_GOLD', 'Gold', 2000.00, 20000.00, 30.00, 10.00, 
 'Premium club membership offering 30% off equipment rentals and 10% off venue bookings.',
 '["30% discount on all equipment loans", "10% discount on venue court bookings", "Priority booking window (7 days in advance)", "Locker room access", "2 guest passes per month"]'),
('PLAN_PLAT', 'Platinum', 3000.00, 30000.00, 50.00, 20.00, 
 'Elite VIP membership offering 50% off equipment rentals and 20% off venue bookings.',
 '["50% discount on all equipment loans", "20% discount on venue court bookings", "Priority booking window (14 days in advance)", "Free court hours (4 hours/month)", "Unlimited guest passes", "Sauna & recovery lounge access"]');

-- 2. Insert Users (Admin, Members, Non-Members)
-- Password for all mock users is 'password123' (bcrypt hash)
INSERT INTO users (user_id, name, username, email, phone, password_hash, role, wallet_balance, is_delinquent)
VALUES
(1, 'Dana Lopez', 'Dana Lopez', 'dana.admin@arenaone.club', '+91 9888877771', '$2b$10$w8k7r5D1J8c0eYF1wVjIje2b3sF9h6HqQZgY7hA3yWpXzQZgY7hA3', 'admin', 5000.00, FALSE),
(2, 'Aarav Mehta', 'Aarav Mehta', 'aarav.mehta@clubmail.com', '+91 9820011223', '$2b$10$w8k7r5D1J8c0eYF1wVjIje2b3sF9h6HqQZgY7hA3yWpXzQZgY7hA3', 'member', 2450.00, FALSE),
(3, 'Priya Sharma', 'Priya Sharma', 'priya.sharma@clubmail.com', '+91 9811122334', '$2b$10$w8k7r5D1J8c0eYF1wVjIje2b3sF9h6HqQZgY7hA3yWpXzQZgY7hA3', 'member', 5100.00, FALSE),
(4, 'Rohan Kapoor', 'Rohan Kapoor', 'rohan.kapoor@clubmail.com', '+91 9899988776', '$2b$10$w8k7r5D1J8c0eYF1wVjIje2b3sF9h6HqQZgY7hA3yWpXzQZgY7hA3', 'member', 180.00, TRUE),
(5, 'Suresh Kumar', 'Suresh Kumar', 'suresh.guest@gmail.com', '+91 9777766665', '$2b$10$w8k7r5D1J8c0eYF1wVjIje2b3sF9h6HqQZgY7hA3yWpXzQZgY7hA3', 'non_member', 0.00, FALSE),
(6, 'Facility Admin', 'admin', 'admin@clubmail.com', '+91 9888877770', '$2b$10$w8k7r5D1J8c0eYF1wVjIje2b3sF9h6HqQZgY7hA3yWpXzQZgY7hA3', 'admin', 5000.00, FALSE),
(7, 'Active Member', 'member', 'member@clubmail.com', '+91 9820011220', '$2b$10$w8k7r5D1J8c0eYF1wVjIje2b3sF9h6HqQZgY7hA3yWpXzQZgY7hA3', 'member', 2000.00, FALSE),
(8, 'Monal Pingale', 'monal', 'pingalemonal5@gmail.com', '+91 9820011229', '$2b$10$w8k7r5D1J8c0eYF1wVjIje2b3sF9h6HqQZgY7hA3yWpXzQZgY7hA3', 'member', 2500.00, FALSE);

-- 3. Insert Subscriptions
INSERT INTO subscriptions (subscription_id, user_id, plan_id, billing_cycle, amount_paid, start_date, end_date, status)
VALUES
(1, 2, 1, 'monthly', 2000.00, DATE_SUB(CURRENT_DATE(), INTERVAL 20 DAY), DATE_ADD(CURRENT_DATE(), INTERVAL 10 DAY), 'Active'),
(2, 3, 2, 'yearly', 30000.00, DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY), DATE_ADD(CURRENT_DATE(), INTERVAL 305 DAY), 'Active'),
(3, 4, 1, 'monthly', 2000.00, DATE_SUB(CURRENT_DATE(), INTERVAL 35 DAY), DATE_SUB(CURRENT_DATE(), INTERVAL 5 DAY), 'Expired'),
(4, 7, 1, 'monthly', 2000.00, DATE_SUB(CURRENT_DATE(), INTERVAL 10 DAY), DATE_ADD(CURRENT_DATE(), INTERVAL 20 DAY), 'Active'),
(5, 8, 1, 'monthly', 2000.00, DATE_SUB(CURRENT_DATE(), INTERVAL 5 DAY), DATE_ADD(CURRENT_DATE(), INTERVAL 25 DAY), 'Active');

-- 4. Insert Venues
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

-- 5. Insert Equipment
INSERT INTO equipment (asset_id, name, category, total_quantity, available_quantity, daily_price, status)
VALUES
('EQ-201', 'Yonex Astrox 88D Pro Racquet', 'Racquets', 24, 17, 150.00, 'Available'),
('EQ-202', 'Head Cyber Pro Squash Racquet', 'Racquets', 10, 0, 120.00, 'In Use'),
('EQ-310', 'Wilson Evolution Basketball Size 7', 'Balls', 15, 11, 80.00, 'Available'),
('EQ-311', 'Nike Pitch Football Size 5', 'Balls', 20, 14, 70.00, 'Available'),
('EQ-420', 'SS Complete Cricket Kit Bag', 'Kits', 6, 2, 450.00, 'Available'),
('EQ-501', 'Spinshot Tennis Ball Machine', 'Machines', 2, 0, 600.00, 'Under Maintenance'),
('EQ-610', 'Speedo Ergonomic Kickboard', 'Aquatics', 30, 26, 40.00, 'Available');

-- 6. Insert Equipment Checkouts
INSERT INTO equipment_checkouts (checkout_id, asset_id, user_id, issue_date, due_date, return_date, daily_rate, discount_percent, late_fee, status)
VALUES
(1, 'EQ-202', 2, DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY), DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY), NULL, 84.00, 30.00, 300.00, 'Overdue'),
(2, 'EQ-201', 3, DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY), DATE_ADD(CURRENT_DATE(), INTERVAL 2 DAY), NULL, 75.00, 50.00, 0.00, 'Active'),
(3, 'EQ-420', 2, DATE_SUB(CURRENT_DATE(), INTERVAL 10 DAY), DATE_SUB(CURRENT_DATE(), INTERVAL 5 DAY), DATE_SUB(CURRENT_DATE(), INTERVAL 5 DAY), 315.00, 30.00, 0.00, 'Returned');

-- 7. Insert Venue Bookings
INSERT INTO venue_bookings (booking_id, venue_id, user_id, start_time, end_time, base_rate, discount_amount, total_cost, status)
VALUES
(1, 'V2', 2, CONCAT(CURRENT_DATE(), ' 09:00:00'), CONCAT(CURRENT_DATE(), ' 11:00:00'), 600.00, 60.00, 540.00, 'Confirmed'),
(2, 'V5', 3, CONCAT(CURRENT_DATE(), ' 07:00:00'), CONCAT(CURRENT_DATE(), ' 08:00:00'), 600.00, 120.00, 480.00, 'Confirmed'),
(3, 'V6', 2, CONCAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY), ' 17:00:00'), CONCAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY), ' 19:00:00'), 1000.00, 100.00, 900.00, 'Completed');

-- 8. Insert Maintenance Operations
INSERT INTO maintenance_operations (operation_id, target_type, target_id, description, priority, request_status, scheduled_date, technician_notes)
VALUES
(1, 'venue', 'V4', 'Front squash wall plaster line crack repair and repainting.', 'High', 'In Progress', DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY), 'Contractor on site; plaster setting.'),
(2, 'equipment', 'EQ-501', 'Ball feeder motor calibration and battery replacement.', 'Medium', 'Pending', CURRENT_DATE(), 'Awaiting replacement motor gear.'),
(3, 'venue', 'V5', 'Pool lane 3 float rope anchoring bolt replacement.', 'Low', 'Completed', DATE_SUB(CURRENT_DATE(), INTERVAL 5 DAY), 'Repaired and tested safety tension.');
