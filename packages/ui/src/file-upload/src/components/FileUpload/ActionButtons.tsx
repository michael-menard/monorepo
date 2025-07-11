import { Trash2, Upload } from 'lucide-react';

type ActionButtonsProps = {
  disabled: boolean;
  onUpload: () => void;
  onClear: () => void;
};

export function ActionButtons({ onUpload, onClear, disabled }: ActionButtonsProps) {
  return (
    <>
      <button
        onClick={onUpload}
        disabled={disabled}
        className="flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload size={18} />
        Upload
      </button>
      <button
        onClick={onClear}
        className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      >
        <Trash2 size={18} />
        Clear All
      </button>
    </>
  );
} 