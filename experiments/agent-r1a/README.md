# CUI R1-A：独立 mock 技术骨架

基线：experiment/integration-r1 @ 3930ed97eaa643bab90baa185e2ce3f60c7ce90f。

全部实现位于本目录。七页及其素材没有导入实验模块，根目录没有新增 api/、package.json、vercel.json 或部署工作流。

这不是可用的真实 Agent：输入不会按关键词推断意图；界面明确选择 mock 场景。没有模型请求、API Key、语音、高级镜头或最终角色视觉。测试结果不能用于计算模型事实准确率。

## 本地运行

需要 Node.js 22+，应用本身没有第三方依赖。

```bash
node experiments/agent-r1a/server.mjs
```

访问 http://127.0.0.1:4177/experiments/agent-r1a/ 。服务器仅绑定 loopback。停止服务器即关闭实验后端；原站文件不受影响。

源界面在 public/index.html；不能直接用 file:// 打开来验证后端。静态托管本目录不会自动生成模型后端；没有本地 bootstrap 时，对话按钮保持关闭。没有部署 Vercel Functions。

## 实现

- knowledge/candidates.json：26张候选卡；16张沿用用户已验收冻结页面中的公开身份、机制和界面行为；10张业务口径/时间/发布材料待逐卡确认，不能检索。
- knowledge/approval-ledger.json：批准内容及source映射摘要；未经批准修改不加载。摘要用于防止未经审批的数据漂移，不是密码学签名，也不能抵抗服务器文件和ledger同时被有权限的人篡改。
- core.mjs：检索、source校验、工具调用记录、页面白名单、导航提案与单次决策。
- adapters/：统一run接口、显式mock场景、取消/截止包装。real模式未授权会拒绝启动；替换适配器通过依赖注入契约验证，未实现真实模型。
- server.mjs：本地HTTP端点、会话/CSRF、单并发、重复请求、防泄露错误、导航决策。没有生产级分布式限额；Map仅用于本地测试。
- public/interaction-compat.js：顶层Dialog、Esc、关闭和焦点协调夹具，未注入七页。
- tests/：实际程序与三尺寸Chromium测试；见CONTRACT.md。

## 复现

```bash
R1A_EVIDENCE_DIR=/absolute/evidence node experiments/agent-r1a/tests/contracts.mjs
R1A_EVIDENCE_DIR=/absolute/evidence node experiments/agent-r1a/tests/http.mjs
NODE_PATH=/path/to/node_modules CUI_CHROMIUM=/path/to/chromium R1A_EVIDENCE_DIR=/absolute/evidence node experiments/agent-r1a/tests/browser.cjs
```

Playwright为测试依赖，不是网站运行依赖。当前测试环境使用已安装Playwright和恢复后的Chromium。浏览器测试启动独立4188端口，HTTP测试启动4189端口，完成后自行关闭；截图deviceScaleFactor=1。

未配置正式Secrets或真实API，也未新增发布工作流。远端保存实验分支可能触发现有平台自动构建，但没有创建可在线使用的实验后端；不将自动构建视为本轮部署验收或可用Agent发布。

## 回滚

本轮只新增此目录。关闭本地进程即可回滚运行状态；七页不需要改动。需要撤销代码时，下一轮仅在此独立分支revert实验提交，不合并main，不删除已有分支，不更改Production。R1-A完成后必须等待R1-B真实API授权。
