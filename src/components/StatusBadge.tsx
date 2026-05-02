import { clsx } from 'clsx';

type Status = 'مسندة' | 'تم' | 'متأخرة' | string;

export default function StatusBadge({ status }: { status: Status }) {
  const getStyles = () => {
    switch (status) {
      case 'مسندة':
        return 'bg-blue-100 text-primary-blue border-blue-200';
      case 'تم':
        return 'bg-green-100 text-success-green border-green-200';
      case 'متأخرة':
        return 'bg-red-100 text-danger-red border-red-200';
      case 'نشط':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'غير نشط':
        return 'bg-gray-100 text-gray-500 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <span className={clsx(
      "px-3 py-1 rounded-full text-xs font-bold border",
      getStyles()
    )}>
      {status}
    </span>
  );
}
