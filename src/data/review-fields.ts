export const reviewStars = [1, 2, 3, 4, 5] as const
export const reviewLimits = { displayName: 60, comment: 1000 }
export const blankReview = { displayName: '', rating: '', comment: '' }

export type ReviewFields = typeof blankReview
export type ReviewErrors = Partial<Record<keyof ReviewFields, string>>
