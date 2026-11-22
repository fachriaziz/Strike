export function initHeroVideo(hero: HTMLElement): () => void {
	const video = hero.querySelector<HTMLVideoElement>('[data-hero-video]');
	const button = hero.querySelector<HTMLButtonElement>('[data-hero-toggle]');
	const source = video?.dataset.src;
	if (!video || !button || !source) return () => {};

	const motion = matchMedia('(prefers-reduced-motion: reduce)');
	const events = new AbortController();
	let visible = false;
	let pausedByUser = false;
	let playbackBlocked = false;
	let pending: object | undefined;

	const render = () => {
		const playing = !video.paused || !!pending;
		button.hidden = motion.matches;
		button.toggleAttribute('data-playing', playing);
		button.setAttribute('aria-label', playing ? 'Pause background video' : 'Play background video');
	};

	const pause = (showPoster = false) => {
		pending = undefined;
		video.pause();
		if (showPoster && video.hasAttribute('src')) {
			video.removeAttribute('src');
			video.load();
		}
		render();
	};

	const sync = () => {
		if (motion.matches || document.hidden || !visible || pausedByUser) {
			pause(motion.matches);
			return;
		}
		if (pending || playbackBlocked || !video.paused) return;

		if (!video.hasAttribute('src')) video.src = source;
		const attempt = {};
		pending = attempt;
		void video.play().catch(() => {
			if (pending === attempt) playbackBlocked = true;
		}).finally(() => {
			if (pending !== attempt) return;
			pending = undefined;
			render();
		});
		render();
	};

	const observer = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		sync();
	});
	const { signal } = events;
	button.addEventListener('click', () => {
		pausedByUser = !video.paused || !!pending;
		playbackBlocked = false;
		sync();
	}, { signal });
	for (const event of ['play', 'playing', 'pause', 'ended']) video.addEventListener(event, render, { signal });
	video.addEventListener('error', () => {
		if (!video.error) return;
		playbackBlocked = true;
		pause(true);
	}, { signal });
	motion.addEventListener('change', sync, { signal });
	document.addEventListener('visibilitychange', sync, { signal });
	observer.observe(hero);
	render();

	return () => {
		events.abort();
		observer.disconnect();
		pause(true);
		button.hidden = true;
	};
}
