// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC internal usdc;

    function setUp() public {
        usdc = new MockUSDC();
    }

    function test_Decimals() public view {
        assertEq(usdc.decimals(), 6);
    }

    function test_PublicMint() public {
        address alice = address(0xA11CE);
        usdc.mint(alice, 1_000e6);
        assertEq(usdc.balanceOf(alice), 1_000e6);
        assertEq(usdc.totalSupply(), 1_000e6);
    }

    function test_Transfer() public {
        address alice = address(0xA11CE);
        address bob = address(0xB0B);
        usdc.mint(alice, 100e6);

        vm.prank(alice);
        usdc.transfer(bob, 40e6);

        assertEq(usdc.balanceOf(alice), 60e6);
        assertEq(usdc.balanceOf(bob), 40e6);
    }
}
