type ProgressBarProps = {
  progress: number;
};

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-grayscale-800">
      <div
        className="h-full bg-primary-500 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
} 