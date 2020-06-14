export const fromRecord = (record) => Object.entries(record)
	.filter(([key, value]) => Boolean(value))
	.map(([key, value]) => value === true ? key : `${key}=${value}`)
	.join("&");
