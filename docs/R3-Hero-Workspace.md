# CUI Agent R3 · Hero → Workspace

仅升级进入/返回镜头。基线3930ed97eaa643bab90baa185e2ce3f60c7ce90f；分支experiment/hero-workspace-r3。

## 行为

桌面进入900ms、返回600ms；移动端240ms轻淡入，reduced-motion立即切换。标题约前340ms退场；工作窗口在约432ms后显现。冻结背景轻推进至1.065再落定；同一个CUI节点进行位置和尺度迁移，旧姿态完全不可见后才换源，最终回到原导览姿态。原始素材、Hero文案和各页面终态不变。

Web Animations可取消；新的导航使旧完成回调失效。重复进入不重复pushState；动画中页面inert，仅跳过按钮可聚焦；完成后恢复目标入口。Esc/Back可中断。现有Dialog的Esc优先；没有Agent注入或模型调用。

## 文件范围

- cui-workspace-test.js：局部镜头、跳过、取消、焦点、重复请求协调。
- workspace-v6.js：只将角色换源与模式事件分开；路由/返回记录逻辑保持。
- hero-workspace-r3.css：只在running状态覆盖运动；idle布局沿用原CSS。
- index.html：一条CSS引用。
- validation/hero-workspace-r3.cjs：独立可复现测试。
- 本文：验收与回滚说明。

没有修改盘古/ContentLab/NoteGuard/能力/关于页文件，没有更换任何图片。原Agent实验、账本、测试成果不在本分支迁移；保留在各自分支，未删除。

## 实际验证

2026-10-13真实无头Chromium，页面视口1440×900、390×844、360×780。Playwright原生recordVideo保存原始连续WebM，25fps；MP4仅转码以便观看，无剪辑、补帧、插值或关键帧拼接。录屏是本地实验服务，不是Vercel线上Preview，也不是实体手机。没有部署。

174/174检查通过：正常进入、页面返回、键盘Enter、Esc、Back、跳过、动画中Esc/Back中断、reduced-motion及运行时切换、每尺寸20轮重复进入/返回、history去重、焦点、单CUI、单活跃UI、资源/JS异常、横向溢出、原图Dialog的Esc及项目返回。测试初次有3项误将空hash首页判失败；修正为识别空hash或#hero后重跑，再调整角色透明度时间轴后进行了最终重跑。

冻结基线与本分支在相同浏览器/字体环境下比较Hero标题、角色容器、三项目窗口、Dock终态矩形，三个尺寸均完全一致。它是几何检查，不等于逐像素视觉一致或用户视觉签收。

检查了桌面实际录屏抽帧与手机终态：标题先退出、窗口后显现、角色单节点换姿态；尚未取得用户视觉签收。没有用功能分数代替高级视觉评价。未测低端实体手机、Safari或60fps帧性能。

## 复现

在带Playwright与Chromium/FFmpeg的环境执行：

    CUI_CHROMIUM=/absolute/path/to/chromium CUI_R3_EVIDENCE=/absolute/output/path node validation/hero-workspace-r3.cjs

测试自建loopback HTTP服务，结束关闭。recordVideo需Playwright可用的FFmpeg。测试环境补充完整Noto CJK系统字体以避免环境缺字，未修改网站字体。没有网络模型请求或API Key。

## 交付与停止

视觉请优先看三尺寸continuous.mp4，其他日志、冻结对照截图、reduced-motion录屏辅助检查。镜头节奏与空间连续感待用户签收；盘古P3、NoteGuard D、Agent辨识度继续保留独立待办。

回滚只需停用本实验分支，在新工作树读取3930基线；若后续需局部撤销，在独立分支revert本R3提交。禁止force覆盖原实验分支、main或Production。本轮不合并、不正式发布、不开展其他场景。
