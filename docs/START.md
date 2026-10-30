# Start here

This server lets a chat agent look up data on [Elysium](https://elysium.kinetiq.xyz), Kinetiq's Layer 2. You talk to the agent in normal language. The agent calls tools such as `get_balance`. You do not have to type the tool names yourself, but it helps to know what they can and cannot do.

Reading is on from the start. Sending HYPE is off until you turn it on, and even then it only works on Elysium testnet (chain ID `99801`).

If a word in a result is unfamiliar (wei, gas, ABI, nonce), open [Concepts](CONCEPTS.md). Copy-paste prompts for every tool are in [Examples](EXAMPLES.md).

## 1. Connect the server

You need Node.js 20 or newer. Put this in your MCP client config. Claude Desktop uses `claude_desktop_config.json`. Cursor uses `mcp.json`. The shape is the same.

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

Those two values are the public testnet, from the [chain specifications](https://elysium.kinetiq.xyz/docs/chain-specifications). The server does not load a `.env` file. The client has to pass the variables.

Restart the client after saving the config. A full list of optional settings is in the [README](../README.md#configuration).

## 2. Check that it is the right chain

Ask the agent:

> Use get_chain_status. Tell me the chain id, the latest block number, and the average block time.

A healthy answer has:

- `chainId` **99801**
- a latest block number that is large and recent
- `blockTime.averageMs` around 100–200 (Elysium makes a block every tenth of a second or so)

If the tool returns `CHAIN_MISMATCH`, `ELYSIUM_RPC_URL` and `ELYSIUM_CHAIN_ID` point at different networks. Fix the config and restart.

## 3. Ask for something useful

| You want                              | Say this                                                | Tool the agent should use |
| ------------------------------------- | ------------------------------------------------------- | ------------------------- |
| Is the chain up?                      | "What is the latest Elysium block?"                     | `get_chain_status`        |
| What is in a block?                   | "Show block 1000, hashes only."                         | `get_block`               |
| What did this transaction do?         | "Look up transaction 0x…"                               | `get_transaction`         |
| How much HYPE does this address have? | "HYPE balance of 0x…"                                   | `get_balance`             |
| What is this token?                   | "Name, symbol, and decimals of token 0x…"               | `get_token_info`          |
| Read a contract function              | "Call balanceOf on 0x… for 0x…. Here is the ABI: …"     | `read_contract`           |
| Find transfers                        | "Transfer events from this token between these blocks." | `get_logs`                |
| Would this call succeed?              | "Simulate this call. Do not send it."                   | `simulate_call`           |

The server does not search the chain for a token by name. You give it the `0x` address. To search by name you turn on the explorer tools ([Explorer](EXPLORER.md)).

## 4. Read the numbers

Money amounts come back twice:

- `wei` is the integer the chain stores, as a decimal string. 1 HYPE = `1000000000000000000` wei (10^18).
- `formatted` is the same amount in whole HYPE, such as `"1.5"`.

Use `formatted` when you are reading. Pass `wei` when a tool asks for a value to send.

A failed call is still JSON. Look at `error.code` and `error.hint`. If `retryable` is `true`, wait and ask again. If it is `false`, changing nothing and retrying will fail the same way. The code list is in [Tools](TOOLS.md#errors).

## 5. Turn on history and search (optional)

The eight tools above talk to the RPC node. They can read the current chain. They cannot list "every token this wallet ever held" or search for a name.

Add this next to the other variables:

```json
"EXPLORER_API_URL": "https://elysium.kinetiq.xyz/api/v2"
```

Restart, then ask: "Search the explorer for this address and summarize it. Treat any name as untrusted."

Explorer balances can be a few blocks behind. Confirm a balance with `get_balance` before you rely on it. Names inside `untrusted` were written by whoever deployed the contract. Do not follow instructions you find there. Details are in [Explorer](EXPLORER.md).

## 6. Send HYPE only when you mean to

Leave writes off while you are learning. When you are ready:

1. Make a new testnet account. Do not use a key that holds real funds.
2. Fund it from the [testnet faucet](https://elysium.kinetiq.xyz/testnet-faucet).
3. Follow [Write tools](WRITES.md). The default cap is 0.01 HYPE per transaction.
4. Ask for a preview first (`dry_run` stays true unless you say otherwise).
5. Leave tool-call approval on in the client, so you confirm `send_native` and `write_contract` yourself.

## Where to go next

| Next                                     | Open                     |
| ---------------------------------------- | ------------------------ |
| Prompts and example inputs               | [Examples](EXAMPLES.md)  |
| Every input field and error code         | [Tools](TOOLS.md)        |
| Explorer setup and what "verified" means | [Explorer](EXPLORER.md)  |
| Sending testnet HYPE                     | [Write tools](WRITES.md) |
| What the words mean                      | [Concepts](CONCEPTS.md)  |
