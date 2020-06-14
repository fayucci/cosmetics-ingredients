<script>
	const id = Math.random().toString(36).slice(2,10);
	const fillId = `fill:${id}`;
	const fill = `url("#${fillId}")`;
	const filterId = `filter:${id}`;
	const filter = `url("#${filterId}")`;
</script>

<svg width="100%" height="100%" >
	<filter id={filterId}><feGaussianBlur stdDeviation="10"/></filter>
	<linearGradient id={fillId}>
		<stop offset="0%" stop-color="#FFFFFF" />
		<stop offset="100%" stop-color="#BBBBBB">
			<animate values="0%;100%;0%" dur="1s" attributeName="offset" repeatCount="indefinite" />
		</stop>
		<stop offset="100%" stop-color="#FFFFFF" />
	</linearGradient>
	<rect width="100%" height="100%" {fill} {filter}/>
</svg>

