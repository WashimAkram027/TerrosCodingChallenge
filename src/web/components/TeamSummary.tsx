import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";

interface TeamSummaryProps {
  /** Omit to hide the "View overdue" buttons, e.g. while the rep filter they set cannot be shown. */
  onSelectRep?: (repId: string) => void;
}

/** Fetches on every mount, so reopening the tab always shows numbers that include tasks completed elsewhere. */
export function TeamSummary({ onSelectRep }: TeamSummaryProps) {
  const summary = useAsync(async () => (await api.taskSummary()).summary, []);

  if (summary.status === "loading") {
    return (
      <p className="state" role="status">
        Loading team summary…
      </p>
    );
  }

  if (summary.status === "error") {
    return (
      <div className="state state-error" role="alert">
        <p>We couldn't load the team summary.</p>
        <button type="button" onClick={summary.reload}>
          Try again
        </button>
      </div>
    );
  }

  const { open, overdue, dueSoon, overdueByRep } = summary.data;

  if (open === 0) {
    return <p className="state state-empty">No open tasks. Your team is all caught up.</p>;
  }

  return (
    <>
      <dl className="task-summary">
        <div className="summary-card">
          <dt>Open tasks</dt>
          <dd>{open}</dd>
        </div>
        <div className="summary-card summary-card-overdue">
          <dt>Overdue</dt>
          <dd>{overdue}</dd>
        </div>
        <div className="summary-card summary-card-soon">
          <dt>Due in the next 24 hours</dt>
          <dd>{dueSoon}</dd>
        </div>
      </dl>

      <h3>Reps with overdue tasks</h3>
      {overdueByRep.length === 0 ? (
        <p className="state state-empty">No reps have overdue tasks.</p>
      ) : (
        <table className="task-table">
          <thead>
            <tr>
              <th scope="col">Rep</th>
              <th scope="col">Overdue</th>
              <th scope="col">Open</th>
              {onSelectRep && (
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {overdueByRep.map((rep) => (
              <tr key={rep.id}>
                <td>{rep.name}</td>
                <td>
                  <span className="badge badge-overdue">{rep.overdue}</span>
                </td>
                <td>{rep.open}</td>
                {onSelectRep && (
                  <td className="actions">
                    <button type="button" aria-label={`View ${rep.name}'s overdue tasks`} onClick={() => onSelectRep(rep.id)}>
                      View overdue
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
