import { gsap } from 'gsap'
import type { createBallScene } from './ball-scene'
import { feedbackRevealQuery, getFeedbackReveal } from './feedback-reveal'

function bounceLift(progress: number, height: number) {
	return Math.sin(Math.PI * progress) * height * 0.1
}

function easeScrollMotion(progress: number, ramp = 0.14) {
	const middleEnd = 1 - ramp
	// Ease at both ends and keep a steady pace through the middle.
	if (progress < ramp) return (progress * progress) / (2 * ramp * middleEnd)
	if (progress > middleEnd) {
		const remaining = 1 - progress
		return 1 - (remaining * remaining) / (2 * ramp * middleEnd)
	}
	return (progress - ramp / 2) / middleEnd
}

function positionBall(visual: HTMLElement, offset: number, clip: string) {
	visual.style.transform = offset ? `translateY(${offset}px)` : ''
	visual.style.clipPath = clip
}

export function initBallMotion(root: HTMLElement): () => void {
	const src = root.dataset.ballSrc
	const hero = root.querySelector<HTMLElement>('#hero')
	const heroBall = hero?.querySelector<HTMLElement>('[data-ball-anchor]')
	const technique = root.querySelector<HTMLElement>('#technique')
	const feedbackBall = root.querySelector<HTMLElement>('#feedback [data-ball-anchor]')
	if (!src || !hero || !heroBall || !technique || !feedbackBall || typeof IntersectionObserver !== 'function') return () => {}

	const media = gsap.matchMedia()
	media.add('(prefers-reduced-motion: no-preference)', () => mountBall(root, hero, heroBall, technique, feedbackBall, src))
	return () => media.revert()
}

function mountBall(
	root: HTMLElement, hero: HTMLElement, heroBall: HTMLElement, technique: HTMLElement, feedbackBall: HTMLElement,
	src: string,
) {
	const heroTrigger = heroBall.querySelector<HTMLButtonElement>('[data-ball-trigger]')
	const feedbackTrigger = feedbackBall.querySelector<HTMLButtonElement>('[data-ball-trigger]')
	const heroStill = heroBall.querySelector<HTMLImageElement>('[data-ball-still]')
	const feedbackStill = feedbackBall.querySelector<HTMLImageElement>('[data-ball-still]')
	const spinSound = root.querySelector<HTMLAudioElement>('[data-ball-sound]')
	if (!heroTrigger || !feedbackTrigger || !heroStill || !feedbackStill) return
	const triggers = [heroTrigger, feedbackTrigger]
	const events = new AbortController()
	const { signal } = events
	const rendererEvents = new AbortController()
	const renderSignal = rendererEvents.signal
	const canvas = document.createElement('canvas')
	canvas.setAttribute('data-ball-canvas', '')
	canvas.setAttribute('aria-hidden', 'true')
	canvas.hidden = true
	const sideBySide = matchMedia(feedbackRevealQuery)
	const response = { progress: 0 }
	let context: WebGL2RenderingContext | null = null
	let motionStarted = false
	let scene: Awaited<ReturnType<typeof createBallScene>> | undefined
	let reaction: gsap.core.Tween | undefined
	let respondingTo: HTMLButtonElement | undefined
	let revealingStill: HTMLImageElement | undefined
	let frame = 0

	function draw() {
		frame = 0
		if (document.hidden) return
		const heroBounds = hero.getBoundingClientRect()
		const origin = heroBall.getBoundingClientRect()
		const destination = feedbackBall.getBoundingClientRect()
		const viewportHeight = window.innerHeight
		// Move the ball toward the Hero's lower edge, then clip it behind Overview.
		const progress = gsap.utils.clamp(0, 1, -heroBounds.top / (heroBounds.height * 0.73))
		const heroMotion = easeScrollMotion(progress)
		const slide = (heroBounds.bottom - origin.top) * heroMotion
		const heroTurn = respondingTo === heroTrigger ? response.progress : 0
		const shift = slide - bounceLift(heroTurn, origin.height)
		const covered = Math.max(0, origin.bottom + shift - heroBounds.bottom)
		const heroClip = covered ? `inset(0 0 ${covered}px)` : ''
		const showHero = progress < 1 && origin.width > 0 && covered < origin.height &&
			origin.top + shift < viewportHeight && origin.bottom + shift - covered > 0

		// The ball starts fully behind Technique, then rolls into the left Feedback column.
		const techniqueEdge = technique.getBoundingClientRect().bottom
		const reveal = getFeedbackReveal(techniqueEdge, destination, viewportHeight)
		const placementRamp = 0.06
		const feedbackProgress = sideBySide.matches ? reveal.progress : 1
		const feedbackSettled = feedbackProgress === 1 && techniqueEdge <= destination.top
		const feedbackTurn = respondingTo === feedbackTrigger ? response.progress : 0
		const feedbackPlacement = easeScrollMotion(feedbackProgress, placementRamp)
		const feedbackShift = -reveal.travel * (1 - feedbackPlacement) - bounceLift(feedbackTurn, destination.height)
		const concealed = Math.max(0, techniqueEdge - destination.top - feedbackShift)
		const showFeedback = destination.width > 0 && concealed < destination.height &&
			destination.top + feedbackShift + concealed < viewportHeight && destination.bottom + feedbackShift > 0
		const feedbackClip = concealed ? `inset(${concealed}px 0 0)` : ''
		const anchor = showHero ? heroBall : showFeedback ? feedbackBall : undefined
		const movingStill = showHero && progress > 0 ? heroStill
			: showFeedback && feedbackProgress < 1 ? feedbackStill : undefined
		if (!scene || revealingStill === heroStill) positionBall(heroStill!, shift, heroClip)
		if (!scene || revealingStill === feedbackStill) positionBall(feedbackStill!, feedbackShift, feedbackClip)
		if (!scene) {
			// Keep a still that is already moving until it reaches its rest pose or leaves view.
			revealingStill = movingStill ?? undefined
			return
		}
		if (revealingStill !== movingStill) revealingStill = undefined
		if (!anchor || revealingStill) {
			canvas.hidden = true
			for (const trigger of triggers) trigger.hidden = true
			return
		}

		const moved = canvas.parentElement !== anchor
		if (moved) anchor.append(canvas)
		const wasHidden = canvas.hasAttribute('hidden')
		canvas.hidden = false
		if (showHero) {
			positionBall(canvas, shift, heroClip)
		} else {
			positionBall(canvas, feedbackShift, feedbackClip)
		}
		try {
			const size = Math.round(showHero ? origin.width : destination.width)
			const pitch = showHero ? heroMotion * 0.7 : 0
			const turn = showHero ? heroTurn : feedbackTurn
			const yaw = (showHero ? heroMotion * Math.PI : 0) + turn * Math.PI * 2
			const revealAngle = showHero ? 0 : (easeScrollMotion(feedbackProgress) - 1) * Math.PI
			scene.render(size, pitch, yaw, revealAngle, moved || wasHidden)
		} catch {
			releaseRenderer()
			return
		}
		anchor.setAttribute('data-ball-rendered', '')
		heroTrigger!.hidden = !showHero || covered > 0
		heroTrigger!.style.transform = showHero && slide ? `translateY(${slide}px)` : ''
		feedbackTrigger!.hidden = showHero || !feedbackSettled
	}

	function schedule() {
		if (motionStarted && !frame && !document.hidden) frame = requestAnimationFrame(draw)
	}

	async function load() {
		try {
			const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' })
			if (!gl) return releaseRenderer()
			context = gl
			const { createBallScene } = await import('./ball-scene')
			if (renderSignal.aborted) return
			const loaded = await createBallScene(canvas, gl, src, renderSignal)
			if (renderSignal.aborted) return loaded.dispose()
			scene = loaded
			schedule()
		} catch {
			releaseRenderer()
		}
	}

	const visible = new IntersectionObserver((entries) => {
		if (signal.aborted || !entries.some((entry) => entry.isIntersecting)) return
		visible.disconnect()
		motionStarted = true
		schedule()
		const start = () => {
			if (!renderSignal.aborted) void load()
		}
		// Let the first visible content paint before creating the WebGL context.
		if (typeof window.requestIdleCallback === 'function') {
			const id = window.requestIdleCallback(start, { timeout: 750 })
			renderSignal.addEventListener('abort', () => window.cancelIdleCallback(id), { once: true })
		} else {
			const id = window.setTimeout(start, 50)
			renderSignal.addEventListener('abort', () => window.clearTimeout(id), { once: true })
		}
	}, { rootMargin: '120px 0px' })
	const sizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : undefined
	visible.observe(heroBall)
	visible.observe(feedbackBall.closest('#feedback') ?? feedbackBall)
	for (const element of [root, heroBall, feedbackBall]) sizeObserver?.observe(element)
	canvas.addEventListener('webglcontextlost', releaseRenderer, { signal: renderSignal })
	window.addEventListener('scroll', schedule, { passive: true, signal })
	window.addEventListener('resize', schedule, { signal })
	document.addEventListener('visibilitychange', schedule, { signal })
	for (const trigger of triggers) {
		trigger.addEventListener('click', () => {
			if (reaction || trigger.hidden) return
			respondingTo = trigger
			reaction = gsap.to(response, {
				progress: 1,
				duration: 0.66,
				ease: 'power1.inOut',
				onUpdate: schedule,
				onComplete: () => {
					reaction = undefined
					respondingTo = undefined
					response.progress = 0
					schedule()
				},
			})
			if (spinSound) {
				spinSound.currentTime = 0
				void spinSound.play().catch(() => {
					// A blocked or failed cue should leave the visual response available.
				})
			}
		}, { signal })
	}

	function releaseRenderer() {
		if (renderSignal.aborted) return
		rendererEvents.abort()
		scene?.dispose()
		scene = undefined
		if (context && !context.isContextLost()) context.getExtension('WEBGL_lose_context')?.loseContext()
		context = null
		canvas.remove()
		heroBall.removeAttribute('data-ball-rendered')
		feedbackBall.removeAttribute('data-ball-rendered')
		for (const trigger of triggers) trigger.hidden = true
		heroTrigger!.style.removeProperty('transform')
		if (!signal.aborted) {
			// Place the still in the current pose before the next paint.
			cancelAnimationFrame(frame)
			draw()
		}
	}

	function cleanup() {
		if (signal.aborted) return
		events.abort()
		visible.disconnect()
		sizeObserver?.disconnect()
		cancelAnimationFrame(frame)
		reaction?.kill()
		spinSound?.pause()
		releaseRenderer()
		positionBall(heroStill!, 0, '')
		positionBall(feedbackStill!, 0, '')
	}

	return cleanup
}
