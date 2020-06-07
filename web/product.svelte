<script>
	import Rating from "./rating.svelte"

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
	
	const checkMark = (a) => a ? "\u2713" : ""
</script>

<div class="product">
	<div class="brand">{brand}</div>
	<div class="main">{name}</div>
	<div>{price}USD</div>
	<div>{label}</div>
	<Rating value={rank}/>
	<div class="check">{checkMark(combination)}</div>
	<div class="check">{checkMark(dry)}</div>
	<div class="check">{checkMark(normal)}</div>
	<div class="check">{checkMark(oily)}</div>
	<div class="check">{checkMark(sensitive)}</div>
</div>

<style>
	.main {
		flex-grow: 1
	}
	.check {
		width: 20px
	}
	.brand {
		width: 200px
	}
	.product {
		transition: all 300ms ease-in;
		display: flex;
		padding: 8px;
	}
	.product:hover {
		background-color: #EEEEEE;
	}
	.product:not(:last-child){
		border-bottom: 1px solid #AAAAAA
	}
	.product div {
		margin: 0 8px;
	}
</style>