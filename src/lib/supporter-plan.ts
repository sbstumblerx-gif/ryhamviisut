// Stripe catalog entries are created through the connected account, never on page load.
export const supporterPlan = {
  productId: "prod_VfWqSHzsskL3HS",
  priceId: "price_1UeBnC9KdyQFdvfrr4Tnr4gh",
  amountMinor: 199,
  currency: "eur",
  interval: "year",
} as const;

export const supporterLimits = {
  regularVotes: 1,
  supporterVotes: 5,
  regularDailyRequests: 50,
  supporterDailyRequests: 200,
} as const;

export function voteLimit(supporter: boolean) {
  return supporter ? supporterLimits.supporterVotes : supporterLimits.regularVotes;
}

export function dailyRequestLimit(supporter: boolean) {
  return supporter ? supporterLimits.supporterDailyRequests : supporterLimits.regularDailyRequests;
}

export function usageDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export const appearanceChoices = {
  palettes: ["original", "mint", "rose"],
  badges: ["star", "heart", "crown"],
} as const;