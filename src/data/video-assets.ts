import alignment from '../assets/technique/alignment.mp4?url'
import alignmentPoster from '../assets/technique/alignment-poster.webp?url'
import stanceGrip from '../assets/technique/stance-grip.mp4?url'
import stanceGripPoster from '../assets/technique/stance-grip-poster.webp?url'
import stroke from '../assets/technique/stroke.mp4?url'
import strokePoster from '../assets/technique/stroke-poster.webp?url'
import type { TechniqueId, VideoAsset } from './guide'

export const techniqueVideos = {
	'stance-grip': { src: stanceGrip, poster: stanceGripPoster },
	alignment: { src: alignment, poster: alignmentPoster },
	stroke: { src: stroke, poster: strokePoster },
} satisfies Record<TechniqueId, VideoAsset>
