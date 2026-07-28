export type ResidenceRoute = 'general' | 'spouse' | 'child' | 'longTermResident' | 'highlySkilled' | 'jSkip'
export type HighlySkilledPointsBand = 'ge80' | 'from70to79' | 'below70'

export interface PermanentResidenceInput {
  route: ResidenceRoute
  // shared conditions (waived for spouse/child routes per statute)
  goodConductConfirmed: boolean
  independentLivelihoodConfirmed: boolean
  // shared conditions applicable to every route
  publicDutiesConfirmed: boolean
  noPenaltyConfirmed: boolean
  holdsMaxPeriodStatus: boolean
  // route: general
  totalYearsInJapan: number | null
  qualifyingWorkOrResidenceYears: number | null
  // route: spouse
  marriageYears: number | null
  // route: spouse / child / longTermResident / jSkip
  continuousResidenceYears: number | null
  // route: highlySkilled
  highlySkilledPoints: HighlySkilledPointsBand | null
  highlySkilledQualifyingYears: number | null
}

export interface ResidenceRequirementItem {
  key: string
  met: boolean
  waived: boolean
}

export interface PermanentResidenceResult {
  route: ResidenceRoute
  eligible: boolean
  items: ResidenceRequirementItem[]
  missingYears: number
  suggestions: string[]
}
