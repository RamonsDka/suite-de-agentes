import { describe, expect, it } from "vitest";
import { RING_STYLE, catalogColumns, paginate } from "../src/tui/layout.ts";

describe("TUI layout helpers", () => {
  it("selects the responsive catalog column count at each breakpoint", () => {
    expect(catalogColumns(60)).toBe(1);
    expect(catalogColumns(85)).toBe(2);
    expect(catalogColumns(110)).toBe(3);
    expect(catalogColumns(70)).toBe(2);
    expect(catalogColumns(100)).toBe(3);
  });

  it("returns a page slice and reports whether another page exists", () => {
    const items = ["a", "b", "c", "d", "e"];

    expect(paginate(items, 0, 2)).toEqual({ slice: ["a", "b"], hasMore: true });
    expect(paginate(items, 1, 2)).toEqual({ slice: ["c", "d"], hasMore: true });
    expect(paginate(items, 2, 2)).toEqual({ slice: ["e"], hasMore: false });
  });

  it("uses the active border token for the focus ring", () => {
    const theme = { border: "gray", borderActive: "cyan", text: "white" };

    expect(RING_STYLE(theme)).toEqual({ focusedBorderColor: "cyan" });
  });
});
