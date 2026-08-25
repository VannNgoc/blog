import { renderHook, act } from "@testing-library/react";
import { useThrottledCallback } from "@/hooks/use-throttled-callback";

/**
 * Wraps lodash.throttle, so the throttling itself isn't what's worth pinning —
 * the React lifecycle around it is. Two things can go wrong: the memo losing
 * its identity on re-render (which silently defeats throttling, because each
 * render gets a fresh window), and a trailing call firing after unmount
 * (which is the classic setState-on-unmounted-component leak).
 */

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("useThrottledCallback", () => {
  it("collapses a burst into a single trailing call", () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useThrottledCallback(fn, 200));

    act(() => {
      result.current();
      result.current();
      result.current();
    });
    expect(fn).not.toHaveBeenCalled(); // leading: false by default

    act(() => void jest.advanceTimersByTime(200));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("allows another call once the window has passed", () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useThrottledCallback(fn, 200));

    act(() => {
      result.current();
      jest.advanceTimersByTime(200);
    });
    act(() => {
      result.current();
      jest.advanceTimersByTime(200);
    });

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("passes the most recent arguments through", () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useThrottledCallback(fn, 200));

    act(() => {
      result.current("first");
      result.current("second");
      jest.advanceTimersByTime(200);
    });

    expect(fn).toHaveBeenCalledWith("second");
  });

  it("fires immediately when leading is enabled", () => {
    const fn = jest.fn();
    const { result } = renderHook(() =>
      useThrottledCallback(fn, 200, [], { leading: true, trailing: false }),
    );

    act(() => void result.current());

    expect(fn).toHaveBeenCalledTimes(1);
  });

  /** The reason this hook exists rather than a bare throttle() call. */
  it("cancels a pending trailing call on unmount", () => {
    const fn = jest.fn();
    const { result, unmount } = renderHook(() => useThrottledCallback(fn, 200));

    act(() => void result.current());
    unmount();
    act(() => void jest.advanceTimersByTime(500));

    expect(fn).not.toHaveBeenCalled();
  });

  it("keeps one throttle window across re-renders with stable deps", () => {
    const fn = jest.fn();
    const { result, rerender } = renderHook(() => useThrottledCallback(fn, 200, []));
    const first = result.current;

    rerender();

    // A new function identity per render would give each call its own window,
    // quietly defeating the throttle.
    expect(result.current).toBe(first);
  });

  it("flush runs the pending call right away", () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useThrottledCallback(fn, 200));

    act(() => {
      result.current();
      result.current.flush();
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("cancel drops the pending call", () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useThrottledCallback(fn, 200));

    act(() => {
      result.current();
      result.current.cancel();
      jest.advanceTimersByTime(500);
    });

    expect(fn).not.toHaveBeenCalled();
  });
});
