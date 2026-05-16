// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {FutarchyMarket} from "./FutarchyMarket.sol";

/// @title FutarchyMarketFactory
/// @notice Permissionless factory for governance markets on launched MODAO project
///         tokens. Anyone can spin up a market — discovery happens via UI surfacing
///         markets only on actually-launched projects. The contract itself doesn't
///         gate by project provenance.
///
///         Markets are indexed two ways:
///           1. global incrementing marketId
///           2. per-projectToken list, so a project page can show its own proposals
contract FutarchyMarketFactory {
    error InvalidWindow();
    error EmptyDescription();

    event MarketCreated(
        uint256 indexed marketId,
        address indexed market,
        address indexed projectToken,
        address proposer,
        string description,
        uint256 tradingEndsAt
    );

    IERC20 public immutable usdc;

    uint256 public marketCount;
    mapping(uint256 => address) public marketsByGlobalId;
    mapping(address => uint256[]) private _marketsByProject;

    uint256 public minTradingWindow = 1 hours;
    uint256 public maxTradingWindow = 30 days;

    constructor(IERC20 usdc_) {
        usdc = usdc_;
    }

    function createProposal(IERC20 projectToken, string calldata description, uint256 tradingWindow)
        external
        returns (uint256 marketId, address marketAddr)
    {
        if (bytes(description).length == 0) revert EmptyDescription();
        if (tradingWindow < minTradingWindow || tradingWindow > maxTradingWindow) revert InvalidWindow();

        marketId = ++marketCount;
        FutarchyMarket market =
            new FutarchyMarket(projectToken, usdc, msg.sender, marketId, description, tradingWindow);
        marketAddr = address(market);

        marketsByGlobalId[marketId] = marketAddr;
        _marketsByProject[address(projectToken)].push(marketId);

        emit MarketCreated(
            marketId, marketAddr, address(projectToken), msg.sender, description, block.timestamp + tradingWindow
        );
    }

    function marketsByProject(address projectToken) external view returns (uint256[] memory) {
        return _marketsByProject[projectToken];
    }

    function marketsByProjectCount(address projectToken) external view returns (uint256) {
        return _marketsByProject[projectToken].length;
    }
}
