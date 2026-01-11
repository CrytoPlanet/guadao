// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {GUAToken} from "../contracts/GUAToken.sol";
import {GUATokenV2} from "../contracts/GUATokenV2.sol";

/**
 * @title GUATokenV2Test
 * @dev 测试 GUAToken V2 升级和 ERC20Votes 功能
 */
contract GUATokenV2Test is Test {
    GUAToken public tokenV1;
    GUATokenV2 public tokenV2;
    address public proxy;

    address public admin = address(1);
    address public alice = address(2);
    address public bob = address(3);

    uint256 constant INITIAL_MINT = 1000 ether;

    function setUp() public {
        // 1. 部署 V1 实现
        GUAToken v1Impl = new GUAToken();

        // 2. 部署代理
        bytes memory initData = abi.encodeCall(GUAToken.initialize, (admin));
        ERC1967Proxy proxyContract = new ERC1967Proxy(address(v1Impl), initData);
        proxy = address(proxyContract);
        tokenV1 = GUAToken(proxy);

        // 3. 授予 admin MINTER_ROLE 并铸造一些代币
        vm.startPrank(admin);
        tokenV1.grantRole(keccak256("MINTER_ROLE"), admin);
        tokenV1.mint(alice, INITIAL_MINT);
        tokenV1.mint(bob, INITIAL_MINT);
        vm.stopPrank();
    }

    // ============ 升级测试 ============

    function test_UpgradeToV2() public {
        // 升级前余额
        uint256 aliceBalanceBefore = tokenV1.balanceOf(alice);
        uint256 bobBalanceBefore = tokenV1.balanceOf(bob);

        // 执行升级
        vm.startPrank(admin);
        GUATokenV2 v2Impl = new GUATokenV2();
        bytes memory initData = abi.encodeCall(GUATokenV2.initializeV2, ());
        tokenV1.upgradeToAndCall(address(v2Impl), initData);
        vm.stopPrank();

        // 使用 V2 接口
        tokenV2 = GUATokenV2(proxy);

        // 验证余额不变
        assertEq(tokenV2.balanceOf(alice), aliceBalanceBefore, "Alice balance should be preserved");
        assertEq(tokenV2.balanceOf(bob), bobBalanceBefore, "Bob balance should be preserved");
    }

    function test_UpgradePreservesTotalSupply() public {
        uint256 totalSupplyBefore = tokenV1.totalSupply();

        // 执行升级
        vm.startPrank(admin);
        GUATokenV2 v2Impl = new GUATokenV2();
        bytes memory initData = abi.encodeCall(GUATokenV2.initializeV2, ());
        tokenV1.upgradeToAndCall(address(v2Impl), initData);
        vm.stopPrank();

        tokenV2 = GUATokenV2(proxy);
        assertEq(tokenV2.totalSupply(), totalSupplyBefore, "Total supply should be preserved");
    }

    // ============ ERC20Votes 测试 ============

    function test_DelegateToSelf() public {
        _upgradeToV2();

        // 委托前投票权为 0
        assertEq(tokenV2.getVotes(alice), 0, "Votes should be 0 before delegation");

        // Alice 委托给自己
        vm.prank(alice);
        tokenV2.delegate(alice);

        // 委托后投票权等于余额
        assertEq(tokenV2.getVotes(alice), INITIAL_MINT, "Votes should equal balance after self-delegation");
    }

    function test_DelegateToOther() public {
        _upgradeToV2();

        // Alice 委托给 Bob
        vm.prank(alice);
        tokenV2.delegate(bob);

        // Alice 投票权为 0，Bob 获得 Alice 的投票权
        assertEq(tokenV2.getVotes(alice), 0, "Alice votes should be 0");
        assertEq(tokenV2.getVotes(bob), INITIAL_MINT, "Bob should have Alice's voting power");
    }

    function test_VotingPowerUpdatesOnTransfer() public {
        _upgradeToV2();

        // Alice 和 Bob 都委托给自己
        vm.prank(alice);
        tokenV2.delegate(alice);
        vm.prank(bob);
        tokenV2.delegate(bob);

        // 转账前
        assertEq(tokenV2.getVotes(alice), INITIAL_MINT);
        assertEq(tokenV2.getVotes(bob), INITIAL_MINT);

        // Alice 转账 500 给 Bob
        vm.prank(alice);
        tokenV2.transfer(bob, 500 ether);

        // 转账后投票权更新
        assertEq(tokenV2.getVotes(alice), 500 ether, "Alice votes should decrease");
        assertEq(tokenV2.getVotes(bob), 1500 ether, "Bob votes should increase");
    }

    function test_GetPastVotes() public {
        _upgradeToV2();

        // Alice 委托给自己
        vm.prank(alice);
        tokenV2.delegate(alice);

        // 记录当前区块
        uint256 blockNumber = block.number;

        // 前进一个区块
        vm.roll(blockNumber + 1);

        // 获取历史投票权
        assertEq(tokenV2.getPastVotes(alice, blockNumber), INITIAL_MINT, "Past votes should reflect delegation");
    }

    function test_MintAfterUpgrade() public {
        _upgradeToV2();

        // Admin 铸造新代币
        vm.prank(admin);
        tokenV2.mint(alice, 500 ether);

        assertEq(tokenV2.balanceOf(alice), INITIAL_MINT + 500 ether);
    }

    function test_NonAdminCannotUpgrade() public {
        GUATokenV2 v2Impl = new GUATokenV2();
        bytes memory initData = abi.encodeCall(GUATokenV2.initializeV2, ());

        // 非管理员尝试升级应该失败
        vm.prank(alice);
        vm.expectRevert();
        tokenV1.upgradeToAndCall(address(v2Impl), initData);
    }

    // ============ Helper ============

    function _upgradeToV2() internal {
        vm.startPrank(admin);
        GUATokenV2 v2Impl = new GUATokenV2();
        bytes memory initData = abi.encodeCall(GUATokenV2.initializeV2, ());
        tokenV1.upgradeToAndCall(address(v2Impl), initData);
        vm.stopPrank();

        tokenV2 = GUATokenV2(proxy);
    }
}
