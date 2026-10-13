// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TaskSummary } from "../../shared/types";
import { TeamSummary } from "./TeamSummary";

const summary: TaskSummary = {
  open: 6,
  overdue: 3,
  dueSoon: 1,
  overdueByRep: [
    { id: "u-jordan", name: "Jordan Pike", overdue: 2, open: 3 },
    { id: "u-alicia", name: "Alicia Chen", overdue: 1, open: 2 },
  ],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function countFor(label: string) {
  return screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent;
}

describe("TeamSummary", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a loading message, then the counts and the reps with overdue tasks", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ summary }));
    vi.stubGlobal("fetch", fetchMock);
    const onSelectRep = vi.fn();

    render(<TeamSummary onSelectRep={onSelectRep} />);

    expect(screen.getByRole("status").textContent).toBe("Loading team summary…");
    expect(await screen.findByText("Jordan Pike")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/summary", expect.anything());
    expect(countFor("Open tasks")).toBe("6");
    expect(countFor("Overdue")).toBe("3");
    expect(countFor("Due in the next 24 hours")).toBe("1");
    expect(screen.getAllByRole("row").map((row) => row.textContent)).toEqual([
      "RepOverdueOpenActions",
      "Jordan Pike23View overdue",
      "Alicia Chen12View overdue",
    ]);

    await userEvent.click(screen.getByRole("button", { name: "View Jordan Pike's overdue tasks" }));

    expect(onSelectRep).toHaveBeenCalledWith("u-jordan");
  });

  it("shows an error with a retry, without the server's error details", async () => {
    let fail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        fail
          ? jsonResponse({ error: { code: "internal_error", message: "Something went wrong" } }, 500)
          : jsonResponse({ summary }),
      ),
    );

    render(<TeamSummary onSelectRep={vi.fn()} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("We couldn't load the team summary.");
    expect(alert.textContent).not.toContain("Something went wrong");

    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Jordan Pike")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("tells the manager when the team has no open tasks", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ summary: { open: 0, overdue: 0, dueSoon: 0, overdueByRep: [] } })));

    render(<TeamSummary onSelectRep={vi.fn()} />);

    expect(await screen.findByText("No open tasks. Your team is all caught up.")).toBeTruthy();
  });

  it("tells the manager when no rep has overdue tasks", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ summary: { open: 2, overdue: 0, dueSoon: 1, overdueByRep: [] } })));

    render(<TeamSummary onSelectRep={vi.fn()} />);

    expect(await screen.findByText("No reps have overdue tasks.")).toBeTruthy();
    expect(countFor("Open tasks")).toBe("2");
  });
});
