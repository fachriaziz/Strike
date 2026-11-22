import {
	Box3, DirectionalLight, Group, HemisphereLight, Mesh, NeutralToneMapping,
	OrthographicCamera, Scene, Texture, Vector3, WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { BufferGeometry, Material, Object3D } from 'three'

function disposeModel(model: Object3D) {
	const geometries = new Set<BufferGeometry>()
	const materials = new Set<Material>()
	const textures = new Set<Texture>()
	model.traverse((object) => {
		if (!(object instanceof Mesh)) return
		geometries.add(object.geometry)
		for (const material of [object.material].flat()) materials.add(material)
	})
	for (const material of materials) {
		for (const value of Object.values(material)) {
			if (value instanceof Texture) textures.add(value)
		}
		material.dispose()
	}
	const bitmaps = new Set<ImageBitmap>()
	for (const texture of textures) {
		if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) bitmaps.add(texture.image)
		texture.dispose()
	}
	for (const bitmap of bitmaps) bitmap.close()
	for (const geometry of geometries) geometry.dispose()
}

export async function createBallScene(
	canvas: HTMLCanvasElement, context: WebGL2RenderingContext, src: string, signal: AbortSignal,
) {
	const response = await fetch(src, { signal })
	if (!response.ok) throw new Error(`Could not load the 9-ball (${response.status})`)
	const buffer = await response.arrayBuffer()
	const base = new URL('.', new URL(src, document.baseURI)).href
	const { scene: model } = await new GLTFLoader().parseAsync(buffer, base)
	let renderer: WebGLRenderer
	try {
		signal.throwIfAborted()
		renderer = new WebGLRenderer({ canvas, context, alpha: true })
	} catch (error) {
		disposeModel(model)
		throw error
	}
	renderer.toneMapping = NeutralToneMapping

	const scene = new Scene()
	const pivot = new Group()
	const revealAxis = new Vector3(0.48, 1, 0.24).normalize()
	const bounds = new Box3().setFromObject(model)
	const dimensions = bounds.getSize(new Vector3())
	model.position.sub(bounds.getCenter(new Vector3()))
	pivot.scale.setScalar(2 / Math.max(dimensions.x, dimensions.y, dimensions.z))
	pivot.add(model)
	const camera = new OrthographicCamera(-1.06, 1.06, 1.06, -1.06, 0.1, 10)
	camera.position.z = 4
	const key = new DirectionalLight(0xffffff, 2.3)
	key.position.set(-4, 6, 5)
	const rim = new DirectionalLight(0xf6f9ff, 1.35)
	rim.position.set(4, 1, -4)
	scene.add(pivot, key, rim, new HemisphereLight(0xffffff, 0x6f737e, 1.25))

	let previousPitch: number | undefined
	let previousYaw: number | undefined
	let previousRevealAngle: number | undefined
	return {
		render(size: number, pitch: number, yaw: number, revealAngle: number, force: boolean) {
			const bufferSize = Math.min(512, Math.floor(size * Math.min(window.devicePixelRatio, 2)))
			const resized = canvas.width !== bufferSize || canvas.height !== bufferSize
			const poseChanged = previousPitch !== pitch || previousYaw !== yaw || previousRevealAngle !== revealAngle
			if (!force && !resized && !poseChanged) return
			if (resized) renderer.setDrawingBufferSize(bufferSize, bufferSize, 1)
			pivot.rotation.set(pitch + 0.04, yaw - 0.12, 0)
			if (revealAngle) pivot.rotateOnWorldAxis(revealAxis, revealAngle)
			renderer.render(scene, camera)
			previousPitch = pitch
			previousYaw = yaw
			previousRevealAngle = revealAngle
		},
		dispose() {
			disposeModel(model)
			renderer.dispose()
		},
	}
}
