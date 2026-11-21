import { describe, expect, it } from "vitest";
import { supporterPlan } from "@/lib/supporter-plan";

describe("Supporter billing rules", () => {
  it("charges €1.99 in EUR", () => {
    expect(supporterPlan.amountMinor).toBe(199);
    expect(supporterPlan.currency).toBe("eur");
  });

  it("renews yearly rather than monthly", () => {
    expect(supporterPlan.interval).toBe("year");
  });
});