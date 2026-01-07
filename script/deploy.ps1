# 一键部署脚本 - 部署合约并自动更新前端配置 (Windows PowerShell)
# 用法: .\script\deploy.ps1 -Network <network>
# 示例: .\script\deploy.ps1 -Network sepolia

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("local", "anvil", "sepolia", "base-sepolia", "mainnet", "base")]
    [string]$Network
)

$ErrorActionPreference = "Stop"

# 网络配置
switch ($Network) {
    { $_ -in "local", "anvil" } {
        $ChainId = "31337"
        $RpcUrl = "http://localhost:8545"
        $VerifyFlag = ""
        Write-Host "🔧 部署到本地 Anvil..." -ForegroundColor Yellow
    }
    { $_ -in "sepolia", "base-sepolia" } {
        $ChainId = "84532"
        $RpcUrl = "https://sepolia.base.org"
        $VerifyFlag = "--verify"
        Write-Host "🔧 部署到 Base Sepolia 测试网..." -ForegroundColor Yellow
    }
    { $_ -in "mainnet", "base" } {
        $ChainId = "8453"
        $RpcUrl = "https://mainnet.base.org"
        $VerifyFlag = "--verify"
        Write-Host "⚠️  警告: 即将部署到 Base 主网!" -ForegroundColor Red
        $confirm = Read-Host "确认继续? (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-Host "已取消"
            exit 1
        }
    }
}

# 检查环境变量
if (-not $env:PRIVATE_KEY) {
    Write-Host "错误: 请设置 PRIVATE_KEY 环境变量" -ForegroundColor Red
    Write-Host '示例: $env:PRIVATE_KEY = "your-private-key"'
    exit 1
}

# 设置 forge 路径
$env:PATH = "$env:USERPROFILE\.foundry\bin;$env:PATH"

# 执行部署
Write-Host "📦 开始部署合约..." -ForegroundColor Yellow

$deployArgs = @(
    "script", "script/Deploy.s.sol:Deploy",
    "--rpc-url", $RpcUrl,
    "--broadcast"
)
if ($VerifyFlag) {
    $deployArgs += $VerifyFlag
}

$output = & forge @deployArgs 2>&1 | Out-String
Write-Host $output

# 从输出中提取地址
$guaToken = ($output | Select-String "GUAToken Proxy deployed at: (0x[a-fA-F0-9]+)").Matches.Groups[1].Value
$airdrop = ($output | Select-String "MerkleAirdrop Proxy deployed at: (0x[a-fA-F0-9]+)").Matches.Groups[1].Value
$escrow = ($output | Select-String "TopicBountyEscrow Proxy deployed at: (0x[a-fA-F0-9]+)").Matches.Groups[1].Value

if (-not $guaToken -or -not $airdrop -or -not $escrow) {
    Write-Host "无法从部署输出中提取合约地址" -ForegroundColor Red
    Write-Host "请手动运行: node script/update-config.js <chainId> <guaToken> <airdrop> <escrow>"
    exit 1
}

# 更新前端配置
Write-Host "📝 更新前端配置..." -ForegroundColor Yellow
node script/update-config.js $ChainId $guaToken $airdrop $escrow

Write-Host "✅ 部署完成!" -ForegroundColor Green
Write-Host ""
Write-Host "下一步:"
Write-Host "  1. git add dapp/config.json"
Write-Host "  2. git commit -m 'chore: update contract addresses for chainId $ChainId'"
Write-Host "  3. git push origin main"
Write-Host "  4. Vercel 将自动部署更新后的前端"
