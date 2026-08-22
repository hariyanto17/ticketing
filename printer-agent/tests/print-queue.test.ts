import test from "node:test";
import assert from "node:assert/strict";
import { PrintQueue } from "../src/printer/PrintQueue.js";

test("PrintQueue preserves order and recovers after a failed job", async () => {
  const queue = new PrintQueue();
  const order: string[] = [];
  const jobs = await Promise.all([
    queue.enqueue("A", async () => { order.push("A"); }),
    queue.enqueue("B", async () => { order.push("B"); throw new Error("offline"); }),
    queue.enqueue("C", async () => { order.push("C"); }),
  ]);

  assert.deepEqual(order, ["A", "B", "C"]);
  assert.deepEqual(jobs.map((job) => job.status), ["completed", "failed", "completed"]);
  assert.equal(jobs[1]?.error, "offline");
});

test("PrintQueue returns the existing result for a duplicate job ID", async () => {
  const queue = new PrintQueue();
  let runs = 0;
  const first = await queue.enqueue("same", async () => { runs += 1; });
  const second = await queue.enqueue("same", async () => { runs += 1; });

  assert.equal(runs, 1);
  assert.deepEqual(second, first);
});
