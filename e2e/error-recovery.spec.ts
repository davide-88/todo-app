import { test, expect } from "@playwright/test";
import { deleteAllTodos } from "./fixtures/seed";

test.describe("Error Recovery", () => {
  test.beforeEach(async ({ request, page }) => {
    await deleteAllTodos(request);
    await page.goto("/");
  });

  test("transient error → retry → success", async ({ page }) => {
    const todoText = "Transient error todo";
    let interceptCount = 0;

    // Intercept the POST to simulate a 500 on first attempt
    await page.route("**/api/todos", (route) => {
      if (route.request().method() === "POST" && interceptCount === 0) {
        interceptCount++;
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INTERNAL_ERROR",
            message: "Simulated server error",
          }),
        });
      }
      return route.continue();
    });

    // Create a todo (will fail)
    const input = page.getByLabel("New todo text");
    await input.fill(todoText);
    await input.press("Enter");

    // Verify error state — row should show error status
    const todoRow = page.getByRole("listitem").filter({ hasText: todoText });
    await expect(todoRow.getByRole("status", { name: "Error" })).toBeVisible({
      timeout: 5000,
    });

    // Verify retry button is visible
    const retryButton = todoRow.getByLabel(`Retry todo: ${todoText}`);
    await expect(retryButton).toBeVisible();

    // Click retry — this time the API call goes through
    await retryButton.click();

    // Wait for syncing to complete
    await expect(
      todoRow.getByRole("status", { name: "Syncing" }),
    ).toBeHidden({ timeout: 5000 });

    // Verify todo is now in confirmed state (no error dot, no retry button)
    await expect(todoRow.getByRole("status")).toBeHidden();
    await expect(retryButton).toBeHidden();
  });

  test("permanent error → error message → delete → recreate", async ({
    page,
  }) => {
    const todoText = "Permanent error todo";

    // Intercept POST to simulate a 400 validation error
    await page.route("**/api/todos", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            code: "VALIDATION_ERROR",
            message: "Text exceeds maximum length",
          }),
        });
      }
      return route.continue();
    });

    // Create a todo (will get permanent error)
    const input = page.getByLabel("New todo text");
    await input.fill(todoText);
    await input.press("Enter");

    // Verify error state with error message
    const todoRow = page.getByRole("listitem").filter({ hasText: todoText });
    await expect(todoRow.getByRole("alert")).toBeVisible({ timeout: 5000 });

    // Verify no retry button for permanent errors
    await expect(
      todoRow.getByLabel(`Retry todo: ${todoText}`),
    ).not.toBeVisible();

    // Delete the errored todo
    const deleteButton = todoRow.getByLabel(`Delete todo: ${todoText}`);
    await deleteButton.click();
    await expect(todoRow).toBeHidden();

    // Remove the route intercept
    await page.unroute("**/api/todos");

    // Recreate with valid data
    await input.fill(todoText);
    await input.press("Enter");

    // Verify new todo succeeds
    const newRow = page.getByRole("listitem").filter({ hasText: todoText });
    await expect(newRow).toBeVisible();
    await expect(newRow.getByRole("status", { name: "Syncing" })).toBeHidden({
      timeout: 5000,
    });
  });
});
