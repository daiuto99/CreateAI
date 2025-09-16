// server/adminLogs.ts
import type { Express, Request, Response } from "express";
import fetch from "node-fetch";

const ROLLING_ISSUE_TITLE = "📓 Log Summaries (Automated)";

export function registerAdminLogs(app: Express) {
  app.get("/admin/latest-log-summary", async (req: Request, res: Response) => {
    try {
      const key = String(req.query.key || "");
      if (!process.env.ADMIN_PULL_KEY || key !== process.env.ADMIN_PULL_KEY) {
        return res.status(401).json({ error: "unauthorized" });
      }

      const owner = process.env.GITHUB_OWNER!;
      const repo  = process.env.GITHUB_REPO!;
      const token = process.env.GITHUB_TOKEN!;
      if (!owner || !repo || !token) {
        return res.status(500).json({ error: "missing_github_secrets" });
      }

      const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };

      // 1) Find the rolling issue by title
      const issuesResp = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=50`,
        { headers }
      );
      if (!issuesResp.ok) {
        return res.status(502).json({ error: "issues_list_failed", detail: await issuesResp.text() });
      }
      const issues = (await issuesResp.json()) as any[];
      const rolling = issues.find(i => i.title === ROLLING_ISSUE_TITLE);
      if (!rolling) {
        return res.status(404).json({ error: "rolling_issue_not_found", title: ROLLING_ISSUE_TITLE });
      }

      // 2) Get the newest comment (latest summary/recap)
      const commentsResp = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${rolling.number}/comments?per_page=1&sort=created&direction=desc`,
        { headers }
      );
      if (!commentsResp.ok) {
        return res.status(502).json({ error: "comments_fetch_failed", detail: await commentsResp.text() });
      }
      const comments = (await commentsResp.json()) as any[];
      const latest = comments[0] || null;

      return res.json({
        issue_url: rolling.html_url,
        issue_number: rolling.number,
        latest_comment: latest
          ? {
              url: latest.html_url,
              created_at: latest.created_at,
              body: latest.body,       // <- this is the summary markdown I’ll read
              user: latest.user?.login || null
            }
          : null
      });
    } catch (err: any) {
      return res.status(500).json({ error: "internal_error", detail: err?.message || String(err) });
    }
  });
}
