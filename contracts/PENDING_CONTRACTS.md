# Pending Contracts

Contracts that are in the v1 design but **not yet written or deployed**.
The governor's `finalize()` currently stops at flipping vault outcomes and emitting
`ProjectLaunched`. Everything below is what's missing between that event and a real,
tradeable, rug-resistant project launch.

Cross-reference: `PLAN.md` §"Resolved Decisions" (3–5) and §"executionPayload = Token Launch".

---

## Deployment status snapshot

| Contract | Source file | Deployed (monad-testnet) | Notes |
|---|---|---|---|
| `MODAOToken` | `src/MODAOToken.sol` | ✅ `0xb2De…8AFB` | Protocol token |
| `MockUSDC` | `src/MockUSDC.sol` | ✅ `0xF1c0…72F5` | Test quote token |
| `AISwarmOracle` | `src/AISwarmOracle.sol` | ✅ `0xAF15…E536` | 3-of-5 threshold |
| `MODAOGovernor` | `src/MODAOGovernor.sol` | ✅ `0x89aA…650F` | v2 (fundraise-corrected) |
| `ConditionalVault` | `src/ConditionalVault.sol` | factory — per proposal | Deployed by governor on market-open |
| `ConditionalToken` | `src/ConditionalToken.sol` | factory — per proposal | Deployed by vault constructor |
| `ProposalAMM` | `src/ProposalAMM.sol` | factory — per proposal | Two per proposal (pass + fail) |
| `ProjectToken` | `src/ProjectToken.sol` | factory — per proposal | Deployed by governor on market-open |
| **`LaunchFactory`** | ❌ not written | ❌ | Required to complete PASS finalize |
| **`ProjectTreasury`** | ❌ not written | ❌ | Holds raised USDC; rug-prevention |

---

## 1. `LaunchFactory`

### Purpose
Called from `MODAOGovernor.finalize()` on PASS. Converts the governor's
post-resolution holdings (conditional LP + remaining conditional tokens) into the
end-state every depositor and trader actually wants:

1. A **permanent, unconditional `PROJECT/USDC` AMM** so the new token is tradeable.
2. **Locked LP** so no one — including the protocol — can pull the rug.
3. A funded **`ProjectTreasury`** so the project can spend on operations under
   time-locked release (not an instant transfer to the proposer wallet).

### Flow (on PASS)

```
governor.finalize(pid)
  → projectVault.finalize(Pass)
  → usdcVault.finalize(Pass)
  → LaunchFactory.launch(pid):
       1. governor.passAmm.removeLiquidity(allShares)
          → returns pass_PROJECT + pass_USDC to governor
       2. governor still holds spec.supply/2 untouched pass_PROJECT from setup
       3. governor.projectVault.redeem(allPassProject) → real PROJECT
       4. governor.usdcVault.redeem(allPassUsdc)     → real USDC
       5. Split real USDC:
            LIQUIDITY_PCT (e.g. 20%) → seed unconditional AMM
            remainder                → ProjectTreasury
          Split real PROJECT:
            matching amount at TWAP price → seed unconditional AMM
            remainder                     → ProjectTreasury (vested)
       6. Deploy unconditional ProposalAMM(PROJECT, USDC)
       7. addLiquidity(...) — receive LP shares to LaunchFactory
       8. transfer LP shares to address(0xdead) — burn forever
       9. emit LaunchCompleted(pid, treasury, amm, lpBurned)
```

### Flow (on FAIL — separate cleanup, not LaunchFactory's job)
- Governor pulls LP from fail-side AMM, redeems via vault, slashes/burns
  proposer's MODAO bond, optional refund of unused USDC bond.
- No project token is launched.

### Constants to expose
```solidity
uint256 public constant LIQUIDITY_USDC_PCT = 20; // % of raised USDC into permanent LP
uint256 public constant LIQUIDITY_PROJECT_PCT = 30; // % of total supply into permanent LP
```
Both `% / 100` — final values pending judgment from team economics.

### Interface sketch
```solidity
interface ILaunchFactory {
    event LaunchCompleted(
        uint256 indexed proposalId,
        address projectToken,
        address treasury,
        address amm,
        uint256 lpBurned,
        uint256 raisedUsdc
    );

    function launch(
        uint256 proposalId,
        address projectToken,
        uint256 totalProjectAmount, // pass_PROJECT held by governor before redemption
        uint256 totalUsdcAmount,    // pass_USDC held by governor before redemption
        address proposer            // for treasury vest beneficiary
    ) external returns (address treasury, address amm);
}
```

### Open questions
- LP burn target: `address(0xdead)` vs. a `TimelockedLP` contract that can rotate
  fees to the treasury but never withdraw principal? Burn is simpler; timelock
  preserves fee capture.
- Should the governor or the LaunchFactory deploy the unconditional AMM?
  (Factory keeps governor lean.)

---

## 2. `ProjectTreasury`

### Purpose
Custody contract for raised USDC + remaining PROJECT for a single project.
Prevents rug by **denying the proposer instant access**. Funds release over
time on a linear vest, or — post-MVP — only via a futarchy vote of project
token holders (MetaDAO's eventual model).

### Hackathon design — linear vest
- Constructor stores `beneficiary` (the proposer), `cliff`, `duration`, and
  per-token balances received.
- `claim()` releases the linearly-vested portion since deployment, gated by
  `block.timestamp >= start + cliff`.
- No early-withdraw, no admin override. Period.

### Interface sketch
```solidity
contract ProjectTreasury {
    address public immutable beneficiary;
    uint256 public immutable start;
    uint256 public immutable cliff;
    uint256 public immutable duration;

    // Per-token vesting state
    mapping(address token => uint256) public deposited;
    mapping(address token => uint256) public claimed;

    constructor(address beneficiary_, uint256 cliff_, uint256 duration_);

    function deposit(address token, uint256 amount) external; // called by LaunchFactory
    function vested(address token) public view returns (uint256);
    function claimable(address token) public view returns (uint256);
    function claim(address token) external; // beneficiary-only
}
```

### Suggested parameters (configurable per project)
| Param | Default | Reason |
|---|---|---|
| `cliff` | 30 days | Stops immediate rug; lets early secondary trading establish a price |
| `duration` | 365 days | Aligns founder incentives with annual roadmap milestones |

### Post-MVP upgrade path
Replace `beneficiary`-gated `claim` with a per-project mini-governor that runs
its own futarchy market on every spend (mirrors MetaDAO post-launch DAOs).
The treasury interface stays the same; only the caller authorization changes.

---

## 3. Required changes to existing contracts

### `MODAOGovernor`
- Constructor: accept `LaunchFactory launchFactory_`.
- `finalize()` PASS branch: call `launchFactory.launch(...)` after vault finalize.
- `finalize()` FAIL branch: pull governor's LP from fail AMM, refund proposer USDC bond
  via fail-side redemption, slash MODAO bond to a sink address (burn or
  protocol treasury).
- `BOND_MODAO` accounting: track which proposals' bonds have been slashed vs. refunded.

### Storage additions in `Proposal`
```solidity
struct Proposal {
    // ...existing fields
    address treasury;    // ProjectTreasury (PASS only)
    address launchAmm;   // unconditional PROJECT/USDC AMM (PASS only)
}
```

### New events
```solidity
event LaunchExecuted(uint256 indexed proposalId, address treasury, address amm);
event BondSlashed(uint256 indexed proposalId, address proposer, uint256 amount);
event BondRefunded(uint256 indexed proposalId, address proposer, uint256 amount);
```

---

## 4. Test coverage to add

- `test_FullLifecyclePass_LaunchesTradeableToken`: after finalize, swap real USDC
  for real PROJECT on the unconditional AMM; assert non-zero output.
- `test_LpIsBurned`: LP balance at `address(0xdead)` matches mint receipt.
- `test_TreasuryVestSchedule`: warp through cliff and duration boundaries, assert
  `claimable()` math.
- `test_TreasuryRejectsEarlyClaim`: revert before cliff.
- `test_FailPath_SlashesBondAndRefundsUsdc`: proposer's MODAO bond is sunk;
  USDC fully recoverable via fail_USDC redemption.

---

## 5. Deployment order

1. Deploy `LaunchFactory` (parameter: governor address — circular dependency:
   use `setGovernor` initializer pattern, or two-phase deploy).
2. Redeploy `MODAOGovernor` with `launchFactory` in constructor.
3. Update `deployments/monad-testnet.json` with both addresses.
4. `ProjectTreasury` is **per-proposal** — deployed by `LaunchFactory` on PASS,
   addresses surfaced via the `LaunchExecuted` event for the indexer.

### Deploy script

Create `contracts/script/DeployLaunchStack.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AISwarmOracle} from "../src/AISwarmOracle.sol";
import {MODAOGovernor} from "../src/MODAOGovernor.sol";
import {LaunchFactory} from "../src/LaunchFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploys LaunchFactory + redeploys MODAOGovernor wired to it.
///         Token + oracle deployments remain pinned.
contract DeployLaunchStackScript is Script {
    address constant MODAO_TOKEN = 0xb2De502B643Fe5cC7781Fc8B18493a414DEe8AFB;
    address constant MOCK_USDC = 0xF1c0657Bb651D14a64a42Daa1381A4615D5e72F5;
    address constant AI_SWARM_ORACLE = 0xAF15A88b7d0CC75bb254662A1abf4d01491FE536;

    function run() external {
        vm.startBroadcast();

        // 1. Predict the next governor address so we can hand it to the factory.
        uint256 nonce = vm.getNonce(msg.sender);
        address predictedGovernor = vm.computeCreateAddress(msg.sender, nonce + 1);

        // 2. Deploy LaunchFactory pointing at the predicted governor.
        LaunchFactory factory = new LaunchFactory(
            IERC20(MOCK_USDC),
            predictedGovernor
        );

        // 3. Deploy governor (consumes the predicted nonce).
        MODAOGovernor governor = new MODAOGovernor(
            IERC20(MODAO_TOKEN),
            IERC20(MOCK_USDC),
            AISwarmOracle(AI_SWARM_ORACLE),
            factory
        );
        require(address(governor) == predictedGovernor, "address mismatch");

        vm.stopBroadcast();

        console2.log("LaunchFactory:", address(factory));
        console2.log("MODAOGovernor:", address(governor));
    }
}
```

### Deploy command

Run from `contracts/`:

```bash
forge script script/DeployLaunchStack.s.sol:DeployLaunchStackScript \
    --rpc-url monad_testnet \
    --account myWallet \
    --sender 0x37960C65118a5263fb880f105663Fd4f29aA15de \
    --broadcast \
    -vv
```

Then update `deployments/monad-testnet.json`:

```json
"contracts": {
  "MODAOToken": "0xb2De502B643Fe5cC7781Fc8B18493a414DEe8AFB",
  "MockUSDC": "0xF1c0657Bb651D14a64a42Daa1381A4615D5e72F5",
  "AISwarmOracle": "0xAF15A88b7d0CC75bb254662A1abf4d01491FE536",
  "LaunchFactory": "0x...new...",
  "MODAOGovernor": "0x...new...",
  "MODAOGovernor_v2_deprecated": "0x89aA2ac89A69603ED0691aC1d1C73eebE8EC650F"
}
```

### Verify after deploy (optional, etherscan endpoint flakes during broadcast)

```bash
forge verify-contract <LAUNCH_FACTORY_ADDR> src/LaunchFactory.sol:LaunchFactory \
  --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org \
  --chain 10143

forge verify-contract <GOVERNOR_ADDR> src/MODAOGovernor.sol:MODAOGovernor \
  --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org \
  --chain 10143
```

### Frontend wire-up after redeploy

- `web/src/lib/contracts.ts` — replace `MODAO_GOVERNOR` address, add `LAUNCH_FACTORY`.
- Regenerate ABIs: `forge inspect MODAOGovernor abi > web/src/abi/MODAOGovernor.json`
  and same for `LaunchFactory` and `ProjectTreasury`.
- Add a `useProjectTreasury(treasuryAddr)` hook for the post-launch treasury panel.

---

## Rough sizing

| Contract | LOC est. | Complexity |
|---|---|---|
| `ProjectTreasury` | ~60 | Trivial — linear vest |
| `LaunchFactory` | ~120 | Moderate — touches AMM, vault, treasury |
| `MODAOGovernor` diff | ~80 | Adds PASS/FAIL cleanup paths |
| Tests | ~200 | Extends `EndToEnd.t.sol` |

Total: ~460 LOC. ~1 focused session.
