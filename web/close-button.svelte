<button on:click>
	<svg height="12" width="12" viewBox="0 0 16 16">
		<line x1="0" y1="0" x2="16" y2="16" />
		<line x1="0" y1="16" x2="16" y2="0" />
	</svg>
</button>

<style>
	line {
		stroke: #555;
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
		width: 18px;
		height: 18px;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 18px;
		-webkit-tap-highlight-color: transparent;
	}

	button:hover {
		background-color: HSL(0, 0%, 100%);
	}

	button:hover line {
		stroke-width: 3;
	}

	button:focus {
		outline: none;
	}
</style>