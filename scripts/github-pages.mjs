import { execFileSync } from "node:child_process";
const repo = "likeavenus/VibePlacement";
let credential;
try {
  credential = execFileSync("git", ["credential", "fill"], {
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
    stdio: ["pipe", "pipe", "pipe"],
  });
} catch {
  throw new Error(
    "GitHub credentials are not available in Git Credential Manager.",
  );
}
const password = credential
  .split(/\r?\n/)
  .find((line) => line.startsWith("password="))
  ?.slice(9);
if (!password)
  throw new Error("GitHub credential did not include an access token.");
async function api(endpoint, method = "GET", body) {
  const response = await fetch("https://api.github.com" + endpoint, {
    method,
    headers: {
      Authorization: "Bearer " + password,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await response.json().catch(() => ({}));
  return { status: response.status, value };
}
const command = process.argv[2] ?? "inspect";
if (command === "inspect") {
  const { status, value } = await api("/repos/" + repo);
  console.log(
    JSON.stringify({
      status,
      repository: value.full_name,
      visibility: value.visibility,
      permissions: value.permissions,
      defaultBranch: value.default_branch,
    }),
  );
  const pages = await api("/repos/" + repo + "/pages");
  console.log(
    JSON.stringify({
      pagesStatus: pages.status,
      url: pages.value.html_url,
      source: pages.value.source,
      buildType: pages.value.build_type,
    }),
  );
} else if (command === "enable") {
  const existing = await api("/repos/" + repo + "/pages");
  if (existing.status !== 200 && existing.status !== 404)
    throw new Error("Cannot inspect Pages settings: HTTP " + existing.status);
  const result = await api(
    "/repos/" + repo + "/pages",
    existing.status === 404 ? "POST" : "PUT",
    { build_type: "legacy", source: { branch: "gh-pages", path: "/" } },
  );
  console.log(
    JSON.stringify({
      status: result.status,
      url: result.value.html_url,
      message: result.value.message,
    }),
  );
  if (![201, 204].includes(result.status)) process.exitCode = 1;
} else if (command === "status") {
  const pages = await api("/repos/" + repo + "/pages");
  const build = await api("/repos/" + repo + "/pages/builds/latest");
  console.log(
    JSON.stringify({
      pagesStatus: pages.status,
      url: pages.value.html_url,
      status: build.value.status,
      error: build.value.error,
      commit: build.value.commit,
    }),
  );
} else throw new Error("Unknown command");
