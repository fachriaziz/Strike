# Strike

Strike is an interactive guide to pool equipment, rules, and technique. It is built with Astro and runs on Node.js.

## Quick start

Install Node.js 22.23.4 or later with npm, then run:

```sh
git clone https://github.com/fachriaziz/Strike.git
cd Strike
npm ci
npm run dev
```

Open `http://localhost:4321` or use the URL printed by Astro. Stop the server with Ctrl+C before starting another server on the same port. In Windows PowerShell, use `npm.cmd` if the shell blocks `npm.ps1`.

## Production build

```sh
npm run build
npm run start
```

Run these commands from the project root. The production server prints its address on startup. Use `npm run check` to check Astro and TypeScript files.

## Reviews and media

Reviews use SQLite bundled with Node.js. On first use, the server creates `data/reviews.sqlite` automatically. Each clone starts with its own database. Set `STRIKE_REVIEWS_DB` to use a different file.

The assets needed to run the site are included. Technique uses a labeled placeholder until final clips and posters are added. See [Technique media filenames](src/assets/technique/README.md).
