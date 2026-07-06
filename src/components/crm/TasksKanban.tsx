import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GripVertical, Handshake, User as UserIcon, Building2, Clock, AlertTriangle } from "lucide-react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import type { Activity, Company, Contact, Deal } from "@/lib/data";
import { TASK_BUCKETS, TASK_BUCKET_LABELS, getTaskBucket, type TaskBucket } from "@/lib/tasks";
import { formatDateShort } from "@/lib/format";

function TaskCard({
  task,
  contact,
  deal,
  company,
  ownerName,
  onClick,
}: {
  task: Activity;
  contact: Contact | null;
  deal: Deal | null;
  company: Company | null;
  ownerName: string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;
  const overdue = getTaskBucket(task) === "overdue";

  return (
    <div ref={setNodeRef} style={style} className="group">
      <Card className="cursor-pointer border-border bg-card transition-all hover:shadow-md" onClick={onClick}>
        <CardContent className="p-2.5">
          <div className="flex items-start gap-2">
            <button
              {...listeners}
              {...attributes}
              className="mt-0.5 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
              aria-label="Arrastar"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <div className="min-w-0 flex-1 space-y-1">
              <p className={`truncate text-[13px] font-medium ${task.completed_at ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {task.title}
              </p>
              {deal && (
                <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <Handshake className="h-3 w-3 shrink-0" />
                  {deal.title}
                </p>
              )}
              {company && (
                <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {company.name}
                </p>
              )}
              {contact && (
                <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <UserIcon className="h-3 w-3 shrink-0" />
                  {contact.first_name} {contact.last_name || ""}
                </p>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {task.due_date ? (
                  <span className={`flex items-center gap-1 text-[10px] ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                    {overdue ? <AlertTriangle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                    {formatDateShort(task.due_date)}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-[10px] text-muted-foreground" title="Responsável">
                  {ownerName}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BucketColumn({
  bucket,
  tasks,
  contacts,
  deals,
  companies,
  ownerName,
  onTaskClick,
}: {
  bucket: TaskBucket;
  tasks: Activity[];
  contacts: Contact[];
  deals: Deal[];
  companies: Company[];
  ownerName: string;
  onTaskClick: (task: Activity) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[240px] sm:w-[260px] shrink-0 flex-col rounded-lg border border-border transition-colors ${
        isOver ? "border-primary/30 bg-primary/5" : "bg-muted/20"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-sm font-semibold">{TASK_BUCKET_LABELS[bucket]}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2 max-h-[calc(100vh-260px)]">
        {tasks.map((task) => {
          const contact = task.contact_id ? contacts.find((c) => c.id === task.contact_id) ?? null : null;
          const deal = task.deal_id ? deals.find((d) => d.id === task.deal_id) ?? null : null;
          const companyId = task.company_id || deal?.company_id || contact?.company_id || null;
          const company = companyId ? companies.find((c) => c.id === companyId) ?? null : null;
          return (
            <TaskCard
              key={task.id}
              task={task}
              contact={contact}
              deal={deal}
              company={company}
              ownerName={ownerName}
              onClick={() => onTaskClick(task)}
            />
          );
        })}
        {tasks.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma tarefa</p>
        )}
      </div>
    </div>
  );
}

interface TasksKanbanProps {
  tasks: Activity[];
  contacts: Contact[];
  deals: Deal[];
  companies: Company[];
  ownerName: string;
  onTaskClick: (task: Activity) => void;
  onDragEnd: (taskId: string, targetBucket: TaskBucket) => void;
}

export function TasksKanban({
  tasks,
  contacts,
  deals,
  companies,
  ownerName,
  onTaskClick,
  onDragEnd,
}: TasksKanbanProps) {
  const [activeTask, setActiveTask] = useState<Activity | null>(null);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(tasks.find((t) => t.id === event.active.id) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const targetBucket = over.id as TaskBucket;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || getTaskBucket(task) === targetBucket) return;
    onDragEnd(taskId, targetBucket);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {TASK_BUCKETS.map((bucket) => (
          <BucketColumn
            key={bucket}
            bucket={bucket}
            tasks={tasks.filter((t) => getTaskBucket(t) === bucket)}
            contacts={contacts}
            deals={deals}
            companies={companies}
            ownerName={ownerName}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-[240px] opacity-90">
            <Card className="border-primary bg-card shadow-lg">
              <CardContent className="p-2.5">
                <p className="text-[13px] font-medium">{activeTask.title}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
