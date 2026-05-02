import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database;

export async function getDb() {
  if (!db) {
    db = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });
    await initDb();
  }
  return db;
}

async function initDb() {
    // 1. Users
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('seasonal', 'supervisor', 'manager')),
        phone TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Companies
    await db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        company_id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Projects
    await db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        project_id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        company_id INTEGER REFERENCES companies(company_id),
        is_active BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Units
    await db.exec(`
      CREATE TABLE IF NOT EXISTS units (
        unit_id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_number TEXT NOT NULL,
        project_id INTEGER REFERENCES projects(project_id),
        company_id INTEGER REFERENCES companies(company_id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Assigned Tasks
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        task_id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_type TEXT NOT NULL CHECK (task_type IN ('تسليم', 'استلام', 'تشغيل')),
        created_by INTEGER REFERENCES users(user_id),
        assigned_to INTEGER REFERENCES users(user_id),
        project_id INTEGER REFERENCES projects(project_id),
        unit_id INTEGER REFERENCES units(unit_id),
        status TEXT DEFAULT 'مسندة' CHECK (status IN ('مسندة', 'تم', 'متأخرة')),
        due_date DATE,
        submitted_at DATETIME,
        photo_url TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Self-Documented Tasks
    await db.exec(`
      CREATE TABLE IF NOT EXISTS task_documentation (
        doc_id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_type TEXT NOT NULL CHECK (doc_type IN ('تسليم', 'استلام', 'تشغيل')),
        documented_by INTEGER REFERENCES users(user_id),
        project_id INTEGER REFERENCES projects(project_id),
        unit_id INTEGER REFERENCES units(unit_id),
        photo_url TEXT,
        notes TEXT,
        documented_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Task Status Audit Log
    await db.exec(`
      CREATE TABLE IF NOT EXISTS task_status_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER REFERENCES tasks(task_id),
        changed_by INTEGER REFERENCES users(user_id),
        old_status TEXT,
        new_status TEXT,
        comment TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
}
