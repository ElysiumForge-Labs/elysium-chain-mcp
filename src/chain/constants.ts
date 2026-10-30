/**
 * HYPE is Elysium's native gas token. Like every EVM native coin, balances
 * are counted in wei: 1 HYPE = 10^18 wei. This is the only place the
 * decimals are defined; everything else reads them from the chain object.
 */
export const NATIVE_CURRENCY = { name: 'HYPE', symbol: 'HYPE', decimals: 18 } as const;

/** Chain ID of the Elysium testnet. Write tools refuse every other chain. */
export const ELYSIUM_TESTNET_CHAIN_ID = 99801;
