// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
          case "/api/tasks/summary":
            return jsonResponse({ summary: { open: 0, overdue: 0, dueSoon: 0, overdueByRep: [] } });
          default:
            return jsonResponse({ tasks: [] });
        }
      }),
    );

    render(<App />);
    // Managers land on the team summary, which hides the rep filter; the filter lives on the Tasks tab.
    await userEvent.click(await screen.findByRole("button", { name: "Tasks" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Could not load your reps.");

    repsFail = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("option", { name: "Alicia Chen" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not offer the team summary to reps", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path: string) => {
        switch (path) {
          case "/api/demo-accounts":
            return jsonResponse({
              accounts: [{ token: "demo-marcus", name: "Marcus Bell", role: "rep", teamName: "North Metro" }],
            });
          case "/api/me":
            return jsonResponse({
              user: { id: "u-marcus", name: "Marcus Bell", role: "rep" },
              teams: [{ id: "team-north", name: "North Metro" }],
            });
          default:
            return jsonResponse({ tasks: [] });
        }
      }),
    );

    render(<App />);

    expect(await screen.findByRole("heading", { name: "My follow-ups" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tasks" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Overdue" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Team summary" })).toBeNull();
  });

  it("lands managers on the team summary, refetches it each time it is opened, and links a rep to their overdue tasks", async () => {
    const fetchMock = vi.fn(async (path: string) => {
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
          return jsonResponse({ reps: [{ id: "u-jordan", name: "Jordan Pike", teamId: "team-north" }] });
        case "/api/tasks/summary":
          return jsonResponse({
            summary: {
              open: 2,
              overdue: 1,
              dueSoon: 0,
              overdueByRep: [{ id: "u-jordan", name: "Jordan Pike", overdue: 1, open: 2 }],
            },
          });
        default:
          return jsonResponse({ tasks: [] });
      }
    });
    vi.stubGlobal("fetch", fetchMock);
    const summaryRequests = () => fetchMock.mock.calls.filter(([path]) => path === "/api/tasks/summary").length;

    render(<App />);

    expect(await screen.findByText("Due in the next 24 hours")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Team summary" }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(await screen.findByRole("button", { name: "View Jordan Pike's overdue tasks" }));

    expect(screen.getByRole("button", { name: "Overdue" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("combobox", { name: "Rep" }) as HTMLSelectElement).value).toBe("u-jordan");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/tasks/overdue?repId=u-jordan", expect.anything()));
    expect(summaryRequests()).toBe(1);

    await userEvent.click(screen.getByRole("button", { name: "Team summary" }));

    expect(await screen.findByText("Jordan Pike")).toBeTruthy();
    expect(summaryRequests()).toBe(2);
  });
});
