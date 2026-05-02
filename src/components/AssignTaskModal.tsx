import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Loader2, ClipboardList, User, Briefcase, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AssignTaskModal({ isOpen, onClose }: Props) {
  const [taskType, setTaskType] = useState('تسليم');
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  
  const [assignedTo, setAssignedTo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
        fetchInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (projectId) fetchUnits();
    else setUnits([]);
  }, [projectId]);

  const fetchInitialData = async () => {
    try {
        const [usersRes, projectsRes] = await Promise.all([
            axios.get('/api/users?role=all'),
            axios.get('/api/projects')
        ]);
        setUsers(usersRes.data);
        setProjects(projectsRes.data);
    } catch (err) {
        console.error(err);
    }
  };

  const fetchUnits = async () => {
    try {
        const res = await axios.get(`/api/units?project_id=${projectId}`);
        setUnits(res.data);
    } catch (err) {
        console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        await axios.post('/api/tasks', {
            task_type: taskType,
            assigned_to: assignedTo,
            project_id: projectId,
            unit_id: unitId,
            due_date: dueDate
        });
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            onClose();
            resetForm();
            window.dispatchEvent(new CustomEvent('taskAssigned'));
        }, 2000);
    } catch (err) {
        alert('حدث خطأ');
    } finally {
        setIsSubmitting(false);
    }
  };

  const resetForm = () => {
      setAssignedTo('');
      setProjectId('');
      setUnitId('');
      setDueDate('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary-blue/30 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 bg-primary-blue text-white flex justify-between items-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl">
                        <ClipboardList className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">إسناد مهمة جديدة</h2>
                        <p className="text-sm opacity-70 font-medium">قم بتوزيع المهام لفريق العمل الميداني</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="p-8">
                {success ? (
                    <div className="text-center py-20 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-green-200">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">تم الإسناد بنجاح</h3>
                        <p className="text-gray-500">جاري إغلاق النافذة والعودة...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-3 gap-3">
                            {['تسليم', 'تشغيل', 'استلام'].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTaskType(t)}
                                    className={clsx(
                                        "py-3 rounded-2xl text-sm font-bold transition-all border-2",
                                        taskType === t ? "bg-primary-blue border-primary-blue text-white shadow-lg" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <label className="block text-xs font-black text-gray-400 mb-2 mr-2 uppercase tracking-widest">الموظف المسؤول</label>
                                <div className="relative">
                                    <select 
                                        required
                                        value={assignedTo}
                                        onChange={(e) => setAssignedTo(e.target.value)}
                                        className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 pr-12 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                                    >
                                        <option value="">اختر الموظف...</option>
                                        {users.filter(u => u.is_active).map(u => <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>)}
                                    </select>
                                    <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 pointer-events-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-xs font-black text-gray-400 mb-2 mr-2 uppercase tracking-widest">المشروع</label>
                                    <div className="relative">
                                        <select 
                                            required
                                            value={projectId}
                                            onChange={(e) => setProjectId(e.target.value)}
                                            className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 pr-12 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                                        >
                                            <option value="">اختر المشروع...</option>
                                            {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                                        </select>
                                        <Briefcase className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="relative">
                                    <label className="block text-xs font-black text-gray-400 mb-2 mr-2 uppercase tracking-widest">الوحدة</label>
                                    <div className="relative">
                                        <select 
                                            required
                                            disabled={!projectId}
                                            value={unitId}
                                            onChange={(e) => setUnitId(e.target.value)}
                                            className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 pr-12 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-blue transition-all disabled:opacity-50"
                                        >
                                            <option value="">اختر الوحدة...</option>
                                            {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_number}</option>)}
                                        </select>
                                        <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-black text-gray-400 mb-2 mr-2 uppercase tracking-widest">تاريخ الاستحقاق</label>
                                <div className="relative">
                                    <input 
                                        type="date"
                                        required
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 pr-12 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                                    />
                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary-blue text-white py-5 rounded-3xl font-black text-lg flex items-center justify-center gap-4 shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 shadow-blue-500/20"
                        >
                            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                            إسناد المهمة للموظف
                        </button>
                    </form>
                )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
