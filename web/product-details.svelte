<script>
	import { fromRecord } from "./query-params";
	import { onMount } from 'svelte';
	import ProductCard from "./product-card.svelte";
	import Ingredients from "./ingredients.svelte";

	import { tweened } from 'svelte/motion';
	import Rating from "./rating.svelte"
	import SkinType from "./skin-type.svelte"

	export let id

	let loading = true
	let product
	const fetchProduct = async () => {
		product = undefined;
		loading = true;
		const response = await fetch(`/api/cosmetic?${fromRecord({ id })}`);
		product = await response.json();
		loading = false;
	}
	$: fetchProduct(id)

</script>

<main class="product">

	<div class="back">
		<a href="/">‹ back to listing</a>
	</div>
	<div class="details container" data-loading={loading}>
		{#if product}
			<div class="content">
				<h1 class="name">{product.name}</h1>
				<div class="category">{product.category}</div>
				<div class="brand">by <strong>{product.brand}</div>
				<div class="price">{product.price}$</div>
				<div class="rating"><Rating value={product.rating}/></div>
			</div>
		{/if}
	</div>
	<div class="skin-types container" data-loading={loading} >
		<h2 class="header">Suitable for skins </h2>
		{#if product}
			<div class="content hidden-scroll">
				{#if product.dry}<SkinType type="dry"/>{/if}
				{#if product.sensitive}<SkinType type="sensitive"/>{/if}
				{#if product.oily}<SkinType type="oily"/>{/if}
				{#if product.combination}<SkinType type="combination"/>{/if}
				{#if product.normal}<SkinType type="normal"/>{/if}
			</div>
		{/if}
	</div>
	<div class="similars container" data-loading={loading} >
		<div class="header">
			<h2>With similar ingredients</h2>
			<em>t-SNE Estimate</em>
		</div>
		{#if product}
			<div class="content hidden-scroll">
				{#if product.similars.length === 0}
					<div class="not-found">
						We could not find any similar product
					</div>
				{/if}
				{#each product.similars as similar}
					<ProductCard margin="16px" {...similar}/>
				{/each}
			</div>
		{/if}
	</div>
	<div class="ingredients container" data-loading={loading} >
		<div class="header">
			<h2>Ingredients</h2>
			<em>Visual Reference</em>
		</div>
		{#if product}
			<div class="canvas" >
				<Ingredients ingredients={product.ingredients} />
			</div>
		{/if}
	</div>
</main>

<style>

	.similars .not-found {
		width: 100%;
		padding: 8px;
		background-color: hsl(0, 0%, 96.9%);
		text-align: center;
		font-weight: 300;
		border-radius: 4px;
	}
	.container {
		background: #FFF;
		border: 1px solid #DDDD;
		overflow: hidden;
		display: grid;
		border-radius: 4px;
		row-gap: 8px;
		box-shadow: 0px 0px 5px 0px hsla(0, 0%, 50%, 0.5);
	}
	@keyframes blink {
		from {
			background: #EEE;
		}
		to {
			background: #BBB;
		}
	}

	.container[data-loading="true"] {
		animation: blink 1s ease infinite alternate-reverse;
		background: #EEE;
	}
	.container[data-loading="true"]:after {
		content: "";
		text-align: center;
		display: grid;
		min-height: 100px;
		align-content: center;
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
		color: hsl(0, 0%, 100%);
		justify-content: space-between;
	}
	
	.header em {
		font-weight: 500;
		font-style: italic;
		text-decoration: underline;
	}
	h2 {
		text-transform: uppercase;
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
		min-height: 300px 
	}

	.product {
		display: grid;
		max-width: 1300px;
		grid-template-columns: minmax(300px, 400px) minmax(440px, 600px) ;
		grid-template-rows: min-content min-content min-content min-content 1fr;
		grid-template-areas: "back ingredients" "details ingredients" "skin-types ingredients" "similars ingredients" ". ingredients";
		column-gap: 20px;
		row-gap: 8px;
		justify-content: center;
		box-sizing: border-box;
		padding: 20px;
		margin: 0 auto;
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
		grid-template-rows: min-content 1fr;
		/* height: 100%;
		width: 100%; */
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