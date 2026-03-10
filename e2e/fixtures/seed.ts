import type { APIRequestContext } from "@playwright/test";

const API_BASE = "http://localhost:3000";

export interface SeededTodo {
  id: string;
  text: string;
  completed: boolean;
}

export async function createTodo(
  request: APIRequestContext,
  text: string,
  options?: { completed?: boolean },
): Promise<SeededTodo> {
  const id = crypto.randomUUID();
  const response = await request.post(`${API_BASE}/api/todos`, {
    data: { id, text },
  });
  if (!response.ok()) {
    throw new Error(`Failed to create todo: ${response.status()}`);
  }
  const todo = (await response.json()) as SeededTodo;

  if (options?.completed) {
    const patchResponse = await request.patch(
      `${API_BASE}/api/todos/${todo.id}`,
      {
        data: { completed: true },
      },
    );
    if (!patchResponse.ok()) {
      throw new Error(`Failed to complete todo: ${patchResponse.status()}`);
    }
    return { ...todo, completed: true };
  }

  return todo;
}

export async function seedTodos(
  request: APIRequestContext,
  count: number,
  options?: { completed?: boolean; prefix?: string },
): Promise<SeededTodo[]> {
  const todos: SeededTodo[] = [];
  for (let i = 1; i <= count; i++) {
    const text = `${options?.prefix ?? "Todo"} ${i}`;
    const todo = await createTodo(request, text, {
      completed: options?.completed,
    });
    todos.push(todo);
  }
  return todos;
}

async function deleteAllByStatus(
  request: APIRequestContext,
  status?: string,
): Promise<void> {
  const qs = status ? `?status=${status}` : "";
  // Server caps limit at pageSize (20), so loop until empty
  for (;;) {
    const response = await request.get(`${API_BASE}/api/todos${qs}`);
    if (!response.ok()) return;
    const body = (await response.json()) as { data: SeededTodo[] };
    if (body.data.length === 0) break;
    await Promise.all(
      body.data.map((todo) =>
        request.delete(`${API_BASE}/api/todos/${todo.id}`),
      ),
    );
  }
}

export async function deleteAllTodos(
  request: APIRequestContext,
): Promise<void> {
  // Without status filter, API returns all todos (active + completed)
  await deleteAllByStatus(request);
}
