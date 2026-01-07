// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {GUAToken} from "../contracts/GUAToken.sol";

contract GUATokenTest is Test {
    GUAToken public token;
    GUAToken public tokenImpl;
    address public admin;
    address public minter;
    address public user1;
    address public user2;

    event Transfer(address indexed from, address indexed to, uint256 value);

    function setUp() public {
        admin = address(this);
        minter = address(0x100);
        user1 = address(0x1);
        user2 = address(0x2);

        // Deploy implementation
        tokenImpl = new GUAToken();

        // Deploy proxy
        bytes memory data = abi.encodeCall(GUAToken.initialize, (admin));
        ERC1967Proxy proxy = new ERC1967Proxy(address(tokenImpl), data);
        token = GUAToken(address(proxy));

        // Grant MINTER_ROLE to minter
        token.grantRole(token.MINTER_ROLE(), minter);
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

    // ============ AccessControl 角色测试 ============

    function test_AdminHasDefaultAdminRole() public view {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_MinterHasMinterRole() public view {
        assertTrue(token.hasRole(token.MINTER_ROLE(), minter));
    }

    function test_AdminCanGrantRole() public {
        address newMinter = address(0x200);
        token.grantRole(token.MINTER_ROLE(), newMinter);
        assertTrue(token.hasRole(token.MINTER_ROLE(), newMinter));
    }

    function test_AdminCanRevokeRole() public {
        token.revokeRole(token.MINTER_ROLE(), minter);
        assertFalse(token.hasRole(token.MINTER_ROLE(), minter));
    }

    // ============ Mint 功能测试 ============

    function test_MinterCanMint() public {
        uint256 amount = 1000 * 10 ** 18;
        vm.prank(minter);
        token.mint(user1, amount);

        assertEq(token.balanceOf(user1), amount);
        assertEq(token.totalSupply(), amount);
    }

    function test_NonMinterCannotMint() public {
        uint256 amount = 1000 * 10 ** 18;

        vm.prank(user1);
        vm.expectRevert();
        token.mint(user2, amount);

        assertEq(token.balanceOf(user2), 0);
        assertEq(token.totalSupply(), 0);
    }

    function test_AdminCannotMintWithoutMinterRole() public {
        uint256 amount = 1000 * 10 ** 18;

        // Admin does not have MINTER_ROLE by default
        vm.expectRevert();
        token.mint(user1, amount);
    }

    function test_MintMultipleTimes() public {
        uint256 amount1 = 1000 * 10 ** 18;
        uint256 amount2 = 500 * 10 ** 18;

        vm.prank(minter);
        token.mint(user1, amount1);

        vm.prank(minter);
        token.mint(user2, amount2);

        assertEq(token.balanceOf(user1), amount1);
        assertEq(token.balanceOf(user2), amount2);
        assertEq(token.totalSupply(), amount1 + amount2);
    }

    // ============ ERC-20 转账功能测试 ============

    function test_Transfer() public {
        uint256 amount = 1000 * 10 ** 18;
        vm.prank(minter);
        token.mint(user1, amount);

        vm.prank(user1);
        bool success = token.transfer(user2, amount);
        assertTrue(success);

        assertEq(token.balanceOf(user1), 0);
        assertEq(token.balanceOf(user2), amount);
    }

    function test_TransferInsufficientBalance() public {
        uint256 amount = 1000 * 10 ** 18;
        vm.prank(minter);
        token.mint(user1, amount);

        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, amount + 1);
    }

    // ============ ERC-20 授权和转账功能测试 ============

    function test_ApproveAndTransferFrom() public {
        uint256 amount = 1000 * 10 ** 18;
        uint256 approveAmount = 500 * 10 ** 18;
        vm.prank(minter);
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
        vm.prank(minter);
        token.mint(user1, amount);

        vm.prank(user1);
        token.approve(user2, approveAmount);

        vm.prank(user2);
        vm.expectRevert();
        token.transferFrom(user1, user2, approveAmount + 1);
    }

    // ============ 初始化测试 ============

    function test_CannotInitializeTwice() public {
        vm.expectRevert();
        token.initialize(user1);
    }

    function test_ImplementationCannotBeInitialized() public {
        vm.expectRevert();
        tokenImpl.initialize(user1);
    }

    // ============ 升级测试 ============

    function test_AdminCanUpgrade() public {
        GUAToken newImpl = new GUAToken();
        token.upgradeToAndCall(address(newImpl), "");
        // If no revert, upgrade succeeded
    }

    function test_NonAdminCannotUpgrade() public {
        GUAToken newImpl = new GUAToken();
        vm.prank(user1);
        vm.expectRevert();
        token.upgradeToAndCall(address(newImpl), "");
    }
}
