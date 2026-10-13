import { Router } from "express";

import type { TaskListResponse, TaskResponse, TaskSummaryResponse } from "../../shared/types";
import { requestContext } from "../auth/authenticate";
import type { TaskService } from "../domain/taskService";
import { optionalString, optionalTaskStatus } from "./query";

export function taskRoutes(taskService: TaskService): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const tasks = await taskService.listTasks(requestContext(res), {
      repId: optionalString(req.query.repId, "repId"),
      status: optionalTaskStatus(req.query.status),
    });
    res.json({ tasks } satisfies TaskListResponse);
  });

  router.get("/overdue", async (req, res) => {
    const tasks = await taskService.listOverdueTasks(requestContext(res), {
      repId: optionalString(req.query.repId, "repId"),
    });
    res.json({ tasks } satisfies TaskListResponse);
  });

  router.get("/summary", async (_req, res) => {
    const summary = await taskService.summarizeTasks(requestContext(res));
    res.json({ summary } satisfies TaskSummaryResponse);
  });

  router.post("/:taskId/complete", async (req, res) => {
    const task = await taskService.completeTask(requestContext(res), req.params.taskId);
    res.json({ task } satisfies TaskResponse);
  });

  return router;
}
