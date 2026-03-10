import { test, expect } from "@playwright/test";
import { deleteAllTodos, seedTodos, createTodo } from "./fixtures/seed";

test.describe("Pagination & Filtering", () => {
  test.beforeEach(async ({ request }) => {
    await deleteAllTodos(request);
  });

  test("load more button shows and loads next page", async ({
    page,
    request,
  }) => {
    // Seed 25 active todos (pageSize is 20)
    await seedTodos(request, 25, { prefix: "Paginated" });

    await page.goto("/");

    // First page should show 20 items
    await expect(page.getByRole("listitem")).toHaveCount(20, {
      timeout: 10000,
    });

    // Load more button should be visible
    const loadMore = page.getByRole("button", { name: /load more/i });
    await expect(loadMore).toBeVisible();

    // Click load more
    await loadMore.click();

    // Should now show all 25 items
    await expect(page.getByRole("listitem")).toHaveCount(25, {
      timeout: 10000,
    });

    // Load more should be hidden (no more pages)
    await expect(loadMore).toBeHidden();
  });

  test("sort order toggle reverses list order", async ({ page, request }) => {
    // Seed a few todos with distinct names (created in order)
    await createTodo(request, "First todo created");
    await createTodo(request, "Second todo created");
    await createTodo(request, "Third todo created");

    await page.goto("/");
    await expect(page.getByRole("listitem")).toHaveCount(3, {
      timeout: 10000,
    });

    // Default sort is newest first — third should be first in list
    const items = page.getByRole("listitem");
    await expect(items.first()).toContainText("Third todo created");

    // Click sort toggle
    const sortButton = page.getByRole("button", {
      name: /sort order/i,
    });
    await sortButton.click();

    // After toggle, oldest first — first should be first in list
    await expect(items.first()).toContainText("First todo created");
  });

  test("tab filtering shows active vs completed todos", async ({
    page,
    request,
  }) => {
    // Seed 3 active and 2 completed
    await createTodo(request, "Active todo 1");
    await createTodo(request, "Active todo 2");
    await createTodo(request, "Active todo 3");
    await createTodo(request, "Completed todo 1", { completed: true });
    await createTodo(request, "Completed todo 2", { completed: true });

    await page.goto("/");

    // Active tab (default) should show 3 items
    await expect(page.getByRole("listitem")).toHaveCount(3, {
      timeout: 10000,
    });

    // Switch to Completed tab
    const completedTab = page.getByRole("tab", { name: "Completed" });
    await completedTab.click();

    // Should show 2 completed items
    await expect(page.getByRole("listitem")).toHaveCount(2, {
      timeout: 10000,
    });

    // Switch back to Active tab
    const activeTab = page.getByRole("tab", { name: "Active" });
    await activeTab.click();

    // Should show 3 active items again
    await expect(page.getByRole("listitem")).toHaveCount(3, {
      timeout: 10000,
    });
  });

  test("deleting a todo in paginated list keeps stable positioning", async ({
    page,
    request,
  }) => {
    // Seed 22 todos
    await seedTodos(request, 22, { prefix: "Stable" });

    await page.goto("/");
    await expect(page.getByRole("listitem")).toHaveCount(20, {
      timeout: 10000,
    });

    // Load more
    const loadMore = page.getByRole("button", { name: /load more/i });
    await loadMore.click();
    await expect(page.getByRole("listitem")).toHaveCount(22, {
      timeout: 10000,
    });

    // Delete one from the middle
    const middleTodo = page
      .getByRole("listitem")
      .filter({ hasText: "Stable 11" });
    const deleteButton = middleTodo.getByLabel("Delete todo: Stable 11");
    await deleteButton.click();

    // Should now have 21 items
    await expect(page.getByRole("listitem")).toHaveCount(21, {
      timeout: 10000,
    });
  });
});
