// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MODAOToken} from "../src/MODAOToken.sol";

contract MODAOTokenTest is Test {
    MODAOToken internal token;
    address internal treasury = address(0xBEEF);

    function setUp() public {
        token = new MODAOToken(treasury);
    }

    function test_Metadata() public view {
        assertEq(token.name(), "MODAO");
        assertEq(token.symbol(), "MODAO");
        assertEq(token.decimals(), 18);
    }

    function test_InitialSupplyMintedToRecipient() public view {
        assertEq(token.totalSupply(), 100_000_000e18);
        assertEq(token.balanceOf(treasury), 100_000_000e18);
    }

    function test_NoMintFunction() public {
        // Sanity: contract exposes no mint() — supply is fixed at construction.
        // Verified by absence in source; this test asserts supply doesn't drift on transfer.
        vm.prank(treasury);
        token.transfer(address(0xCAFE), 1e18);
        assertEq(token.totalSupply(), 100_000_000e18);
    }

    function test_Permit() public {
        uint256 ownerPk = 0xA11CE;
        address owner = vm.addr(ownerPk);
        address spender = address(0xB0B);
        uint256 value = 50e18;
        uint256 deadline = block.timestamp + 1 hours;

        vm.prank(treasury);
        token.transfer(owner, value);

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                spender,
                value,
                token.nonces(owner),
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, digest);

        token.permit(owner, spender, value, deadline, v, r, s);
        assertEq(token.allowance(owner, spender), value);
        assertEq(token.nonces(owner), 1);
    }
}
