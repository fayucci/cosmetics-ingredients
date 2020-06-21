export const fromRecord = (record) => Object.entries(record)
	.filter(([key, value]) => value !== undefined)
	.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
	.join("&");
