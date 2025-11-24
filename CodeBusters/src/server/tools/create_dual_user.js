const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function createDualUser() {
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
            console.error('Failed to open DB:', err.message);
            process.exit(1);
        }
    });

    const username = 'dual';
    const password = 'dual';
    const firstName = 'Dual';
    const lastName = 'User';
    const email = 'dual.user@example.com';
    const address = '1 Dual Lane, Demo City';
    const role = 'dual';
    const initialFlex = 2.5;

    db.serialize(() => {
        // Ensure users table exists (schema migrations in server should have run, but be safe)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'rider',
            first_name TEXT,
            last_name TEXT,
            email TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Ensure flex_dollars column exists
        db.all("PRAGMA table_info('users')", (err, cols) => {
            if (err) {
                console.error('Error reading users table info:', err.message);
            } else {
                const hasFlex = Array.isArray(cols) && cols.some(c => String(c.name).toLowerCase() === 'flex_dollars');
                if (!hasFlex) {
                    db.run('ALTER TABLE users ADD COLUMN flex_dollars DECIMAL(10,2) DEFAULT 0.00', (alterErr) => {
                        if (alterErr) console.warn('Could not add flex_dollars column:', alterErr.message);
                        else console.log('Added flex_dollars column');
                    });
                }
            }
        });

        // Ensure transactions table exists
        db.run(`CREATE TABLE IF NOT EXISTS flex_dollars_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            transaction_type TEXT NOT NULL,
            description TEXT,
            related_rental_id INTEGER,
            related_station_id TEXT,
            balance_after DECIMAL(10,2),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Check existing user
        db.get('SELECT id, username, role, flex_dollars FROM users WHERE username = ?', [username], (selectErr, row) => {
            if (selectErr) {
                console.error('Error querying users:', selectErr.message);
                db.close();
                process.exit(1);
            }

            if (row) {
                console.log('User already exists:', row.username, 'id=', row.id, 'role=', row.role);
                // Update role to dual if different
                if (row.role !== role) {
                    db.run('UPDATE users SET role = ? WHERE id = ?', [role, row.id], function(uErr) {
                        if (uErr) console.error('Failed to update role:', uErr.message);
                        else console.log('Updated user role to dual');
                    });
                }
                // Do NOT modify existing user's flex balance. Keep zero balances as-is.
                db.close();
                return;
            }

            // Insert new user
            db.run('INSERT INTO users (username, password, first_name, last_name, email, address, role, flex_dollars) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [username, password, firstName, lastName, email, address, role, initialFlex], function(insertErr) {
                    if (insertErr) {
                        console.error('Error creating user:', insertErr.message);
                        db.close();
                        process.exit(1);
                    }

                    const userId = this.lastID;
                    console.log('Created user', username, 'id=', userId);
                    db.run('INSERT INTO flex_dollars_transactions (user_id, amount, transaction_type, description, balance_after) VALUES (?, ?, ?, ?, ?)',
                        [userId, initialFlex, 'award', 'Initial demo balance', initialFlex], (txErr) => {
                            if (txErr) console.error('Failed to record initial transaction:', txErr.message);
                            db.close();
                        }
                    );
                }
            );
        });
    });
}

createDualUser();
