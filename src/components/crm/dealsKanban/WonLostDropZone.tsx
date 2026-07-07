import { useDroppable } from '@dnd-kit/core';

export function WonLostDropZone({
  id,
  label,
  icon: Icon,
  color,
  className = '',
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
        isOver
          ? 'border-primary bg-primary/10 scale-[1.02] shadow-md'
          : 'border-muted-foreground/30 bg-background/80 backdrop-blur-sm hover:border-primary/50'
      } ${className}`}
    >
      <Icon className={`h-8 w-8 ${color} mb-1`} />
      <span className={`text-[13px] font-bold ${color}`}>{label}</span>
    </div>
  );
}
