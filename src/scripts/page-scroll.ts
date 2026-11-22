import type Lenis from 'lenis'
import type { VirtualScrollData } from 'lenis'
import { feedbackRevealQuery, getFeedbackReveal } from './feedback-reveal'

const wheelLerp = 0.13
const maxSceneWheelSpeed = 1800
// Lenis damps wheel input at lerp × 60. Limiting the queued lead also bounds bursts.
const maxWheelLead = maxSceneWheelSpeed / (wheelLerp * 60)
const usesNativeWheel = (node: EventTarget | null) => node instanceof HTMLTextAreaElement

export function initPageScroll() {
	const wheelAllowed = window.matchMedia('(prefers-reduced-motion: no-preference) and (any-pointer: fine)')
	const events = new AbortController()
	const { signal } = events
	const hero = document.getElementById('hero')
	const overview = document.getElementById('overview')
	const technique = document.getElementById('technique')
	const feedbackBall = document.querySelector('#feedback [data-ball-anchor]')
	const feedbackRevealAllowed = window.matchMedia(feedbackRevealQuery)
	let lenis: Lenis | undefined

	function paceWheel(data: VirtualScrollData) {
		const { event, deltaY } = data
		if (!lenis || !(event instanceof WheelEvent) || event.ctrlKey || !deltaY || usesNativeWheel(event.target)) {
			return true
		}
		const position = lenis.actualScroll
		// The browser can jump before Lenis processes the native scroll event.
		if (Math.abs(position - lenis.animatedScroll) > 2) lenis.resize()
		const requested = lenis.targetScroll + deltaY
		if (Math.abs(requested - position) <= maxWheelLead) return true

		const viewport = window.innerHeight
		const openingScene = overview?.dataset.scrollGallery === 'full' ? overview : hero
		const openingEdge = openingScene?.getBoundingClientRect().bottom ?? 0
		const openingActive = openingEdge > viewport * (openingScene === overview ? 1 : 0.27)
		let limitFrom = position
		if (!openingActive) {
			if (!technique || !feedbackBall || !feedbackRevealAllowed.matches) return true
			const edge = technique.getBoundingClientRect().bottom
			const { offset, distance } = getFeedbackReveal(edge, feedbackBall.getBoundingClientRect(), viewport)
			const revealStart = position - offset
			const start = Math.max(revealStart, position + edge - viewport)
			const end = revealStart + distance
			if (start >= end || Math.max(position, requested) <= start || Math.min(position, requested) >= end) return true
			// For an entering gesture, allow normal travel up to the edge of the reveal.
			limitFrom = Math.max(start, Math.min(end, position))
		}

		const target = Math.max(limitFrom - maxWheelLead, Math.min(limitFrom + maxWheelLead, requested))
		data.deltaY = target - lenis.targetScroll
		if (data.deltaY) return true
		if (event.cancelable) event.preventDefault()
		return false
	}

	async function syncWheel() {
		if (!wheelAllowed.matches) {
			lenis?.destroy()
			lenis = undefined
			return
		}
		if (lenis) return

		const [{ default: WheelScroller }, { ScrollTrigger }] = await Promise.all([
			import('lenis'),
			import('gsap/ScrollTrigger'),
		])
		if (signal.aborted || !wheelAllowed.matches || lenis) return

		lenis = new WheelScroller({
			autoRaf: true,
			lerp: wheelLerp,
			syncTouch: false,
			stopInertiaOnNavigate: true,
			prevent: usesNativeWheel,
			virtualScroll: paceWheel,
		})
		lenis.on('scroll', () => ScrollTrigger.update())
	}

	function updateWheel() {
		void syncWheel().catch(() => {
			// Native scrolling remains available if the optional enhancement cannot load.
		})
	}

	function cancelInertia() {
		if (lenis?.isScrolling !== 'smooth') return
		// Stop the tween even when Lenis already reports the current position as its target.
		lenis.stop()
		lenis.start()
	}

	wheelAllowed.addEventListener('change', updateWheel, { signal })
	window.addEventListener('popstate', cancelInertia, { signal })
	window.addEventListener('hashchange', cancelInertia, { signal })
	updateWheel()

	return {
		scrollTo(section: HTMLElement) {
			if (lenis) {
				const scrollLimit = document.documentElement.scrollHeight - window.innerHeight
				// A link can be activated before Lenis observes a change in page height.
				if (lenis.limit !== scrollLimit) lenis.resize()
				lenis.scrollTo(section, {
					duration: 0.72,
					easing: (progress) => 1 - (1 - progress) ** 3,
					lerp: 0,
				})
			} else {
				section.scrollIntoView({ behavior: 'smooth', block: 'start' })
			}
		},
		destroy() {
			events.abort()
			lenis?.destroy()
		},
	}
}
