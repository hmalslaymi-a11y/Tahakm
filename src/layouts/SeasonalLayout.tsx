import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Home, Camera, ClipboardList } from 'lucide-react';

export default function SeasonalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-app-bg pb-20">
      <header className="bg-primary-blue text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">نظام تحكم</h1>
              <p className="text-xs opacity-80">{user?.full_name}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-6 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-50">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Link to="/seasonal" className="flex flex-col items-center gap-1 text-gray-500 hover:text-primary-blue transition-colors">
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">مهامي</span>
          </Link>
          <Link to="/seasonal/document" className="flex flex-col items-center justify-center -mt-12 group">
            <div className="bg-primary-blue text-white p-4 rounded-full shadow-xl group-hover:scale-110 transition-transform duration-200">
              <Camera className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold text-primary-blue mt-1">توثيق سريع</span>
          </Link>
          <div className="flex flex-col items-center gap-1 text-gray-300">
            <ClipboardList className="w-6 h-6" />
            <span className="text-xs font-medium">سجلاتي</span>
          </div>
        </div>
      </nav>
    </div>
  );
}
