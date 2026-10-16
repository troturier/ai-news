export async function register() {
  // The scheduler needs the Node.js runtime (database, long-lived process).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./pipeline/scheduler");
    startScheduler();
  }
}
