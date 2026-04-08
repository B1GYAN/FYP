const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const serverEntry = path.join(projectRoot, "server.js");
const dbEntry = path.join(projectRoot, "db.js");
const pollIntervalMs = 700;
const watchedDirectories = [path.join(projectRoot, "src"), path.join(projectRoot, "tests")];
const watchedRootFiles = [
  path.join(projectRoot, ".env"),
  path.join(projectRoot, ".env.example"),
  path.join(projectRoot, "db.js"),
  path.join(projectRoot, "package.json"),
  path.join(projectRoot, "server.js"),
];
const watchedExtensions = new Set([".js", ".json"]);
const ignoredDirectories = new Set(["node_modules", ".git", "coverage", "build", "dist"]);

let activeServer = null;
let lastSnapshot = new Map();
let isRestarting = false;
let pendingReason = "";
let pollHandle = null;
let isShuttingDown = false;

function shouldWatchFile(filePath) {
  const extension = path.extname(filePath);
  const basename = path.basename(filePath);

  return watchedExtensions.has(extension) || basename === ".env" || basename === ".env.example";
}

function collectWatchedFiles(directory, files = []) {
  if (!fs.existsSync(directory)) {
    return files;
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });

  entries.forEach((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) {
        return;
      }

      collectWatchedFiles(entryPath, files);
      return;
    }

    if (shouldWatchFile(entryPath)) {
      files.push(entryPath);
    }
  });

  return files;
}

function buildSnapshot() {
  const snapshot = new Map();
  const files = [
    ...watchedRootFiles.filter((filePath) => fs.existsSync(filePath)),
    ...watchedDirectories.flatMap((directory) => collectWatchedFiles(directory)),
  ];

  files.forEach((filePath) => {
    const stats = fs.statSync(filePath);
    snapshot.set(filePath, `${stats.size}:${stats.mtimeMs}`);
  });

  return snapshot;
}

function findChangedFile(previousSnapshot, nextSnapshot) {
  const allPaths = new Set([
    ...previousSnapshot.keys(),
    ...nextSnapshot.keys(),
  ]);

  for (const filePath of allPaths) {
    if (previousSnapshot.get(filePath) !== nextSnapshot.get(filePath)) {
      return filePath;
    }
  }

  return null;
}

async function closeDatabasePool() {
  let cachedDbModule;

  try {
    cachedDbModule = require.cache[require.resolve(dbEntry)];
  } catch (error) {
    return;
  }

  const pool = cachedDbModule?.exports?.pool;

  if (!pool?.end) {
    return;
  }

  try {
    await pool.end();
  } catch (error) {
    console.error("[dev] Failed to close PostgreSQL pool cleanly:", error);
  }
}

function clearProjectCache() {
  Object.keys(require.cache).forEach((modulePath) => {
    if (!modulePath.startsWith(projectRoot)) {
      return;
    }

    if (modulePath.includes(`${path.sep}node_modules${path.sep}`)) {
      return;
    }

    if (modulePath === __filename) {
      return;
    }

    delete require.cache[modulePath];
  });
}

async function closeActiveServer() {
  if (!activeServer) {
    return;
  }

  const serverToClose = activeServer;
  activeServer = null;

  await new Promise((resolve) => {
    let finished = false;
    const fallback = setTimeout(() => {
      if (finished) {
        return;
      }

      finished = true;
      serverToClose.closeAllConnections?.();
      resolve();
    }, 2000);

    serverToClose.close(() => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(fallback);
      resolve();
    });

    serverToClose.closeIdleConnections?.();
  });
}

async function restartServer(reason) {
  if (isRestarting) {
    pendingReason = reason;
    return;
  }

  isRestarting = true;

  if (reason) {
    console.log(`[dev] ${reason}`);
  }

  try {
    await closeActiveServer();
    await closeDatabasePool();
    clearProjectCache();

    const startServer = require(serverEntry);
    activeServer = await startServer({ exitOnError: false });
    lastSnapshot = buildSnapshot();
  } catch (error) {
    console.error("[dev] Backend restart failed:", error);
  } finally {
    isRestarting = false;

    if (pendingReason) {
      const nextReason = pendingReason;
      pendingReason = "";
      await restartServer(nextReason);
    }
  }
}

function beginPolling() {
  pollHandle = setInterval(() => {
    if (isRestarting || isShuttingDown) {
      return;
    }

    const nextSnapshot = buildSnapshot();
    const changedFile = findChangedFile(lastSnapshot, nextSnapshot);

    if (!changedFile) {
      return;
    }

    lastSnapshot = nextSnapshot;
    const relativePath = path.relative(projectRoot, changedFile);
    restartServer(`Change detected in ${relativePath}. Restarting backend...`);
  }, pollIntervalMs);
}

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (pollHandle) {
    clearInterval(pollHandle);
  }

  console.log(`[dev] ${signal} received. Stopping backend...`);
  await closeActiveServer();
  await closeDatabasePool();
  process.exit(0);
}

async function bootstrap() {
  console.log("[dev] Starting PaperTrade backend in reloadable dev mode...");
  lastSnapshot = buildSnapshot();
  await restartServer("Initial backend boot.");
  beginPolling();
  console.log(`[dev] Watching backend files with ${pollIntervalMs}ms polling.`);
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

bootstrap().catch((error) => {
  console.error("[dev] Unable to start backend dev runner:", error);
  process.exit(1);
});
