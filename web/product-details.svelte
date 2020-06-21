<script>
	import { fromRecord } from "./query-params";
	import { onMount } from 'svelte';
	import ProductCard from "./product-card.svelte";
	import Ingredients from "./ingredients.svelte";

	import { tweened } from 'svelte/motion';
	import Rating from "./rating.svelte"
	import SkinType from "./skin-type.svelte"

	export let id
	const fetchProduct = async () => {
		const response = await fetch(`/api/cosmetic?${fromRecord({ id })}`);
		return response.json();
	}

	$: productRequest = fetchProduct(id)

</script>

<main class="product">

	{#await productRequest}
	{:then product}
		<div class="back">
			<a href="/">‹ back to listing</a>
		</div>
		<div class="details container">
			<div class="content">
				<h1 class="name">{product.name}</h1>
				<div class="category">{product.category}</div>
				<div class="brand">by <strong>{product.brand}</div>
				<div class="price">{product.price}$</div>
				<div class="rating"><Rating value={product.rating}/></div>
			</div>
		</div>
		<div class="skin-types container">
			<h2 class="header">Suitable for skins </h2>
			<div class="content hidden-scroll">
				{#if product.dry}<SkinType type="dry"/>{/if}
				{#if product.sensitive}<SkinType type="sensitive"/>{/if}
				{#if product.oily}<SkinType type="oily"/>{/if}
				{#if product.combination}<SkinType type="combination"/>{/if}
				{#if product.normal}<SkinType type="normal"/>{/if}
			</div>
		</div>
		<div class="similars container" >
			<h2 class="header">With similar ingredients</h2>
			<div class="content hidden-scroll">
				{#each product.similars.concat(product.similars).concat(product.similars) as similar}
					<ProductCard margin="16px" {...similar}/>
				{/each}
			</div>
		</div>
		<div class="ingredients container">
			<h2 class="header">Explore the ingredients</h2>
			<div class="canvas" >
				<Ingredients ingredients={product.ingredients} />
			</div>
		</div>
	{:catch error}
	{/await}

</main>

<style>
	.container {
		background: #FFF;
		border: 1px solid #DDDD;
		overflow: hidden;
		border-radius: 4px;
		row-gap: 8px;
		box-shadow: 0px 0px 5px 0px hsla(0, 0%, 50%, 0.5);
	}

	.content {
		padding: 8px;
	}

	.header {
		box-shadow: 0px 0px 5px 1px hsla(0, 0%, 50%, 0.5);
		display: flex;
		align-items: center;
		padding: 8px;
		background-color: hsl(240, 50%, 50%);
		text-transform: uppercase;
		color: hsl(0, 0%, 100%);
	}

	h2 {
		margin: 0;
		font-size: 18px;
		font-weight: 500;
	}

	h1 {
		margin: 0;
		font-size: 24px;
		font-weight: 500;
	}

	.canvas {
		padding: 8px;
	}

	.product {
		display: grid;
		max-width: 1300px;
		grid-template-columns: minmax(300px, 500px) minmax(500px, 800px) ;
		grid-template-rows: min-content min-content min-content min-content 1fr;
		grid-template-areas: "back ingredients" "details ingredients" "skin-types ingredients" "similars ingredients" ". ingredients";
		column-gap: 30px;
		row-gap: 8px;
		justify-content: center;
		box-sizing: border-box;
		margin: 20px auto;
	}

	@media only screen and (max-width: 800px) {
		.product {
			grid-template-columns: calc(100vw - 10px);
			grid-template-rows: auto auto auto auto auto;
			grid-template-areas: "back" "details" "skin-types" "ingredients" "similars" ;
			border: solid 0px black;
			border-radius: 0;
			height: auto;
			padding: 5px;
		}
	}

	.back {
		grid-area: back;
		font-size: 16px;
		font-weight: 300;
		color: #333;
	}

	.back a:visited {
		color: inherit;
	}

	.details {
		grid-area: details;

	}
	.details .content {
		display: grid;
		grid-auto-rows: min-content;
		row-gap: 8px;
		column-gap: 8px;
	}

	.category {
		font-style: italic;
		font-weight: 300;
	}

	.skin-types {
		grid-area: skin-types;
	}

	.skin-types .content {
		display: flex;
		flex-flow: row nowrap;
		scroll-snap-type: x mandatory;
		overflow-x: scroll;
	}

	.price {
		display: flex;
		justify-content: left;
		font-size: 32px;
		font-weight: 600;
	}
	.rating {
		display: grid;
		grid-template-columns: 150px;
		justify-content: left;
	}

	.brand {
		text-align: start;
		font-style: italic;
		font-size: 16px;
		font-weight: 300;
	}

	.brand strong {
		font-weight: 600;
	}

	.name {
		font-size: 32px;
		font-weight: 500;
	}

	.ingredients {
		grid-area: ingredients;
		display: grid;
		height: 100%;
		width: 100%;
	}

	.similars {
		grid-area: similars;
	}
	.similars .content {
		display: flex;
		flex-flow: row nowrap;
		scroll-snap-type: x mandatory;
		overflow-x: scroll;
	}


</style>