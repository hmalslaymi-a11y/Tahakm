import { getDb } from './db.js';
import bcrypt from 'bcryptjs';

export async function seedDb() {
  const db = await getDb();

  // Check if seeded
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count > 0) return;

  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('123456', 10);

  // Users
  await db.run(
    'INSERT INTO users (full_name, role, email, password_hash) VALUES (?, ?, ?, ?)',
    ['أحمد المدير', 'manager', 'manager@test.com', passwordHash]
  );
  await db.run(
    'INSERT INTO users (full_name, role, email, password_hash) VALUES (?, ?, ?, ?)',
    ['المشرف الرئيسي', 'manager', 'hmalslaymi@kidana.com.sa', await bcrypt.hash('H@1234', 10)]
  );
  await db.run(
    'INSERT INTO users (full_name, role, email, password_hash) VALUES (?, ?, ?, ?)',
    ['سارة المشرفة', 'supervisor', 'super@test.com', passwordHash]
  );
  await db.run(
    'INSERT INTO users (full_name, role, email, password_hash) VALUES (?, ?, ?, ?)',
    ['موظف موسمي', 'seasonal', 'h@gmail.com', await bcrypt.hash('H2@1234', 10)]
  );
  await db.run(
    'INSERT INTO users (full_name, role, email, password_hash) VALUES (?, ?, ?, ?)',
    ['محمد الموسمي', 'seasonal', 'seasonal@test.com', passwordHash]
  );

  // Companies
  await db.run('INSERT INTO companies (company_name) VALUES (?)', ['شركة الإتقان العقارية']);
  await db.run('INSERT INTO companies (company_name) VALUES (?)', ['مجموعة الرياض للتطوير']);

  // Projects
  await db.run('INSERT INTO projects (project_name, company_id) VALUES (?, ?)', ['مشروع النخيل', 1]);
  await db.run('INSERT INTO projects (project_name, company_id) VALUES (?, ?)', ['مشروع الواجهة البحرية', 2]);

  // Units
  await db.run('INSERT INTO units (unit_number, project_id, company_id) VALUES (?, ?, ?)', ['A-101', 1, 1]);
  await db.run('INSERT INTO units (unit_number, project_id, company_id) VALUES (?, ?, ?)', ['A-102', 1, 1]);
  await db.run('INSERT INTO units (unit_number, project_id, company_id) VALUES (?, ?, ?)', ['A-103', 1, 1]);

  // Tasks
  const today = new Date();
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const yesterday = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  await db.run(
    'INSERT INTO tasks (task_type, created_by, assigned_to, project_id, unit_id, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['تسليم', 2, 3, 1, 1, 'مسندة', threeDaysLater]
  );
  await db.run(
    'INSERT INTO tasks (task_type, created_by, assigned_to, project_id, unit_id, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['استلام', 2, 3, 1, 2, 'متأخرة', yesterday]
  );
  await db.run(
    'INSERT INTO tasks (task_type, created_by, assigned_to, project_id, unit_id, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['تشغيل', 2, 3, 1, 3, 'تم', nextWeek]
  );

  console.log('Seeding complete.');
}
