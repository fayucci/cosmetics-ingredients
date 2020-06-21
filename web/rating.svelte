<script>
	import Star from "./star.svelte";

	export let value;
	export let highlighted = false
</script>

<div>
	<Star {highlighted} value={Math.min(1, value - 0)}/>
	<Star {highlighted} value={Math.min(1, value - 1)}/>
	<Star {highlighted} value={Math.min(1, value - 2)}/>
	<Star {highlighted} value={Math.min(1, value - 3)}/>
	<Star {highlighted} value={Math.min(1, value - 4)}/>
</div>

<style>
	div {
		display: flex;
		justify-content: space-around;
		flex-wrap: nowrap;
	}
</style>