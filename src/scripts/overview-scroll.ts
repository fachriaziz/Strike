import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initOverviewScroll(root: HTMLElement): () => void {
	const scene = root.querySelector<HTMLElement>('[data-overview-scene]')
	const track = scene?.querySelector<HTMLElement>('[data-overview-track]')
	const stage = track?.querySelector<HTMLElement>('[data-overview-stage]')
	const stack = stage?.querySelector<HTMLOListElement>('#overview-photos')
	if (!scene || !track || !stage || !stack || stack.children.length < 2) return () => {}
	if (!window.CSS?.supports('position', 'sticky')) return () => {}

	gsap.registerPlugin(ScrollTrigger)
	const cards = Array.from(stack.children)
	const media = gsap.matchMedia()

	media.add({
		hasRoom: '(min-height: 20rem)',
		reduceMotion: '(prefers-reduced-motion: reduce)',
	}, ({ conditions }) => {
		if (!conditions?.hasRoom) return
		const { reduceMotion } = conditions
		scene.dataset.scrollGallery = reduceMotion ? 'reduced' : 'full'
		const peek = () => parseFloat(getComputedStyle(stack).paddingTop) / (cards.length - 1)
		gsap.set(cards, {
			y: 0,
			yPercent: 0,
			scale: 1,
			transformOrigin: 'center top',
			zIndex: (index: number) => reduceMotion && index > 0 ? 0 : index + 1,
		})
		if (!reduceMotion) gsap.set(cards.slice(1), { yPercent: 110 })

		const viewingInterval = 0.42
		const timeline = gsap.timeline({ defaults: { duration: 1, ease: 'sine.inOut' } })
		cards.slice(1).forEach((card, step) => {
			const position = reduceMotion ? step + 1 : viewingInterval + step * (1 + viewingInterval)
			if (reduceMotion) {
				timeline.set(card, { zIndex: step + 2 }, position)
			} else {
				timeline.to(card, { yPercent: 0 }, position)
			}

			for (let index = 0; index <= step; index++) {
				const depth = step + 1 - index
				const placement = {
					y: () => -depth * peek(),
					scale: () => 1 - depth * peek() / stack.clientWidth,
				}
				if (reduceMotion) timeline.set(cards[index], placement, position)
				else timeline.to(cards[index], placement, position)
			}
		})

		ScrollTrigger.create({
			trigger: track,
			animation: timeline,
			start: () => `top ${getComputedStyle(stage).top}`,
			// Hold the final photo briefly before the sticky stage releases.
			end: () => `+=${Math.round((track.clientHeight - stage.clientHeight) * 0.89)}`,
			scrub: true,
			invalidateOnRefresh: true,
		})

		const nextPhoto = !reduceMotion ? cards[1].querySelector('img') : null
		const prepare = nextPhoto && typeof IntersectionObserver === 'function'
			? new IntersectionObserver(([entry]) => {
				if (!entry.isIntersecting) return
				prepare?.disconnect()
				nextPhoto.loading = 'eager'
				void nextPhoto.decode().catch(() => {
					// The image element handles normal loading and its fallback.
				})
			}, { rootMargin: '0px 0px -80px' })
			: undefined
		prepare?.observe(stage)

		const resize = typeof ResizeObserver === 'function'
			? new ResizeObserver(() => ScrollTrigger.refresh(true))
			: undefined
		resize?.observe(stage)

		return () => {
			prepare?.disconnect()
			resize?.disconnect()
			scene.removeAttribute('data-scroll-gallery')
		}
	}, scene)

	return () => media.revert()
}
