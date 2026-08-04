console.log(JSON.stringify({ service: "worker", status: "ready", pid: process.pid }));
process.on("SIGTERM", () => process.exit(0));
