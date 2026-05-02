import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Users, 
    TrendingUp, 
    Calendar,
    ArrowUpRight,
    Search,
    Filter,
    Briefcase,
    Download
} from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import StatusBadge from '../../components/StatusBadge';
import * as xlsx from 'xlsx';

export default function Dashboard() {
    const [stats, setStats] = useState({ total: 0, completed: 0, late: 0, pending: 0, percent: 0 });
    const [recentTasks, setRecentTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [filterProjectId, setFilterProjectId] = useState('');
    const [filterUserId, setFilterUserId] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchFilters();
    }, []);

    useEffect(() => {
        fetchData();
        const handleTaskAssigned = () => fetchData();
        window.addEventListener('taskAssigned', handleTaskAssigned);
        return () => window.removeEventListener('taskAssigned', handleTaskAssigned);
    }, [filterProjectId, filterUserId]);

    const fetchFilters = async () => {
        try {
            const [projRes, userRes] = await Promise.all([
                axios.get('/api/projects'),
                axios.get('/api/users?role=staff')
            ]);
            setProjects(projRes.data);
            setUsers(userRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = { project_id: filterProjectId, assigned_to: filterUserId };
            const [statsRes, tasksRes] = await Promise.all([
                axios.get('/api/reports/tasks', { params }),
                axios.get('/api/tasks?limit=5', { params })
            ]);
            setStats(statsRes.data);
            setRecentTasks(tasksRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet([
            { 'المؤشر': 'إجمالي المهام', 'القيمة': stats.total },
            { 'المؤشر': 'المهام المكتملة', 'القيمة': stats.completed },
            { 'المؤشر': 'المهام المتأخرة', 'القيمة': stats.late },
            { 'المؤشر': 'بانتظار العمل', 'القيمة': stats.pending },
            { 'المؤشر': 'نسبة الإنجاز', 'القيمة': `${stats.percent}%` }
        ]);
        xlsx.utils.book_append_sheet(wb, ws, 'تقرير الإنجاز');
        xlsx.writeFile(wb, `تقرير_لوحة_التحكم_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const chartData = [
        { name: 'مكتملة', value: stats.completed, color: '#16A34A' },
        { name: 'بانتظار العمل', value: stats.pending, color: '#1E3A5F' },
        { name: 'متأخرة', value: stats.late, color: '#DC2626' },
    ];

    const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-between group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-success-green text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
                        <TrendingUp className="w-3 h-3" />
                        {trend}
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm font-bold text-gray-400 mb-1">{title}</p>
                <h3 className="text-3xl font-black text-gray-900">{value}</h3>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">لوحة التحكم والتقارير</h1>
                    <p className="text-gray-500 font-medium mt-1">نظرة شاملة وموحدة على العمليات والمهام الميدانية</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleExport}
                        className="bg-white border border-gray-200 px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-3 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <Download className="w-5 h-5 text-primary-blue" />
                        تصدير البيانات
                    </button>
                    <div className="bg-white border border-gray-200 px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 hidden md:flex min-w-[140px] justify-center">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        ٢ مايو ٢٠٢٦
                    </div>
                </div>
            </header>

            {/* Combined Filter Bar */}
            <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <p className="text-[10px] font-black text-gray-400 mb-2 mr-2 uppercase tracking-widest">تصفية حسب المشروع</p>
                    <div className="relative">
                        <select 
                            value={filterProjectId}
                            onChange={(e) => setFilterProjectId(e.target.value)}
                            className="w-full appearance-none bg-gray-50 border border-transparent rounded-xl px-5 py-3 pr-10 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary-blue transition-all"
                        >
                            <option value="">جميع المشاريع</option>
                            {projects.map((p: any) => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                        </select>
                        <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <p className="text-[10px] font-black text-gray-400 mb-2 mr-2 uppercase tracking-widest">تصفية حسب الموظف</p>
                    <div className="relative">
                        <select 
                            value={filterUserId}
                            onChange={(e) => setFilterUserId(e.target.value)}
                            className="w-full appearance-none bg-gray-50 border border-transparent rounded-xl px-5 py-3 pr-10 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary-blue transition-all"
                        >
                            <option value="">جميع الموظفين</option>
                            {users.map((u: any) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                        </select>
                        <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="إجمالي المهام" 
                    value={stats.total} 
                    icon={CheckCircle2} 
                    color="bg-primary-blue" 
                    trend="+١٢٪"
                />
                <StatCard 
                    title="المهام المنجزة" 
                    value={stats.completed} 
                    icon={CheckCircle2} 
                    color="bg-green-600" 
                    trend={`${stats.percent}%`}
                />
                <StatCard 
                    title="بانتظار الإنجاز" 
                    value={stats.pending} 
                    icon={Clock} 
                    color="bg-orange-500" 
                />
                <StatCard 
                    title="المهام المتأخرة" 
                    value={stats.late} 
                    icon={AlertCircle} 
                    color="bg-red-600" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 h-[450px] flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="font-black text-lg text-gray-900 border-r-4 border-primary-blue pr-3">توزيع حالات المهام</h2>
                        <div className="flex gap-6 text-xs font-bold text-gray-400">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-success-green" /> مكتملة</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary-blue" /> بانتظار العمل</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-danger-red" /> متأخرة</div>
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 'bold' }} />
                                <Tooltip 
                                    cursor={{ fill: '#F9FAFB' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', direction: 'rtl' }}
                                />
                                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activities */}
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-black text-lg text-gray-900 border-r-4 border-accent-blue pr-3">أحدث المهام</h2>
                        <button className="text-primary-blue text-xs font-bold hover:underline">مشاهدة الكل</button>
                    </div>
                    <div className="space-y-4 overflow-y-auto pr-1">
                        {recentTasks.map((task: any) => (
                            <div key={task.task_id} className="p-4 bg-gray-50 rounded-2xl border border-gray-50 hover:border-gray-100 hover:bg-white transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{task.task_type}</span>
                                    <StatusBadge status={task.status} />
                                </div>
                                <h4 className="font-bold text-gray-900 text-sm mb-2 group-hover:text-primary-blue transition-colors line-clamp-1">{task.project_name}</h4>
                                <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                                    <div className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {task.assignee_name}
                                    </div>
                                    <span>{task.due_date}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
