// src/components/todo-item.tsx
"use client";

import { api } from "~/trpc/react";
import { useState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import { todos } from "~/server/db/schema";

type Todo = InferSelectModel<typeof todos>;

export function TodoItem({ todo }: { todo: Todo }) {
  const utils = api.useUtils();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);

  const toggle = api.todo.toggle.useMutation({
    onSuccess: () => utils.todo.list.invalidate(),
  });
  const updateTitle = api.todo.updateTitle.useMutation({
    onSuccess: () => {
      utils.todo.list.invalidate();
      setEditing(false);
    },
  });
  const remove = api.todo.remove.useMutation({
    onSuccess: () => utils.todo.list.invalidate(),
  });

  return (
    <li className="flex items-center gap-3 rounded border p-3">
      <input
        type="checkbox"
        checked={!!todo.completed}
        onChange={(e) =>
          toggle.mutate({ id: todo.id, completed: e.target.checked })
        }
        className="h-5 w-5"
      />

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            updateTitle.mutate({ id: todo.id, title: draft.trim() });
          }}
          className="flex flex-1 items-center gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 rounded border px-2 py-1"
            autoFocus
          />
          <button
            type="submit"
            className="rounded bg-black px-3 py-1 text-white"
            disabled={updateTitle.isPending}
          >
            Save
          </button>
          <button
            type="button"
            className="rounded border px-3 py-1"
            onClick={() => {
              setDraft(todo.title);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <span
          className={`flex-1 ${todo.completed ? "text-gray-400 line-through" : ""}`}
          onDoubleClick={() => setEditing(true)}
          title="ダブルクリックで編集"
        >
          {todo.title}
        </span>
      )}

      <button
        onClick={() => setEditing((v) => !v)}
        className="rounded border px-3 py-1"
      >
        {editing ? "Edit…" : "Edit"}
      </button>

      <button
        onClick={() => remove.mutate({ id: todo.id })}
        className="rounded bg-red-600 px-3 py-1 text-white"
        disabled={remove.isPending}
      >
        Delete
      </button>
    </li>
  );
}