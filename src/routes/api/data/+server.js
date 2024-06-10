import { json } from '@sveltejs/kit'
import data from './countriesAndFlags.json'

export async function GET() {
	return json(data)
}
