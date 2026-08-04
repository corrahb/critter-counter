import { describe, expect, it } from "vitest";
import { countOf, plural } from "../plural";

describe("plural — the cases the spec calls out", () => {
  it("simple +s", () => {
    expect(plural("Rabbit")).toBe("Rabbits");
    expect(plural("Raccoon")).toBe("Raccoons");
    expect(plural("Cat")).toBe("Cats");
  });

  it("pluralizes only the last word: wild turkey → wild turkeys", () => {
    expect(plural("Wild turkey")).toBe("Wild turkeys");
  });

  it("consonant + y → ies", () => {
    expect(plural("Bunny")).toBe("Bunnies");
  });

  it("vowel + y stays +s (turkey → turkeys, not turkies)", () => {
    expect(plural("Turkey")).toBe("Turkeys");
  });

  it("sibilants take es", () => {
    expect(plural("Fox")).toBe("Foxes");
    expect(plural("Finch")).toBe("Finches");
    expect(plural("Thrush")).toBe("Thrushes");
  });

  it("f/fe → ves", () => {
    expect(plural("Wolf")).toBe("Wolves");
    expect(plural("Knife")).toBe("Knives");
  });

  it("irregulars", () => {
    expect(plural("Mouse")).toBe("mice");
    expect(plural("Goose")).toBe("geese");
  });

  it("deer stays deer (and moose, sheep, fish)", () => {
    expect(plural("Deer")).toBe("deer");
    expect(plural("Moose")).toBe("moose");
    expect(plural("Sheep")).toBe("sheep");
    expect(plural("Fish")).toBe("fish");
  });

  it("trims and survives extra whitespace", () => {
    expect(plural("  Wild   turkey ")).toBe("Wild turkeys");
  });
});

describe("countOf — used in the New record toast", () => {
  it("singular for exactly 1", () => {
    expect(countOf(1, "Rabbit")).toBe("1 rabbit");
  });

  it("plural otherwise, lowercased", () => {
    expect(countOf(2, "Rabbit")).toBe("2 rabbits");
    expect(countOf(26, "Rabbit")).toBe("26 rabbits");
    expect(countOf(3, "Wild turkey")).toBe("3 wild turkeys");
    expect(countOf(2, "Deer")).toBe("2 deer");
  });
});
