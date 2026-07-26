import type { JSkipInput, JSkipResult } from '@/types/jSkip'

export const J_SKIP_RULES_VERSION = '2026-07'
export const J_SKIP_SOURCE_URL =
  'https://www.moj.go.jp/isa/applications/resources/nyuukokukanri01_00009.html'

export function calculateJSkip(input: JSkipInput): JSkipResult {
  if (input.activity === 'management') {
    const meetsIncome = input.annualIncome >= 4000
    const meetsExperience = input.experienceYears >= 5
    return {
      eligible: meetsIncome && meetsExperience && input.baseActivityConfirmed,
      meetsIncome,
      meetsEducationOrExperience: meetsExperience,
      route: meetsExperience ? 'management' : 'none',
      missingIncome: Math.max(0, 4000 - input.annualIncome),
      missingExperience: Math.max(0, 5 - input.experienceYears),
    }
  }

  const hasGraduateDegree = ['master', 'doctorate', 'professional_degree'].includes(input.education)
  const hasExperience = input.experienceYears >= 10
  const meetsIncome = input.annualIncome >= 2000
  return {
    eligible: meetsIncome && (hasGraduateDegree || hasExperience) && input.baseActivityConfirmed,
    meetsIncome,
    meetsEducationOrExperience: hasGraduateDegree || hasExperience,
    route: hasGraduateDegree ? 'degree' : hasExperience ? 'experience' : 'none',
    missingIncome: Math.max(0, 2000 - input.annualIncome),
    missingExperience: hasGraduateDegree ? 0 : Math.max(0, 10 - input.experienceYears),
  }
}
