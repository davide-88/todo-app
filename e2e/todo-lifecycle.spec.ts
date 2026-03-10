import { test, expect } from "@playwright/test";
import { deleteAllTodos } from "./fixtures/seed";

test.describe("Todo Lifecycle", () => {
  test.beforeEach(async ({ request, page }) => {
    await deleteAllTodos(request);
    await page.goto("/");
  });

  test("create → complete → uncomplete → delete", async ({ page }) => {
    const todoText = "Buy groceries";

    // Create a todo
    const input = page.getByLabel("New todo text");
    await input.fill(todoText);
    await input.press("Enter");

    // Verify it appears in list
    const todoRow = page.getByRole("listitem").filter({ hasText: todoText });
    await expect(todoRow).toBeVisible();

    // Wait for syncing to complete (status dot disappears)
    await expect(
      todoRow.getByRole("status", { name: "Syncing" }),
    ).toBeHidden({ timeout: 5000 });

    // Complete the todo
    const checkbox = todoRow.getByRole("checkbox");
    await checkbox.click();

    // Completing on Active tab moves it to Completed tab — switch there
    const completedTab = page.getByRole("tab", { name: "Completed" });
    await completedTab.click();

    const completedRow = page
      .getByRole("listitem")
      .filter({ hasText: todoText });
    await expect(completedRow).toBeVisible();

    // Verify strikethrough (completed state)
    await expect(completedRow.locator("span.line-through")).toBeVisible();

    const completedCheckbox = completedRow.getByRole("checkbox");
    await completedCheckbox.click();

    // Wait for sync
    await expect(
      completedRow.getByRole("status", { name: "Syncing" }),
    ).toBeHidden({ timeout: 5000 });

    // Switch back to Active tab — todo should be back
    const activeTab = page.getByRole("tab", { name: "Active" });
    await activeTab.click();

    const activeRow = page.getByRole("listitem").filter({ hasText: todoText });
    await expect(activeRow).toBeVisible();

    // Verify no strikethrough (active state)
    await expect(activeRow.locator("span.line-through")).toBeHidden();

    // Delete the todo
    const deleteButton = activeRow.getByLabel(`Delete todo: ${todoText}`);
    await deleteButton.click();

    // Verify removed from list
    await expect(activeRow).toBeHidden();
  });

  test("input retains focus after creation", async ({ page }) => {
    const input = page.getByLabel("New todo text");
    await input.fill("First todo");
    await input.press("Enter");

    // Input should be focused and cleared
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("");
  });

  test("prevents empty todo creation", async ({ page }) => {
    const countBefore = await page.getByRole("listitem").count();

    const input = page.getByLabel("New todo text");
    await input.press("Enter");

    // No new todo should be created — count stays the same
    await expect(page.getByRole("listitem")).toHaveCount(countBefore);
  });
});
