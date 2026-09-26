/**
 * @vitest-environment jsdom
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useStarMapStore } from "./store/useStarMapStore";

const INITIAL = {
  selectedStarId: "sol",
  selectedBookId: "we-are-legion",
  selectedChapterScopeId: "book-1-arrival-epsilon-eridani",
  focalYear: 2134,
};

function bookSelector() {
  return screen.getByRole("group", { name: "Book selector" });
}

function starIndex() {
  return screen.getByLabelText("Quick system selection");
}

function currentParams() {
  return new URLSearchParams(window.location.search);
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  useStarMapStore.setState(INITIAL);

  // jsdom has no layout or WebGL; keep the scene path inert so these tests
  // exercise URL state rather than a headless 3D context.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  HTMLCanvasElement.prototype.getContext = () => null;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("shareable view state", () => {
  it("applies a deep-linked frame on load without clobbering the URL", async () => {
    window.history.replaceState(
      null,
      "",
      "/?book=all-these-worlds&scope=book-3-finale&year=2257.4&star=delta-pavonis",
    );

    render(<App />);

    await waitFor(() => {
      expect(useStarMapStore.getState().selectedChapterScopeId).toBe("book-3-finale");
    });

    const state = useStarMapStore.getState();
    expect(state.selectedBookId).toBe("all-these-worlds");
    expect(state.selectedStarId).toBe("delta-pavonis");
    expect(state.focalYear).toBe(2257.4);

    // The shared link must survive hydration intact.
    await waitFor(() => {
      expect(currentParams().get("scope")).toBe("book-3-finale");
      expect(currentParams().get("star")).toBe("delta-pavonis");
    });
  });

  it("mirrors a book change into the URL", async () => {
    render(<App />);
    await bookSelector();

    fireEvent.click(within(bookSelector()).getByRole("button", { name: /Book 2/ }));

    await waitFor(() => {
      expect(currentParams().get("book")).toBe("for-we-are-many");
    });
    expect(currentParams().get("scope")).toBe("book-2-others-reveal");
  });

  it("mirrors a chapter-boundary change into the URL", async () => {
    render(<App />);
    const select = await screen.findByLabelText(/Chapter reached/);

    fireEvent.change(select, { target: { value: "book-1-finale" } });

    await waitFor(() => {
      expect(currentParams().get("scope")).toBe("book-1-finale");
    });
    expect(currentParams().get("book")).toBe("we-are-legion");
  });

  it("mirrors a star focus change into the URL", async () => {
    render(<App />);

    await starIndex();
    fireEvent.click(within(starIndex()).getByRole("button", { name: /Epsilon Eridani/ }));

    await waitFor(() => {
      expect(currentParams().get("star")).toBe("epsilon-eridani");
    });
  });

  it("mirrors a scrubbed year into the URL", async () => {
    render(<App />);
    const slider = await screen.findByLabelText("Story year");

    fireEvent.change(slider, { target: { value: "2140.5" } });

    await waitFor(() => {
      expect(currentParams().get("year")).toBe("2140.5");
    });
  });

  it("shares the selected event and opens on the story tab", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("tab", { name: /Story/ }));
    const event = await screen.findByRole("button", { name: /Bob comes online/ });
    fireEvent.click(event);

    await waitFor(() => {
      expect(currentParams().get("event")).toBe("bob-online");
    });
    expect(currentParams().get("tab")).toBe("events");
  });

  it("clears stale event state from the URL when the scope changes", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("tab", { name: /Story/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Bob comes online/ }));
    await waitFor(() => expect(currentParams().get("event")).toBe("bob-online"));

    fireEvent.click(within(bookSelector()).getByRole("button", { name: /Book 2/ }));

    await waitFor(() => {
      expect(currentParams().get("event")).toBeNull();
    });
    expect(currentParams().get("tab")).toBeNull();
  });

  it("restores a shared event link straight into the story tab", async () => {
    window.history.replaceState(null, "", "/?event=bob-launch&tab=events");

    render(<App />);

    await waitFor(() => {
      expect(currentParams().get("event")).toBe("bob-launch");
    });
    expect(
      screen.getByRole("tab", { name: /Story/ }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("does not let a hand-edited year escape the selected scope", async () => {
    window.history.replaceState(
      null,
      "",
      "/?book=we-are-legion&scope=book-1-arrival-epsilon-eridani&year=99999",
    );

    render(<App />);

    await waitFor(() => {
      expect(currentParams().get("year")).toBe("2144.6");
    });
  });
});
