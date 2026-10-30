import { defineChain, type Chain } from 'viem';
import type { Config } from '../config.js';
import { NATIVE_CURRENCY } from './constants.js';

export function buildChain(config: Pick<Config, 'chainId' | 'chainName' | 'rpcUrl'>): Chain {
  return defineChain({
    id: config.chainId,
    name: config.chainName,
    nativeCurrency: NATIVE_CURRENCY,
    rpcUrls: { default: { http: [config.rpcUrl] } },
  });
}
