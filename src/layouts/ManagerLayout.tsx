import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  LayoutDashboard, 
  Database, 
  PieChart, 
  Building2, 
  Briefcase, 
  Users, 
  CheckSquare, 
  MapPin,
  ChevronLeft,
  PlusCircle,
  ClipboardList
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import AssignTaskModal from '../components/AssignTaskModal';

export default function ManagerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'لوحة التحكم', icon: LayoutDashboard, path: '/admin', section: 'main' },
    { name: 'التقارير التشغيلية', icon: ClipboardList, path: '/admin/operational-reports', section: 'main' },
    { name: 'الموظفون', icon: Users, path: '/admin/db/users', section: 'database' },
    { name: 'المشاريع', icon: Briefcase, path: '/admin/db/projects', section: 'database' },
    { name: 'الشركات', icon: Building2, path: '/admin/db/companies', section: 'database' },
    { name: 'الوحدات', icon: MapPin, path: '/admin/db/units', section: 'database' },
    { name: 'المهام', icon: CheckSquare, path: '/admin/db/tasks', section: 'database' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-primary-blue text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="font-bold">نظام تحكم - الإدارة</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1">
          <Database className="w-6 h-6" />
        </button>
      </header>

      {/* Sidebar */}
      <aside className={clsx(
        "bg-white border-l border-gray-200 transition-all duration-300 z-40 fixed md:relative h-full",
        isSidebarOpen ? "w-64" : "w-0 md:w-20 overflow-hidden"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between border-b border-gray-100">
            <h2 className={clsx("font-bold text-primary-blue text-xl transition-opacity", !isSidebarOpen && "md:opacity-0")}>نظام تحكم</h2>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex p-1 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <ChevronLeft className={clsx("w-5 h-5 transition-transform", !isSidebarOpen && "rotate-180")} />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <button 
                onClick={() => setIsAssignModalOpen(true)}
                className="w-full bg-primary-blue text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 mb-8 hover:bg-accent-blue transition-all shadow-md active:scale-95"
            >
                <PlusCircle className="w-5 h-5" />
                <span className={clsx(!isSidebarOpen && "md:hidden")}>إسناد مهمة</span>
            </button>

            <div className="space-y-6">
              <div>
                <p className={clsx("text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider px-2", !isSidebarOpen && "md:hidden")}>التقارير والمتابعة</p>
                <div className="space-y-1">
                  {navItems.filter(i => i.section === 'main').map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/admin'}
                      className={({ isActive }) => clsx(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                        isActive ? "bg-primary-blue/5 text-primary-blue" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <item.icon className={clsx("w-5 h-5", !isSidebarOpen && "md:mx-auto")} />
                      <span className={clsx("font-medium", !isSidebarOpen && "md:hidden")}>{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              <div>
                <p className={clsx("text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider px-2", !isSidebarOpen && "md:hidden")}>قاعدة البيانات</p>
                <div className="space-y-1">
                  {navItems.filter(i => i.section === 'database').map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => clsx(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                        isActive ? "bg-primary-blue/5 text-primary-blue" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <item.icon className={clsx("w-5 h-5", !isSidebarOpen && "md:mx-auto")} />
                      <span className={clsx("font-medium", !isSidebarOpen && "md:hidden")}>{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100">
            <div className={clsx("flex items-center gap-3 px-2 mb-4", !isSidebarOpen && "md:hidden")}>
                <div className="w-10 h-10 rounded-full bg-primary-blue/10 flex items-center justify-center text-primary-blue font-bold">
                    {user?.full_name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.role === 'manager' ? 'مدير النظام' : 'مشرف ميداني'}</p>
                </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-danger-red hover:bg-red-50 transition-all font-medium"
            >
              <LogOut className={clsx("w-5 h-5", !isSidebarOpen && "md:mx-auto")} />
              <span className={clsx(!isSidebarOpen && "md:hidden")}>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto">
            <Outlet />
        </div>
      </main>

      <AssignTaskModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} />
    </div>
  );
}
