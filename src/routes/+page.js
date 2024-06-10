export async function load({ fetch }) {
    const response = await fetch('api/data')
    const data = await response.json()
    return data
}