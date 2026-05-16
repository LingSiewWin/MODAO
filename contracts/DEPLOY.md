# Deploy to Monad Testnet

## One-time setup

Import your deployer key into Foundry's encrypted keystore:

```bash
cast wallet import myWallet --interactive
```

Paste your private key when prompted, then set a password. The key is stored encrypted in `~/.foundry/keystores/myWallet` — no plaintext key on disk, no `.env` needed.

Fund the wallet with ≥ 10 MON on Monad testnet (faucet: https://faucet.monad.xyz).

## Deploy command

Get your wallet address (one-time):

```bash
cast wallet address --account myWallet
```

Run from `contracts/`, substituting the address into `--sender`:

```bash
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url monad_testnet \
    --account myWallet \
    --sender 0xYourWalletAddressHere \
    --broadcast \
    --verify \
    --verifier sourcify \
    --verifier-url https://sourcify-api-monad.blockvision.org \
    -vvv
```

`--sender` is required alongside `--account` so the script's `msg.sender` resolves to your wallet (otherwise Foundry's default sender triggers a safety check). Foundry prompts for the keystore password once.

## Output

Deployed addresses land in `broadcast/Deploy.s.sol/10143/run-latest.json` and are also logged via `console2` in the terminal.

## Re-verify a single contract (if `--verify` flakes)

```bash
forge verify-contract <ADDRESS> src/MODAOToken.sol:MODAOToken \
  --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org \
  --chain 10143
```

## Redeploy MODAOGovernor only

After changes to `MODAOGovernor.sol` you can redeploy *just the governor* against the existing token + oracle deployment. Agents stay registered; no need to re-run the full deploy.

Run from `contracts/`, with the same keystore and `--sender` as the original deploy:

```bash
forge script script/RedeployGovernor.s.sol:RedeployGovernorScript \
    --rpc-url monad_testnet \
    --account myWallet \
    --sender 0x37960C65118a5263fb880f105663Fd4f29aA15de \
    --broadcast \
    -vv
```

Notes:
- `--verify` is omitted because Monad testnet's etherscan-compatible endpoint flakes during broadcast lookups. Verify after deploy with `forge verify-contract` (snippet above).
- The script pins the existing `MODAOToken`, `MockUSDC`, and `AISwarmOracle` addresses internally. If those ever change, edit `script/RedeployGovernor.s.sol`.
- After it succeeds, update `deployments/monad-testnet.json` with the new governor address.

## Deploy the FutarchyMarketFactory (governance layer)

The futarchy stack is independent of the ICO governor — it can be deployed once and reused across every launched project. Run from `contracts/`:

```bash
forge script script/DeployFutarchy.s.sol:DeployFutarchyScript \
    --rpc-url monad_testnet \
    --account myWallet \
    --sender 0x37960C65118a5263fb880f105663Fd4f29aA15de \
    --broadcast \
    --verify \
    --verifier sourcify \
    --verifier-url https://sourcify-api-monad.blockvision.org \
    -vvv
```

After it succeeds:

1. Copy the `FutarchyMarketFactory:` address from the console output.
2. Paste it into `web/src/lib/contracts.ts` → `CONTRACTS.futarchyFactory`.
3. Add the entry to `deployments/monad-testnet.json` under `contracts`:

   ```json
   "FutarchyMarketFactory": "0x..."
   ```

Notes:
- The script pins `MockUSDC` internally. If USDC ever moves, edit `script/DeployFutarchy.s.sol`.
- Markets themselves are deployed on demand by `createProposal(...)` — no further deploys needed per market.
- If `--verify` flakes, run the verify snippet above against `src/FutarchyMarketFactory.sol:FutarchyMarketFactory`.
