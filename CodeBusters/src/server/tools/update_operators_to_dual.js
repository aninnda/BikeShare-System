const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Updates all existing users with role 'operator' to role 'dual'
 * This allows operators to also act as riders
 */
async function updateOperatorsToDual() {
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error('Failed to open DB:', err.message);
            process.exit(1);
        }
        console.log('Connected to database:', dbPath);
    });

    db.serialize(() => {
        // First, check how many operators exist
        db.get("SELECT COUNT(*) as count FROM users WHERE role = 'operator'", (err, row) => {
            if (err) {
                console.error('Error counting operators:', err.message);
                db.close();
                process.exit(1);
            }

            const operatorCount = row.count;
            console.log(`Found ${operatorCount} user(s) with role 'operator'`);

            if (operatorCount === 0) {
                console.log('No operators to update. Exiting.');
                db.close();
                return;
            }

            // Show the operators that will be updated
            db.all("SELECT id, username, first_name, last_name, email FROM users WHERE role = 'operator'", (err, operators) => {
                if (err) {
                    console.error('Error fetching operators:', err.message);
                    db.close();
                    process.exit(1);
                }

                console.log('\nOperators to be updated to "dual" role:');
                operators.forEach(op => {
                    console.log(`  - ID: ${op.id}, Username: ${op.username}, Name: ${op.first_name} ${op.last_name}, Email: ${op.email}`);
                });

                // Perform the update
                db.run("UPDATE users SET role = 'dual' WHERE role = 'operator'", function(updateErr) {
                    if (updateErr) {
                        console.error('Error updating operators:', updateErr.message);
                        db.close();
                        process.exit(1);
                    }

                    console.log(`\nSuccessfully updated ${this.changes} user(s) from 'operator' to 'dual' role.`);
                    console.log('These users can now switch between operator and rider views.');
                    
                    db.close();
                });
            });
        });
    });
}

// Run the update
updateOperatorsToDual();
