// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title ProjectToken
/// @notice ERC20 deployed per-proposal by the governor at market-open time.
///         Name, symbol, and supply come from the proposer's ProjectSpec.
///         Entire supply is minted to the deployer (the governor), which then
///         deposits it into the conditional vault. Post-PASS resolution, the
///         tokens flow to depositors via the redeem mechanism.
/// @dev    Fixed supply, no further mint path. Decimals fixed at 18.
contract ProjectToken is ERC20 {
    constructor(string memory name_, string memory symbol_, uint256 supply, address recipient)
        ERC20(name_, symbol_)
    {
        _mint(recipient, supply);
    }
}
