# 图七｜关于我 · 联系我

## 安全基线
- 基线：experiment/fig6-capability-lab-v2，0024dd86747281b32cc3606cc839f609148fe986。
- 该 HEAD 包含 experiment/fig4-content-archive-r12 和 experiment/cui-workspace-interaction-v1。
- main 为 d21ee6026c747e1f82315402ccce02c878758352，未修改、未合并。
- 当前远端没有独立图五实验分支。基线仍保留原 NoteGuard 展示；不能声称已纳入其他会话尚未提交的图五成果。
- 工作区施工前为空。图一至图六原有页面、素材、业务与 API 均未改动。

## 修改范围
- about-contact/index.html：独立终章页面、真实文本、三个联系入口、简历待补充说明。
- about-contact/scene.css：CSS 数字空间与响应式布局。
- about-contact/scene.js：独立人物路径配置、简历说明与焦点恢复。
- about-contact/README.md：本说明。
- workspace-v6.js：仅新增 7 行，关于我／联系我进入独立图七，返回恢复原入口焦点。

## 母版差异与素材缺口
- 母版：《关于我与星光联系.png》，2026-10-11，未作为网页背景铺满。
- 玻璃层、轨道、地面与人物承托平台均以 CSS 实现；未重画或虚构产品 UI。远景没有项目截图窗口，空间细节与母版不逐像素一致。
- 姓名左中、人物右下、联系入口横排；按要求减少强光、粒子及背景干扰。
- 缺少母版坐姿挥手 CUI 原始透明文件。复用已冻结 assets/workspace-v6/cui-guide.png，未抠图、未重画、未改脸；动作仍是导览，属于占位。可在 scene.js 的 assets.character 单独替换。
- 仓库 assets/workspace-v6/resume.pdf 明确标注 2026-08-14 存档，且内容与当前经历口径不一致，不作为最终简历提供。查看简历入口可点击，展示待补充说明，不能算作简历下载完成。
- 根目录 PDF 是作品集，不冒充简历。
- 邮箱 3104306958@qq.com 已与 resume.pdf 文本和原 workspace-v6.js 交叉核实。

## 真实浏览器检查
- 真实本地 Chromium 153，Playwright；deviceScaleFactor=1。
- Desktop 1440×900、Mobile 390×844；截图不缩放、不合成。
- 26 项检查通过：独立 HTML 姓名、无横向溢出、人物与联系入口不重叠；简历说明打开、Esc 关闭、恢复触发按钮焦点；Tab 到 GitHub／邮箱；GitHub 新窗口请求正确 URL；邮箱激活指向核实 mailto；返回 Workspace 可见并恢复原入口焦点；关于我及联系我入口均有效；prefers-reduced-motion 停止动画；无 JavaScript 异常。
- GitHub 外部页面加载未通过网络验收；邮件客户端是否启动不在浏览器环境内验证；未发送邮件。
- 移动端为基础布局，人物及页脚在首屏以下，可正常纵向滚动。
- 本地截图与功能检查不冒充 Vercel Preview 验收。Vercel API 部署列表返回团队授权 403，CLI 不可用，优先依靠 Git 集成自动预览。

## 本轮停止点
只完成图七和必要入口连接。无 main 合并，无 Production 发布，不开始其他章节施工。
