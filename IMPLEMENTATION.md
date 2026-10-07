# Codex 第一轮：工作现场

范围：Boot / Hero → Workspace → 盘古第一章。XHS、NoteGuard、About 不在本轮实现范围。

## 安全边界
从实验分支 `redesign/esther-workspace-phase1` 的 `54e9afe` 创建独立分支 `redesign/codex-10`。不提交 main，不合并，不部署 Production。保留旧实验文件作为内容记录，新入口不加载旧 CSS / JS。assets 及真实产品 UI 不作修改。

## 参考研究
- Esther `602c0abc367ee382464dd0a2f9b54527bc2e999d`：直接阅读 `HomePage.jsx`、`siteController.js`、`site.css`。研究 staged intro、入口按视口尺寸计算放大、独立 desktop surface、窗口激活层级、级联定位与指针操作。https://github.com/esthersjw/esther-website-1
- Aitezaz：阅读 `HomeScrollOrchestrator.tsx`，学习在交接时协调背景退场、缩放与 pointer-events。https://github.com/aitezazdev/Portfolio
- Ritik：阅读 `ProjectsSection.tsx`，研究图像规模随浏览节奏改变；本轮不采用重复项目墙。https://github.com/Ritiksh0h/portfolio_gen2
- Yassine：阅读 `components/magnet.tsx`，研究轻量指针位移与回弹；本轮只保留 8px 以内的产品空间视差，触屏及减少动效模式关闭。https://github.com/yass-gr/portfolio-2026

## 独立设计实现
不是 Mac 或终端复刻。Hero 的小空间就是之后展开的真实 DOM Workspace；Enter 放大同一空间，不用遮罩切换到长网页。工作台只有本轮可进入的盘古，关键判断作为空间里的纸条，后续项目仅留状态文字。

盘古使用同一个 image DOM 节点，从桌面入口迁移至全视口 camera，再退回原位置。冻结 UI 接管视野，镜头移动到六字段、实时预览、素材工具栏、全貌。手机是单列工作现场；相机单独计算构图，工具栏单独聚焦。没有重新绘制产品 UI，也没有将冻结截图冒充可操作产品。

工程采用原生 ES modules + Web Animations API：`app.js` 管空间状态，`pangu.js` 管章节/镜头，`motion.js` 管动效偏好，CSS 管不同设备布局。此轮无需引入 React/GSAP 运行时或打包依赖；静态 Vercel Preview 可直接部署。`node scripts/serve.mjs` 启动本地验证服务器。

可用操作：Enter 进入；点击走进产品；章节按钮 / 下一步 / 方向键 / 滚轮切换；手机横滑相机切换；Escape 返回。减少动效模式直接切换，背景使用 inert 隔离焦点。

## 素材边界
`assets/pangu-frozen-product.webp` 字节与实验分支一致，910×660。明确标为基于真实项目经历重构的脱敏原型。V5 数据保持在实验记录，未改写或实现 NoteGuard 后续章节。
