<script>
	import Star from "./star.svelte";

	export let value;
	export let size;
</script>

<div>
	<Star {size} value={Math.min(1, value - 0)}/>
	<Star {size} value={Math.min(1, value - 1)}/>
	<Star {size} value={Math.min(1, value - 2)}/>
	<Star {size} value={Math.min(1, value - 3)}/>
	<Star {size} value={Math.min(1, value - 4)}/>
</div>

<style>
	div {
		/* width: 100px; */
		display: flex;
		justify-content: space-around;
		flex-wrap: nowrap;
	}
</style>