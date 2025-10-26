"use client";

import { useIsMutating } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Alert } from "~/components/alert";
import { TodoItem } from "~/components/todo-item";
import { toErrorMessage } from "~/lib/error-message";

type Notification = {
  status: "success" | "error";
  message: string;
};

type TodoApiClient = typeof api;

type HomePageContentProps = {
  apiClient?: TodoApiClient;
};

function useSafeMutationCount() {
  try {
    return useIsMutating();
  } catch (error) {
    if (error instanceof Error && error.message.includes("No QueryClient set")) {
      return 0;
    }
    throw error;
  }
}

export function HomePageContent({ apiClient }: HomePageContentProps) {
  const client = apiClient ?? api;
  const utils = client.useUtils();
  const [status, setStatus] = useState<"all" | "active" | "completed">("all");
  const { data: todos, isLoading, isFetching } = client.todo.list.useQuery({ status });
  const [title, setTitle] = useState("");
  const [notification, setNotification] = useState<Notification | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const isMutating = useSafeMutationCount() > 0;

  const {
    data: deletedTodos,
    isLoading: isDeletedLoading,
    isFetching: isDeletedFetching,
  } = client.todo.listDeleted.useQuery(undefined, {
    enabled: showDeleted,
  });

  const showError = (error: unknown) => {
    setNotification({ status: "error", message: toErrorMessage(error) });
  };

  const createMutation = client.todo.create.useMutation({
    onSuccess: () => {
      setTitle("");
      void utils.todo.list.invalidate();
      setNotification({ status: "success", message: "Task added successfully." });
    },
    onError: (error) => {
      showError(error);
    },
  });

  const restoreMutation = client.todo.restore.useMutation({
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

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-bold">T3 Todo (Drizzle)</h1>

      {notification ? (
        <div className="mb-4">
          <Alert
            status={notification.status}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        </div>
      ) : null}

      <div className="mb-4 flex gap-2">
        {(
          [
            { label: "All", value: "all" as const },
            { label: "Active", value: "active" as const },
            { label: "Completed", value: "completed" as const },
          ] satisfies { label: string; value: "all" | "active" | "completed" }[]
        ).map(({ label, value }) => {
          const isActive = status === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded border px-3 py-1 text-sm ${
                isActive ? "bg-black text-white" : "bg-white"
              } disabled:opacity-50`}
              disabled={isActive || isMutating}
            >
              {label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          setNotification(null);
          createMutation.mutate({ title });
        }}
        className="mb-6 flex gap-2"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 rounded border px-3 py-2 outline-none"
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Adding..." : "Add"}
        </button>
      </form>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul className="space-y-2">
          {todos?.map((t) => (
            <TodoItem key={t.id} todo={t} apiClient={client} />
          ))}
        </ul>
      )}

      {isFetching && !isLoading ? (
        <p className="mt-2 text-sm text-gray-500">Updating list...</p>
      ) : null}

      <section className="mt-8 border-t pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Deleted tasks</h2>
          <button
            type="button"
            onClick={() => setShowDeleted((v) => !v)}
            className="rounded border px-3 py-1 text-sm"
          >
            {showDeleted ? "Hide" : "Show"}
          </button>
        </div>

        {showDeleted ? (
          <div className="space-y-2">
            {isDeletedLoading ? (
              <p>Loading deleted tasks...</p>
            ) : deletedTodos && deletedTodos.length > 0 ? (
              <ul className="space-y-2">
                {deletedTodos.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      {item.deletedAt ? (
                        <p className="text-xs text-gray-500">
                          Deleted at: {item.deletedAt.toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => restoreMutation.mutate({ id: item.id })}
                      className="rounded bg-black px-3 py-1 text-white disabled:opacity-50"
                      disabled={restoreMutation.isPending}
                    >
                      {restoreMutation.isPending ? "Restoring..." : "Restore"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No deleted tasks.</p>
            )}

            {isDeletedFetching && !isDeletedLoading ? (
              <p className="text-xs text-gray-500">Updating deleted list...</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            View and restore tasks removed from the main list.
          </p>
        )}
      </section>
    </main>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
