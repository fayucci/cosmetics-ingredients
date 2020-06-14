<script>
	import Rating from "./rating.svelte"
	import routes from "./routes"

	export let brand;
	export let label;
	export let name;
	export let price;
	export let combination;
	export let dry;
	export let normal;
	export let oily;
	export let sensitive;
	export let rank;
	export let id;

	const handleClick = () => {
		routes.set(["details", id]);
	};
</script>

<div class="product" on:click={handleClick}>
	<div class="brand">{brand}</div>
	<div class="label">{label}</div>
	<div class="name">{name}</div>
	<div class="rating"><Rating value={rank}/></div>
	<div class="price">{price}$</div>
	<div class="skin-types">
		{#if combination}<div class="chip">Combination</div>{/if}
		{#if oily}<div class="chip">Oily</div>{/if}
		{#if sensitive}<div class="chip">Sensitive</div>{/if}
		{#if normal}<div class="chip">Normal</div>{/if}
		{#if dry}<div class="chip">Dry</div>{/if}
	</div>
</div>

<style>
	.brand {
		font-size: 14px;
		font-weight: 400;
		font-style: italic;
		color: #444;
	}
	.label {
		font-size: 12px;
		font-weight: 300;
		font-style: italic;
		color: #444;
	}
	.name {
		display: flex;
		font-size: 12px;
		font-weight: 500;
		color: #222;
		align-items: center;
	}

	.rating {
		display: flex;
		justify-content: center;
	}

	.skin-types {
		font-size: 12px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: repeat(auto-fit, 20px);

		grid-column-gap: 4px;
		grid-row-gap: 4px;
		align-items: center;
	}
	.chip {
		font-size: 12px;
		display: inline-block;
		border-radius: 2px;
		padding: 2px 4px;
		background: hsl(0, 0%, 20%);
		color: hsl(0, 0%, 100%);
		font-style: italic;
		font-weight: 300;
		text-align: center;
	}
	.price {
		text-align: center;
		font-size: 18px;
		font-weight: 800;
	}
	.product {
		position: relative;
		border-radius: 4px;
		padding: 8px;
		box-shadow: 0px 1px 2px 0px hsla(0, 0%, 0%, 0.5);
		background-color: #FFF;
		display: grid;
		grid-template-rows: min-content min-content 1fr min-content min-content min-content ;
		row-gap: 4px;
		max-width: 300px;
	}
	.product:hover {
		cursor: pointer;
	}
	.product:not(:last-child) {
		border-bottom: 1px solid #EEEEEE;
	}

	.product::after {
		content: '';
		position: absolute;
		z-index: -1;
		border-radius: 4px;
		width: 100%;
		height: 100%;
		filter: opacity(0);
		pointer-events: none;
		box-shadow: 0px 0px 3px 1px hsla(0, 0%, 0%, 0.5);;
		transition: filter 300ms ease-in-out;
	}
	.product:hover:after {
		filter: opacity(1);
	}

</style>