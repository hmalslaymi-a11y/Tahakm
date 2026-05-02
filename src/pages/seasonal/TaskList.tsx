import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  ChevronRight, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Search
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import TaskDetailModal from '../../components/TaskDetailModal';
import { clsx } from 'clsx';

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

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('الكل');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    const handleTaskAssigned = () => fetchTasks();
    window.addEventListener('taskAssigned', handleTaskAssigned);
    return () => window.removeEventListener('taskAssigned', handleTaskAssigned);
  }, [filter]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/tasks', { params: { status: filter } });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const completedCount = tasks.filter(t => t.status === 'تم').length;
  const totalCount = tasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">إنجازك اليومي</h2>
            <p className="text-sm text-gray-500 font-medium">خطوة بخطوة نحو تسليم المشروع</p>
          </div>
          <div className="text-left">
            <span className="text-3xl font-black text-primary-blue">{completionRate}%</span>
          </div>
        </div>
        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${completionRate}%` }}
            className="bg-primary-blue h-full"
          />
        </div>
        <div className="mt-3 flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
          <span>{completedCount} مهام مكتملة</span>
          <span>من أصل {totalCount}</span>
        </div>
      </section>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['الكل', 'مسندة', 'تم', 'متأخرة'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
              filter === f ? "bg-primary-blue text-white shadow-md" : "bg-white text-gray-500 border border-gray-100"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white h-32 rounded-3xl animate-pulse border border-gray-100" />
          ))
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-bold">لا توجد مهام حالياً</p>
            <p className="text-sm text-gray-400">استمتع بوقتك أو تحقق من الفلاتر</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div
                layout
                key={task.task_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setSelectedTask(task)}
                className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
              >
                  {/* Accent Line */}
                  <div className={clsx(
                      "absolute top-0 right-0 w-1.5 h-full",
                      task.status === 'مسندة' ? "bg-primary-blue" : task.status === 'تم' ? "bg-success-green" : "bg-danger-red"
                  )} />

                <div className="flex justify-between items-start mb-3 pr-2">
                  <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">{task.task_type}</span>
                      <StatusBadge status={task.status} />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-blue transition-colors" />
                </div>

                <h3 className="font-bold text-gray-900 text-lg mb-4 pr-2">{task.project_name}</h3>

                <div className="flex items-center gap-6 pr-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-bold">{task.unit_number}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-bold">{task.due_date}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <TaskDetailModal 
        task={selectedTask} 
        isOpen={!!selectedTask} 
        onClose={() => setSelectedTask(null)}
        onUpdate={fetchTasks}
      />
    </div>
  );
}
