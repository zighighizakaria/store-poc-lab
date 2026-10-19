import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slugify";

describe("slugify", () => {
  it("strips Latin accents and lowercases", () => {
    expect(slugify("Chemise Été & Co")).toBe("chemise-ete-co");
    expect(slugify("  Hoodies   &  Sweats ")).toBe("hoodies-sweats");
  });

  it("keeps Arabic letters intact", () => {
    expect(slugify("قميص قطن")).toBe("قميص-قطن");
  });

  it("keeps hamza forms (they are not Latin accents)", () => {
    expect(slugify("أحذية رياضية")).toBe("أحذية-رياضية");
    expect(slugify("إكسسوارات")).toBe("إكسسوارات");
    expect(slugify("آلة")).toBe("آلة");
  });

  it("keeps digits and returns an empty string when nothing usable is left", () => {
    expect(slugify("Jean 501")).toBe("jean-501");
    expect(slugify("!!! ---")).toBe("");
  });
});
