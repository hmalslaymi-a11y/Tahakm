import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Camera, 
    FileText, 
    ArrowRight, 
    CheckCircle2, 
    Loader2,
    ShieldCheck,
    Hash,
    Briefcase,
    Settings,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { showToast } from '../../components/ToastNotification';

export default function DocumentTask() {
    const [step, setStep] = useState(1);
    const [docType, setDocType] = useState<'تسليم' | 'استلام' | 'تشغيل'>('تسليم');
    const [projects, setProjects] = useState<any[]>([]);
    const [projectId, setProjectId] = useState('');
    const [units, setUnits] = useState<any[]>([]);
    const [unitId, setUnitId] = useState('');
    const [mode, setMode] = useState<'photo' | 'note'>('photo');
    const [photo, setPhoto] = useState<File | null>(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (projectId) fetchUnits();
        else setUnits([]);
    }, [projectId]);

    const fetchProjects = async () => {
        const res = await axios.get('/api/projects');
        setProjects(res.data);
    };

    const fetchUnits = async () => {
        const res = await axios.get(`/api/units?project_id=${projectId}`);
        setUnits(res.data);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('doc_type', docType);
        formData.append('project_id', projectId);
        formData.append('unit_id', unitId);
        formData.append('notes', notes);
        if (photo) formData.append('photo', photo);

        try {
            await axios.post('/api/documentation', formData);
            setIsSuccess(true);
            window.dispatchEvent(new CustomEvent('taskAssigned'));
            setTimeout(() => navigate('/seasonal'), 1500);
        } catch (err) {
            showToast('حدث خطأ أثناء التوثيق', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-success-green rounded-full flex items-center justify-center text-white mb-6 shadow-xl"
                >
                    <Check className="w-12 h-12 stroke-[4px]" />
                </motion.div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">تم توثيق المهمة بنجاح</h1>
                <p className="text-gray-500 font-medium leading-relaxed">شكراً لمجهودك، تم تسجيل التوثيق في سجلات النظام وسوف يتم العودة بك إلى القائمة الرئيسية خلال ثوانٍ.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between mb-8">
                <button onClick={() => navigate('/seasonal')} className="p-2 bg-white border border-gray-100 rounded-xl">
                    <ArrowRight className="w-6 h-6 text-gray-400" />
                </button>
                <h2 className="text-xl font-black text-gray-900">توثيق مهمة جديدة</h2>
                <div className="w-10" />
            </header>

            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-10">
                {/* Step 1: Basic Info */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-r-4 border-primary-blue pr-3 py-1">
                        <span className="text-sm font-black text-gray-400">01</span>
                        <h3 className="font-bold text-gray-800">المعلومات الأساسية</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                             <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">نوع العملية</label>
                             <div className="grid grid-cols-3 gap-2">
                                {['تسليم', 'تشغيل', 'استلام'].map((t: any) => (
                                    <button 
                                        key={t}
                                        onClick={() => setDocType(t)}
                                        className={clsx(
                                            "py-3 rounded-xl text-xs font-bold transition-all border",
                                            docType === t ? "bg-primary-blue text-white border-primary-blue shadow-md" : "bg-gray-50 text-gray-500 border-gray-100"
                                        )}
                                    >
                                        {t}
                                    </button>
                                ))}
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 mr-1 uppercase">المشروع</label>
                                <div className="relative">
                                    <select 
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 pr-10 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                                    >
                                        <option value="">اختر المشروع</option>
                                        {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                                    </select>
                                    <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 mr-1 uppercase">رقم الوحدة</label>
                                <div className="relative">
                                    <select 
                                        disabled={!projectId}
                                        value={unitId}
                                        onChange={(e) => setUnitId(e.target.value)}
                                        className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 pr-10 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-blue transition-all disabled:opacity-50"
                                    >
                                        <option value="">اختر الوحدة</option>
                                        {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_number}</option>)}
                                    </select>
                                    <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 2: Content */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-r-4 border-accent-blue pr-3 py-1">
                        <span className="text-sm font-black text-gray-400">02</span>
                        <h3 className="font-bold text-gray-800">المحتوى التوثيقي</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                            <button 
                                onClick={() => setMode('photo')}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                                    mode === 'photo' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                                )}
                            >
                                <Camera className="w-4 h-4" />
                                صورة
                            </button>
                            <button 
                                onClick={() => setMode('note')}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                                    mode === 'note' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                                )}
                            >
                                <FileText className="w-4 h-4" />
                                ملاحظة
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {mode === 'photo' ? (
                                <motion.div 
                                    key="photo"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <input 
                                        type="file" 
                                        id="doc-photo" 
                                        className="hidden" 
                                        onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                                    />
                                    <label 
                                        htmlFor="doc-photo"
                                        className={clsx(
                                            "flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-3xl cursor-pointer transition-all min-h-[160px]",
                                            photo ? "border-success-green bg-green-50" : "border-gray-200 hover:border-primary-blue bg-gray-50/50"
                                        )}
                                    >
                                        {photo ? (
                                            <div className="text-center">
                                                <div className="bg-success-green/10 p-3 rounded-full mb-3 inline-block">
                                                    <ShieldCheck className="w-8 h-8 text-success-green" />
                                                </div>
                                                <p className="text-sm font-bold text-gray-900">{photo.name}</p>
                                                <p className="text-xs text-gray-500 mt-1 italic">اضغط للتغيير</p>
                                            </div>
                                        ) : (
                                            <>
                                                <Camera className="w-10 h-10 text-gray-300 mb-3" />
                                                <p className="text-sm font-bold text-gray-400">اضغط لالتقاط أو اختيار الصورة</p>
                                                <p className="text-[10px] text-gray-300 mt-2">JPG, PNG أو HEIC (بحد أقصى 5 ميجابايت)</p>
                                            </>
                                        )}
                                    </label>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="note"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <textarea 
                                        placeholder="اكتب ملاحظاتك الميدانية هنا..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-5 text-sm font-medium outline-none focus:ring-2 focus:ring-accent-blue transition-all min-h-[160px]"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <button 
                    disabled={isSubmitting || !projectId || !unitId || (mode === 'photo' && !photo) || (mode === 'note' && !notes)}
                    onClick={handleSubmit}
                    className="w-full bg-primary-blue text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-4 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Settings className="w-6 h-6" />}
                    توثيق المهمة فوراً
                </button>
            </div>
        </div>
    );
}
