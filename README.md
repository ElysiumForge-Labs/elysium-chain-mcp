# elysium-chain-mcp

MCP server so AI agents can read and interact with the Elysium chain (Kinetiq's Arbitrum Orbit L2 for Hyperliquid).

Part of [ElysiumForge Labs](https://github.com/ElysiumForge-Labs).

An agent can read blocks, balances, contracts, and logs over JSON-RPC, and can query the block explorer when that API is configured. Sending transactions is a separate switch, and it accepts only Elysium testnet (chain ID `99801`).

Reads follow `ELYSIUM_RPC_URL`. Write tools stay unregistered until `ENABLE_WRITES=true`, and the process accepts them only on chain ID `99801`.

For a first connection, follow [Start here](docs/START.md), then the prompts in [Examples](docs/EXAMPLES.md).

## Requirements

Node.js 20 or newer.

## Client setup

The RPC URL and chain ID below are the public testnet values from the [chain specifications](https://elysium.kinetiq.xyz/docs/chain-specifications).

```json
{
  "mcpServers": {
    "elysium": {
      "command": "npx",
      "args": ["-y", "elysium-chain-mcp"],
      "env": {
        "ELYSIUM_RPC_URL": "https://testnet-rpc.elysium.kinetiq.xyz",
        "ELYSIUM_CHAIN_ID": "99801"
      }
    }
  }
}
```

Claude Desktop (`claude_desktop_config.json`) and Cursor (`mcp.json`) both use this `mcpServers` object. The default transport is MCP over stdio. The process reads environment variables from the client and does not load a `.env` file. Every variable is listed in [`.env.example`](.env.example).

### Local checkout

```bash
npm install
npm run build
npm start
```

Export `ELYSIUM_RPC_URL` and `ELYSIUM_CHAIN_ID` before `npm start`.

### HTTP

Set `MCP_TRANSPORT=http` to serve MCP over HTTP. The process binds `127.0.0.1:3000`, accepts `POST /mcp`, and `GET /health` returns `{ "status": "ok" }`.

`MCP_HTTP_TOKEN` (at least 16 characters) is required when the bind address is not loopback, and whenever writes are enabled over HTTP.

## Tools

Eight read tools are always registered. Inputs, outputs, and error codes are in [Tools](docs/TOOLS.md).

| Tool               | What it does                                                     |
| ------------------ | ---------------------------------------------------------------- |
| `get_chain_status` | Latest block, measured block time, base fee, and gas price       |
| `get_block`        | One block, by number, tag, or hash                               |
| `get_transaction`  | Transaction, receipt, fee, and optional decoded call and logs    |
| `get_balance`      | HYPE balance, plus up to 20 ERC-20 balances                      |
| `get_token_info`   | ERC-20 name, symbol, decimals, and total supply                  |
| `read_contract`    | Call a `view` or `pure` function. The call is not submitted      |
| `get_logs`         | Event logs. Unfiltered queries are capped (default 2,000 blocks) |
| `simulate_call`    | `eth_call` plus a gas estimate. Nothing is signed or submitted   |

Seven explorer tools register only when `EXPLORER_API_URL` is set. They call an undocumented Blockscout-style API. Indexed balances can lag the chain; the RPC tools are the source of truth. Names, symbols, ABIs, and source code come back under `untrusted`. Detail is in [Explorer tools](docs/EXPLORER.md).

| Tool                                | What it does                                   |
| ----------------------------------- | ---------------------------------------------- |
| `explorer_get_address`              | Indexed overview of an address                 |
| `explorer_get_address_transactions` | Transactions for an address, newest first      |
| `explorer_get_token_transfers`      | Token transfers for an address                 |
| `explorer_get_token_balances`       | Tokens the explorer has indexed for an address |
| `explorer_get_contract`             | Verification status, ABI, and optional source  |
| `explorer_search`                   | Search by name or address                      |
| `explorer_get_token`                | Token metadata, and holders when requested     |

Two write tools register only when `ENABLE_WRITES=true`. Setup and the full check sequence are in [Write tools](docs/WRITES.md).

| Tool             | What it does                                     |
| ---------------- | ------------------------------------------------ |
| `send_native`    | Send HYPE from the server's testnet account      |
| `write_contract` | Call a state-changing function from that account |

Both default to `dry_run: true`. A dry run simulates and returns the exact transaction. Set `dry_run` to `false` to sign and submit.

Amounts in tool output are decimal strings. HYPE uses 18 decimals (1 HYPE = 10^18 wei). Chain IDs, nonces, gas, and logs are covered in [Concepts](docs/CONCEPTS.md).

## Configuration

| Variable                   | Required                               | Default     | Purpose                                                         |
| -------------------------- | -------------------------------------- | ----------- | --------------------------------------------------------------- |
| `ELYSIUM_RPC_URL`          | yes                                    |             | HTTP or HTTPS JSON-RPC endpoint                                 |
| `ELYSIUM_CHAIN_ID`         | yes                                    |             | Chain ID that endpoint must serve                               |
| `ELYSIUM_CHAIN_NAME`       | no                                     | `Elysium`   | Display name only                                               |
| `RPC_TIMEOUT_MS`           | no                                     | `10000`     | Per-attempt RPC timeout                                         |
| `RPC_RETRY_COUNT`          | no                                     | `3`         | Retries after the first attempt, for transport failures only    |
| `RPC_RETRY_BASE_DELAY_MS`  | no                                     | `250`       | Base delay for exponential backoff with jitter                  |
| `RPC_RATE_LIMIT_RPS`       | no                                     | `10`        | Client-side request rate. Retries count against it              |
| `MAX_LOG_BLOCK_RANGE`      | no                                     | `2000`      | Largest unfiltered `get_logs` range, in blocks                  |
| `BLOCK_TIME_SAMPLE_SIZE`   | no                                     | `1000`      | Blocks used to measure average block time                       |
| `MCP_TRANSPORT`            | no                                     | `stdio`     | `stdio` or `http`                                               |
| `MCP_HTTP_HOST`            | no                                     | `127.0.0.1` | HTTP bind address                                               |
| `MCP_HTTP_PORT`            | no                                     | `3000`      | HTTP port. `0` asks the OS for a free port                      |
| `MCP_HTTP_TOKEN`           | off loopback, and for writes over HTTP |             | Bearer token, at least 16 characters                            |
| `LOG_LEVEL`                | no                                     | `info`      | `debug`, `info`, `warn`, or `error`. Logs go to stderr          |
| `EXPLORER_API_URL`         | no                                     | off         | Explorer API base, such as `https://elysium.kinetiq.xyz/api/v2` |
| `EXPLORER_TIMEOUT_MS`      | no                                     | `10000`     | Per-attempt explorer timeout                                    |
| `EXPLORER_RETRY_COUNT`     | no                                     | `2`         | Explorer retries after the first attempt                        |
| `EXPLORER_RATE_LIMIT_RPS`  | no                                     | `5`         | Client-side explorer request rate                               |
| `ENABLE_WRITES`            | no                                     | `false`     | Register `send_native` and `write_contract`                     |
| `ELYSIUM_PRIVATE_KEY`      | when writes are on                     |             | 32-byte hex key. Never a tool argument                          |
| `MAX_SEND_HYPE`            | no                                     | `0.01`      | Most HYPE one transaction may send                              |
| `MAX_FEE_HYPE`             | no                                     | `0.001`     | Most HYPE one transaction may spend on fees                     |
| `WRITE_ALLOWLIST`          | no                                     | any address | Comma-separated destination addresses                           |
| `WRITE_RECEIPT_TIMEOUT_MS` | no                                     | `30000`     | How long a send waits for its receipt                           |

Logs record only the origin of `ELYSIUM_RPC_URL` and `EXPLORER_API_URL`, so a key in the path or query string stays out of the log line.

## Risks

Read this before setting `ENABLE_WRITES=true`. The longer version is in [Write tools](docs/WRITES.md#risks-of-the-write-tools).

The server starts with writes enabled only when the key is valid, `ELYSIUM_CHAIN_ID` is `99801`, and HTTP mode has `MCP_HTTP_TOKEN` set. Every write then checks, in order:

1. The destination is on `WRITE_ALLOWLIST`, when that list is set, and the HYPE value is within `MAX_SEND_HYPE`.
2. The node reports chain ID `99801`.
3. `eth_call` from the signing account succeeds. A revert submits nothing.
4. The gas limit (`eth_estimateGas` plus 20%) times the max fee per gas is within `MAX_FEE_HYPE`.
5. The account balance covers the value plus that maximum fee.

`dry_run` defaults to true. It is a preview. The agent can pass `dry_run: false` on its own, so leave tool-call approval on in the MCP client for `send_native` and `write_contract`.

Use a dedicated testnet account, funded from the [testnet faucet](https://elysium.kinetiq.xyz/testnet-faucet), holding only what you can afford to lose. The key is read from `ELYSIUM_PRIVATE_KEY` and then removed from the process environment. The client config or secrets file that supplied it still holds the key. Tool arguments, logs, and tool results omit the key.

`WRITE_ALLOWLIST` and `MAX_SEND_HYPE` apply to the top-level transaction. An allowed token contract can still be called with `transfer` or `approve` for any address. Close that gap before enabling writes on any chain that holds real value.

A `pending` status, or `SEND_STATUS_UNKNOWN`, means the transaction may already be in the node. Look it up with `get_transaction` and the hash before submitting it again.

Explorer text and on-chain names are written by third parties and can try to steer the agent. With writes and the explorer both enabled, the server logs a warning at startup. Tool-call approval is the control that stops a steered write.

## Documentation

| Document                           | Contents                                                 |
| ---------------------------------- | -------------------------------------------------------- |
| [Start here](docs/START.md)        | Connect, check the chain, and the first questions to ask |
| [Examples](docs/EXAMPLES.md)       | Prompts and the tool input each one should produce       |
| [Tools](docs/TOOLS.md)             | Inputs, outputs, error codes, RPC retry behaviour        |
| [Explorer tools](docs/EXPLORER.md) | Undocumented API, pagination, untrusted fields           |
| [Write tools](docs/WRITES.md)      | Setup, checks, and risks                                 |
| [Concepts](docs/CONCEPTS.md)       | Blocks, wei, gas, logs, and keys                         |
| [Changelog](CHANGELOG.md)          | Released changes                                         |
| [Security](SECURITY.md)            | What to report, and how                                  |

## Development

```bash
npm install
npm run typecheck
npm test
npm run test:integration   # live testnet; set SKIP_INTEGRATION=true to skip
npm run build
```

`prepublishOnly` runs the typecheck, the unit tests, and the build. Integration tests are opt-in because they call the public testnet. The funded write test runs only when `ELYSIUM_TEST_PRIVATE_KEY` is set. Release steps are in [RELEASING.md](RELEASING.md).

## Security

Report a vulnerability privately. Omit private keys, including testnet keys. Scope and the known limits are in [SECURITY.md](SECURITY.md).

---

Unofficial community project. Not affiliated with Kinetiq/Hyperliquid.
