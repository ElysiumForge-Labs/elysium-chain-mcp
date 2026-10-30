import type { AnyToolDefinition } from './define.js';
import { getBalance } from './read/getBalance.js';
import { getBlock } from './read/getBlock.js';
import { getChainStatus } from './read/getChainStatus.js';
import { getLogs } from './read/getLogs.js';
import { getTokenInfo } from './read/getTokenInfo.js';
import { getTransaction } from './read/getTransaction.js';
import { readContract } from './read/readContract.js';
import { simulateCall } from './read/simulateCall.js';
import { sendNative } from './write/sendNative.js';
import { writeContract } from './write/writeContract.js';

export const READ_TOOLS: readonly AnyToolDefinition[] = [
  getChainStatus,
  getBlock,
  getTransaction,
  getBalance,
  getTokenInfo,
  readContract,
  getLogs,
  simulateCall,
];

/** Registered only when ENABLE_WRITES=true. */
export const WRITE_TOOLS: readonly AnyToolDefinition[] = [sendNative, writeContract];
