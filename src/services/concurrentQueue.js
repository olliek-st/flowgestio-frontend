// src/services/concurrentQueue.js
// Simple concurrency-limited queue with retry/backoff for rate limiting

export class ConcurrentQueue {
  constructor(concurrency = 2, retryBaseDelay = 1200, maxRetries = 4) {
    this.concurrency = concurrency;
    this.active = 0;
    this.queue = [];
    this.retryBaseDelay = retryBaseDelay;
    this.maxRetries = maxRetries;
  }

  enqueue(taskFn, label = "") {
    return new Promise((resolve, reject) => {
      this.queue.push({ taskFn, resolve, reject, label, retries: 0 });
      this.process();
    });
  }

  async process() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    const item = this.queue.shift();
    this.active++;
    try {
      const result = await item.taskFn();
      this.active--;
      item.resolve(result);
      this.process();
    } catch (e) {
      // Retry on rate limit (HTTP 429 or error message)
      if (
        e?.code === 429 ||
        (typeof e?.message === "string" && e.message.toLowerCase().includes("rate limit"))
      ) {
        if (item.retries < this.maxRetries) {
          const delay = this.retryBaseDelay * Math.pow(2, item.retries);
          item.retries++;
          setTimeout(() => {
            this.active--;
            this.queue.unshift(item); // requeue at front
            this.process();
          }, delay);
          return;
        }
      }
      this.active--;
      item.reject(e);
      this.process();
    }
  }
}