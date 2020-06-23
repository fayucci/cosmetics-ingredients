<script>
	import Rating from "./rating.svelte"

	export let brand;
	export let category;
	export let name;
	export let price;
	export let combination;
	export let dry;
	export let normal;
	export let oily;
	export let sensitive;
	export let rating;
	export let id;
	export let margin = 0;

</script>

<a
	class="product"
	href={`/?id=${id}`}
	style="--margin: {margin}"
>
	<div class="brand">{brand}</div>
	<div class="category">{category}</div>
	<div class="name">{name}</div>
	<div class="rating"><Rating value={rating}/></div>
	<div class="price">{price}$</div>
	<div class="skin-types">
		<div aria-hidden={!normal} class="chip">Normal</div>
		<div aria-hidden={!dry} class="chip">Dry</div>
		<div aria-hidden={!oily} class="chip">Oily</div>
		<div aria-hidden={!sensitive} class="chip">Sensitive</div>
		<div aria-hidden={!combination} class="chip">Combination</div>
	</div>
</a>

<style>
	.brand {
		font-size: 14px;
		font-weight: 400;
		font-style: italic;
		color: #444;
	}
	.category {
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
		display: grid;
		grid-template-columns: 100px;
		justify-content: center;
	}

	.skin-types {
		font-size: 12px;
		display: flex;
		flex-wrap: wrap;
		justify-content: start;
	}
	.chip {
		font-size: 12px;
		display: inline-block;
		border-radius: 2px;
		padding: 2px 4px;
		background: hsl(240, 50%, 50%);
		color: hsl(0, 0%, 100%);
		font-style: italic;
		font-weight: 400;
		text-align: center;
		margin: 2px;
		flex-grow: 1;
	}
	.chip[aria-hidden="true"] {
		visibility: hidden;
	}
	.price {
		text-align: center;
		font-size: 18px;
		font-weight: 800;
	}
	.product {
		text-decoration: none;
		color: inherit;
		position: relative;
		user-select: none;
		border-radius: 4px;
		padding: 8px;
		transition: all 100ms ease;
		cursor: pointer;
		background-color: #FFF;
		display: grid;
		grid-template-rows: min-content min-content 1fr min-content min-content min-content ;
		row-gap: 4px;
		min-width: 200px;
		min-height: 200px;
		width: 200px;
		height: 200px;
		box-sizing: border-box;
		border: 1px solid hsl(0, 0%, 90%);
		border-right: solid 2px hsl(0, 0%, 75%);
		border-bottom: solid 3px hsl(0, 0%, 75%);
		margin: var(--margin, 0);
		scroll-snap-align: center;
		-webkit-tap-highlight-color: transparent;
		-webkit-touch-callout: none;
	}

	.product:active {
		outline: none;
		border-bottom-width: 0;
		border-right-width: 0;
		transform: translate(2px, 3px);
	}
	.product:focus {
		box-shadow: 0px 0px 1px 0px hsla(0, 0%, 0%, 0.5);
		outline: none;
	}
	.product:hover {
		box-shadow: 0px 0px 1px 0px hsla(0, 0%, 0%, 0.5);

	}

</style>