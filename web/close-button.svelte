<button on:click>
	<svg height="8" width="8" viewBox="0 0 16 16">
		<line x1="0" y1="0" x2="16" y2="16" />
		<line x1="0" y1="16" x2="16" y2="0" />
	</svg>
</button>

<style>
	line {
		stroke: #333;
		transition: stroke-width 300ms ease-in;
		stroke-width: 2;
	}
	button {
		transition: background-color 300ms ease-in;
		user-select: none;
		border: none;
		cursor: pointer;
		background: none;
		padding: 0;
		width: 16px;
		height: 16px;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: HSL(0, 0%, 90%);
		border-radius: 16px;
	}
	button:hover {
		background-color: HSL(0, 0%, 100%);
	}
	button:hover line {
		stroke-width: 3;
	}
</style>