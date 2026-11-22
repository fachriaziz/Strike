import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { reviewLimits, reviewStars } from '../data/review-fields';
import type { ReviewErrors, ReviewFields } from '../data/review-fields';

export interface Review {
	id: number;
	displayName: string;
	rating: number;
	comment: string;
	createdAt: string;
}

export function readReview(form: FormData): ReviewFields {
	const read = (field: keyof ReviewFields) => {
		const [first, ...rest] = form.getAll(field);
		return typeof first === 'string' && rest.length === 0 ? first : '';
	};

	return {
		displayName: read('displayName'),
		rating: read('rating'),
		// Use the same line endings for length validation as the textarea does.
		comment: read('comment').replace(/\r\n?/g, '\n'),
	};
}

function isStarRating(value: string) {
	return reviewStars.some((rating) => String(rating) === value);
}

export function validateReview(values: ReviewFields): ReviewErrors {
	const errors: ReviewErrors = {};
	const name = values.displayName.trim();
	if (!name) {
		errors.displayName = 'Enter a name or nickname.';
	} else if (values.displayName.length > reviewLimits.displayName) {
		errors.displayName = `Use ${reviewLimits.displayName} characters or fewer for your name or nickname.`;
	}
	if (!isStarRating(values.rating)) errors.rating = 'Choose a rating from 1 to 5 stars.';
	if (values.comment.length > reviewLimits.comment) {
		errors.comment = `Use ${reviewLimits.comment} characters or fewer for your comment.`;
	}
	return errors;
}

const reviewsSchemaVersion = 2;

function migrateReviews(db: DatabaseSync) {
	const version = db.prepare('PRAGMA user_version');
	if (Number(version.get()?.user_version) >= reviewsSchemaVersion) return;

	db.exec('PRAGMA secure_delete = ON; BEGIN IMMEDIATE;');
	try {
		if (Number(version.get()?.user_version) < reviewsSchemaVersion) {
			const previousColumns = db.prepare('PRAGMA table_info(reviews)').all();
			db.exec(`
				CREATE TABLE reviews_next (
					id INTEGER PRIMARY KEY,
					display_name TEXT NOT NULL,
					rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
					comment TEXT NOT NULL,
					created_at TEXT NOT NULL
				) STRICT
			`);
			if (previousColumns.some(({ name }) => name === 'rating_scale')) {
				db.exec(`
					INSERT INTO reviews_next (id, display_name, rating, comment, created_at)
					SELECT id, display_name, rating, comment, created_at FROM reviews WHERE rating_scale = 5
				`);
			}
			if (previousColumns.length > 0) db.exec('DROP TABLE reviews');
			db.exec(`ALTER TABLE reviews_next RENAME TO reviews; PRAGMA user_version = ${reviewsSchemaVersion};`);
		}
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}
}

function withDatabase<T>(work: (db: DatabaseSync) => T): T {
	const defaultPath = 'data/reviews.sqlite';
	const legacyPath = '.data/strait-reviews.sqlite';
	const override = process.env.STRIKE_REVIEWS_DB || process.env.STRAIT_REVIEWS_DB;
	const selectedPath = override || (existsSync(defaultPath) || !existsSync(legacyPath) ? defaultPath : legacyPath);
	const path = resolve(selectedPath);
	mkdirSync(dirname(path), { recursive: true });
	const db = new DatabaseSync(path, { timeout: 500 });
	try {
		migrateReviews(db);
		return work(db);
	} finally {
		db.close();
	}
}

export function saveReview(values: ReviewFields): void {
	if (!isStarRating(values.rating)) throw new Error('Invalid review rating');
	withDatabase((db) => {
		db.prepare(`
			INSERT INTO reviews (display_name, rating, comment, created_at)
			VALUES (?, ?, ?, ?)
		`).run(values.displayName.trim(), Number(values.rating), values.comment.trim(), new Date().toISOString());
	});
}

export function listReviews(): Review[] {
	return withDatabase((db) => db.prepare(`
		SELECT id, display_name AS displayName, rating, comment, created_at AS createdAt
		FROM reviews ORDER BY created_at DESC, id DESC
	`).all() as unknown as Review[]);
}
