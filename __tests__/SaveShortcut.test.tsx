import { act, render, waitFor } from "@testing-library/react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { editPostHandler } from "@/lib/posts/actions";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/lib/posts/actions", () => ({
  createPostHandler: jest.fn(),
  editPostHandler: jest.fn().mockResolvedValue({ ok: true, id: 5 }),
}));

const mockEdit = editPostHandler as jest.Mock;

function pressKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  // react-hotkeys-hook reads `code` as well as `key`; set both like a real keypress.
  const event = new KeyboardEvent("keydown", {
    key,
    code: `Key${key.toUpperCase()}`,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  act(() => {
    document.dispatchEvent(event);
  });
  return event;
}

async function renderEditor() {
  const utils = render(<SimpleEditor postId={5} initialTitle="Hello" />);
  // The editor is created after mount (immediatelyRender: false).
  await waitFor(() => expect(document.querySelector(".ProseMirror")).not.toBeNull());
  return utils;
}

// jsdom lacks the layout APIs the editor's toolbar measures with.
beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("Save shortcut", () => {
  beforeEach(() => mockEdit.mockClear());

  it("does not save or swallow a plain 's' typed into the editor", async () => {
    await renderEditor();

    const event = pressKey("s");

    expect(event.defaultPrevented).toBe(false);
    expect(mockEdit).not.toHaveBeenCalled();
  });

  it("does not save on mod+shift+s, which is strikethrough", async () => {
    await renderEditor();

    pressKey("s", { ctrlKey: true, metaKey: true, shiftKey: true });

    expect(mockEdit).not.toHaveBeenCalled();
  });

  it("saves in place on mod+s", async () => {
    await renderEditor();

    // jsdom isn't a Mac, so "mod" is Ctrl.
    const event = pressKey("s", { ctrlKey: true });

    expect(event.defaultPrevented).toBe(true);
    await waitFor(() =>
      expect(mockEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 5, stay: true })),
    );
  });
});
