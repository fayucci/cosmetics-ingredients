<script>
	export let value;
	export let highlighted = false

	$: rounded = value.toFixed(1);
	$: id = `star:${Math.random().toString(36).slice(2,10)}`;
</script>

<svg viewBox="0 0 4 4" width="100%" height="100%">
	<defs>
		<linearGradient {id} x1="0%" y1="0" y2="0" x2="100%" gradientUnits="objectBoundingBox" >
			<stop stop-color="#FCCD12" stop-opacity="1" offset="0"/>
			<stop stop-color="#FCCD12" stop-opacity="1" offset={rounded}/>
			<stop stop-color="#FCCD12" stop-opacity="0" offset={rounded}/>
			<stop stop-color="#FCCD12" stop-opacity="0" offset="1"/>
		</linearGradient>
	</defs>
	<polygon data-highlighted={highlighted} fill={`url(#${id})`} points="2.9511,2.3090 3.1756,3.6180 2.0000,3.0000 0.8244,3.6180 1.0489,2.3090 0.0979,1.3820 1.4122,1.1910 2.0000,0.0000 2.5878,1.1910 3.9021,1.3820" />
</svg>


<style>
	polygon {
		stroke: hsla(47.9, 97.5%, 25%, 0.5);
		stroke-width: 0.2;
	}
	polygon[data-highlighted="true"]{
		stroke: hsl(0, 0%, 25%);
		stroke-width: 0.3;
	}
</style>