# Kidana Operational Management System

This README serves as the complete project source of truth, establishing context, user flows, PRD, and development constraints for AI coding agents and human developers alike.

---

## 1. Project Context
This application is a full-stack Operational Reporting and Task Management dashboard. It is specialized for tracking field operations, primarily managing the handover, operation, and return of project units during seasonal deployments (like Hajj operations for Kidana). 

The platform supports organizational hierarchy, delegating field accountability to **Seasonal Staff**, while providing oversight to **Supervisors** and **Managers**. 

## 2. Product Requirements Document (PRD)

### Objective
Streamline the tracking and documentation of operational phases for field units. To enable clear delegation, enforce visual/textual documentation for physical progress, and provide supervisors with an eagle-eye view of operational status and employee performance.

### Core Features
- **Role-Based Access Control (RBAC):**
  - **Supervisors / Managers:** Full visibility, assignment controls, metrics tracking, and export capabilities.
  - **Seasonal Staff:** Field-focused interface for fulfilling assigned tasks or independently documenting operational events.
- **Three-Phase Lifecycle Flow:** Track physical field units through:
  1. `تسليم` (Delivery/Handover)
  2. `تشغيل` (Operation)
  3. `استلام` (Receiving/Return)
- **Analytics & Reporting:**
  - Top-level metrics summarizing overall readiness and bottleneck detection.
  - Employee productivity bar charts (Total Assigned vs. Completed).
- **Evidence-Based Execution:**
  - Task completion requires uploading photographic evidence (`multer`) or text-based notes before state changes are permitted.
- **Automated Fallbacks:**
  - Tasks automatically shift state to `متأخرة` (Delayed) if the due date is exceeded without fulfillment.

---

## 3. User Flows

### Manager & Supervisor Flow
1. **Authentication:** Login using email and password via `/login`.
2. **Dashboard & Assignment:** Navigate to local dashboard to view outstanding tasks. Supervisors can assign a new task to a specific `unit`, choose the `task_type` (`تسليم`, `تشغيل`, `استلام`), provide a due date, and select the responsible employee.
3. **Operational Reports:** Navigate to the reports screen (`/supervisor/reports`) to monitor live line-charts and KPIs for unit states. 
4. **Employee Evaluation:** The same report dashboard hosts an "Employee Performance" chart, tracking assignments versus completed tasks.
5. **Data Export:** Click "Export to Excel" to generate a `.xlsx` snapshot of global operational statuses.

### Seasonal Staff Flow
1. **Authentication:** Login to land on the field-optimized mobile-friendly view.
2. **Task Execution (`/seasonal/tasks`):** View the list of `مسندة` (Assigned) and `متأخرة` (Delayed) tasks. 
3. **Documentation Submission:** Open a task, attach a photo or text note, and mark as `تم` (Completed). The system captures an audit log of this state change.
4. **Ad-Hoc Documentation (`/seasonal/document`):** If a staff member needs to log a delivery/operation event that wasn't expressly assigned, they can independently choose a unit and upload proof.

---

## 4. Tech Stack & Architecture

- **Frontend:** React 19, Vite, Tailwind CSS v4, TypeScript, React Router Dom.
- **Data Visualization:** `recharts` for scalable SVG graphs.
- **Backend:** Node.js, Express.js.
- **Database:** SQLite natively integrated using `sqlite` and `sqlite3` packages. 
- **Storage:** Local disk storage via `multer` for image uploads (Saved to `/uploads`).
- **Authentication:** JWT (`jsonwebtoken`) and encrypted passwords (`bcryptjs`).

### Database Map 
(Refer to `server/db.ts` for authoritative schema configuration)
1. `users` - Defines access rights (`role = seasonal | supervisor | manager`).
2. `companies` & `projects` - Hierarchical data dictating which contractor/company manages which project.
3. `units` - The atomic physical entity being managed (e.g. a residential tent/building).
4. `tasks` - The action assigned. (`status = مسندة | تم | متأخرة`).
5. `task_documentation` - Ad-hoc documentation submitted outside of standard task assignments.
6. `task_status_log` - Historical audit trail for all changes to task states.

---

## 5. AI Tooling Guide 🤖 
*(For other AI Agents working on this project)*

When extending or maintaining this project, you must adhere to the following rules to prevent regression:

### 1. State Handling & Terminology
- **DO NOT** translate the task statuses or roles into English in the database or UI strings.
  - Allowed Task Types: `'تسليم', 'استلام', 'تشغيل'`
  - Allowed Task Statuses: `'مسندة', 'تم', 'متأخرة'`
- Do not mix the order of operations. The required flow is `تسليم` (Delivery) -> `تشغيل` (Operation) -> `استلام` (Receiving). UI buttons and table headers must reflect this exact order.

### 2. Backend & SQLite Considerations
- The app runs through `server.ts` utilizing `tsx`. There is no separate backend dev server.
- The SQLite DB is initialized locally on startup through `server/db.ts`. 
- **Migration Policy:** If you modify database arrays or add tables, you MUST update `server/db.ts`.

### 3. Frontend Development Patterns
- **Tailwind v4 Setup:** This project uses CSS-based configurations (`@import "tailwindcss";` in `index.css`). Do NOT attempt to create or modify `tailwind.config.js`.
- **API Fetching:** JWTs must be passed in the `Authorization: Bearer <token>` header for all `/api/` calls. Ensure robust error handling for `401 Unauthorized`.
- **Charts Construction:** The data served by `/api/reports/operational` aggregates deep SQL joins to calculate sums and conditions. Do NOT attempt to calculate aggregate statistics on the frontend; always issue a SQL query grouping on the Express side. When modifying Recharts elements (like `BarChart`s in `OperationalReports.tsx`), ensure the `dataKey` perfectly aligns with the JSON keys shipped from the `.all()` SQL rows.
