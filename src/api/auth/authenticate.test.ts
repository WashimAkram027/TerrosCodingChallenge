import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app";

describe("authenticate", () => {
  it("accepts the Bearer scheme in any letter case", async () => {
    const app = createApp();

    for (const scheme of ["Bearer", "bearer", "BEARER"]) {
      const response = await request(app).get("/api/me").set("Authorization", `${scheme} demo-dana`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe("u-dana");
    }
  });

  it("requires a space between the scheme and the token", async () => {
    const app = createApp();

    for (const separator of ["\t", " "]) {
      const response = await request(app).get("/api/me").set("Authorization", `Bearer${separator}demo-dana`);

      expect(response.status).toBe(401);
    }
  });
});
