<script>
	import { onMount, tick } from 'svelte';
	import { writable } from 'svelte/store';
	import { fromRecord } from "./query-params";
	import Product from "./product-card.svelte";
	import Sorting from "./sorting.svelte";
	import Filters from "./filters.svelte";


	let sorting = writable([])
	let filters = writable({})

	let loading = false;
	let products = [];
	let pages;
	let currentPage = 0;



	const fetchProducts = async ({ minPrice, maxPrice, category, ...filters }, [sort, ascending], page = 0) => {
		currentPage = page;
		loading = true;
		const response = await fetch(`/api/cosmetics?${fromRecord({ page, "max-price": maxPrice, "min-price": minPrice, label: category, ...filters, sort, ascending })}`);
		const { data, meta } = await response.json();
		pages = meta.pages;
		for (const product of data) {
			products = products.concat(product);
			await tick();
		}
		loading = false;
	};


	const timer = {}
	$: {
		clearTimeout(timer.current);
		timer.current = setTimeout(() => {
			products = [];
			fetchProducts($filters, $sorting);
		}, 600)
	};
	let expanded = null;
	let drawer;

	const infiniteScroll = (node) => {
		const handleScroll = ({ target: { scrollHeight, scrollTop, clientHeight }}) => {
			if(loading) return;
			const closeToBottom = (scrollHeight - (clientHeight * 2) < scrollTop);
			if (closeToBottom && currentPage + 1 < pages) fetchProducts($filters, sorting, currentPage + 1)
		}
		node.addEventListener("scroll", handleScroll);
		return ({
			destroy: () => node.removeEventListener("sroll", handleScroll)
		})
	}
</script>

<main>
	<div class="products hidden-scroll" use:infiniteScroll>
		{#each products as product (product.id)}
			<Product {...product} />
		{/each}
	</div>
	<div class="filters">
		<div class="list">
			{#if drawer}
				<Filters {filters} drawer={drawer} />
				<Sorting {sorting} />
			{/if}
		</div>
		<div bind:this={drawer} class="drawer hidden-scroll" />
	</div>
</main>

<style>

	main {
		display: grid;
		grid-template-columns: 150px 1fr minmax(250px, 800px) 1fr;
		grid-template-rows: 100vh;
		grid-template-areas: "filters . products .";
		min-height: 100vh;
		column-gap: 16px;
	}

	@media only screen and (max-width: 800px) {
		main {
			grid-template-columns: 120px minmax(250px, 800px);
			grid-template-areas: "filters products";
		}
	}

	.products {
		display: grid;
		grid-area: products;
		grid-template-columns: repeat(auto-fit, minmax(200px, max-content));
		grid-auto-rows: minmax(200px, min-content);
		grid-column-gap: 16px;
		grid-row-gap: 16px;
		justify-content: center;
		max-height: 100vh;
		overflow-y: scroll;
	}

	.filters {
		grid-area: filters;
		position: relative;
		background: #FFF;
		border: 1px solid #DDDD;
		padding: 16px 8px;
		box-shadow: 1px 0px 1px 0px hsla(0, 0%, 50%, 0.25);
		z-index: 0;
	}
	.filters .list {
		display: grid;
		row-gap: 16px;
	}
	.filters .drawer {
		position: absolute;
		overflow-x: hidden;
		height: calc(100% - 32px);
		background: hsla(0, 0%, 100%, 0.95);
		top: -1px;
		left: calc(100% - 8px);
		z-index: -1;
		transition: all 600ms ease;
		border-left: 1px solid #EEE;
		border-right: none;
		border-bottom-right-radius: 4px;
		border-top-right-radius: 4px;
		overflow-y: scroll;
		padding-left: 4px;
		padding-right: 4px; 
		padding-top: 16px;
		padding-bottom: 16px;
		box-shadow: 1px 0px 1px 0px hsla(0, 0%, 50%, 0.25);
	}

</style>