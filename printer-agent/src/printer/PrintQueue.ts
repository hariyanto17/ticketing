export type PrintJobState = "queued" | "printing" | "completed" | "failed";

export interface PrintJobResult {
  jobId: string;
  status: PrintJobState;
  error?: string;
}

type QueueTask = {
  jobId: string;
  task: () => Promise<void>;
  resolve: (result: PrintJobResult) => void;
};

export class PrintQueue {
  private readonly queue: QueueTask[] = [];
  private readonly jobs = new Map<string, PrintJobResult>();
  private processing = false;

  enqueue(jobId: string, task: () => Promise<void>): Promise<PrintJobResult> {
    const existing = this.jobs.get(jobId);
    if (existing) return Promise.resolve(existing);

    this.jobs.set(jobId, { jobId, status: "queued" });
    return new Promise((resolve) => {
      this.queue.push({ jobId, task, resolve });
      void this.process();
    });
  }

  get(jobId: string): PrintJobResult | undefined {
    return this.jobs.get(jobId);
  }

  async close(): Promise<void> {
    while (this.processing) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        if (!item) continue;

        this.jobs.set(item.jobId, { jobId: item.jobId, status: "printing" });
        try {
          await item.task();
          const result = { jobId: item.jobId, status: "completed" as const };
          this.jobs.set(item.jobId, result);
          item.resolve(result);
        } catch (error) {
          const result = {
            jobId: item.jobId,
            status: "failed" as const,
            error: error instanceof Error ? error.message : "Print failed",
          };
          this.jobs.set(item.jobId, result);
          item.resolve(result);
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
