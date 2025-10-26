import test from "node:test";
import assert from "node:assert/strict";
import { act, useState } from "react";

import { HomePageContent } from "~/app/page";
import { TodoItem } from "~/components/todo-item";
import type { InferSelectModel } from "drizzle-orm";
import { todos } from "~/server/db/schema";

import {
  click,
  flushMicrotasks,
  getByPlaceholderText,
  getByText,
  input,
  queryAllByTag,
  queryByText,
  render,
} from "./utils/render";
import type { MiniNode } from "./utils/minidom";

type Todo = InferSelectModel<typeof todos>;

type MutationConfig<TInput> = {
  onError?: (error: Error, variables: TInput, context: unknown) => void;
  onSuccess?: (data: unknown, variables: TInput, context: unknown) => void;
};

type MutationBehavior<TInput> = {
  mode: "success" | "error";
  errorMessage?: string;
};

type MockApiOptions = {
  list?: {
    data?: Todo[];
    isLoading?: boolean;
  };
  listDeleted?: {
    data?: Todo[];
    isLoading?: boolean;
  };
  create?: MutationBehavior<{ title: string }>;
  updateTitle?: MutationBehavior<{ id: string; title: string }>;
  toggle?: MutationBehavior<{ id: string; completed: boolean }>;
  remove?: MutationBehavior<{ id: string }>;
  restore?: MutationBehavior<{ id: string }>;
};

type TodoApiClient = typeof import("~/trpc/react").api;

type MutationControls = {
  create?: ReturnType<typeof useMockMutation<{ title: string }>>;
  updateTitle?: ReturnType<typeof useMockMutation<{ id: string; title: string }>>;
  toggle?: ReturnType<typeof useMockMutation<{ id: string; completed: boolean }>>;
  remove?: ReturnType<typeof useMockMutation<{ id: string }>>;
  restore?: ReturnType<typeof useMockMutation<{ id: string }>>;
};

function useMockMutation<TInput>(
  config: MutationConfig<TInput> | undefined,
  behavior: MutationBehavior<TInput>,
) {
  const [isPending, setIsPending] = useState(false);

  const mutate = (variables: TInput) => {
    setIsPending(true);
    queueMicrotask(() => {
      act(() => {
        if (behavior.mode === "error") {
          const error = new Error(behavior.errorMessage ?? "Mutation failed");
          config?.onError?.(error, variables, undefined as never);
        } else {
          config?.onSuccess?.(undefined as never, variables, undefined as never);
        }
        setIsPending(false);
      });
    });
  };

  return {
    mutate,
    isPending,
  };
}

function createMockApi(options: MockApiOptions = {}): {
  client: TodoApiClient;
  controls: MutationControls;
} {
  const controls: MutationControls = {};
  const utils = {
    todo: {
      list: {
        invalidate: async () => {
          // テストでは実際のデータ取得を行わない
        },
      },
      listDeleted: {
        invalidate: async () => {
          // テストでは実際のデータ取得を行わない
        },
      },
    },
  };

  const client = {
    useUtils: () => utils,
    todo: {
      list: {
        useQuery: () => ({
          data: options.list?.data ?? [],
          isLoading: options.list?.isLoading ?? false,
          isFetching: false,
        }),
      },
      listDeleted: {
        useQuery: (_input?: unknown, queryOptions?: { enabled?: boolean }) => ({
          data: options.listDeleted?.data ?? [],
          isLoading:
            queryOptions?.enabled === false
              ? false
              : options.listDeleted?.isLoading ?? false,
          isFetching: false,
        }),
      },
      create: {
        useMutation: (config?: MutationConfig<{ title: string }>) => {
          const mutation = useMockMutation(config, options.create ?? { mode: "success" });
          controls.create = mutation;
          return mutation;
        },
      },
      updateTitle: {
        useMutation: (config?: MutationConfig<{ id: string; title: string }>) => {
          const mutation = useMockMutation(
            config,
            options.updateTitle ?? { mode: "success" },
          );
          controls.updateTitle = mutation;
          return mutation;
        },
      },
      toggle: {
        useMutation: (config?: MutationConfig<{ id: string; completed: boolean }>) => {
          const mutation = useMockMutation(
            config,
            options.toggle ?? { mode: "success" },
          );
          controls.toggle = mutation;
          return mutation;
        },
      },
      remove: {
        useMutation: (config?: MutationConfig<{ id: string }>) => {
          const mutation = useMockMutation(config, options.remove ?? { mode: "success" });
          controls.remove = mutation;
          return mutation;
        },
      },
      restore: {
        useMutation: (config?: MutationConfig<{ id: string }>) => {
          const mutation = useMockMutation(config, options.restore ?? { mode: "success" });
          controls.restore = mutation;
          return mutation;
        },
      },
    },
  } as unknown as TodoApiClient;

  return { client, controls };
}

test("HomePageContent は作成失敗時にエラーを表示する", async () => {
  const { client, controls } = createMockApi({
    create: { mode: "error", errorMessage: "Failed to create task" },
  });
  const { container, unmount } = render(<HomePageContent apiClient={client} />);

  const titleInput = getByPlaceholderText(container, "Add a task...");
  input(titleInput, "New Task");

  assert.ok(controls.create, "create ミューテーションが初期化されること");
  act(() => {
    controls.create?.mutate({ title: "New Task" });
  });
  await flushMicrotasks();

  const alert = await waitForText(container, "Failed to create task");
  assert.ok(alert, "エラーアラートが表示されること");

  const submitButton = queryAllByTag(container, "button").find(
    (btn) => btn.getAttribute("type") === "submit",
  );
  assert.ok(submitButton, "submit ボタンが存在すること");
  assert.strictEqual(submitButton!.getAttribute("disabled"), null);

  unmount();
});

test("TodoItem はタイトル更新失敗時にエラーを表示する", async () => {
  const { client, controls } = createMockApi({
    updateTitle: { mode: "error", errorMessage: "Failed to update" },
  });
  const todo: Todo = {
    id: "todo-1",
    title: "Sample",
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const { container, unmount } = render(<TodoItem todo={todo} apiClient={client} />);

  const editButton = getByText(container, "Edit");
  click(editButton);

  const inputs = queryAllByTag(container, "input");
  const textInput = inputs.find((inputEl) => inputEl.getAttribute("type") !== "checkbox");
  assert.ok(textInput, "タイトル入力欄が表示されること");
  input(textInput!, "Updated title");

  const formButtons = queryAllByTag(textInput!.parentNode ?? textInput!, "button");
  assert.ok(formButtons.length > 0, "フォーム内のボタンが取得できること");
  const saveButton = formButtons[0];
  assert.ok(saveButton, "保存ボタンが取得できること");

  assert.ok(controls.updateTitle, "updateTitle ミューテーションが初期化されること");
  act(() => {
    controls.updateTitle?.mutate({ id: todo.id, title: "Updated title" });
  });
  await flushMicrotasks();

  const alert = await waitForText(container, "Failed to update");
  assert.ok(alert, "更新エラーが表示されること");

  assert.strictEqual(saveButton.getAttribute("disabled"), null);

  unmount();
});

async function waitForText(container: MiniNode, text: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const match = queryByText(container, text);
    if (match) {
      return match;
    }
    await flushMicrotasks();
  }
  return getByText(container, text);
}
