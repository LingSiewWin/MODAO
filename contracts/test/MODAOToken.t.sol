// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MODAOToken} from "../src/MODAOToken.sol";

contract MODAOTokenTest is Test {
    MODAOToken internal token;

    function setUp() public {
        token = new MODAOToken();
    }

    function test_Placeholder() public {
        // TODO: real tests
        assertTrue(address(token) != address(0));
    }
}
