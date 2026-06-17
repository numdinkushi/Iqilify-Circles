export function getRewardConfig() {
  const minScore = Number(process.env.NEXT_PUBLIC_REWARD_MIN_SCORE ?? 70)
  const baseAmount = Number(process.env.NEXT_PUBLIC_REWARD_CRC_AMOUNT ?? 3)
  return {
    minScore: Number.isFinite(minScore) ? minScore : 70,
    baseAmount: Number.isFinite(baseAmount) ? baseAmount : 3,
  }
}

/** CRC reward for a completed interview score (0 = not eligible). */
export function rewardAmountForScore(overallScore: number): number {
  const { minScore, baseAmount } = getRewardConfig()
  if (overallScore < minScore) return 0
  if (overallScore >= 90) return baseAmount + 2
  if (overallScore >= 80) return baseAmount + 1
  return baseAmount
}

export function isRewardEligible(overallScore: number): boolean {
  return rewardAmountForScore(overallScore) > 0
}
