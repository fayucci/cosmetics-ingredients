<script>
	import { fromRecord } from "./query-params";
	import { onMount } from 'svelte';
	import ProductCard from "./product-card.svelte";
	import Ingredients from "./ingredients.svelte";

	import routes from "./routes"
	import { tweened } from 'svelte/motion';
	import Rating from "./rating.svelte"


	const fetchProduct = async ([,id]) => {
		// console.log(_, id)
		const response = await fetch(`/api/cosmetic?${fromRecord({ id })}`);
		return response.json();
	}

	$: productRequest = fetchProduct($routes)
	let ingredientsPanelSize

	const captureSize = ({ clientWidth, clientHeight }) => {
		console.log(clientWidth, clientHeight)
		ingredientsPanelSize = { width: clientWidth, height: clientHeight };
	}
</script>

<main class="product">

	{#await productRequest}
	{:then product}
		<div class="details">
			<div class="name">{product.name}</div>
			<div class="brand">by <strong>{product.brand}</div>
			<div class="label">{product.label}</div>
			<div class="rating"><Rating size={32} value={product.rank}/></div>
			<div class="price">{product.price}$</div>
			<div class="skin-types">
				<div>Suitable for skins: </div>
				{#if product.combination}<div class="chip">Combination</div>{/if}
				{#if product.oily}<div class="chip">Oily</div>{/if}
				{#if product.sensitive}<div class="chip">Sensitive</div>{/if}
				{#if product.normal}<div class="chip">Normal</div>{/if}
				{#if product.dry}<div class="chip">Dry</div>{/if}
			</div>
		</div>
		<div class="similars" style="--size: {product.similars.length*3}" >
			{#each product.similars.concat(product.similars).concat(product.similars) as similar}
				<ProductCard {...similar}/>
			{/each}
		</div>
		<div use:captureSize class="ingredients">
			{#if ingredientsPanelSize}
				<Ingredients width={ingredientsPanelSize.width} height={ingredientsPanelSize.height} ingredients={product.ingredients} />
			{/if}
		</div>
	{:catch error}
	{/await}

</main>

<style>

	.product {
		display: grid;
		height: 100vh;
		max-width: 1300px;
		grid-template-columns: minmax(500px, 800px) minmax(300px, 500px);
		grid-template-rows: 100vh;
		grid-template-areas: "ingredients details";
		column-gap: 30px;
		row-gap: 8px;
		justify-content: center;
		box-sizing: border-box;
		border: solid 1px black;
		border-radius: 4px;
		background-color: #fff;
		box-shadow: 0px 1px 2px 0px hsla(0, 0%, 0%, 0.5);
		/* padding: 20px; */
	}
	@media only screen and (max-width: 800px) {
		.product {
			grid-template-columns: calc(100vw - 10px);
			grid-template-rows: auto auto auto;
			grid-template-areas: "details" "similars" "ingredients";
			border: solid 0px black;
			border-radius: 0;
			height: auto;
			padding: 5px;
		}

	}
	.details {
		grid-area: details;
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: auto 1fr;
		grid-template-areas:
			"name name"
			"brand label"
			"price price"
			"rating rating"
			"skin-types skin-types";

		box-sizing: border-box;
		row-gap: 8px;
		column-gap: 8px;

		padding: 16px;
		/* grid-template-rows: minmax(auto, 100vh) 232px; */
	}
	.skin-types {
		grid-area: skin-types;

	}
	.price {
		grid-area: price;
		display: flex;
		justify-content: center;
		font-size: 32px;
		font-weight: 600;
		font-style: oblique;
	}
	.rating {
		grid-area: rating;
		display: flex;
		justify-content: center;
	}
	.label {
		grid-area: label;
		text-align: end;
	}
	.brand {
		grid-area: brand;
		text-align: start;
		font-style: italic;
		font-size: 16px;
		font-weight: 300;
	}
	.brand strong {
		font-weight: 600;
	}
	.name {
		grid-area: name;
		font-size: 32px;
		font-weight: 500;
		font-variant: petite-caps;
	}

	.ingredients {
		grid-area: ingredients;
		height: 100%;
		widows: 100%;
	}

	.similars {
		display: grid;
		padding: 16px;
		
		grid-template-columns: auto;
		grid-template-rows: repeat(var(--size, auto-fit), max-content);
		overflow-y: auto;
		column-gap: 16px;
		row-gap: 16px;

		justify-content: center;
		scrollbar-width: none; 
		
		/* border: 1px solid #888;
		border-radius: 4px;
		box-shadow: 0 0 10px 0px #8888 inset; */
	}
	.similars::-webkit-scrollbar {
		width: 0px;
		background: transparent;
	}

	@media only screen and (max-width: 800px) {
		.similars {
			grid-template-columns: repeat(var(--size, auto-fit), 200px);
			grid-template-rows: 200px;
			overflow-x: auto;
			overflow-y: hidden;
		}
	}
</style>