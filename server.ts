import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db.js';
import { seedDb } from './server/seed.js';
import { verifyToken, requireRole } from './server/middleware/auth.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import * as xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static('uploads'));

  // Ensure uploads directory exists
  import('fs').then(fs => {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
  });

  // DB init
  await seedDb();
  const db = await getDb();

  // AUTH
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ user_id: user.user_id, role: user.role, email: user.email }, JWT_SECRET);
    res.json({ token, user: { user_id: user.user_id, full_name: user.full_name, role: user.role } });
  });

  app.get('/api/auth/me', verifyToken, async (req: any, res) => {
    const user = await db.get('SELECT user_id, full_name, role, email FROM users WHERE user_id = ?', [req.user.user_id]);
    res.json(user);
  });

  // TASKS
  app.get('/api/tasks', verifyToken, async (req: any, res) => {
    // Auto-update delayed tasks (if past due date)
    await db.run(
        `UPDATE tasks 
         SET status = 'متأخرة' 
         WHERE status = 'مسندة' 
         AND due_date IS NOT NULL 
         AND due_date != ''
         AND date(due_date) < date('now', 'localtime')`
    );

    const { assigned_to, status, project_id } = req.query;
    let query = `
      SELECT t.*, p.project_name, u.unit_number, creator.full_name as creator_name, assignee.full_name as assignee_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.project_id
      JOIN units u ON t.unit_id = u.unit_id
      JOIN users creator ON t.created_by = creator.user_id
      LEFT JOIN users assignee ON t.assigned_to = assignee.user_id
      WHERE 1=1
    `;
    const params = [];
    if (req.user.role === 'seasonal') {
      query += ' AND t.assigned_to = ?';
      params.push(req.user.user_id);
    } else if (assigned_to) {
      query += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }
    if (status && status !== 'الكل') {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (project_id) {
      query += ' AND t.project_id = ?';
      params.push(project_id);
    }
    const tasks = await db.all(query, params);
    res.json(tasks);
  });

  app.post('/api/tasks', verifyToken, requireRole(['supervisor', 'manager']), async (req: any, res) => {
    const { task_type, assigned_to, project_id, unit_id, due_date } = req.body;
    const result = await db.run(
      'INSERT INTO tasks (task_type, created_by, assigned_to, project_id, unit_id, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [task_type, req.user.user_id, assigned_to, project_id, unit_id, due_date]
    );
    const taskId = result.lastID;
    await db.run('INSERT INTO task_status_log (task_id, changed_by, old_status, new_status, comment) VALUES (?, ?, ?, ?, ?)',
      [taskId, req.user.user_id, null, 'مسندة', 'تم إسناد المهمة']);
    res.json({ success: true, taskId });
  });

  app.patch('/api/tasks/:id', verifyToken, upload.single('photo'), async (req: any, res) => {
    const { status, notes, comment } = req.body;
    const taskId = req.params.id;
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const oldTask = await db.get('SELECT * FROM tasks WHERE task_id = ?', [taskId]);
    if (!oldTask) return res.status(404).json({ message: 'Task not found' });

    let updateQuery = 'UPDATE tasks SET task_id = task_id';
    const params = [];
    if (status) {
      updateQuery += ', status = ?';
      params.push(status);
    }
    if (photoUrl) {
      updateQuery += ', photo_url = ?';
      params.push(photoUrl);
    }
    if (notes) {
      updateQuery += ', notes = ?';
      params.push(notes);
    }
    if (status === 'تم') {
      updateQuery += ', submitted_at = CURRENT_TIMESTAMP';
    }
    updateQuery += ' WHERE task_id = ?';
    params.push(taskId);

    await db.run(updateQuery, params);

    if (status || comment) {
        await db.run('INSERT INTO task_status_log (task_id, changed_by, old_status, new_status, comment) VALUES (?, ?, ?, ?, ?)',
            [taskId, req.user.user_id, oldTask.status, status || oldTask.status, comment || notes || 'تحديث المهمة']);
    }

    // Sync to documentation log if completed, so it shows in operational reports
    if (status === 'تم') {
        const docTypes = ['تسليم', 'استلام', 'تشغيل'];
        if (docTypes.includes(oldTask.task_type)) {
            // Check if already documented to avoid duplicates
            const existingDoc = await db.get('SELECT doc_id FROM task_documentation WHERE unit_id = ? AND doc_type = ? AND project_id = ?', 
                [oldTask.unit_id, oldTask.task_type, oldTask.project_id]);
            
            if (!existingDoc) {
                await db.run(
                    'INSERT INTO task_documentation (doc_type, documented_by, project_id, unit_id, photo_url, notes) VALUES (?, ?, ?, ?, ?, ?)',
                    [oldTask.task_type, req.user.user_id, oldTask.project_id, oldTask.unit_id, photoUrl || oldTask.photo_url, notes || 'تم الإكمال من سجل المهام']
                );
            }
        }
    }

    res.json({ success: true });
  });

  app.get('/api/tasks/:id/logs', verifyToken, async (req, res) => {
    const logs = await db.all(`
        SELECT l.*, u.full_name as user_name
        FROM task_status_log l
        JOIN users u ON l.changed_by = u.user_id
        WHERE l.task_id = ?
        ORDER BY l.changed_at DESC
    `, [req.params.id]);
    res.json(logs);
  });

  // DOCUMENTATION
  app.post('/api/documentation', verifyToken, upload.single('photo'), async (req: any, res) => {
    const { doc_type, project_id, unit_id, notes } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    // 1. Insert into documentation log
    await db.run(
        'INSERT INTO task_documentation (doc_type, documented_by, project_id, unit_id, photo_url, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [doc_type, req.user.user_id, project_id, unit_id, photo_url, notes]
    );

    // 2. Automatically mark the corresponding assigned task as completed if it exists
    // We look for a task of the same type for this unit/project assigned to this user that is still pending
    const pendingTask = await db.get(
        'SELECT task_id FROM tasks WHERE project_id = ? AND unit_id = ? AND task_type = ? AND assigned_to = ? AND status = "مسندة"',
        [project_id, unit_id, doc_type, req.user.user_id]
    );

    if (pendingTask) {
        await db.run(
            'UPDATE tasks SET status = "تم", notes = ?, photo_url = ?, submitted_at = CURRENT_TIMESTAMP WHERE task_id = ?',
            [notes || 'تم التوثيق من صفحة العمليات', photo_url, pendingTask.task_id]
        );

        await db.run(
            'INSERT INTO task_status_log (task_id, changed_by, old_status, new_status, comment) VALUES (?, ?, ?, ?, ?)',
            [pendingTask.task_id, req.user.user_id, 'مسندة', 'تم', 'تم الإنجاز عبر التوثيق الميداني']
        );
    }

    res.json({ success: true });
  });

  app.get('/api/documentation', verifyToken, requireRole(['supervisor', 'manager']), async (req, res) => {
    const docs = await db.all(`
        SELECT d.*, p.project_name, u.unit_number, us.full_name as user_name
        FROM task_documentation d
        JOIN projects p ON d.project_id = p.project_id
        JOIN units u ON d.unit_id = u.unit_id
        JOIN users us ON d.documented_by = us.user_id
        ORDER BY d.documented_at DESC
    `);
    res.json(docs);
  });

  // USERS
  app.get('/api/users', verifyToken, async (req: any, res) => {
    const { role } = req.query;
    let query = 'SELECT user_id, full_name, role, email, phone, is_active FROM users WHERE 1=1';
    const params = [];
    if (role) {
        if (role === 'seasonal') {
            query += ' AND role = "seasonal"';
        } else if (role === 'staff') {
            query += ' AND role IN ("supervisor", "manager")';
        }
    }
    const users = await db.all(query, params);
    res.json(users);
  });

  app.post('/api/users', verifyToken, requireRole(['manager']), async (req, res) => {
    const { full_name, email, role, phone, password } = req.body;
    const hash = await bcrypt.hash(password || '123456', 10);
    await db.run(
        'INSERT INTO users (full_name, email, role, phone, password_hash) VALUES (?, ?, ?, ?, ?)',
        [full_name, email, role, phone, hash]
    );
    res.json({ success: true });
  });

  app.patch('/api/users/:id', verifyToken, requireRole(['supervisor', 'manager']), async (req, res) => {
    const { full_name, role, is_active, phone, email } = req.body;
    // Only manager can change role
    // Need to implement role check for that specific field
    await db.run(
        'UPDATE users SET full_name = COALESCE(?, full_name), role = COALESCE(?, role), is_active = COALESCE(?, is_active), phone = COALESCE(?, phone), email = COALESCE(?, email) WHERE user_id = ?',
        [full_name, role, is_active, phone, email, req.params.id]
    );
    res.json({ success: true });
  });

  app.delete('/api/users/:id', verifyToken, requireRole(['manager']), async (req, res) => {
    await db.run('DELETE FROM users WHERE user_id = ?', [req.params.id]);
    res.json({ success: true });
  });

  // PROJECTS
  app.get('/api/projects', verifyToken, async (req, res) => {
    const projects = await db.all(`
        SELECT p.*, c.company_name
        FROM projects p
        JOIN companies c ON p.company_id = c.company_id
    `);
    res.json(projects);
  });
  app.post('/api/projects', verifyToken, requireRole(['manager']), async (req, res) => {
    const { project_name, company_id } = req.body;
    await db.run('INSERT INTO projects (project_name, company_id) VALUES (?, ?)', [project_name, company_id]);
    res.json({ success: true });
  });
  app.patch('/api/projects/:id', verifyToken, requireRole(['manager']), async (req, res) => {
    const { project_name, company_id } = req.body;
    await db.run('UPDATE projects SET project_name = COALESCE(?, project_name), company_id = COALESCE(?, company_id) WHERE project_id = ?', [project_name, company_id, req.params.id]);
    res.json({ success: true });
  });
  app.delete('/api/projects/:id', verifyToken, requireRole(['manager']), async (req, res) => {
    try {
        await db.run('DELETE FROM projects WHERE project_id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ message: 'لا يمكن حذف المشروع لوجود بيانات مرتبطة به' });
    }
  });

  // COMPANIES
  app.get('/api/companies', verifyToken, async (req, res) => {
    const companies = await db.all('SELECT * FROM companies');
    res.json(companies);
  });
  app.post('/api/companies', verifyToken, requireRole(['manager']), async (req, res) => {
    const { company_name } = req.body;
    await db.run('INSERT INTO companies (company_name) VALUES (?)', [company_name]);
    res.json({ success: true });
  });
  app.delete('/api/companies/:id', verifyToken, requireRole(['manager']), async (req, res) => {
    try {
        await db.run('DELETE FROM companies WHERE company_id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ message: 'لا يمكن حذف الشركة لوجود بيانات مرتبطة بها' });
    }
  });

  // UNITS
  app.get('/api/units', verifyToken, async (req, res) => {
    const { project_id } = req.query;
    let query = `
        SELECT u.*, p.project_name, c.company_name
        FROM units u
        JOIN projects p ON u.project_id = p.project_id
        JOIN companies c ON u.company_id = c.company_id
    `;
    const params = [];
    if (project_id) {
        query += ' WHERE u.project_id = ?';
        params.push(project_id);
    }
    const units = await db.all(query, params);
    res.json(units);
  });
  app.post('/api/units', verifyToken, requireRole(['manager', 'supervisor']), async (req, res) => {
    const { unit_number, project_id, company_id } = req.body;
    await db.run('INSERT INTO units (unit_number, project_id, company_id) VALUES (?, ?, ?)', [unit_number, project_id, company_id]);
    res.json({ success: true });
  });

  // EXPORT / IMPORT
  app.get('/api/export/:table', verifyToken, requireRole(['supervisor', 'manager']), async (req, res) => {
    const table = req.params.table;
    const data = await db.all(`SELECT * FROM ${table}`);
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, table);
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename=${table}.xlsx`);
    res.send(buf);
  });

  app.post('/api/import/:table', verifyToken, requireRole(['manager']), upload.single('file'), async (req: any, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    const table = req.params.table;

    // VERY BASIC IMPORT: Delete all and replace
    // In production, we should map fields and validate
    await db.run(`DELETE FROM ${table}`);
    for (const row of data) {
        const keys = Object.keys(row).join(', ');
        const placeholders = Object.keys(row).map(() => '?').join(', ');
        const values = Object.values(row);
        await db.run(`INSERT INTO ${table} (${keys}) VALUES (${placeholders})`, values);
    }
    res.json({ success: true, count: data.length });
  });

  // REPORTS
  app.get('/api/reports/tasks', verifyToken, requireRole(['supervisor', 'manager']), async (req: any, res) => {
    // Auto-update delayed tasks (if past due date)
    await db.run(
        `UPDATE tasks 
         SET status = 'متأخرة' 
         WHERE status = 'مسندة' 
         AND due_date IS NOT NULL 
         AND due_date != ''
         AND date(due_date) < date('now', 'localtime')`
    );

    const { project_id, assigned_to } = req.query;
    let baseQuery = 'FROM tasks WHERE 1=1';
    const params = [];
    if (project_id) {
        baseQuery += ' AND project_id = ?';
        params.push(project_id);
    }
    if (assigned_to) {
        baseQuery += ' AND assigned_to = ?';
        params.push(assigned_to);
    }

    const total = await db.get(`SELECT COUNT(*) as count ${baseQuery}`, params);
    const completed = await db.get(`SELECT COUNT(*) as count ${baseQuery} AND status = "تم"`, params);
    const late = await db.get(`SELECT COUNT(*) as count ${baseQuery} AND status = "متأخرة"`, params);
    const pending = await db.get(`SELECT COUNT(*) as count ${baseQuery} AND status = "مسندة"`, params);

    res.json({
        total: total.count,
        completed: completed.count,
        late: late.count,
        pending: pending.count,
        percent: total.count > 0 ? Math.round((completed.count / total.count) * 100) : 0
    });
  });

  app.get('/api/reports/operational', verifyToken, requireRole(['supervisor', 'manager']), async (req: any, res) => {
    // Auto-update delayed tasks (if past due date)
    await db.run(
        `UPDATE tasks 
         SET status = 'متأخرة' 
         WHERE status = 'مسندة' 
         AND due_date IS NOT NULL 
         AND due_date != ''
         AND date(due_date) < date('now', 'localtime')`
    );

    const { project_id, company_id, from_date, to_date } = req.query;
    
    let unitFilters = 'WHERE 1=1';
    const unitParams = [];
    if (project_id) {
        unitFilters += ' AND u.project_id = ?';
        unitParams.push(project_id);
    }
    if (company_id) {
        unitFilters += ' AND u.company_id = ?';
        unitParams.push(company_id);
    }

    // 1. Get total units
    const totalUnitsCount = await db.get(`SELECT COUNT(*) as count FROM units u ${unitFilters}`, unitParams);
    const totalUnits = totalUnitsCount.count;

    // 2. Get delivery status (from tasks)
    let deliveryFilters = 'WHERE task_type = "تسليم" AND status = "تم"';
    const deliveryParams = [];
    if (project_id) {
        deliveryFilters += ' AND project_id = ?';
        deliveryParams.push(project_id);
    }
    if (company_id) {
        // units are linked to projects and projects to company, but unit table has company_id too
        deliveryFilters += ' AND unit_id IN (SELECT unit_id FROM units WHERE company_id = ?)';
        deliveryParams.push(company_id);
    }
    const deliveryCompleted = await db.get(`SELECT COUNT(DISTINCT unit_id) as count FROM tasks ${deliveryFilters}`, deliveryParams);

    // 3. Get receiving/operation status (from task_documentation)
    const getDocCount = async (type: string) => {
        let filters = 'WHERE doc_type = ?';
        const params: any[] = [type];
        if (project_id) {
            filters += ' AND project_id = ?';
            params.push(project_id);
        }
        if (company_id) {
            filters += ' AND unit_id IN (SELECT unit_id FROM units WHERE company_id = ?)';
            params.push(company_id);
        }
        if (from_date) {
            filters += ' AND documented_at >= ?';
            params.push(from_date);
        }
        if (to_date) {
            filters += ' AND documented_at <= ?';
            params.push(to_date);
        }
        const result = await db.get(`SELECT COUNT(DISTINCT unit_id) as count FROM task_documentation ${filters}`, params);
        return result.count;
    };

    const receivingCompleted = await getDocCount('استلام');
    const operationCompleted = await getDocCount('تشغيل');

    // 4. Get chart data (Project-wise)
    const projectStats = await db.all(`
        SELECT 
            p.project_id,
            p.project_name,
            (SELECT COUNT(*) FROM units u WHERE u.project_id = p.project_id) as total,
            (SELECT COUNT(DISTINCT unit_id) FROM tasks t WHERE t.project_id = p.project_id AND t.task_type = "تسليم" AND t.status = "تم") as delivery,
            (SELECT COUNT(DISTINCT unit_id) FROM task_documentation td WHERE td.project_id = p.project_id AND td.doc_type = "استلام") as receiving,
            (SELECT COUNT(DISTINCT unit_id) FROM task_documentation td WHERE td.project_id = p.project_id AND td.doc_type = "تشغيل") as operation,
            ((SELECT COUNT(*) FROM units u WHERE u.project_id = p.project_id) - (SELECT COUNT(DISTINCT unit_id) FROM task_documentation td WHERE td.project_id = p.project_id AND td.doc_type = "تشغيل")) as remaining
        FROM projects p
        WHERE 1=1 ${project_id ? ' AND p.project_id = ?' : ''}
    `, project_id ? [project_id] : []);

    // 5. Get trend data (Daily completion)
    const trendData = await db.all(`
        SELECT DATE(documented_at) as date, COUNT(*) as count 
        FROM task_documentation 
        WHERE 1=1 ${from_date ? ' AND documented_at >= ?' : ''} ${to_date ? ' AND documented_at <= ?' : ''}
        GROUP BY DATE(documented_at)
        ORDER BY date
    `, [...(from_date ? [from_date] : []), ...(to_date ? [to_date] : [])]);

    // 6. Get Employee Stats
    const employeeStatsParams = [];
    let employeeStatsFilters = '';
    if (project_id) {
        employeeStatsFilters += ' AND t.project_id = ?';
        employeeStatsParams.push(project_id);
    }
    if (company_id) {
        employeeStatsFilters += ' AND un.company_id = ?';
        employeeStatsParams.push(company_id);
    }

    const employeeStats = await db.all(`
        SELECT 
            us.full_name as employee_name,
            COUNT(t.task_id) as total_assigned,
            SUM(CASE WHEN t.status = 'تم' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN t.status = 'متأخرة' THEN 1 ELSE 0 END) as delayed,
            SUM(CASE WHEN t.status = 'مسندة' THEN 1 ELSE 0 END) as pending
        FROM users us
        JOIN tasks t ON us.user_id = t.assigned_to
        LEFT JOIN units un ON t.unit_id = un.unit_id
        WHERE us.role = 'staff' ${employeeStatsFilters}
        GROUP BY us.user_id, us.full_name
        ORDER BY completed DESC
    `, employeeStatsParams);

    // 7. Get detailed unit statuses for the table
    let detailedQuery = `
        SELECT 
            u.unit_id,
            u.unit_number,
            p.project_name,
            c.company_name,
            -- Delivery Phase
            (SELECT status FROM tasks t WHERE t.unit_id = u.unit_id AND t.task_type = "تسليم" ORDER BY t.created_at DESC LIMIT 1) as delivery_status,
            (SELECT MAX(due_date) FROM tasks t WHERE t.unit_id = u.unit_id AND t.task_type = "تسليم") as delivery_due,
            EXISTS(SELECT 1 FROM task_documentation td WHERE td.unit_id = u.unit_id AND td.doc_type = "تسليم") as delivery_done,

            -- Receiving Phase
            (SELECT status FROM tasks t WHERE t.unit_id = u.unit_id AND t.task_type = "استلام" ORDER BY t.created_at DESC LIMIT 1) as receiving_status,
            (SELECT MAX(due_date) FROM tasks t WHERE t.unit_id = u.unit_id AND t.task_type = "استلام") as receiving_due,
            EXISTS(SELECT 1 FROM task_documentation td WHERE td.unit_id = u.unit_id AND td.doc_type = "استلام") as receiving_done,
            
            -- Operation Phase
            (SELECT status FROM tasks t WHERE t.unit_id = u.unit_id AND t.task_type = "تشغيل" ORDER BY t.created_at DESC LIMIT 1) as operation_status,
            (SELECT MAX(due_date) FROM tasks t WHERE t.unit_id = u.unit_id AND t.task_type = "تشغيل") as operation_due,
            EXISTS(SELECT 1 FROM task_documentation td WHERE td.unit_id = u.unit_id AND td.doc_type = "تشغيل") as operation_done,

            (SELECT fullName FROM (SELECT us.full_name as fullName FROM task_documentation td JOIN users us ON td.documented_by = us.user_id WHERE td.unit_id = u.unit_id ORDER BY td.documented_at DESC LIMIT 1)) as last_responsible,
            (SELECT MAX(documented_at) FROM task_documentation td WHERE td.unit_id = u.unit_id) as last_update,
            (SELECT notes FROM (
                SELECT notes, documented_at as ts FROM task_documentation WHERE unit_id = u.unit_id
                UNION ALL
                SELECT notes, created_at as ts FROM tasks WHERE unit_id = u.unit_id
                ORDER BY ts DESC LIMIT 1
            )) as notes
        FROM units u
        JOIN projects p ON u.project_id = p.project_id
        JOIN companies c ON u.company_id = c.company_id
        ${unitFilters}
    `;
    const unitsData = await db.all(detailedQuery, unitParams);

    res.json({
        summary: {
            total: totalUnits,
            delivery: deliveryCompleted.count,
            receiving: receivingCompleted,
            operation: operationCompleted,
            incomplete: totalUnits - deliveryCompleted.count // Placeholder for simple difference
        },
        projectStats,
        trendData,
        employeeStats,
        unitsData
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
