/**
 * API Latency Validation Script
 *
 * Measures p95 latency for all CRUD operations and pagination.
 * Requires the backend to be running with a real Postgres database.
 *
 * Usage: npx tsx scripts/check-api-latency.ts
 */

const API_BASE = process.env["API_BASE"] ?? "http://localhost:3000";
const ITERATIONS = 50;

interface TimingResult {
  operation: string;
  times: number[];
  p95: number;
  threshold: number;
  pass: boolean;
}

async function measureLatency(
  _operation: string,
  fn: () => Promise<void>,
  iterations: number,
): Promise<number[]> {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  return times;
}

function p95(times: number[]): number {
  const sorted = [...times].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[index]!;
}

async function main() {
  console.log(`API Latency Validation`);
  console.log(`API Base: ${API_BASE}`);
  console.log(`Iterations per operation: ${ITERATIONS}`);
  console.log("");

  // Check API is reachable
  try {
    await fetch(`${API_BASE}/api/health`);
  } catch {
    console.error(`ERROR: Cannot reach API at ${API_BASE}/api/health`);
    console.error("Make sure the backend is running.");
    process.exit(1);
  }

  const results: TimingResult[] = [];
  const createdIds: string[] = [];
  const allCreatedIds: string[] = [];

  try {
  // CREATE - POST /api/todos
  const createTimes = await measureLatency(
    "CREATE",
    async () => {
      const id = crypto.randomUUID();
      const res = await fetch(`${API_BASE}/api/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text: `Latency test ${id.slice(0, 8)}` }),
      });
      if (!res.ok) throw new Error(`CREATE failed: ${res.status}`);
      createdIds.push(id);
      allCreatedIds.push(id);
    },
    ITERATIONS,
  );

  results.push({
    operation: "CREATE (POST /api/todos)",
    times: createTimes,
    p95: p95(createTimes),
    threshold: 500,
    pass: p95(createTimes) < 500,
  });

  // READ (list) - GET /api/todos
  const readTimes = await measureLatency(
    "READ",
    async () => {
      const res = await fetch(`${API_BASE}/api/todos`);
      if (!res.ok) throw new Error(`READ failed: ${res.status}`);
    },
    ITERATIONS,
  );

  results.push({
    operation: "READ (GET /api/todos)",
    times: readTimes,
    p95: p95(readTimes),
    threshold: 300,
    pass: p95(readTimes) < 300,
  });

  // UPDATE - PATCH /api/todos/:id
  const updateTimes = await measureLatency(
    "UPDATE",
    async () => {
      const id = createdIds[Math.floor(Math.random() * createdIds.length)];
      const res = await fetch(`${API_BASE}/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error(`UPDATE failed: ${res.status}`);
    },
    ITERATIONS,
  );

  results.push({
    operation: "UPDATE (PATCH /api/todos/:id)",
    times: updateTimes,
    p95: p95(updateTimes),
    threshold: 500,
    pass: p95(updateTimes) < 500,
  });

  // PAGINATION - GET /api/todos with cursor
  const paginationTimes = await measureLatency(
    "PAGINATION",
    async () => {
      const res = await fetch(`${API_BASE}/api/todos?status=active`);
      if (!res.ok) throw new Error(`PAGINATION failed: ${res.status}`);
      const body = (await res.json()) as { cursor: string | null };
      if (body.cursor) {
        const res2 = await fetch(
          `${API_BASE}/api/todos?status=active&cursor=${body.cursor}`,
        );
        if (!res2.ok)
          throw new Error(`PAGINATION page 2 failed: ${res2.status}`);
      }
    },
    ITERATIONS,
  );

  results.push({
    operation: "PAGINATION (GET /api/todos?cursor=...)",
    times: paginationTimes,
    p95: p95(paginationTimes),
    threshold: 300,
    pass: p95(paginationTimes) < 300,
  });

  // DELETE - DELETE /api/todos/:id
  const deleteIds = createdIds.splice(0, Math.min(ITERATIONS, createdIds.length));
  const deleteTimes = await measureLatency(
    "DELETE",
    async () => {
      const id = deleteIds.pop();
      if (!id) return;
      const res = await fetch(`${API_BASE}/api/todos/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404)
        throw new Error(`DELETE failed: ${res.status}`);
    },
    deleteIds.length,
  );

  results.push({
    operation: "DELETE (DELETE /api/todos/:id)",
    times: deleteTimes,
    p95: p95(deleteTimes),
    threshold: 500,
    pass: p95(deleteTimes) < 500,
  });

  } finally {
    // Cleanup all created todos (including ones already deleted — 404 is fine)
    for (const id of allCreatedIds) {
      await fetch(`${API_BASE}/api/todos/${id}`, { method: "DELETE" }).catch(
        () => {},
      );
    }
  }

  // Report
  console.log("Results:");
  console.log("--------");
  let allPass = true;
  for (const r of results) {
    const status = r.pass ? "PASS" : "FAIL";
    console.log(
      `  ${status}: ${r.operation} — p95: ${r.p95.toFixed(1)}ms (threshold: ${r.threshold}ms)`,
    );
    if (!r.pass) allPass = false;
  }

  console.log("");
  if (allPass) {
    console.log("PASS: All API latency checks passed.");
  } else {
    console.log("FAIL: Some API latency checks failed.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
