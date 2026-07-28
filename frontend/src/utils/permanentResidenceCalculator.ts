import type { PermanentResidenceInput, PermanentResidenceResult, ResidenceRequirementItem } from '@/types/permanentResidence'

export const PERMANENT_RESIDENCE_RULES_VERSION = '2026-07'
export const PERMANENT_RESIDENCE_SOURCE_URL =
  'https://www.moj.go.jp/isa/applications/resources/nyukan_nyukan50.html'

const GENERAL_TOTAL_YEARS = 10
const GENERAL_QUALIFYING_YEARS = 5
const SPOUSE_MARRIAGE_YEARS = 3
const SHORT_CONTINUOUS_YEARS = 1
const LONG_TERM_RESIDENT_YEARS = 5
const HIGHLY_SKILLED_80_YEARS = 1
const HIGHLY_SKILLED_70_YEARS = 3

export function requiredContinuousYears(route: PermanentResidenceInput['route']): number {
  if (route === 'longTermResident') return LONG_TERM_RESIDENT_YEARS
  return SHORT_CONTINUOUS_YEARS
}

function add(items: ResidenceRequirementItem[], key: string, met: boolean, waived = false) {
  items.push({ key, met, waived })
}

function durationMet(input: PermanentResidenceInput): boolean {
  const years = (value: number | null) => value ?? 0
  switch (input.route) {
    case 'general':
      return years(input.totalYearsInJapan) >= GENERAL_TOTAL_YEARS
        && years(input.qualifyingWorkOrResidenceYears) >= GENERAL_QUALIFYING_YEARS
    case 'spouse':
      return years(input.marriageYears) >= SPOUSE_MARRIAGE_YEARS
        && years(input.continuousResidenceYears) >= SHORT_CONTINUOUS_YEARS
    case 'child':
      return years(input.continuousResidenceYears) >= SHORT_CONTINUOUS_YEARS
    case 'longTermResident':
      return years(input.continuousResidenceYears) >= LONG_TERM_RESIDENT_YEARS
    case 'jSkip':
      return years(input.continuousResidenceYears) >= SHORT_CONTINUOUS_YEARS
    case 'highlySkilled': {
      const qualifyingYears = years(input.highlySkilledQualifyingYears)
      if (input.highlySkilledPoints === 'ge80' && qualifyingYears >= HIGHLY_SKILLED_80_YEARS) return true
      if (
        (input.highlySkilledPoints === 'ge80' || input.highlySkilledPoints === 'from70to79')
        && qualifyingYears >= HIGHLY_SKILLED_70_YEARS
      ) return true
      return false
    }
    default:
      return false
  }
}

export function calculatePermanentResidence(input: PermanentResidenceInput): PermanentResidenceResult {
  const waiveConductAndLivelihood = input.route === 'spouse' || input.route === 'child'
  const items: ResidenceRequirementItem[] = []

  add(items, 'goodConduct', waiveConductAndLivelihood || input.goodConductConfirmed, waiveConductAndLivelihood)
  add(items, 'independentLivelihood', waiveConductAndLivelihood || input.independentLivelihoodConfirmed, waiveConductAndLivelihood)
  add(items, 'publicDuties', input.publicDutiesConfirmed)
  add(items, 'noPenalty', input.noPenaltyConfirmed)
  add(items, 'maxPeriodStatus', input.holdsMaxPeriodStatus)
  add(items, 'residenceDuration', durationMet(input))

  const eligible = items.every((item) => item.met || item.waived)

  const suggestions: string[] = []
  if (!eligible) {
    for (const item of items) {
      if (item.met || item.waived) continue
      if (item.key === 'residenceDuration' && input.route === 'highlySkilled' && input.highlySkilledPoints === 'below70') {
        suggestions.push('highlySkilledPointsTooLow')
        continue
      }
      suggestions.push(item.key)
    }
  } else {
    suggestions.push('prepareEvidence')
  }

  const missingYears = (() => {
    const years = (value: number | null) => value ?? 0
    switch (input.route) {
      case 'general':
        return Math.max(
          0,
          GENERAL_TOTAL_YEARS - years(input.totalYearsInJapan),
          GENERAL_QUALIFYING_YEARS - years(input.qualifyingWorkOrResidenceYears),
        )
      case 'spouse':
        return Math.max(
          0,
          SPOUSE_MARRIAGE_YEARS - years(input.marriageYears),
          SHORT_CONTINUOUS_YEARS - years(input.continuousResidenceYears),
        )
      case 'highlySkilled': {
        const target = input.highlySkilledPoints === 'ge80' ? HIGHLY_SKILLED_80_YEARS : HIGHLY_SKILLED_70_YEARS
        return Math.max(0, target - years(input.highlySkilledQualifyingYears))
      }
      default:
        return Math.max(0, requiredContinuousYears(input.route) - years(input.continuousResidenceYears))
    }
  })()

  return {
    route: input.route,
    eligible,
    items,
    missingYears,
    suggestions,
  }
}
