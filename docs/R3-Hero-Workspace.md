# CUI Agent R3 · Hero → Workspace

仅升级进入/返回镜头。基线3930ed97eaa643bab90baa185e2ce3f60c7ce90f；分支experiment/hero-workspace-r3。

## 行为

桌面进入900ms、返回600ms；移动端240ms轻淡入，reduced-motion立即切换。标题180ms保留H1层级，240ms退出并由盘古窗口承接。盘古240ms、内容卡280ms、NoteGuard340ms、辅助入口400ms、Dock480ms开始不同节奏的显现。580ms各层透明度分别为0.94/0.82/0.68/0.55/0.38。冻结背景轻推进至1.065再落定；同一个CUI节点进行位置和尺度迁移，桌面580ms途经H2角色位置(-5,268)、宽348；不可见换姿态窗口缩短为18ms。移动端在原位置退场，86.4–103.2ms不可见，88.8ms移动同一节点，随后右上显现。最终回到原导览姿态。原始素材、Hero文案和各页面终态不变。

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

## R3 局部补丁复验

原174项与新增65项，共239/239通过。新增真实分层、H2几何、移动端不可见迁移、48次实际鼠标Skip及取消完成事件验证。旧版与补丁版均录制三尺寸原生连续视频；未部署。

前次Skip超时已复现：history.back尚未执行popstate时测试误认旧idle完成，之后错过短暂按钮。修正目标模式等待及实际鼠标点击，并要求settled(reason=skip)回执，不增加等待超时。

300/420/580/760ms PNG是实际Chromium动画时钟暂停定点采样，不是连续视频抽帧；手机240ms结束，300ms之后为终态。连续视频单独用于动态视觉验收。25fps录屏不能证明60fps性能。无已确认功能P0/P1；空间连续感、18ms换姿态及低端设备性能仍待视觉/设备验收。

本补丁只改控制器、运行态CSS、两份验证脚本和本文。workspace-v6.js、index.html及七页内容/冻结素材均未再修改。复现补充检查：CUI_CHROMIUM=/absolute/chromium CUI_R3_PATCH_EVIDENCE=/absolute/output node validation/hero-workspace-r3-patch.cjs。局部回滚可在另一个实验分支revert本补丁；旧检查点d187a0579a3767d4c98f553da0da4d7e271b13be保持可读，不重写分支。
