// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title MODAOToken
/// @notice Fixed-supply governance and base-pair token for the MODAO futarchy platform.
/// @dev Entire supply minted at construction. No further mint path exists.
contract MODAOToken is ERC20, ERC20Permit {
    uint256 public constant INITIAL_SUPPLY = 100_000_000e18;

    constructor(address recipient) ERC20("MODAO", "MODAO") ERC20Permit("MODAO") {
        _mint(recipient, INITIAL_SUPPLY);
    }
}
