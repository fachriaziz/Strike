export type EquipmentId = 'cue' | 'cue-ball' | 'object-balls' | 'pockets';
export type TechniqueId = 'stance-grip' | 'alignment' | 'stroke';
export type VideoAsset = { src: string; poster: string; captions?: string };

type Topic<Id extends string> = {
	id: Id;
	label: string;
	description: string;
};

type EquipmentTopic = Topic<EquipmentId> & { note?: string };

export const equipmentTopics: readonly EquipmentTopic[] = [
	{
		id: 'cue',
		label: 'Cue',
		description: 'The long, tapered stick used to strike the cue ball. Its tip makes contact with the ball, and your bridge hand guides the cue as you shoot.',
	},
	{
		id: 'cue-ball',
		label: 'Cue ball',
		description: 'The white ball you strike with the cue. It hits an object ball to move it across the table.',
		note: 'Which object ball you must contact first depends on the game.',
	},
	{
		id: 'object-balls',
		label: 'Object balls',
		description: 'The numbered balls you aim to pocket. The cue ball moves them on contact. In 8-Ball, the object balls include solids, stripes, and the 8-ball.',
	},
	{
		id: 'pockets',
		label: 'Pockets',
		description: 'A pool table has four corner pockets and one side pocket halfway along each long side. When a ball drops into one of these openings, it is pocketed.',
	},
];

export const techniqueTopics: readonly Topic<TechniqueId>[] = [
	{
		id: 'stance-grip',
		label: 'Stance and grip',
		description: 'Find a balanced stance that feels comfortable and gives your cue room to move. Rest your front hand on the table to guide the cue, and hold the back of the cue lightly. Keep your head and body steady as you practise the stroke.',
	},
	{
		id: 'alignment',
		label: 'Alignment',
		description: 'Choose the path you want the cue ball to take while you are still standing. As you lower into your stance, line up the cue with that path and set your bridge hand to guide it.',
	},
	{
		id: 'stroke',
		label: 'Stroke',
		description: 'Draw the cue back smoothly, then send it forward along the same line. Let it continue forward after contact. Keep your head and bridge hand steady through the shot.',
	},
];

export const initialEquipment = 'cue' satisfies EquipmentId;
export const initialTechnique = 'stance-grip' satisfies TechniqueId;
