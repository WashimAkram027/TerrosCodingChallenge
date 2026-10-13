// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("App", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("offers a retry when the manager's rep list fails to load", async () => {
    let repsFail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path: string) => {
        switch (path) {
          case "/api/demo-accounts":
            return jsonResponse({
              accounts: [{ token: "demo-dana", name: "Dana Whitfield", role: "manager", teamName: "North Metro" }],
            });
          case "/api/me":
            return jsonResponse({
              user: { id: "u-dana", name: "Dana Whitfield", role: "manager" },
              teams: [{ id: "team-north", name: "North Metro" }],
            });
          case "/api/team/reps":
            return repsFail
              ? jsonResponse({ error: { code: "internal_error", message: "Something went wrong" } }, 500)
              : jsonResponse({ reps: [{ id: "u-alicia", name: "Alicia Chen", teamId: "team-north" }] });
          default:
            return jsonResponse({ tasks: [] });
        }
      }),
    );

    render(<App />);

    expect((await screen.findByRole("alert")).textContent).toContain("Could not load your reps.");

    repsFail = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("option", { name: "Alicia Chen" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
