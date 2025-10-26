"use client";

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

export function HomePageContent({ apiClient }: HomePageContentProps) {
  const client = apiClient ?? api;
  const utils = client.useUtils();
  const { data: todos, isLoading } = client.todo.list.useQuery();
  const [title, setTitle] = useState("");
  const [notification, setNotification] = useState<Notification | null>(null);

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
    </main>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
