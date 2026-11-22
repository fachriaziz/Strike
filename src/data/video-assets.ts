import { statSync } from 'node:fs'
import { join } from 'node:path'
import type { TechniqueId, VideoAsset } from './guide'

const techniqueAssets = import.meta.glob<string>('../assets/technique/*.{mp4,webp,vtt}', {
	query: '?url&no-inline', import: 'default', eager: true,
})

function techniqueAsset(filename: string): string | undefined {
	const url = techniqueAssets[`../assets/technique/${filename}`]
	if (!url) return
	const file = statSync(join('src', 'assets', 'technique', filename), { throwIfNoEntry: false })
	if (file?.isFile() && file.size > 0) return url
}

export function getTechniqueVideo(id: TechniqueId): VideoAsset | undefined {
	const src = techniqueAsset(`${id}.mp4`)
	const poster = techniqueAsset(`${id}-poster.webp`)
	if (!src || !poster) return
	return { src, poster, captions: techniqueAsset(`${id}.vtt`) }
}
