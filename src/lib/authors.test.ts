import { describe, expect, it } from "vitest";
import { formatPersonName, splitAuthors, splitTitle } from "./authors";

describe("authors", () => {
  it("turns Western Last, First into First Last", () => {
    expect(formatPersonName("Boswell, Dustin")).toBe("Dustin Boswell");
  });

  it("joins Japanese Last, First", () => {
    expect(formatPersonName("角, 征典")).toBe("角征典");
  });

  it("parses openBD summary author strings", () => {
    expect(splitAuthors("Boswell,Dustin Foucher,Trevor 角,征典")).toEqual([
      "Dustin Boswell",
      "Trevor Foucher",
      "角征典",
    ]);
  });

  it("keeps role-separated Japanese authors", () => {
    expect(splitAuthors("森見登美彦／著")).toEqual(["森見登美彦"]);
  });
});

describe("title", () => {
  it("splits subtitle after colon", () => {
    expect(splitTitle("リーダブルコード : より良いコードを書くためのシンプルで実践的なテクニック")).toEqual({
      title: "リーダブルコード",
      subtitle: "より良いコードを書くためのシンプルで実践的なテクニック",
    });
  });
});
