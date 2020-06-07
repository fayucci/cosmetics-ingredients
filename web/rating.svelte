<script>
	import Star from "./star.svelte";

	export let value;
</script>

<div {...$$restProps}>
	<Star value={Math.min(1, value - 0)}/>
	<Star value={Math.min(1, value - 1)}/>
	<Star value={Math.min(1, value - 2)}/>
	<Star value={Math.min(1, value - 3)}/>
	<Star value={Math.min(1, value - 4)}/>
</div>
