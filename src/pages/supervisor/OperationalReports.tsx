import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  User,
  Calendar,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import * as xlsx from 'xlsx';
import { clsx } from 'clsx';
import StatusBadge from '../../components/StatusBadge';

interface Project {
  project_id: number;
  project_name: string;
}

interface Company {
  company_id: number;
  company_name: string;
}

interface UnitData {
  unit_id: number;
  unit_number: string;
  project_name: string;
  company_name: string;
  delivery_status: string;
  delivery_due: string | null;
  delivery_done: number;
  receiving_status: string;
  receiving_due: string | null;
  receiving_done: number;
  operation_status: string;
  operation_due: string | null;
  operation_done: number;
  last_responsible: string | null;
  last_update: string | null;
  notes: string | null;
}

interface OperationalReportResponse {
  summary: {
    total: number;
    delivery: number;
    receiving: number;
    operation: number;
    incomplete: number;
  };
  projectStats: any[];
  trendData: any[];
  employeeStats: any[];
  unitsData: UnitData[];
}

export default function OperationalReports() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OperationalReportResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  
  // Filters
  const [filters, setFilters] = useState({
    project_id: '',
    company_id: '',
    from_date: '',
    to_date: ''
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof UnitData, direction: 'asc' | 'desc' } | null>(null);

  // Drill down state
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [reportRes, projectsRes, companiesRes] = await Promise.all([
        axios.get('/api/reports/operational', { 
          params: filters,
          headers: { Authorization: `Bearer ${token}` } 
        }),
        axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/companies', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setData(reportRes.data);
      setProjects(projectsRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error("Error fetching operational reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleTaskAssigned = () => fetchData();
    window.addEventListener('taskAssigned', handleTaskAssigned);
    return () => window.removeEventListener('taskAssigned', handleTaskAssigned);
  }, []);

  const handleSort = (key: keyof UnitData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchData();
  };

  const handleResetFilters = () => {
    setFilters({
      project_id: '',
      company_id: '',
      from_date: '',
      to_date: ''
    });
    // Wait for state to update or just fetch with defaults
    setTimeout(() => fetchData(), 0);
  };

  const exportToExcel = () => {
    if (!filteredUnits.length) return;
    const wb = xlsx.utils.book_new();
    const exportData = filteredUnits.map(u => ({
      'رقم الوحدة': u.unit_number,
      'المشروع': u.project_name,
      'الشركة': u.company_name,
      'حالة التسليم': u.delivery_done ? 'مكتمل' : (u.delivery_status || 'غير مسندة'),
      'حالة التشغيل': u.operation_done ? 'مكتمل' : (u.operation_status || 'غير مسندة'),
      'حالة الاستلام': u.receiving_done ? 'مكتمل' : (u.receiving_status || 'غير مسندة'),
      'المسؤول': u.last_responsible || '-',
      'آخر تحديث': u.last_update || '-',
      'ملاحظات': u.notes || '-'
    }));
    const ws = xlsx.utils.json_to_sheet(exportData);
    xlsx.utils.book_append_sheet(wb, ws, 'تقرير الوحدات');
    xlsx.writeFile(wb, `تقرير_تشغيلي_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredUnits = useMemo(() => {
    if (!data) return [];
    let items = data.unitsData.filter(unit => 
      unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig) {
      items.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [data, searchTerm, sortConfig]);

  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUnits.slice(start, start + pageSize);
  }, [filteredUnits, currentPage, pageSize]);

  const COLORS = ['#1E3A5F', '#16A34A', '#D97706', '#DC2626'];

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-20 bg-white rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 h-64 bg-white rounded-xl"></div>
           <div className="h-64 bg-white rounded-xl"></div>
        </div>
        <div className="h-96 bg-white rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header & Sticky Filters */}
      <div className="sticky top-0 z-20 bg-gray-50/80 backdrop-blur-md pb-4 pt-2 -mx-2 px-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-primary-blue mb-1">التقارير التشغيلية</h1>
            <p className="text-gray-500 font-medium text-sm">متابعة دقيقة لمراحل تسليم واستلام الوحدات التشغيلية</p>
          </div>
          <div className="flex gap-2">
             <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-sm"
             >
                <Download className="w-4 h-4" />
                تصدير Excel
             </button>
             <button 
              onClick={fetchData}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 shadow-sm transition-all"
             >
                <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
             </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4 min-h-20">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 mb-1.5 px-1">المشروع</label>
            <select 
              value={filters.project_id}
              onChange={(e) => setFilters({...filters, project_id: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue outline-none transition-all"
            >
              <option value="">كل المشاريع</option>
              {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
             <label className="block text-xs font-bold text-gray-500 mb-1.5 px-1">الشركة</label>
             <select 
              value={filters.company_id}
              onChange={(e) => setFilters({...filters, company_id: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue outline-none transition-all"
            >
              <option value="">كل الشركات</option>
              {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
            </select>
          </div>

          <div className="flex-1 min-w-[300px] flex gap-2">
            <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 px-1">من تاريخ</label>
                <input 
                    type="date"
                    value={filters.from_date}
                    onChange={(e) => setFilters({...filters, from_date: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue outline-none transition-all"
                />
            </div>
            <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 px-1">إلى تاريخ</label>
                <input 
                    type="date"
                    value={filters.to_date}
                    onChange={(e) => setFilters({...filters, to_date: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue outline-none transition-all"
                />
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleApplyFilters}
              className="bg-primary-blue text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-accent-blue transition-all active:scale-95 text-sm"
            >
              تطبيق الفلترة
            </button>
            <button 
              onClick={handleResetFilters}
              className="bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95 text-sm"
            >
              إعادة ضبط
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="نسبة التسليم"
          value={data?.summary.delivery || 0}
          total={data?.summary.total || 0}
          color="blue"
          icon={<CheckCircle2 className="w-6 h-6 text-blue-600" />}
        />
        <KPICard 
          title="نسبة التشغيل"
          value={data?.summary.operation || 0}
          total={data?.summary.total || 0}
          color="orange"
          icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
        />
        <KPICard 
          title="نسبة الاستلام"
          value={data?.summary.receiving || 0}
          total={data?.summary.total || 0}
          color="green"
          icon={<Download className="w-6 h-6 text-green-600" />}
        />
        <KPICard 
          title="نسبة الإنجاز الكلي"
          value={data?.summary.operation || 0}
          total={data?.summary.total || 0}
          color="blue"
          icon={<TrendingUp className="w-6 h-6 text-primary-blue" />}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Project Comparison */}
        <div className="lg:col-span-12 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-blue" />
              مقارنة المشاريع
            </h3>
            <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full uppercase tracking-tighter">بناءً على الوحدات</span>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.projectStats || []} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="project_name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#64748B' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#64748B' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="delivery" name="تسليم" stackId="a" fill="#1E3A5F" radius={[0, 0, 0, 0]} barSize={32} />
                <Bar dataKey="operation" name="تشغيل" stackId="a" fill="#D97706" radius={[0, 0, 0, 0]} barSize={32} />
                <Bar dataKey="receiving" name="استلام" stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} barSize={32} />
                <Bar dataKey="remaining" name="متبقي" stackId="a" fill="#F1F5F9" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend line */}
        <div className="lg:col-span-12 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[350px]">
           <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-blue" />
                منحنى الإنجاز اليومي
              </h3>
           </div>
           <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.trendData || []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#1E3A5F" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
           </div>
        </div>

        {/* Employee Stats */}
        <div className="lg:col-span-12 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary-blue" />
              تقرير أداء الموظفين
            </h3>
            <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full uppercase tracking-tighter">المهام المنجزة</span>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.employeeStats || []} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="employee_name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#64748B' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#64748B' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="total_assigned" name="إجمالي المهام" fill="#1E3A5F" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="completed" name="المهام المنجزة" fill="#16A34A" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="font-black text-gray-800 text-xl">حالة الوحدات التشغيلية</h3>
          <div className="relative w-full md:w-80">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="البحث عن وحدة، مشروع، شركة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-blue/20 outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 font-bold text-xs uppercase tracking-wider">
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('unit_number')}>
                  <div className="flex items-center gap-1 justify-end">
                    {sortConfig?.key === 'unit_number' && (sortConfig.direction === 'asc' ? <ChevronRight className="w-3 h-3 rotate-90" /> : <ChevronRight className="w-3 h-3 -rotate-90" />)}
                    رقم الوحدة
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('project_name')}>
                  <div className="flex items-center gap-1 justify-end">
                    {sortConfig?.key === 'project_name' && (sortConfig.direction === 'asc' ? <ChevronRight className="w-3 h-3 rotate-90" /> : <ChevronRight className="w-3 h-3 -rotate-90" />)}
                    المشروع
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('company_name')}>
                  <div className="flex items-center gap-1 justify-end">
                    {sortConfig?.key === 'company_name' && (sortConfig.direction === 'asc' ? <ChevronRight className="w-3 h-3 rotate-90" /> : <ChevronRight className="w-3 h-3 -rotate-90" />)}
                    الشركة
                  </div>
                </th>
                <th className="px-6 py-4">حالة التسليم</th>
                <th className="px-6 py-4">حالة التشغيل</th>
                <th className="px-6 py-4">حالة الاستلام</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('last_update')}>
                  <div className="flex items-center gap-1 justify-end">
                    {sortConfig?.key === 'last_update' && (sortConfig.direction === 'asc' ? <ChevronRight className="w-3 h-3 rotate-90" /> : <ChevronRight className="w-3 h-3 -rotate-90" />)}
                    آخر تحديث
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('last_responsible')}>
                  <div className="flex items-center gap-1 justify-end">
                    {sortConfig?.key === 'last_responsible' && (sortConfig.direction === 'asc' ? <ChevronRight className="w-3 h-3 rotate-90" /> : <ChevronRight className="w-3 h-3 -rotate-90" />)}
                    المسؤول
                  </div>
                </th>
                <th className="px-6 py-4">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedUnits.map((unit) => (
                <tr 
                  key={unit.unit_id} 
                  className="hover:bg-gray-50/80 transition-all group cursor-pointer"
                  onClick={() => {
                    const p = data?.projectStats.find(ps => ps.project_name === unit.project_name);
                    setSelectedProject(p);
                  }}
                >
                  <td className="px-6 py-4">
                    <span className="font-black text-primary-blue">{unit.unit_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-300" />
                      <span className="text-sm font-medium text-gray-900">{unit.project_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{unit.company_name}</span>
                  </td>
                  <td className="px-6 py-4">
                     <OperationalStatusBadge 
                        status={unit.delivery_status} 
                        isDone={!!unit.delivery_done || unit.delivery_status === 'تم'} 
                        dueDate={unit.delivery_due}
                     />
                  </td>
                  <td className="px-6 py-4">
                     <OperationalStatusBadge 
                        status={unit.operation_status} 
                        isDone={!!unit.operation_done || unit.operation_status === 'تم'} 
                        dueDate={unit.operation_due}
                     />
                  </td>
                  <td className="px-6 py-4">
                     <OperationalStatusBadge 
                        status={unit.receiving_status} 
                        isDone={!!unit.receiving_done || unit.receiving_status === 'تم'} 
                        dueDate={unit.receiving_due}
                     />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-700">{unit.last_update ? new Date(unit.last_update).toLocaleDateString('ar-SA') : '-'}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{unit.last_update ? new Date(unit.last_update).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-600">
                    {unit.last_responsible || '-'}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 max-w-[150px] truncate">
                    {unit.notes || '-'}
                  </td>
                </tr>
              ))}
              {paginatedUnits.length === 0 && (
                <tr>
                   <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4 grayscale opacity-40">
                         <Search className="w-16 h-16 text-gray-200" />
                         <p className="font-black text-xl text-gray-400">لا توجد بيانات مطابقة للبحث</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
           <p className="text-sm font-bold text-gray-500">
             عرض {(currentPage - 1) * pageSize + 1} إلى {Math.min(currentPage * pageSize, filteredUnits.length)} من {filteredUnits.length} وحدة
           </p>
           <div className="flex gap-2">
             <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 transition-all"
             >
               <ChevronRight className="w-5 h-5" />
             </button>
             <button 
              disabled={currentPage * pageSize >= filteredUnits.length}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 transition-all"
             >
               <ChevronLeft className="w-5 h-5" />
             </button>
           </div>
        </div>
      </div>

      {/* Drill Down Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedProject(null)}
               className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl relative z-10 overflow-hidden"
             >
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-primary-blue">{selectedProject.project_name}</h2>
                        <p className="text-gray-500 font-bold">تحليل تفصيلي لمؤشرات المشروع</p>
                    </div>
                    <button 
                        onClick={() => setSelectedProject(null)}
                        className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>
                
                <div className="p-8 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-4 gap-4 mb-8 text-center text-sm font-bold">
                        <div className="p-4 bg-blue-50 rounded-2xl text-blue-700">
                             <div className="text-xs text-blue-500 mb-1">إجمالي الوحدات</div>
                             <div className="text-3xl font-black">{selectedProject.total}</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-2xl text-green-700">
                             <div className="text-xs text-green-500 mb-1">تمت الاستلام</div>
                             <div className="text-3xl font-black">{selectedProject.receiving}</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl text-gray-700">
                             <div className="text-xs text-gray-500 mb-1">المتبقي</div>
                             <div className="text-3xl font-black">{selectedProject.total - selectedProject.operation}</div>
                        </div>
                        <div className="p-4 bg-primary-blue rounded-2xl text-white">
                             <div className="text-xs text-white/70 mb-1">نسبة الإنجاز</div>
                             <div className="text-3xl font-black">{Math.round((selectedProject.operation / selectedProject.total) * 100) || 0}%</div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-2xl">
                        <h4 className="font-black text-gray-800 mb-4">قائمة وحدات المشروع</h4>
                        <div className="space-y-2">
                             {filteredUnits.filter(u => u.project_name === selectedProject.project_name).map(u => (
                               <div key={u.unit_id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm">
                                  <span className="font-bold text-gray-900">{u.unit_number}</span>
                                  <div className="flex gap-2">
                                     {u.delivery_status === 'تم' && <div className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">تسليم</div>}
                                     {u.operation_done === 1 && <div className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">تشغيل</div>}
                                     {u.receiving_done === 1 && <div className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">استلام</div>}
                                  </div>
                               </div>
                             ))}
                        </div>
                    </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KPICard({ title, value, total, color, icon, isCounter = false }: any) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    red: 'bg-red-50 text-red-600 border-red-100'
  };

  const progressColors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600',
    red: 'bg-red-600'
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4 relative overflow-hidden group"
    >
      <div className="flex items-center justify-between z-10">
        <div className={`p-3 rounded-2xl ${colors[color as keyof typeof colors]} border shadow-sm`}>
          {icon}
        </div>
        {!isCounter && (
           <div className="text-2xl font-black text-gray-900">{percent}%</div>
        )}
      </div>
      
      <div className="z-10">
        <h4 className="text-gray-500 font-bold text-sm mb-1">{title}</h4>
        <p className="text-xl font-black text-gray-900">
          {value} <span className="text-gray-400 text-xs font-bold">/ {total} وحدة</span>
        </p>
      </div>

      {!isCounter && (
        <div className="w-full bg-gray-100 h-2 rounded-full mt-2 z-10 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${progressColors[color as keyof typeof progressColors]} rounded-full`}
          />
        </div>
      )}

      {/* Background Graphic */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
         {React.cloneElement(icon, { size: 120, className: icon.props.className })}
      </div>
    </motion.div>
  );
}

function OperationalStatusBadge({ status, isDone, dueDate }: any) {
    const isLate = dueDate && !isDone && new Date(dueDate) < new Date();

    if (isDone) {
        return (
            <div className="flex items-center gap-1.5 text-success-green bg-green-50/50 border border-green-100 px-2.5 py-1 rounded-lg w-fit">
                <span className="text-[10px]">✓</span>
                <span className="text-xs font-black">مكتمل</span>
            </div>
        );
    }

    if (isLate) {
        return (
            <div className="flex items-center gap-1.5 text-danger-red bg-red-50/50 border border-red-100 px-2.5 py-1 rounded-lg w-fit">
                <span className="text-[10px]">⚠</span>
                <span className="text-xs font-black">متأخر</span>
            </div>
        );
    }

    if (!status) {
        return (
            <div className="flex items-center gap-1.5 text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg w-fit">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-black">غير مسندة</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 text-accent-blue bg-blue-50/50 border border-blue-100 px-2.5 py-1 rounded-lg w-fit">
            <span className="text-[10px]">📌</span>
            <span className="text-xs font-black">مسندة</span>
        </div>
    );
}
