"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { moveTaskAction } from "./actions";
import { TaskCard, type Option } from "./task-card";

export type BoardTask = {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  priority: string;
  dueDate: string | null;
  assigneeName: string | null;
  assigneeId: string | null;
  milestoneId: string | null;
};

const COLUMNS = [
  { key: "todo", label: "待办" },
  { key: "doing", label: "进行中" },
  { key: "done", label: "已完成" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

function Column({
  columnKey,
  label,
  tasks,
  projectId,
  canWrite,
  members,
  milestones,
}: {
  columnKey: ColumnKey;
  label: string;
  tasks: BoardTask[];
  projectId: string;
  canWrite: boolean;
  members: Option[];
  milestones: Option[];
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
        <TaskCard
          key={t.id}
          task={t}
          projectId={projectId}
          canWrite={canWrite}
          members={members}
          milestones={milestones}
        />
      ))}
    </div>
  );
}

export function Board({
  projectId,
  tasks,
  canWrite,
  members,
  milestones,
}: {
  projectId: string;
  tasks: BoardTask[];
  canWrite: boolean;
  members: Option[];
  milestones: Option[];
}) {
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
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
    const task = optimisticTasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;

    startTransition(async () => {
      setError(null);
      moveOptimistic({ taskId, status });
      const res = await moveTaskAction({ taskId, projectId, status });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <DndContext id={`board-${projectId}`} sensors={sensors} onDragEnd={handleDragEnd}>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.key}
            columnKey={col.key}
            label={col.label}
            tasks={optimisticTasks.filter((t) => t.status === col.key)}
            projectId={projectId}
            canWrite={canWrite}
            members={members}
            milestones={milestones}
          />
        ))}
      </div>
    </DndContext>
  );
}
