import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app";

describe("errorHandler", () => {
  it("returns invalid_request for a malformed JSON body", async () => {
    const response = await request(createApp())
      .post("/api/tasks/task-1003/complete")
      .set("Authorization", "Bearer demo-marcus")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: "invalid_request", message: expect.any(String) } });
  });
});
