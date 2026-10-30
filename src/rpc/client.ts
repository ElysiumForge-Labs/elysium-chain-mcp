import { createPublicClient, http, type Chain, type PublicClient, type Transport } from 'viem';
import type { Config } from '../config.js';
import { ToolError, toToolError } from '../core/errors.js';
import type { Logger } from '../core/logger.js';
import { RateLimiter, type Sleep } from './rateLimit.js';
import { withRetry } from './retry.js';

export interface TransportDeps {
  limiter: RateLimiter;
  logger?: Logger;
  sleep?: Sleep;
  fetchFn?: typeof fetch;
}

/**
 * viem HTTP transport with our own retry policy and rate limiting. viem's
 * built-in retry is disabled so that every attempt (including retries) goes
 * through the rate limiter, and only transport failures (timeouts, 408/429/5xx,
 * connection errors) are retried, never reverts or bad-input errors.
 */
export function resilientHttp(
  config: Pick<Config, 'rpcUrl' | 'rpcTimeoutMs' | 'rpcRetryCount' | 'rpcRetryBaseDelayMs'>,
  deps: TransportDeps,
): Transport {
  const base = http(config.rpcUrl, {
    timeout: config.rpcTimeoutMs,
    retryCount: 0,
    ...(deps.fetchFn ? { fetchFn: deps.fetchFn } : {}),
  });

  return (params) => {
    const inner = base({ ...params, retryCount: 0 });
    return {
      ...inner,
      request: (args, options) =>
        withRetry(
          async () => {
            // Acquire outside viem's timeout window so queueing never counts as an RPC timeout.
            await deps.limiter.acquire();
            return inner.request(args, options);
          },
          {
            retries: config.rpcRetryCount,
            baseDelayMs: config.rpcRetryBaseDelayMs,
            ...(deps.sleep ? { sleep: deps.sleep } : {}),
            onRetry: ({ attempt, delayMs, error }) =>
              deps.logger?.warn(
                `RPC ${args.method} failed (${toToolError(error).code}); retry ${attempt} in ${delayMs} ms`,
              ),
          },
        ),
    } as ReturnType<Transport>;
  };
}

export function createElysiumClient(config: Config, chain: Chain, deps: TransportDeps): PublicClient {
  return createPublicClient({ chain, transport: resilientHttp(config, deps) });
}

/** The subset of viem's PublicClient the tools use. Unit tests mock this. */
export type ChainClient = Pick<
  PublicClient,
  | 'chain'
  | 'getChainId'
  | 'getBlock'
  | 'getBlockNumber'
  | 'getGasPrice'
  | 'getTransaction'
  | 'getTransactionReceipt'
  | 'getBalance'
  | 'getCode'
  | 'readContract'
  | 'call'
  | 'estimateGas'
  | 'estimateFeesPerGas'
  | 'getTransactionCount'
  | 'request'
>;

/**
 * Checks once that the RPC endpoint serves the configured chain ID. A
 * mismatch is permanent; a network failure is not cached, so the next tool
 * call tries again.
 */
export class ChainGuard {
  private pending: Promise<void> | undefined;
  private verified = false;

  constructor(
    private readonly client: Pick<ChainClient, 'getChainId'>,
    private readonly expectedChainId: number,
  ) {}

  async ensure(): Promise<void> {
    if (this.verified) return;
    this.pending ??= this.check().finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }

  private async check(): Promise<void> {
    let actual: number;
    try {
      actual = await this.client.getChainId();
    } catch (err) {
      throw toToolError(err);
    }
    if (actual !== this.expectedChainId) {
      throw new ToolError(
        'CHAIN_MISMATCH',
        `The RPC endpoint serves chain ID ${actual}, but ELYSIUM_CHAIN_ID is ${this.expectedChainId}.`,
        {
          hint: 'Fix ELYSIUM_RPC_URL or ELYSIUM_CHAIN_ID and restart the server.',
          details: { expected: this.expectedChainId, actual },
        },
      );
    }
    this.verified = true;
  }
}
