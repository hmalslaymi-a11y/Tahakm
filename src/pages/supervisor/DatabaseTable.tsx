import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { 
    Download, 
    Upload, 
    Plus, 
    Search, 
    ArrowUpDown, 
    Edit2, 
    Check, 
    X,
    MoreHorizontal,
    ArrowUp,
    ArrowDown,
    Loader2,
    Trash2,
    Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import StatusBadge from '../../components/StatusBadge';
import * as xlsx from 'xlsx';

export default function DatabaseTable() {
    const { tableName } = useParams();
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [isAdding, setIsAdding] = useState(false);
    const [newData, setNewData] = useState<any>({});
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        fetchData();
        setEditingId(null);
        setIsAdding(false);
        setNewData({});
    }, [tableName]);

    useEffect(() => {
        if (tableName !== 'tasks') return;
        const handleTaskAssigned = () => fetchData();
        window.addEventListener('taskAssigned', handleTaskAssigned);
        return () => window.removeEventListener('taskAssigned', handleTaskAssigned);
    }, [tableName]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`/api/${tableName}`);
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveNew = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`/api/${tableName}`, newData);
            setIsAdding(false);
            setNewData({});
            fetchData();
            alert('تمت الإضافة بنجاح');
        } catch (err) {
            alert('فشل في إضافة السجل. تأكد من إدخال جميع البيانات المطلوبة.');
        }
    };

    const handleSort = (key: string) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = [...data].sort((a, b) => {
        if (!sortConfig.key) return 0;
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    }).filter(item => {
        return Object.values(item).some(val => 
            String(val).toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const getTableLabel = () => {
        switch (tableName) {
            case 'users': return 'الموظفين';
            case 'projects': return 'المشاريع';
            case 'companies': return 'الشركات';
            case 'units': return 'الوحدات';
            case 'tasks': return 'المهام';
            case 'documentation': return 'التوثيق الميداني';
            default: return tableName;
        }
    };

    const getColumns = () => {
        if (data.length > 0) {
            let cols = Object.keys(data[0]).filter(k => !k.includes('password'));
            if (tableName === 'tasks') {
                cols = cols.filter(k => !['project_id', 'unit_id', 'assigned_to', 'created_by', 'task_id'].includes(k));
            }
            return cols;
        }
        
        // Default columns if table is empty
        const defaults: any = {
            users: ['full_name', 'email', 'role', 'phone', 'is_active'],
            projects: ['project_name', 'company_id'],
            companies: ['company_name'],
            units: ['unit_number', 'project_id', 'company_id'],
            tasks: ['task_type', 'assigned_to', 'project_id', 'unit_id', 'due_date']
        };
        return defaults[tableName || ''] || [];
    };

    const getFormColumns = () => {
        return getColumns().filter(c => 
            !['user_id', 'project_id', 'company_id', 'unit_id', 'task_id', 'created_at', 'updated_at', 'doc_id', 'documented_at', 'status', 'is_active'].includes(c) 
            || (tableName === 'projects' && c === 'company_id')
            || (tableName === 'units' && (c === 'project_id' || c === 'company_id'))
            || (tableName === 'tasks' && (c === 'project_id' || c === 'unit_id' || c === 'assigned_to'))
        );
    };

    const getArLabel = (col: string) => {
        const labels: any = {
            user_id: 'ID',
            full_name: 'الاسم الكامل',
            email: 'البريد',
            role: 'الدور',
            phone: 'الجوال',
            is_active: 'الحالة',
            project_id: 'ID المشروع',
            project_name: 'اسم المشروع',
            company_name: 'الشركة',
            unit_number: 'رقم الوحدة',
            task_type: 'تصنيف المهمة',
            status: 'الحالة',
            due_date: 'الموعد',
            created_at: 'تاريخ الإضافة',
            updated_at: 'تاريخ التحديث',
            assignee_name: 'المسندة له',
            creator_name: 'منشئ المهمة',
            notes: 'ملاحظات'
        };
        return labels[col] || col;
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.json_to_sheet(data);
            xlsx.utils.book_append_sheet(wb, ws, tableName || 'Data');
            xlsx.writeFile(wb, `${tableName}.xlsx`);
        } finally {
            setIsExporting(false);
        }
    };

    const startEdit = (row: any) => {
        setEditingId(row[Object.keys(row)[0]]);
        setEditData({ ...row });
    };

    const handleDelete = async (row: any) => {
        const id = row[Object.keys(row)[0]];
        if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
        try {
            await axios.delete(`/api/${tableName}/${id}`);
            fetchData();
            alert('تم الحذف بنجاح');
        } catch (err: any) {
            alert(err.response?.data?.message || 'فشل الحذف');
        }
    };

    const saveEdit = async () => {
        const idCol = Object.keys(editData)[0];
        try {
            await axios.patch(`/api/${tableName}/${editingId}`, editData);
            setEditingId(null);
            fetchData();
        } catch (err) {
            alert('فشل التحديث');
        }
    };

    const handleImport = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            await axios.post(`/api/import/${tableName}`, formData);
            fetchData();
            alert('تم الاستيراد بنجاح');
        } catch (err) {
            alert('خطأ في الاستيراد');
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">إدارة {getTableLabel()}</h1>
                    <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
                        قاعدة البيانات
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        {tableName}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-all text-gray-600 shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        تصدير Excel
                    </button>
                    <div className="relative">
                        <input type="file" id="import-excel" className="hidden" onChange={handleImport} accept=".xlsx,.xls" />
                        <label 
                            htmlFor="import-excel"
                            className="bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 cursor-pointer transition-all text-gray-600 shadow-sm"
                        >
                            <Upload className="w-4 h-4" />
                            استيراد
                        </label>
                    </div>
                    {tableName !== 'tasks' && (
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="bg-primary-blue text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/10 hover:bg-accent-blue transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            إضافة صف جديد
                        </button>
                    )}
                </div>
            </header>

            <AnimatePresence>
                {isAdding && (
                    <div 
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsAdding(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl overflow-hidden relative"
                        >
                            <button onClick={() => setIsAdding(false)} className="absolute top-6 left-6 p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-black text-gray-900 mb-6 border-r-4 border-primary-blue pr-3">إضافة {getTableLabel()} جديد</h2>
                            <form onSubmit={handleSaveNew} className="space-y-4">
                                {getFormColumns().map(col => (
                                    <div key={col}>
                                        <label className="block text-xs font-black text-gray-400 mb-1.5 mr-2 uppercase">{getArLabel(col)}</label>
                                        <input 
                                            required
                                            type="text"
                                            value={newData[col] || ''}
                                            onChange={(e) => setNewData({ ...newData, [col]: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                                            placeholder={`أدخل ${getArLabel(col)}...`}
                                        />
                                    </div>
                                ))}
                                {tableName === 'users' && (
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-1.5 mr-2 uppercase">كلمة المرور</label>
                                        <input 
                                            required
                                            type="password"
                                            onChange={(e) => setNewData({ ...newData, password: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    className="w-full bg-primary-blue text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 mt-6 shadow-xl hover:shadow-2xl transition-all"
                                >
                                    حفظ البيانات
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row gap-4 items-center bg-gray-50/50">
                    <div className="relative flex-1 w-full">
                        <input 
                            type="text" 
                            placeholder="ابحث في كافة الحقول..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-4 pr-12 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                        />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-500">
                             <Filter className="w-4 h-4" />
                             تصفية متقدمة
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                {getColumns().map((col) => (
                                    <th 
                                        key={col}
                                        onClick={() => handleSort(col)}
                                        className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                                    >
                                        <div className="flex items-center gap-2">
                                            {getArLabel(col)}
                                            {sortConfig.key === col ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                            ) : <ArrowUpDown className="w-3 h-3 opacity-20" />}
                                        </div>
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">الخيارات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: getColumns().length + 1 }).map((_, j) => (
                                            <td key={j} className="px-6 py-5">
                                                <div className="h-4 bg-gray-100 rounded w-full" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : sortedData.length === 0 ? (
                                <tr>
                                    <td colSpan={getColumns().length + 1} className="py-20 text-center text-gray-400 font-bold">لا توجد بيانات متاحة للعرض</td>
                                </tr>
                            ) : (
                                sortedData.map((row) => (
                                    <tr key={Object.values(row)[0] as any} className="hover:bg-gray-50 transition-colors group">
                                        {getColumns().map((col) => (
                                            <td key={col} className="px-6 py-4">
                                                {editingId === (row[Object.keys(row)[0]] as any) ? (
                                                    <input 
                                                        value={editData[col]}
                                                        onChange={(e) => setEditData({ ...editData, [col]: e.target.value })}
                                                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:ring-2 focus:ring-primary-blue outline-none"
                                                    />
                                                ) : (
                                                    <span className={clsx(
                                                        "text-sm font-bold transition-all",
                                                        col === Object.keys(row)[0] ? "text-primary-blue" : "text-gray-600"
                                                    )}>
                                                        {col === 'status' || col === 'role' || col === 'is_active' ? (
                                                            <StatusBadge status={row[col] === 1 || row[col] === true ? 'نشط' : row[col] === 0 || row[col] === false ? 'غير نشط' : row[col]} />
                                                        ) : (
                                                            row[col]
                                                        )}
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {editingId === (row[Object.keys(row)[0]] as any) ? (
                                                    <>
                                                        <button onClick={saveEdit} className="p-1.5 bg-green-50 text-success-green rounded-lg hover:bg-green-100"><Check className="w-4 h-4" /></button>
                                                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEdit(row)} className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-primary-blue hover:text-white transition-all"><Edit2 className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDelete(row)} className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-danger-red hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-gray-50 flex justify-between items-center bg-gray-50/30 font-bold text-xs text-gray-400">
                    <span>إحصائيات الجدول: {sortedData.length} سجلات جاهزة</span>
                    <div className="flex gap-1 items-center">
                        نظام تحكم الميداني العرضي - {new Date().getFullYear()}
                    </div>
                </div>
            </div>
        </div>
    );
}
