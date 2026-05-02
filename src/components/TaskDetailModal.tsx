import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  FileText, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  ShieldCheck,
  Send,
  Loader2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import StatusBadge from './StatusBadge';
import { showToast } from './ToastNotification';

interface Task {
  task_id: number;
  task_type: string;
  project_name: string;
  unit_number: string;
  due_date: string;
  status: string;
  notes?: string;
  photo_url?: string;
}

interface Log {
    log_id: number;
    user_name: string;
    new_status: string;
    comment: string;
    changed_at: string;
}

interface Props {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TaskDetailModal({ task, isOpen, onClose, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<'details' | 'logs'>('details');
  const [comment, setComment] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [newStatus, setNewStatus] = useState<'تم' | 'متأخرة'>('تم');
  const [logs, setLogs] = useState<Log[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [localTask, setLocalTask] = useState<Task | null>(null);

  useEffect(() => {
    if (task) setLocalTask(task);
  }, [task]);

  useEffect(() => {
    if (localTask && isOpen) {
        fetchLogs();
    } else {
        setLogs([]);
        setComment('');
        setNotes('');
        setPhoto(null);
        setIsSuccess(false);
    }
  }, [localTask, isOpen]);

  const fetchLogs = async () => {
    try {
        const res = await axios.get(`/api/tasks/${localTask?.task_id}/logs`);
        setLogs(res.data);
    } catch (err) {
        console.error(err);
    }
  };

  const handleUpdate = async (withStatus = false) => {
    setIsSubmitting(true);
    const formData = new FormData();
    if (withStatus) {
        formData.append('status', newStatus);
        formData.append('notes', notes);
        if (photo) formData.append('photo', photo);
    } else {
        formData.append('comment', comment);
    }

    try {
        await axios.patch(`/api/tasks/${localTask?.task_id}`, formData);
        onUpdate();
        window.dispatchEvent(new CustomEvent('taskAssigned'));
        if (withStatus) {
            setIsSuccess(true);
            setTimeout(() => onClose(), 1500);
        }
        else {
            setComment('');
            fetchLogs();
        }
    } catch (err) {
        showToast('فشل التحديث', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!localTask) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 bg-primary-blue text-white relative">
                 <div className="flex justify-between items-start mb-4">
                    <span className="bg-white/20 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">{localTask.task_type}</span>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                 </div>
                 <h2 className="text-2xl font-bold mb-1">{localTask.project_name}</h2>
                 <p className="opacity-80 font-medium">وحدة {localTask.unit_number} - الموعد: {localTask.due_date}</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-gray-50/50">
                <button 
                    onClick={() => setActiveTab('details')}
                    className={clsx(
                        "flex-1 py-4 text-sm font-bold transition-all border-b-2",
                        activeTab === 'details' ? "border-primary-blue text-primary-blue" : "border-transparent text-gray-400"
                    )}
                >
                    التفاصيل والإنجاز
                </button>
                <button 
                    onClick={() => setActiveTab('logs')}
                    className={clsx(
                        "flex-1 py-4 text-sm font-bold transition-all border-b-2",
                        activeTab === 'logs' ? "border-primary-blue text-primary-blue" : "border-transparent text-gray-400"
                    )}
                >
                    سجل المتابعة ({logs.length})
                </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 bg-success-green rounded-full flex items-center justify-center text-white mb-4 shadow-xl"
                        >
                            <CheckCircle2 className="w-10 h-10 stroke-[3px]" />
                        </motion.div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">تم الإنجاز بنجاح</h2>
                        <p className="text-sm text-gray-500 font-medium">سوف تعود الآن للقائمة الرئيسية...</p>
                    </div>
                ) : activeTab === 'details' ? (
                    <div className="space-y-8">
                        {/* Status Section */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <span className="text-sm font-bold text-gray-500">الحالة الحالية</span>
                            <StatusBadge status={localTask.status} />
                        </div>

                        {/* Completion Form */}
                        {(localTask.status === 'مسندة' || localTask.status === 'متأخرة') && (
                            <div className="space-y-6">
                                <h3 className="font-bold flex items-center gap-2 text-gray-900 border-r-4 border-primary-blue pr-3 py-1">إكمال المهمة</h3>
                                
                                <div>
                                    <label className="block text-sm font-black text-gray-700 mb-3">التوثيق (صورة أو ملاحظة)</label>
                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <input 
                                                type="file" 
                                                id="photo-upload" 
                                                className="hidden" 
                                                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                                            />
                                            <label 
                                                htmlFor="photo-upload"
                                                className={clsx(
                                                    "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                                                    photo ? "border-success-green bg-green-50" : "border-gray-200 hover:border-primary-blue bg-gray-50/50"
                                                )}
                                            >
                                                {photo ? (
                                                    <div className="text-center">
                                                        <ShieldCheck className="w-10 h-10 text-success-green mx-auto mb-2" />
                                                        <p className="text-sm font-bold text-success-green">تم اختيار الصورة</p>
                                                        <p className="text-xs text-green-600/70">{photo.name}</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Camera className="w-10 h-10 text-gray-400 mb-2 group-hover:text-primary-blue transition-colors" />
                                                        <p className="text-sm font-bold text-gray-500">إرفاق صورة التوثيق</p>
                                                    </>
                                                )}
                                            </label>
                                        </div>

                                        <textarea 
                                            placeholder="أضف ملاحظاتك هنا..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <button 
                                    disabled={isSubmitting || (!photo && !notes)}
                                    onClick={() => handleUpdate(true)}
                                    className="w-full bg-primary-blue text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="bg-white/20 p-1 rounded-md"><CheckCircle2 className="w-5 h-5" /></div>}
                                    إنجاز المهمة نهائياً
                                </button>
                            </div>
                        )}

                        {/* Comment Section (always visible) */}
                        <div className="space-y-4 pt-6 border-t border-gray-100">
                             <h3 className="font-bold text-gray-900 border-r-4 border-accent-blue pr-3 py-1">إضافة تعليق للمتابعة</h3>
                             <div className="relative">
                                <textarea 
                                    placeholder="اكتب تعليقك هنا..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pb-14 text-sm font-medium outline-none focus:ring-2 focus:ring-accent-blue transition-all"
                                    rows={2}
                                />
                                <button 
                                    disabled={!comment || isSubmitting}
                                    onClick={() => handleUpdate(false)}
                                    className="absolute left-3 bottom-3 bg-accent-blue text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                                >
                                    إرسال {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                                </button>
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {logs.length === 0 ? (
                            <div className="text-center py-10 opacity-40">لا يوجد سجل تاريخي حالياً</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={log.log_id} className="relative pr-8 last:pb-0 pb-8 group">
                                     {/* Timeline Line */}
                                     {i !== logs.length - 1 && <div className="absolute top-8 right-3.5 bottom-0 w-0.5 bg-gray-100" />}
                                     
                                     {/* Dot */}
                                     <div className={clsx(
                                         "absolute top-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-white z-10 shadow-sm",
                                         log.new_status === 'تم' ? "bg-success-green" : log.new_status === 'متأخرة' ? "bg-danger-red" : "bg-primary-blue"
                                     )}>
                                        <Clock className="w-4 h-4" />
                                     </div>

                                     <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                         <div className="flex justify-between items-center mb-2">
                                             <span className="text-sm font-black text-gray-900">{log.user_name}</span>
                                             <span className="text-[10px] font-bold text-gray-400">{new Date(log.changed_at).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                         </div>
                                         <div className="mb-2">
                                            <StatusBadge status={log.new_status} />
                                         </div>
                                         <p className="text-sm text-gray-600 font-medium leading-relaxed">{log.comment}</p>
                                     </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
