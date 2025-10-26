"use client";

import { useState, type ReactNode } from "react";
import type { InferSelectModel } from "drizzle-orm";
import { api } from "~/trpc/react";
import { Alert } from "~/components/alert";
import { toErrorMessage } from "~/lib/error-message";
import { todos } from "~/server/db/schema";

type Todo = InferSelectModel<typeof todos>;

type Notification = {
  status: "success" | "error";
  message: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

type TodoApiClient = typeof api;

type TodoItemProps = {
  todo: Todo;
  apiClient?: TodoApiClient;
};

export function TodoItem({ todo, apiClient }: TodoItemProps) {
  const client = apiClient ?? api;
  const utils = client.useUtils();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [notification, setNotification] = useState<Notification | null>(null);

  const showError = (error: unknown) => {
    setNotification({ status: "error", message: toErrorMessage(error) });
  };

  const toggle = client.todo.toggle.useMutation({
    onSuccess: async () => {
      await utils.todo.list.invalidate();
      setNotification(null);
    },
    onError: async (error) => {
      await utils.todo.list.invalidate();
      showError(error);
    },
  });

  const updateTitle = client.todo.updateTitle.useMutation({
    onSuccess: async () => {
      await utils.todo.list.invalidate();
      setEditing(false);
      setNotification({ status: "success", message: "Task title updated." });
    },
    onError: async (error) => {
      await utils.todo.list.invalidate();
      showError(error);
    },
  });

  const restore = client.todo.restore.useMutation({
    onSuccess: async () => {
      setNotification({ status: "success", message: "タスクを復元しました。" });
      await Promise.all([
        utils.todo.list.invalidate(),
        utils.todo.listDeleted.invalidate(),
      ]);
    },
    onError: async (error) => {
      await Promise.all([
        utils.todo.list.invalidate(),
        utils.todo.listDeleted.invalidate(),
      ]);
      showError(error);
    },
  });

  const remove = client.todo.remove.useMutation({
    onSuccess: async (result) => {
      if (result?.todo) {
        setNotification({
          status: "success",
          message: `「${result.todo.title}」を削除しました。`,
          actionLabel: "元に戻す",
          onAction: () => {
            if (restore.isPending) return;
            setNotification(null);
            restore.mutate({ id: result.todo.id });
          },
        });
      } else if (result?.ok === false) {
        setNotification({ status: "error", message: "タスクが見つかりませんでした。" });
      }

      await Promise.all([
        utils.todo.list.invalidate(),
        utils.todo.listDeleted.invalidate(),
      ]);
    },
    onError: async (error) => {
      await Promise.all([
        utils.todo.list.invalidate(),
        utils.todo.listDeleted.invalidate(),
      ]);
      showError(error);
    },
  });

  return (
    <li className="flex flex-wrap items-center gap-3 rounded border p-3">
      <input
        type="checkbox"
        checked={!!todo.completed}
        onChange={(e) => {
          setNotification(null);
          toggle.mutate({ id: todo.id, completed: e.target.checked });
        }}
        className="h-5 w-5"
        disabled={toggle.isPending || remove.isPending}
      />

      {toggle.isPending ? (
        <span className="text-xs text-gray-500">Updating...</span>
      ) : null}

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            setNotification(null);
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
            {updateTitle.isPending ? "Saving..." : "Save"}
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
        disabled={updateTitle.isPending || remove.isPending}
      >
        {editing ? "Edit…" : "Edit"}
      </button>

      <button
        onClick={() => {
          setNotification(null);
          remove.mutate({ id: todo.id });
        }}
        className="rounded bg-red-600 px-3 py-1 text-white"
        disabled={remove.isPending}
      >
        {remove.isPending ? "Deleting..." : "Delete"}
      </button>

      {notification ? (
        <div className="w-full">
          <Alert
            status={notification.status}
            message={notification.message}
            onClose={() => setNotification(null)}
            actionLabel={notification.actionLabel}
            onAction={notification.onAction}
          />
        </div>
      ) : null}
    </li>
  );
}
