// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Test} from "forge-std/Test.sol";
import {GUAToken} from "../contracts/GUAToken.sol";

contract GUATokenTest is Test {
    GUAToken public token;
    address public owner;
    address public user1;
    address public user2;

    event Transfer(address indexed from, address indexed to, uint256 value);

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);

        token = new GUAToken();
    }

    // ============ 基础功能测试 ============

    function test_TokenName() public view {
        assertEq(token.name(), "GUA Token");
    }

    function test_TokenSymbol() public view {
        assertEq(token.symbol(), "GUA");
    }

    function test_TokenDecimals() public view {
        assertEq(token.decimals(), 18);
    }

    // ============ 初始供应量测试 ============

    function test_InitialTotalSupplyIsZero() public view {
        assertEq(token.totalSupply(), 0);
    }

    // ============ Mint 功能测试 ============

    function test_OwnerCanMint() public {
        uint256 amount = 1000 * 10 ** 18;
        token.mint(user1, amount);

        assertEq(token.balanceOf(user1), amount);
        assertEq(token.totalSupply(), amount);
    }

    function test_NonOwnerCannotMint() public {
        uint256 amount = 1000 * 10 ** 18;

        vm.prank(user1);
        vm.expectRevert();
        token.mint(user2, amount);

        assertEq(token.balanceOf(user2), 0);
        assertEq(token.totalSupply(), 0);
    }

    function test_MintMultipleTimes() public {
        uint256 amount1 = 1000 * 10 ** 18;
        uint256 amount2 = 500 * 10 ** 18;

        token.mint(user1, amount1);
        token.mint(user2, amount2);

        assertEq(token.balanceOf(user1), amount1);
        assertEq(token.balanceOf(user2), amount2);
        assertEq(token.totalSupply(), amount1 + amount2);
    }

    // ============ ERC-20 转账功能测试 ============

    function test_Transfer() public {
        uint256 amount = 1000 * 10 ** 18;
        token.mint(user1, amount);

        vm.prank(user1);
        bool success = token.transfer(user2, amount);
        assertTrue(success);

        assertEq(token.balanceOf(user1), 0);
        assertEq(token.balanceOf(user2), amount);
    }

    function test_TransferInsufficientBalance() public {
        uint256 amount = 1000 * 10 ** 18;
        token.mint(user1, amount);

        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, amount + 1);
    }

    // ============ ERC-20 授权和转账功能测试 ============

    function test_ApproveAndTransferFrom() public {
        uint256 amount = 1000 * 10 ** 18;
        uint256 approveAmount = 500 * 10 ** 18;
        token.mint(user1, amount);

        vm.prank(user1);
        bool approveSuccess = token.approve(user2, approveAmount);
        assertTrue(approveSuccess);

        assertEq(token.allowance(user1, user2), approveAmount);

        vm.prank(user2);
        bool transferSuccess = token.transferFrom(user1, user2, approveAmount);
        assertTrue(transferSuccess);

        assertEq(token.balanceOf(user1), amount - approveAmount);
        assertEq(token.balanceOf(user2), approveAmount);
        assertEq(token.allowance(user1, user2), 0);
    }

    function test_TransferFromInsufficientAllowance() public {
        uint256 amount = 1000 * 10 ** 18;
        uint256 approveAmount = 500 * 10 ** 18;
        token.mint(user1, amount);

        vm.prank(user1);
        token.approve(user2, approveAmount);

        vm.prank(user2);
        vm.expectRevert();
        token.transferFrom(user1, user2, approveAmount + 1);
    }
}

