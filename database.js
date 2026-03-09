const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const dataDirectory = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : __dirname;

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const databasePath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(dataDirectory, "production_control.db");

const db = new sqlite3.Database(databasePath, (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log(`Connected to SQLite database at: ${databasePath}`);
  }
});

function initializeDatabase() {
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_name TEXT NOT NULL,
        mall_location TEXT NOT NULL
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_code TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active'
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS job_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_order_number TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        store_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        service_type TEXT NOT NULL,
        current_status TEXT NOT NULL DEFAULT 'Received',
        priority_level TEXT NOT NULL DEFAULT 'Normal',
        date_received DATETIME DEFAULT CURRENT_TIMESTAMP,
        due_date TEXT,
        storage_location TEXT,
        notes TEXT,
        FOREIGN KEY (store_id) REFERENCES stores(id)
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS workflow_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_order_id INTEGER NOT NULL,
        step_name TEXT NOT NULL,
        assigned_employee_id INTEGER,
        status TEXT NOT NULL DEFAULT 'Pending',
        start_time TEXT,
        end_time TEXT,
        time_spent_minutes INTEGER DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (job_order_id) REFERENCES job_orders(id),
        FOREIGN KEY (assigned_employee_id) REFERENCES employees(id)
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS movement_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_order_id INTEGER NOT NULL,
        from_location TEXT NOT NULL,
        to_location TEXT NOT NULL,
        movement_status TEXT NOT NULL DEFAULT 'In Transit',
        moved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        received_at TEXT,
        notes TEXT,
        FOREIGN KEY (job_order_id) REFERENCES job_orders(id)
      )`
    );

    seedAdmin();
    seedStores();
    seedEmployees();
  });
}

function seedAdmin() {
  db.get(`SELECT id FROM admins WHERE username = ?`, ["admin"], async (err, row) => {
    if (err) {
      console.error("Admin seed check error:", err.message);
      return;
    }

    if (row) {
      return;
    }

    try {
      const hashedPassword = await bcrypt.hash("admin123", 10);

      db.run(
        `INSERT INTO admins (username, password, full_name)
         VALUES (?, ?, ?)`,
        ["admin", hashedPassword, "System Administrator"],
        (insertErr) => {
          if (insertErr) {
            console.error("Admin seed insert error:", insertErr.message);
          } else {
            console.log("Default admin account created.");
          }
        }
      );
    } catch (hashErr) {
      console.error("Admin password hash error:", hashErr.message);
    }
  });
}

function seedStores() {
  db.get(`SELECT COUNT(*) AS count FROM stores`, (err, row) => {
    if (err) {
      console.error("Stores seed check error:", err.message);
      return;
    }

    if (row.count > 0) {
      return;
    }

    const stores = [
      ["Sole Surgeon SM Clark", "SM City Clark"],
      ["Sole Surgeon Trinoma", "Trinoma Mall"],
      ["Sole Surgeon SM Pampanga", "SM City Pampanga"],
    ];

    const stmt = db.prepare(
      `INSERT INTO stores (store_name, mall_location) VALUES (?, ?)`
    );

    stores.forEach((store) => stmt.run(store));

    stmt.finalize((finalizeErr) => {
      if (finalizeErr) {
        console.error("Stores seed finalize error:", finalizeErr.message);
      } else {
        console.log("Default stores seeded.");
      }
    });
  });
}

function seedEmployees() {
  db.get(`SELECT COUNT(*) AS count FROM employees`, (err, row) => {
    if (err) {
      console.error("Employees seed check error:", err.message);
      return;
    }

    if (row.count > 0) {
      return;
    }

    const employees = [
      ["EMP-001", "Marco Santos", "Cleaning Technician"],
      ["EMP-002", "Ana Reyes", "Restoration Specialist"],
      ["EMP-003", "John Cruz", "Quality Control Staff"],
    ];

    const stmt = db.prepare(
      `INSERT INTO employees (employee_code, full_name, role)
       VALUES (?, ?, ?)`
    );

    employees.forEach((employee) => stmt.run(employee));

    stmt.finalize((finalizeErr) => {
      if (finalizeErr) {
        console.error("Employees seed finalize error:", finalizeErr.message);
      } else {
        console.log("Default employees seeded.");
      }
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
};