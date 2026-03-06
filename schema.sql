-- ============================================
-- RoomsAve Hotel Management System
-- Database Schema
-- ============================================
-- NOTE: Run this script ONCE as root user:
--   CMD:        mysql -u root -p < schema.sql
--   PowerShell: Get-Content schema.sql | mysql -u root -p
-- After this, everything uses the 'hotel_admin' user.
-- ============================================

-- Step 1: Create the database
CREATE DATABASE IF NOT EXISTS hotel_management;
USE hotel_management;

-- Step 2: Create a dedicated user (change password if you want)
CREATE USER IF NOT EXISTS 'hotel_admin'@'localhost' IDENTIFIED BY 'hotel@123';
GRANT ALL PRIVILEGES ON hotel_management.* TO 'hotel_admin'@'localhost';
FLUSH PRIVILEGES;

-- ----------------------------
-- Table: USER
-- ----------------------------
CREATE TABLE IF NOT EXISTS user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(15),
    password VARCHAR(255) NOT NULL,
    role ENUM('guest', 'admin') DEFAULT 'guest'
);

-- ----------------------------
-- Table: ROOM
-- ----------------------------
CREATE TABLE IF NOT EXISTS room (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    room_type VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    status ENUM('available', 'booked', 'maintenance') DEFAULT 'available'
);

-- ----------------------------
-- Table: BOOKING
-- ----------------------------
CREATE TABLE IF NOT EXISTS booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    booking_status ENUM('confirmed', 'cancelled', 'completed') DEFAULT 'confirmed',
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES room(room_id) ON DELETE CASCADE
);

-- ----------------------------
-- Table: PAYMENT
-- ----------------------------
CREATE TABLE IF NOT EXISTS payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'upi') NOT NULL,
    payment_date DATE NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES booking(booking_id) ON DELETE CASCADE
);

-- SEED DATA
-- ============================================

-- Sample Rooms
INSERT INTO room (room_number, room_type, capacity, price_per_night, status) VALUES
('101', 'Deluxe',      2, 150.00, 'available'),
('102', 'Suite',       3, 250.00, 'available'),
('103', 'Standard',    2,  85.00, 'available'),
('201', 'Penthouse',   4, 450.00, 'available'),
('202', 'Cabin',       2, 180.00, 'booked'),
('203', 'Studio',      1, 110.00, 'available'),
('301', 'Heritage',    2,  70.00, 'available');

-- Sample Admin User (username: admin, password: admin123)
INSERT INTO user (name, username, email, phone, password, role) VALUES
('Admin', 'admin', 'admin@roomsave.com', '9999999999', 'admin123', 'admin');

-- Sample Guest User (username: johndoe, password: guest123)
INSERT INTO user (name, username, email, phone, password, role) VALUES
('John Doe', 'johndoe', 'john@example.com', '8888888888', 'guest123', 'guest');
