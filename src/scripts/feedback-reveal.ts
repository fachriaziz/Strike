export const feedbackRevealQuery = '(width > 48rem)'

export function getFeedbackReveal(
	techniqueEdge: number, ball: Pick<DOMRectReadOnly, 'top' | 'bottom'>, viewportHeight: number,
) {
	const travel = ball.bottom - techniqueEdge
	// A longer scroll span keeps peak ball travel below page travel.
	const distance = travel * 1.1
	const start = Math.max(
		viewportHeight * 0.8,
		viewportHeight - (ball.top - techniqueEdge),
		distance + viewportHeight * 0.18,
	)
	const offset = start - techniqueEdge
	const progress = distance > 0 ? Math.max(0, Math.min(1, offset / distance)) : 1
	return { travel, progress, offset, distance }
}
