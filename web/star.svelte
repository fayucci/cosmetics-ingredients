<script>
	export let value;
	export let size = 18;

	const rounded = value.toFixed(1);
	const id = `star:${Math.random().toString(36).slice(2,10)}`;
</script>
<!-- TODO CONVERT INTO IMAGES -->
<svg viewBox="0 0 4 4" width="{size}px" height="{size}px">
	<defs>
		<linearGradient {id} x1="0%" y1="0" y2="0" x2="100%" gradientUnits="objectBoundingBox" >
			<stop stop-color="#FCCD12" stop-opacity="1" offset="0"/>
			<stop stop-color="#FCCD12" stop-opacity="1" offset={rounded}/>
			<stop stop-color="#FCCD12" stop-opacity="0" offset={rounded}/>
			<stop stop-color="#FCCD12" stop-opacity="0" offset="1"/>
		</linearGradient>
	</defs>
	<polygon stroke="#000" stroke-width="0.1" fill={`url(#${id})`} points="2.9511,2.3090 3.1756,3.6180 2.0000,3.0000 0.8244,3.6180 1.0489,2.3090 0.0979,1.3820 1.4122,1.1910 2.0000,0.0000 2.5878,1.1910 3.9021,1.3820" />
</svg>
