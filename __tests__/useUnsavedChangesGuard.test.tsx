import { renderHook, act } from "@testing-library/react";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { guardedExit } from "@/lib/unsaved-changes";

/**
 * The hook standing between an author and a lost draft. It intercepts clicks in
 * the capture phase while the editor is dirty, so most of what matters here is
 * the set of clicks it must NOT swallow — a middle-click, a cmd-click, an
 * external link — because getting those wrong breaks ordinary navigation in a
 * way that is easy to ship and hard to notice.
 */

function setup({ dirty = true }: { dirty?: boolean } = {}) {
  const onNavigate = jest.fn();
  const isDirty = jest.fn(() => dirty);
  const view = renderHook(() => useUnsavedChangesGuard({ isDirty, onNavigate }));
  return { ...view, onNavigate, isDirty };
}

/** Dispatches a real click through an anchor so the capture-phase listener on
    `document` sees it exactly as it would in the browser. */
function clickAnchor(
  attrs: Record<string, string>,
  init: MouseEventInit = {},
): MouseEvent {
  const a = document.createElement("a");
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
  a.textContent = "link";
  document.body.appendChild(a);
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
  // Dispatched inside act() because the capture-phase listener calls
  // setPending — without this the state update isn't flushed before we read it.
  act(() => {
    a.dispatchEvent(event);
  });
  a.remove();
  return event;
}

beforeEach(() => {
  window.history.pushState({}, "", "/posts/1/edit");
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useUnsavedChangesGuard — intercepting", () => {
  it("blocks an in-app link while dirty and remembers where it was headed", () => {
    const { result } = setup({ dirty: true });

    const event = clickAnchor({ href: "/posts" });

    expect(event.defaultPrevented).toBe(true);
    expect(result.current.pending?.href).toBe("/posts");
  });

  it("lets the same link through when nothing is dirty", () => {
    const { result } = setup({ dirty: false });

    const event = clickAnchor({ href: "/posts" });

    expect(event.defaultPrevented).toBe(false);
    expect(result.current.pending).toBeNull();
  });
});

describe("useUnsavedChangesGuard — clicks it must not swallow", () => {
  it.each([
    ["meta (open in new tab)", { metaKey: true }],
    ["ctrl", { ctrlKey: true }],
    ["shift (new window)", { shiftKey: true }],
    ["alt (download)", { altKey: true }],
    ["middle click", { button: 1 }],
  ])("ignores %s", (_label, init) => {
    const { result } = setup({ dirty: true });

    const event = clickAnchor({ href: "/posts" }, init as MouseEventInit);

    expect(event.defaultPrevented).toBe(false);
    expect(result.current.pending).toBeNull();
  });

  it("ignores links to another origin", () => {
    const { result } = setup({ dirty: true });

    const event = clickAnchor({ href: "https://example.com/somewhere" });

    expect(event.defaultPrevented).toBe(false);
    expect(result.current.pending).toBeNull();
  });

  it("ignores in-page hash links", () => {
    const { result } = setup({ dirty: true });

    const event = clickAnchor({ href: "#main-content" });

    expect(event.defaultPrevented).toBe(false);
    expect(result.current.pending).toBeNull();
  });

  it("ignores anchors that open in a new context", () => {
    const { result } = setup({ dirty: true });

    const event = clickAnchor({ href: "/posts", target: "_blank" });

    expect(event.defaultPrevented).toBe(false);
    expect(result.current.pending).toBeNull();
  });

  it("ignores a link back to the page you are already on", () => {
    const { result } = setup({ dirty: true });

    const event = clickAnchor({ href: "/posts/1/edit" });

    expect(event.defaultPrevented).toBe(false);
    expect(result.current.pending).toBeNull();
  });

  it("ignores a click that something else already handled", () => {
    const { result } = setup({ dirty: true });

    const a = document.createElement("a");
    a.setAttribute("href", "/posts");
    document.body.appendChild(a);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    event.preventDefault();
    a.dispatchEvent(event);

    expect(result.current.pending).toBeNull();
  });
});

describe("useUnsavedChangesGuard — resolving", () => {
  it("runs the held navigation on discard and closes the dialog", () => {
    const { result, onNavigate } = setup({ dirty: true });
    clickAnchor({ href: "/posts" });

    act(() => result.current.discardAndLeave());

    expect(onNavigate).toHaveBeenCalledWith("/posts");
    expect(result.current.pending).toBeNull();
  });

  it("keeps the author where they are, and does not navigate", () => {
    const { result, onNavigate } = setup({ dirty: true });
    clickAnchor({ href: "/posts" });

    act(() => result.current.keepEditing());

    expect(onNavigate).not.toHaveBeenCalled();
    expect(result.current.pending).toBeNull();
  });

  it("requestNavigation goes straight through when clean", () => {
    const { result, onNavigate } = setup({ dirty: false });

    act(() => result.current.requestNavigation("/drafts"));

    expect(onNavigate).toHaveBeenCalledWith("/drafts");
    expect(result.current.pending).toBeNull();
  });

  it("requestNavigation asks first when dirty", () => {
    const { result, onNavigate } = setup({ dirty: true });

    act(() => result.current.requestNavigation("/drafts"));

    expect(onNavigate).not.toHaveBeenCalled();
    expect(result.current.pending?.href).toBe("/drafts");
  });
});

describe("useUnsavedChangesGuard — non-link exits (Sign Out)", () => {
  /** Sign Out destroys the session before navigating, so `beforeunload` is too
      late to save anything — it routes through the same dialog instead. */
  it("holds a guarded exit while dirty instead of proceeding", () => {
    const { result } = setup({ dirty: true });
    const proceed = jest.fn();

    act(() => guardedExit(proceed));

    expect(proceed).not.toHaveBeenCalled();
    expect(result.current.pending).not.toBeNull();

    act(() => result.current.discardAndLeave());
    expect(proceed).toHaveBeenCalled();
  });

  it("lets a guarded exit run immediately when clean", () => {
    setup({ dirty: false });
    const proceed = jest.fn();

    act(() => guardedExit(proceed));

    expect(proceed).toHaveBeenCalled();
  });

  it("unregisters on unmount so a stale editor cannot block sign out", () => {
    const { unmount } = setup({ dirty: true });
    unmount();

    const proceed = jest.fn();
    act(() => guardedExit(proceed));

    expect(proceed).toHaveBeenCalled();
  });
});

describe("useUnsavedChangesGuard — browser unload", () => {
  it("asks the browser to confirm while dirty", () => {
    setup({ dirty: true });

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("stays out of the way when clean", () => {
    setup({ dirty: false });

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("stops intercepting clicks after unmount", () => {
    const { unmount } = setup({ dirty: true });
    unmount();

    const event = clickAnchor({ href: "/posts" });

    expect(event.defaultPrevented).toBe(false);
  });
});
