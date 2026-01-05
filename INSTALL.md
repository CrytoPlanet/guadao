# 安装说明

## 前置要求

1. 安装 Foundry：https://book.getfoundry.sh/getting-started/installation

   Windows (PowerShell):
   ```powershell
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. 验证安装：
   ```bash
   forge --version
   ```

## 安装依赖

在项目根目录运行：

```bash
# 安装 OpenZeppelin Contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Forge Std 通常随 Foundry 自动安装，如果需要手动安装：
forge install foundry-rs/forge-std --no-commit
```

## 验证安装

```bash
# 编译合约
forge build

# 运行测试
forge test

# 格式化代码
forge fmt
```

