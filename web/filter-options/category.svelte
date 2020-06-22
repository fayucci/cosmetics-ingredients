<script>
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';


	export let filters;

	let categories = []
	onMount(async () => {
		const response = await fetch("/api/categories", { cache: "force-cache" });
		categories = await response.json();
	});

	const dispatch = createEventDispatcher();
	const handleSelection = (category) => () => {
		$filters = { ...$filters, category }
		dispatch("filter");
	}
</script>

<div class="drawer-content" >
	{#each categories as category }
		<div data-selected={$filters.category === category}  class="option" on:click={handleSelection(category)}>{category}</div>
	{/each}
</div>

<style>
	.drawer-content {
		display: grid;
		grid-auto-rows: min-content;
		row-gap: 8px;
		width: 250px;
		box-sizing: border-box;
	}

	.option {
		transition: all 300ms ease;
		white-space: nowrap;
		padding: 8px 12px;
		text-align: left;
		cursor: pointer;
		background: transparent;
		border-radius: 4px;
	}
	.option[data-selected="true"] {
		font-weight: 500;
	}
	.option:hover {
		background: #EEEEEEDD;
	}
</style>