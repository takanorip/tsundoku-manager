import { describe, expect, it } from "vitest";
import { isbnFromCiniiPart } from "./metadata";

describe("cinii isbn", () => {
  it("reads ISBN from urn", () => {
    expect(isbnFromCiniiPart("urn:isbn:9784480815781")).toBe("9784480815781");
    expect(isbnFromCiniiPart("urn:isbn:080442957X")).toBe("9780804429573");
  });
});
