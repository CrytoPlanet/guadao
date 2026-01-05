## ADDED Requirements
### Requirement: 交付证明模板与哈希提示
dApp SHALL 在交付页面提供固定模板、nonce 生成与哈希提示，帮助用户生成可提交的交付证明。

#### Scenario: 生成交付模板
- **WHEN** 用户进入交付页面并输入必要字段
- **THEN** 页面展示 `GUA-DELIVER` 模板与自动生成的 nonce

#### Scenario: 提交前提示
- **WHEN** 用户准备提交交付证明
- **THEN** 页面提示将对链接、视频 ID 与置顶评论进行哈希后提交
