"use client";

import { useOptimistic, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { moveTaskAction } from "./actions";

export type BoardTask = {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  priority: string;
  dueDate: string | null;
  assigneeName: string | null;
};

const COLUMNS = [
  { key: "todo", label: "待办" },
  { key: "doing", label: "进行中" },
  { key: "done", label: "已完成" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

function TaskCard({ task, canWrite }: { task: BoardTask; canWrite: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !canWrite,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
          : undefined
      }
      className={`rounded border bg-white p-2 text-sm ${
        canWrite ? "cursor-grab" : ""
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <p className="font-medium">{task.title}</p>
      <p className="mt-1 text-xs text-gray-500">
        {task.assigneeName ?? "未分配"}
        {task.dueDate && ` · ${task.dueDate}`}
        {` · ${task.priority}`}
      </p>
    </div>
  );
}

function Column({
  columnKey,
  label,
  tasks,
  canWrite,
}: {
  columnKey: ColumnKey;
  label: string;
  tasks: BoardTask[];
  canWrite: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-40 space-y-2 rounded border p-3 ${
        isOver ? "bg-blue-50" : "bg-gray-50"
      }`}
    >
      <h3 className="text-sm font-medium text-gray-600">
        {label} <span className="text-xs text-gray-400">{tasks.length}</span>
      </h3>
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} canWrite={canWrite} />
      ))}
    </div>
  );
}

export function Board({
  projectId,
  tasks,
  canWrite,
}: {
  projectId: string;
  tasks: BoardTask[];
  canWrite: boolean;
}) {
  const [, startTransition] = useTransition();
  const [optimisticTasks, moveOptimistic] = useOptimistic(
    tasks,
    (current, move: { taskId: string; status: ColumnKey }) =>
      current.map((t) => (t.id === move.taskId ? { ...t, status: move.status } : t)),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const over = event.over?.id;
    if (!over) return;
    const status = over as ColumnKey;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;

    startTransition(async () => {
      moveOptimistic({ taskId, status });
      await moveTaskAction({ taskId, projectId, status });
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.key}
            columnKey={col.key}
            label={col.label}
            tasks={optimisticTasks.filter((t) => t.status === col.key)}
            canWrite={canWrite}
          />
        ))}
      </div>
    </DndContext>
  );
}
