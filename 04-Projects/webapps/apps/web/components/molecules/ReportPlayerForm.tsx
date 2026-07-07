"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ReportType } from "@game-hub/profiles-service";
import { Button } from "@/components/atoms/Button";
import { RequireSignIn } from "@/components/molecules/RequireSignIn";
import { listReportTypesAction, submitReportAction } from "@/lib/actions/profiles";

/** Report-type select + reason textarea, wraps RequireSignIn so a guest's click redirects (FR-015). */
export function ReportPlayerForm({ reportedUserId }: { reportedUserId: string }) {
  const [open, setOpen] = useState(false);
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [reportTypeId, setReportTypeId] = useState("");
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listReportTypesAction().then((result) => {
      if (!cancelled && result.ok) {
        setReportTypes(result.data);
        setReportTypeId(result.data[0]?.id ?? "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!reportTypeId || !context) return;

    setSubmitting(true);
    const result = await submitReportAction({ reportedUserId, reportTypeId, context });
    setSubmitting(false);

    if (result.ok) {
      setOpen(false);
      setContext("");
    }
  }

  return (
    <RequireSignIn onAction={() => setOpen(true)}>
      {({ onClick }) =>
        open ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <label className="flex flex-col gap-1 text-sm text-[var(--color-text-secondary)]">
              Reason
              <select
                value={reportTypeId}
                onChange={(event) => setReportTypeId(event.target.value)}
                className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)]"
              >
                {reportTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-[var(--color-text-secondary)]">
              Details
              <textarea
                value={context}
                onChange={(event) => setContext(event.target.value)}
                className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)]"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !reportTypeId || !context}>
                Submit
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" onClick={onClick}>
            Report
          </Button>
        )
      }
    </RequireSignIn>
  );
}
