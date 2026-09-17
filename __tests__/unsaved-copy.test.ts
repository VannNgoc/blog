/**
 * @jest-environment jsdom
 */
import {
  clearUnsavedCopy,
  readUnsavedCopy,
  unsavedCopyKey,
  writeUnsavedCopy,
  type UnsavedCopy,
} from "@/lib/unsaved-copy";

const copy: UnsavedCopy = {
  json: { type: "doc", content: [{ type: "paragraph" }] },
  title: "Half-written",
  description: "",
  access: 2,
  savedAt: 1_700_000_000_000,
};

beforeEach(() => window.localStorage.clear());
afterEach(() => jest.restoreAllMocks());

describe("unsaved copy", () => {
  it("round-trips a copy per post, with new posts sharing one key", () => {
    writeUnsavedCopy(12, copy);
    writeUnsavedCopy(undefined, { ...copy, title: "Brand new" });

    expect(readUnsavedCopy(12)).toEqual(copy);
    expect(readUnsavedCopy(undefined)?.title).toBe("Brand new");
    expect(unsavedCopyKey(undefined)).toBe("recollections:unsaved:new");
  });

  it("clears only the post it's asked to", () => {
    writeUnsavedCopy(12, copy);
    writeUnsavedCopy(13, copy);

    clearUnsavedCopy(12);

    expect(readUnsavedCopy(12)).toBeNull();
    expect(readUnsavedCopy(13)).toEqual(copy);
  });

  it("treats a malformed entry as absent instead of restoring it half-broken", () => {
    window.localStorage.setItem(unsavedCopyKey(12), JSON.stringify({ title: "no body" }));
    expect(readUnsavedCopy(12)).toBeNull();

    window.localStorage.setItem(unsavedCopyKey(12), "{not json");
    expect(readUnsavedCopy(12)).toBeNull();
  });

  /** Private windows and full quotas throw; the editor must keep working. */
  it("never throws when storage is unavailable", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => writeUnsavedCopy(12, copy)).not.toThrow();
    expect(readUnsavedCopy(12)).toBeNull();
    expect(() => clearUnsavedCopy(12)).not.toThrow();
  });
});
