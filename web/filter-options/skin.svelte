<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let filters;

	let {
		dry = false,
		oily = false,
		normal = false,
		sensitive = false,
		combination = false,
	} = $filters;

	const valid = ([, value]) => value;
	const aggregate = (acc, [key, value])=> ({ ...acc, [key]: value });
	const handleSelection = () => {
		$filters.dry = dry || undefined;
		$filters.oily = oily || undefined;
		$filters.normal = normal || undefined;
		$filters.sensitive = sensitive || undefined;
		$filters.combination = combination || undefined;
		dispatch("filter")
	}
	const timer = {}
	const debouncedChange = () => {
		clearTimeout(timer.current);
		timer.current = setTimeout(handleSelection, 1000);
	}
</script>

<div class="drawer-content" on:change|capture={debouncedChange}>
	<label class="option" >
		<input type="checkbox" bind:checked={dry} name="dry">Dry
	</label>
	<label class="option" >
		<input type="checkbox" bind:checked={oily} name="oily">Oily
	</label>
	<label class="option" >
		<input type="checkbox" bind:checked={normal} name="normal">Normal
	</label>
	<label class="option">
		<input type="checkbox" bind:checked={sensitive} name="sensitive">Sensitive
	</label>
	<label class="option" >
		<input type="checkbox" bind:checked={combination} name="combination">Combination
	</label>
</div>
<style>
	.drawer-content {
		display: grid;
		grid-auto-rows: min-content;
		row-gap: 8px;
		width: 250px;
		padding: 0 12px;
		box-sizing: border-box;
	}
	input {
		-moz-appearance: none;
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 300ms ease;
		border: 1px solid #DDDD;
		background: #FFF;
		border-radius: 4px;
		-webkit-tap-highlight-color: transparent;
	}
	input:checked {
		background: hsl(240, 49.8%, 50%);
	}

	input:checked:before {
		content: "✓";
		color: #FFF;
	}
	input:focus {
		outline: none;
	}

	.drawer-content {
		display: grid;
		grid-auto-rows: min-content;
		row-gap: 8px;
	}

	.option {
		display: grid;
		grid-template-columns: min-content 1fr;
		column-gap: 8px;
		transition: all 300ms ease;
		white-space: nowrap;
		padding: 8px 12px 8px 8px;
		text-align: left;
		cursor: pointer;
		background: transparent;
		align-items: center;
		border-radius: 4px;
	}

	.option:hover {
		background: #EEEEEEDD;
	}
</style>