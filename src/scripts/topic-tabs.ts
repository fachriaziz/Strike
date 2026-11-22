export function initTopicTabs(root: HTMLElement, onSelect: (topicId: string, tab: HTMLButtonElement) => void): void {
	const list = root.querySelector<HTMLElement>('[data-topic-list]');
	if (!list?.hidden) return;

	const entries: { tab: HTMLButtonElement; panel: HTMLElement; id: string }[] = [];
	for (const tab of list.querySelectorAll<HTMLButtonElement>('button[data-topic]')) {
		const id = tab.dataset.topic;
		const panelId = tab.getAttribute('aria-controls');
		const panel = panelId && root.ownerDocument.getElementById(panelId);
		if (!id || !tab.id || !(panel instanceof HTMLElement) || !root.contains(panel)
			|| entries.some((entry) => entry.id === id || entry.tab.id === tab.id || entry.panel === panel)) return;
		entries.push({ tab, panel, id });
	}

	const initial = entries.findIndex(({ id }) => id === root.dataset.initialTopic);
	if (initial < 0) return;

	const reserveSpace = root.hasAttribute('data-reserve-topic-space')
	let selected = initial;
	function setTabStop(index: number) {
		entries.forEach(({ tab }, position) => { tab.tabIndex = position === index ? 0 : -1; });
	}

	function select(index: number) {
		selected = index;
		setTabStop(index);
		entries.forEach(({ tab, panel }, position) => {
			const active = position === index;
			tab.setAttribute('aria-selected', String(active));
			if (reserveSpace) {
				panel.inert = !active
			} else {
				panel.hidden = !active
			}
		});
		const { id, tab } = entries[index];
		onSelect(id, tab);
	}

	for (const [index, { tab, panel }] of entries.entries()) {
		tab.setAttribute('role', 'tab');
		panel.setAttribute('role', 'tabpanel');
		panel.setAttribute('aria-labelledby', tab.id);
		panel.tabIndex = 0;
		tab.addEventListener('click', () => {
			if (index !== selected) select(index);
		});
		tab.addEventListener('focus', () => setTabStop(index));
		tab.addEventListener('keydown', (event) => {
			let next: number;
			switch (event.key) {
				case 'ArrowRight': next = (index + 1) % entries.length; break;
				case 'ArrowLeft': next = (index + entries.length - 1) % entries.length; break;
				case 'Home': next = 0; break;
				case 'End': next = entries.length - 1; break;
				default: return;
			}
			event.preventDefault();
			entries[next].tab.focus();
		});
	}

	list.addEventListener('focusout', ({ relatedTarget }) => {
		if (!(relatedTarget instanceof Node) || !list.contains(relatedTarget)) setTabStop(selected);
	});
	list.setAttribute('role', 'tablist');
	select(initial);
	list.hidden = false;
}
