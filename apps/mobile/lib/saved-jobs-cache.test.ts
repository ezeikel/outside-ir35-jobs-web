import { describe, expect, it } from "vitest";
import type { MobileJobCard } from "@/lib/api-jobs";
import type { SavedJob } from "@/lib/api-saved-jobs";
import {
  applyOptimisticToggle,
  isJobSaved,
  nextToggleAction,
  reverseOptimisticToggle,
} from "@/lib/saved-jobs-cache";

const job = (id: string): MobileJobCard =>
  ({ id, position: id, companyName: "Co", location: "London" }) as MobileJobCard;

const saved = (id: string): SavedJob => ({
  id: `s-${id}`,
  savedAt: "2026-01-01",
  job: job(id),
});

describe("applyOptimisticToggle", () => {
  it("removes the job when unsaving", () => {
    const list = [saved("a"), saved("b")];
    expect(
      applyOptimisticToggle(list, job("a"), true).map((s) => s.job.id),
    ).toEqual(["b"]);
  });

  it("adds a synthetic row at the top when saving", () => {
    const out = applyOptimisticToggle([saved("b")], job("a"), false);
    expect(out.map((s) => s.job.id)).toEqual(["a", "b"]);
    expect(out[0].id).toBe("optimistic-a");
  });

  it("is idempotent: saving an already-saved job is a no-op", () => {
    const list = [saved("a")];
    expect(applyOptimisticToggle(list, job("a"), false)).toBe(list);
  });

  it("is idempotent: unsaving an absent job leaves the list unchanged", () => {
    const list = [saved("b")];
    expect(applyOptimisticToggle(list, job("a"), true).map((s) => s.job.id)).toEqual([
      "b",
    ]);
  });
});

describe("reverseOptimisticToggle (error rollback)", () => {
  it("re-adds a job whose unsave failed", () => {
    // We optimistically removed 'a' (wasSaved=true) from a list that's since lost it.
    const live = [saved("b")];
    expect(
      reverseOptimisticToggle(live, job("a"), true).map((s) => s.job.id),
    ).toEqual(["a", "b"]);
  });

  it("removes a job whose save failed", () => {
    const live = [saved("a"), saved("b")];
    expect(
      reverseOptimisticToggle(live, job("a"), false).map((s) => s.job.id),
    ).toEqual(["b"]);
  });
});

// The regression this whole refactor exists for.
describe("concurrent unsaves don't resurrect each other (THE BUG)", () => {
  it("unsaving two jobs back-to-back leaves both gone", () => {
    let list: SavedJob[] = [saved("a"), saved("b"), saved("c")];
    // Two toggles fire before either resolves; each reads the LIVE list at its
    // onMutate (sequential setState), so optimistic state is [c] after both.
    list = applyOptimisticToggle(list, job("a"), true);
    list = applyOptimisticToggle(list, job("b"), true);
    expect(list.map((s) => s.job.id)).toEqual(["c"]);
  });

  it("rolling back ONE failed unsave does NOT bring back the OTHER unsaved job", () => {
    // Start: a,b,c saved. Unsave a AND b optimistically → [c].
    let live: SavedJob[] = [saved("a"), saved("b"), saved("c")];
    live = applyOptimisticToggle(live, job("a"), true); // [b,c]
    live = applyOptimisticToggle(live, job("b"), true); // [c]

    // Now a's DELETE fails → reverse ONLY a, on top of the LIVE [c]. b must NOT
    // reappear (the old whole-list-snapshot rollback would have resurrected b).
    live = reverseOptimisticToggle(live, job("a"), true);
    expect(live.map((s) => s.job.id).sort()).toEqual(["a", "c"]);
    expect(isJobSaved(live, "b")).toBe(false);
  });

  it("both unsaves failing rolls both back exactly once (no duplicates)", () => {
    let live: SavedJob[] = [saved("a"), saved("b")];
    live = applyOptimisticToggle(live, job("a"), true); // [b]
    live = applyOptimisticToggle(live, job("b"), true); // []
    live = reverseOptimisticToggle(live, job("a"), true); // [a]
    live = reverseOptimisticToggle(live, job("b"), true); // [b,a]
    const ids = live.map((s) => s.job.id).sort();
    expect(ids).toEqual(["a", "b"]);
    // no duplicate rows
    expect(live.length).toBe(2);
  });
});

describe("nextToggleAction (direction) — THE UNLIKE BUG", () => {
  it("an already-saved job → unsave", () => {
    expect(nextToggleAction([saved("a")], "a")).toBe("unsave");
  });

  it("a not-saved job → save", () => {
    expect(nextToggleAction([saved("a")], "b")).toBe("save");
  });

  it("empty list → save", () => {
    expect(nextToggleAction([], "a")).toBe("save");
  });

  it("REGRESSION: direction must be decided from the list BEFORE the optimistic toggle", () => {
    // Tapping unlike on a saved job: decide direction FIRST (unsave)…
    const before = [saved("a"), saved("b")];
    const action = nextToggleAction(before, "a");
    expect(action).toBe("unsave");

    // …THEN optimistically remove it. If we (wrongly) re-derived the direction from
    // the post-optimistic list, we'd see "a" gone → "save", firing a SAVE instead of
    // a DELETE (the "unliking doesn't work" bug). The action above is already
    // decided, so the network call stays a DELETE.
    const after = applyOptimisticToggle(before, job("a"), action === "unsave");
    expect(isJobSaved(after, "a")).toBe(false);
    expect(nextToggleAction(after, "a")).toBe("save"); // proves the trap exists
    expect(action).toBe("unsave"); // but the captured action is correct
  });
});
