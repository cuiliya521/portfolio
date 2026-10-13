# R4-A 盘古入口展开实验

基线：f847e50533e77fd8fd3dea2f2d1d690d2d220a81。仅Workspace与盘古之间，实验分支experiment/pangu-expand-r4a。

桌面620ms、手机220ms；reduced-motion零动画。以入口卡实际屏幕矩形作为FLIP起点，动画现有.pangu-r1-window证据figure，等比缩放保持真实截图比例。不是在线产品或共享源图片的完全同节点迁移：入口缩略图与项目原图是既有不同图片，本实验共享几何/窗口关系，不虚构产品操作。返回figure收合到卡片；目标卡片在过程中隐藏，结束才恢复。现有单角色节点移动，换源仅在不可见期执行；移动端保持原位退场、不可见定位后显现。

两边inert，Skip单一可操作；场景标题与旧Workspace内容错开。Esc、Back、重复请求沿用R3状态机与取消票据。阅读器仍是原native Dialog，Esc先关阅读器。动画完成恢复scene-back或open-test-pangu焦点；浏览器历史沿用既有深度。初始直达盘古不动画。

验证：真实本地Chromium三个指定视口、旧新连续录屏、原174回归及新增90项。原测试增加盘古返回settled等待，因现为真实动画不能期待同步完成。不得把功能检查当视觉验收。未经批准不部署、不合并、不推广其他项目。

灰白录屏开头：Playwright录制器使用pad=宽:高:0:0:gray，初始小尺寸浏览器表面得到灰填充；网站没有该占位组件。页面首绘仍有真实加载等待，本次记录Paint Timing与图片解码，不能声称线上性能已通过。原始录屏保留开头，不剪掉掩盖。

复现：安装Playwright及Chromium/FFmpeg，设置CUI_CHROMIUM、CUI_R4_OLD_ROOT为基线只读目录，CUI_R4_EVIDENCE为输出目录，运行node validation/pangu-expand-r4a.cjs；原回归node validation/hero-workspace-r3.cjs。只创建loopback服务，结束关闭。测试需要完整中文系统字体。

回滚：保留R3分支不动，在新的实验分支revert此实验提交或基于f847重新开工作树。禁止强推旧分支或改main。剩余视觉：背景透视切换、角色姿态淡出与原缩略图到完整截图内容差异仍需总控看视频签收；手机缩略证据文字小，沿用原图阅读器。低端实体手机/Safari/60fps与线上首绘未验证。
