import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "./app";
import { fixedClock } from "./domain/clock";

const referenceTime = new Date("2026-03-10T15:00:00.000Z");

function asUser(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function apiError(status: number, code: string) {
  return { status, body: { error: { code, message: expect.any(String) } } };
}

describe("HTTP API", () => {
  let app: Express;

  beforeEach(() => {
    app = createApp({ clock: fixedClock(referenceTime) });
  });

  describe("public endpoints", () => {
    it("reports health without a token", async () => {
      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ok" });
    });

    it("lists the demo accounts without a token", async () => {
      const response = await request(app).get("/api/demo-accounts");

      expect(response.status).toBe(200);
      expect(response.body.accounts).toHaveLength(5);
      expect(response.body.accounts[0]).toEqual({
        token: "demo-dana",
        name: "Dana Whitfield",
        role: "manager",
        teamName: "North Metro",
      });
    });
  });

  describe("authentication", () => {
    it("rejects a request without a token", async () => {
      const response = await request(app).get("/api/tasks");

      expect(response).toMatchObject(apiError(401, "unauthenticated"));
    });

    it("rejects an unknown token", async () => {
      const response = await request(app).get("/api/tasks").set(asUser("demo-nobody"));

      expect(response).toMatchObject(apiError(401, "unauthenticated"));
    });
  });

  describe("GET /api/me", () => {
    it("describes a manager and the teams they manage", async () => {
      const response = await request(app).get("/api/me").set(asUser("demo-dana"));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: { id: "u-dana", name: "Dana Whitfield", role: "manager" },
        teams: [{ id: "team-north", name: "North Metro" }],
      });
    });

    it("describes a rep and the team they belong to", async () => {
      const response = await request(app).get("/api/me").set(asUser("demo-marcus"));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: { id: "u-marcus", name: "Marcus Bell", role: "rep" },
        teams: [{ id: "team-north", name: "North Metro" }],
      });
    });
  });

  describe("GET /api/team/reps", () => {
    it("lists the manager's reps sorted by name", async () => {
      const response = await request(app).get("/api/team/reps").set(asUser("demo-dana"));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        reps: [
          { id: "u-alicia", name: "Alicia Chen", teamId: "team-north" },
          { id: "u-jordan", name: "Jordan Pike", teamId: "team-north" },
          { id: "u-marcus", name: "Marcus Bell", teamId: "team-north" },
        ],
      });
    });

    it("is forbidden for reps", async () => {
      const response = await request(app).get("/api/team/reps").set(asUser("demo-marcus"));

      expect(response).toMatchObject(apiError(403, "forbidden"));
    });
  });

  describe("GET /api/tasks", () => {
    it("returns tasks in the documented shape", async () => {
      const response = await request(app).get("/api/tasks?repId=u-marcus&status=open").set(asUser("demo-dana"));

      expect(response.status).toBe(200);
      expect(response.body.tasks[0]).toEqual({
        id: "task-1001",
        title: "Call back about financing options",
        customerName: "Hernandez residence",
        status: "open",
        dueAt: "2026-03-09T09:00:00.000Z",
        completedAt: null,
        isOverdue: true,
        assignee: { id: "u-marcus", name: "Marcus Bell" },
        team: { id: "team-north", name: "North Metro" },
      });
    });

    it("filters by status", async () => {
      const response = await request(app).get("/api/tasks?status=completed").set(asUser("demo-dana"));

      expect(response.status).toBe(200);
      expect(response.body.tasks.map((task: { id: string }) => task.id)).toEqual(["task-1002", "task-1005", "task-1009"]);
    });

    it("rejects an unknown status", async () => {
      const response = await request(app).get("/api/tasks?status=done").set(asUser("demo-dana"));

      expect(response).toMatchObject(apiError(400, "invalid_request"));
    });

    it("rejects a repeated repId", async () => {
      const response = await request(app).get("/api/tasks?repId=u-alicia&repId=u-marcus").set(asUser("demo-dana"));

      expect(response).toMatchObject(apiError(400, "invalid_request"));
    });

    it("forbids a rep outside the manager's teams", async () => {
      const response = await request(app).get("/api/tasks?repId=u-sam").set(asUser("demo-dana"));

      expect(response).toMatchObject(apiError(403, "forbidden"));
    });
  });

  describe("GET /api/tasks/overdue", () => {
    it("narrows to the requested rep", async () => {
      const response = await request(app).get("/api/tasks/overdue?repId=u-alicia").set(asUser("demo-dana"));

      expect(response.status).toBe(200);
      expect(response.body.tasks.map((task: { id: string }) => task.id)).toEqual(["task-1004"]);
    });

    it("forbids a rep outside the manager's teams", async () => {
      const response = await request(app).get("/api/tasks/overdue?repId=u-sam").set(asUser("demo-dana"));

      expect(response).toMatchObject(apiError(403, "forbidden"));
    });

    it("forbids a rep from asking for another rep's tasks", async () => {
      const response = await request(app).get("/api/tasks/overdue?repId=u-alicia").set(asUser("demo-marcus"));

      expect(response).toMatchObject(apiError(403, "forbidden"));
    });
  });

  describe("GET /api/tasks/summary", () => {
    it("requires a session token", async () => {
      const response = await request(app).get("/api/tasks/summary");

      expect(response).toMatchObject(apiError(401, "unauthenticated"));
    });

    it("counts the manager's open work and reflects a task completed through the API", async () => {
      const before = await request(app).get("/api/tasks/summary").set(asUser("demo-dana"));

      expect(before.status).toBe(200);
      expect(before.body.summary).toMatchObject({ open: 6, overdue: 3, dueSoon: 1 });

      await request(app).post("/api/tasks/task-1004/complete").set(asUser("demo-dana")).expect(200);
      const after = await request(app).get("/api/tasks/summary").set(asUser("demo-dana"));

      expect(after.body.summary).toMatchObject({ open: 5, overdue: 2, dueSoon: 1 });
      expect(after.body.summary.overdueByRep.map((rep: { id: string }) => rep.id)).toEqual(["u-jordan", "u-marcus"]);
    });
  });

  describe("POST /api/tasks/:taskId/complete", () => {
    it("completes a visible open task", async () => {
      const response = await request(app).post("/api/tasks/task-1003/complete").set(asUser("demo-marcus"));

      expect(response.status).toBe(200);
      expect(response.body.task).toMatchObject({
        id: "task-1003",
        status: "completed",
        completedAt: referenceTime.toISOString(),
        isOverdue: false,
      });
    });

    it("reports a task outside the user's visibility as not found", async () => {
      const response = await request(app).post("/api/tasks/task-1004/complete").set(asUser("demo-marcus"));

      expect(response).toMatchObject(apiError(404, "not_found"));
    });

    it("reports an unknown task as not found", async () => {
      const response = await request(app).post("/api/tasks/task-9999/complete").set(asUser("demo-dana"));

      expect(response).toMatchObject(apiError(404, "not_found"));
    });

    it("returns a conflict for a task that is already completed", async () => {
      const response = await request(app).post("/api/tasks/task-1002/complete").set(asUser("demo-marcus"));

      expect(response).toMatchObject(apiError(409, "conflict"));
    });
  });

  it("returns not found for an unknown API route", async () => {
    const response = await request(app).get("/api/unknown").set(asUser("demo-dana"));

    expect(response).toMatchObject(apiError(404, "not_found"));
  });
});
