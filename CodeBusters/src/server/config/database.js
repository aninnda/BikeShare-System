/**
 * SQLite Database Configuration and Initialization Module
 * 
 * This module defines a Database class for managing the SQLite connection,
 * schema initialization, and lifecycle operations for the application.
 * It handles connecting to the database, creating required tables (users, bikes,
 * rentals, reservations, state transitions, docks), and provides methods to
 * access and close the database connection.
 * 
 * Usage: Import and instantiate the Database class in your server code to
 * ensure the database is properly initialized and accessible.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            const dbPath = path.join(__dirname, '..', 'database.sqlite');
            
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.initializeTables()
                        .then(() => resolve(this.db))
                        .catch(reject);
                }
            });
        });
    }

    initializeTables() {
        return new Promise((resolve, reject) => {
            const queries = [
                // Users table
                `CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'rider',
                    first_name TEXT,
                    last_name TEXT,
                    email TEXT,
                    address TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                
                // Bikes table
                `CREATE TABLE IF NOT EXISTS bikes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bike_id TEXT UNIQUE NOT NULL,
                    model TEXT NOT NULL,
                    status TEXT DEFAULT 'available',
                    location TEXT,
                    battery_level INTEGER DEFAULT 100,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                
                // Rentals table
                `CREATE TABLE IF NOT EXISTS rentals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    bike_id INTEGER,
                    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    end_time DATETIME,
                    total_cost DECIMAL(10,2),
                    status TEXT DEFAULT 'active',
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (bike_id) REFERENCES bikes (id)
                )`,
                
                // Reservations table
                `CREATE TABLE IF NOT EXISTS reservations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    bike_id INTEGER NOT NULL,
                    dock_id TEXT,
                    reserved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    status TEXT DEFAULT 'active',
                    expires_after_minutes INTEGER DEFAULT 15,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (bike_id) REFERENCES bikes (id)
                )`,
                
                // State transitions table
                `CREATE TABLE IF NOT EXISTS state_transitions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id TEXT NOT NULL,
                    bike_id INTEGER,
                    dock_id TEXT,
                    user_id INTEGER,
                    from_state TEXT,
                    to_state TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (bike_id) REFERENCES bikes (id)
                )`,
                
                // Docks table
                `CREATE TABLE IF NOT EXISTS docks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dock_id TEXT UNIQUE NOT NULL,
                    location TEXT NOT NULL,
                    status TEXT DEFAULT 'in_service',
                    capacity INTEGER DEFAULT 1,
                    current_bike_id INTEGER,
                    last_maintenance DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (current_bike_id) REFERENCES bikes (id)
                )`,
                
                // Flex Dollars transactions table
                `CREATE TABLE IF NOT EXISTS flex_dollars_transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    transaction_type TEXT NOT NULL,
                    description TEXT,
                    related_rental_id INTEGER,
                    related_station_id TEXT,
                    balance_after DECIMAL(10,2),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (related_rental_id) REFERENCES rentals (id)
                )`,
                
                // Payment methods table
                `CREATE TABLE IF NOT EXISTS payment_methods (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    card_number_last4 TEXT NOT NULL,
                    card_holder_name TEXT NOT NULL,
                    expiry_date TEXT NOT NULL,
                    is_default INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )`
            ];

            let completed = 0;
            const total = queries.length;

            queries.forEach((query, index) => {
                this.db.run(query, (err) => {
                    if (err) {
                        console.error(`Error creating table ${index}:`, err.message);
                        reject(err);
                        return;
                    }
                    
                    completed++;
                    if (completed === total) {
                        console.log('All database tables initialized successfully');
                        this.runMigrations()
                            .then(() => resolve())
                            .catch(reject);
                    }
                });
            });
        });
    }

    runMigrations() {
        return new Promise((resolve, reject) => {
            // Add new columns to users table if they don't exist
            const migrations = [
                'ALTER TABLE users ADD COLUMN first_name TEXT',
                'ALTER TABLE users ADD COLUMN last_name TEXT', 
                'ALTER TABLE users ADD COLUMN email TEXT',
                'ALTER TABLE users ADD COLUMN address TEXT',
                'ALTER TABLE users ADD COLUMN flex_dollars DECIMAL(10,2) DEFAULT 0.00',
                'ALTER TABLE users ADD COLUMN loyalty_tier TEXT DEFAULT "none"',
                'ALTER TABLE users ADD COLUMN last_tier_check DATETIME',
                'CREATE TABLE IF NOT EXISTS loyalty_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, old_tier TEXT, new_tier TEXT, reason TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id))'
            ];

            let completed = 0;
            let hasErrors = false;

            migrations.forEach((migration, index) => {
                this.db.run(migration, (err) => {
                    completed++;
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error(`Migration ${index + 1} error:`, err.message);
                        hasErrors = true;
                    } else if (err && err.message.includes('duplicate column name')) {
                        // Column already exists, which is expected for existing databases
                    } else {
                        console.log(`Migration ${index + 1} completed: Added new user profile column`);
                    }
                    
                    if (completed === migrations.length) {
                        if (hasErrors) {
                            reject(new Error('Some migrations failed'));
                        } else {
                            console.log('Database migrations completed successfully');
                            resolve();
                        }
                    }
                });
            });
        });
    }

    getDB() {
        return this.db;
    }

    close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                    } else {
                        console.log('Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = Database;