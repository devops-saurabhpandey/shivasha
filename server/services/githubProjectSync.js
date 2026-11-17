const API = "https://api.github.com";
const CACHE_MS = 60_000;
let cache = { at: 0, value: null };

async function githubGet(path, token) {
  const response = await fetch(API + path, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "SHIVASHA-Project-Dashboard"
    },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error("GitHub API returned " + response.status);
    error.status = response.status;
    error.detail = detail.slice(0, 500);
    throw error;
  }
  return response.json();
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await worker(items[index]);
    }
  }));
  return output;
}

export async function getGitHubProjectSnapshot({ force = false } = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const error = new Error("GitHub sync is not configured. Add GITHUB_TOKEN to the private backend environment.");
    error.status = 503;
    throw error;
  }
  if (!force && cache.value && Date.now() - cache.at < CACHE_MS) return cache.value;

  const owner = String(process.env.GITHUB_OWNER || "devops-saurabhpandey").trim();
  const repositories = await githubGet("/user/repos?per_page=100&sort=updated&affiliation=owner", token);
  const owned = repositories.filter(repo => repo.owner?.login?.toLowerCase() === owner.toLowerCase());
  const projects = await mapLimit(owned, 5, async repo => {
    const base = "/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo.name);
    const results = await Promise.allSettled([
      githubGet(base + "/issues?state=open&per_page=10&sort=updated", token),
      githubGet(base + "/pulls?state=open&per_page=10&sort=updated", token),
      githubGet(base + "/actions/runs?per_page=1", token)
    ]);
    const [issueResult, prResult, runResult] = results;
    const issues = issueResult.status === "fulfilled"
      ? issueResult.value.filter(item => !item.pull_request).map(item => ({
          number: item.number, title: item.title, url: item.html_url,
          updatedAt: item.updated_at, labels: (item.labels || []).map(label => label.name)
        }))
      : [];
    const pullRequests = prResult.status === "fulfilled"
      ? prResult.value.map(item => ({
          number: item.number, title: item.title, url: item.html_url,
          updatedAt: item.updated_at, draft: item.draft
        }))
      : [];
    const run = runResult.status === "fulfilled" ? runResult.value.workflow_runs?.[0] : null;
    const errors = results.filter(result => result.status === "rejected").length;
    return {
      id: repo.id, name: repo.name, fullName: repo.full_name,
      url: repo.html_url, visibility: repo.visibility || (repo.private ? "private" : "public"),
      defaultBranch: repo.default_branch, updatedAt: repo.updated_at,
      openIssues: repo.open_issues_count ?? issues.length,
      issues, pullRequests,
      workflow: run ? {
        name: run.name, status: run.status, conclusion: run.conclusion,
        url: run.html_url, updatedAt: run.updated_at
      } : null,
      syncWarning: errors ? "Some GitHub status data could not be loaded." : null
    };
  });

  const value = {
    owner, syncedAt: new Date().toISOString(),
    repositoryCount: projects.length,
    totals: {
      openIssues: projects.reduce((sum, item) => sum + item.issues.length, 0),
      openPullRequests: projects.reduce((sum, item) => sum + item.pullRequests.length, 0),
      workflowFailures: projects.filter(item => item.workflow?.conclusion === "failure").length,
      workflowsRunning: projects.filter(item => item.workflow?.status === "in_progress").length
    },
    projects
  };
  cache = { at: Date.now(), value };
  return value;
}
