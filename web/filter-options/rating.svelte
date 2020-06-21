<script>
	import Rating from "../rating.svelte";
	import { createEventDispatcher } from 'svelte';
	
	export let filters;

	const dispatch = createEventDispatcher();
	const handleSelection = (rating) => () => {
		$filters = { ...$filters, rating };
		dispatch("filter", rating);
	}
</script>

<div class="drawer-content" >
	<div class="option" data-selected={$filters.rating === 1} on:click={handleSelection(1)}>
		<Rating highlighted={$filters.rating === 1} value={1} />+1
	</div>
	<div class="option" data-selected={$filters.rating === 2} on:click={handleSelection(2)}>
		<Rating highlighted={$filters.rating === 2} value={2} />+2
	</div>
	<div class="option" data-selected={$filters.rating === 3} on:click={handleSelection(3)}>
		<Rating highlighted={$filters.rating === 3} value={3} />+3
	</div>
	<div class="option" data-selected={$filters.rating === 4} on:click={handleSelection(4)}>
		<Rating highlighted={$filters.rating === 4} value={4} />+4
	</div>
	<div class="option" data-selected={$filters.rating === 5} on:click={handleSelection(5)}>
		<Rating highlighted={$filters.rating === 5} value={5} /> 5
	</div>
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
		display: grid;
		grid-template-columns: 100px 20px;
		transition: all 300ms ease;
		white-space: nowrap;
		padding: 8px 12px;
		text-align: right;
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