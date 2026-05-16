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
