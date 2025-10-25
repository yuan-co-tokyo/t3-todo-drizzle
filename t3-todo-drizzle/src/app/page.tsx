// src/app/page.tsx
"use client";

import { api } from "~/trpc/react";
import { useState } from "react";
import { TodoItem } from "~/components/todo-item";

export default function HomePage() {
  const utils = api.useUtils();
  const { data: todos, isLoading } = api.todo.list.useQuery();
  const [title, setTitle] = useState("");

  const createMutation = api.todo.create.useMutation({
    onSuccess: () => {
      setTitle("");
      utils.todo.list.invalidate();
    },
  });

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-bold">T3 Todo (Drizzle)</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
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
          {todos?.map((t) => <TodoItem key={t.id} todo={t} />)}
        </ul>
      )}
    </main>
  );
}