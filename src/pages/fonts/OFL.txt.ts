import license from '../../assets/fonts/OFL.txt?raw';

export function GET() {
	return new Response(license, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
}
