# R4-C NoteGuard Review Trace

父提交：50ef52bd8ddf865ae7761a3de2aebf47ef4b01e1。独立分支 experiment/noteguard-workflow-r4c。

复用 noteguard-case 的四幕、单控制器、阅读器、阶段键盘和返回语义。未改公共导航、Hero、盘古、其他页面、素材、Agent 或部署配置。

## 真实证据与边界

|阶段|真实素材|可证明的内容|
|---|---|---|
|A|NoteGuard_A_审核原文_原像素裁切.png；NoteGuard_A_风险解释_原像素裁切.png|原文风险定位、风险说明；AI不直接覆盖原文|
|B|b-draft.png / ng-release-draft.jpg|独立候选建议稿|
|C|c-edit.png、c-reject.png、c-adopt.png|编辑确认弹窗、拒绝记录、采用稿记录|
|D|d-final.png、d-result.png|最终采用稿与复检记录；不是绝对合规保证|

c-adopt.png 来自 ng-release-edit-adopted.jpg，不能证明独立“直接采用”执行。界面明确标记独立执行截图待补。C的按钮仅选择历史证据；D是采用分支的已有记录，与C选择无实时执行联动。各幕是不同真实截图，不声称同一录制会话。未调用审核、采纳或模型API。

## 运动与稳定性

桌面统一工作台 left330/top224/1044×550，四幕同背景和标题位置。300ms局部证据交接，金线位于单独轨迹栏；不穿越说明。手机180ms、纵向完整阅读、四阶段触控入口；CUI仅CSS显示80×97，图片字节不变。reduced-motion直接终态。没有滚轮劫持或盘古缩放镜头。

过渡代理只复制退出证据面板，inert、aria-hidden、无ID、按钮禁用、不可交互；单活动真实面板、单CUI。世代计数和清理处理重复操作、取消、pagehide；保留history.state，replaceState不增加阶段历史。阅读器关闭只在焦点仍留于关闭弹窗或body时恢复，避免延迟close抢走阶段按钮焦点。

## 验证

真实Chromium151、Playwright；1440×900、390×844、360×780。NoteGuard211/211；关键帧144/144；盘古保护108/108；Hero保护174/174：共637/637。素材哈希17/17一致。

记录进入、A→B→C→D、D→B、三种证据选择、原图及关闭、返回、Esc/Back、快速操作、键盘、焦点、移动触控、reduced-motion、资源和异常。连续录像为原生Chromium WebM；关键过渡PNG为真实WAAPI时钟暂停截图，不是设计稿或连续录像抽帧。验证在私有本地环境，不是线上Preview或实体手机测试。

复现：NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules；使用 validation/noteguard-workflow-r4c.cjs 和 validation/noteguard-trace-frames.cjs，脚本头部列明环境变量。旧版目录为父提交只读快照。

## 残留与回滚

P0：未发现。P1：真实运动仍待总控视觉签收，自动化不替代视觉验收。P2：独立直接采用执行截图缺失、临时CUI像素提取素材、原图分辨率边界；实体手机、Safari、线上性能未验证。

回滚：独立实验分支恢复父提交或撤销本轮提交；不改main、不回写父实验分支。未部署、未合并、未启动R5。
