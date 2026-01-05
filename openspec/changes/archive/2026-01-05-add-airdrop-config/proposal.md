# Change: Airdrop 配置与静态 proofs.json

## Why

当前 dApp 需要手动输入合约地址并上传 proofs.json，门槛高且容易出错。通过配置文件与静态 proofs.json，可实现自动化加载与更顺滑的领取体验。

## What Changes

- 新增 `config.json`：按网络提供合约地址与 proofs.json 地址
- dApp 启动时读取 `config.json` 并自动配置
- 使用静态 `proofs.json`（CDN/静态目录）自动查询地址 proof

## Impact

- Affected specs: `airdrop-config`, `proofs-static`
- Affected code: `dapp/` 前端加载逻辑、文档
