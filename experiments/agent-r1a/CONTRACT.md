# R1-A 接口契约与限制

## 适配器

`{id: string, run(context, tools, AbortSignal): Promise<Reply>}`。

context包含受校验的user/assistant消息、requestId与显式fixtureId。mock完全忽略问题内容的语义，只执行用户选择的固定测试场景；这正是测试夹具，不冒充意图理解。未来真实适配器可以接收同样的消息并选择同样的工具，必须删除/忽略测试fixture对语义的控制。

Reply是`{blocks, unknown, navigation}`。R1-A只接受事实块`{factId,text,sourceId}`：文本必须与批准卡完全一致，且该卡实际由本轮工具检索过。未知回复没有事实块和导航。自由解释、推断及模型改写本轮不开放；R1-B若需要新增回答类型，必须另行设计评测，不能绕开当前校验。

伪造事实、source、HTML、导航和未检索的工具结果均拒绝；错误不回显适配器原始异常。runAdapter即使面对不响应AbortSignal的适配器也会截止；关闭请求后工具不再可用。实际上游计算是否真正取消仍待真实模型验证。

## 工具

`get_project_evidence({projectId,topic})`：枚举参数，不接受用户自定路径/来源/指令。只返回approved卡，包含version、factId、text、sourceId、kind、unknown。结果深度冻结。每回合最多2次读取。

`propose_navigation({pageId,stage,reason,evidenceIds})`：只生成提议，没有destination或执行能力。pageId仅hero/workspace/pangu/contentlab/noteguard/capability/about。stage只允许NoteGuard的a/b/c/d；证据来源与项目关联。每回合最多1个提议。

服务器确认回包才给出固定destination；目标不能来自模型URL。模型工具没有调用确认端点的能力。

## 本地HTTP

- GET `/__r1a__/bootstrap`：HttpOnly、SameSite=Strict会话cookie；返回CSRF、mock-only模式、知识版本和批准数量。仅本地非TLS测试，Cookie没有Secure；未来线上必须HTTPS与Secure。
- POST `/__r1a__/chat`：requestId、messages、fixtureId、csrf。Origin严格匹配本地服务；最多12条user/assistant消息、每条1000字符/总6000字符，不接受system/tool/额外工具结果。单会话同时1请求。
- POST `/__r1a__/cancel`：requestId、csrf。取消未完成请求，并使该请求仍待确认的提议失效。
- POST `/__r1a__/navigation`：proposalId、confirm/reject、csrf。提议绑定会话，默认60秒过期；一次有效确认可导航，拒绝/过期/取消/重复均不执行。

同requestId同payload在完成后返回缓存、同一提议，不再跑适配器；运行中的重复返回409，异内容复用同ID返回409。另一并发请求429。每本地会话最多30个请求；此Map不代表生产分布式限额。

用户界面只在可信click事件中请求确认，立即禁用按钮，验证destination后执行一次。服务器接口本身不能证明点击者是人类；CSRF/Origin不是完整防机器人方案。R1-A证明模型没有任意执行工具，不宣称线上公共匿名服务已防滥用。

## 状态协调夹具

createInteractionCoordinator提供open/close/beforeNavigation/dispose。已有其他dialog时open拒绝；Agent打开时Esc仅关闭Agent，宿主返回监听不执行；关闭恢复原invoker或可见fallback，保留滚动。Reader由其自身原生Esc关闭。

该模块只在独立技术页中验证。图四/图五/图六真实监听顺序的整站注入兼容性尚未验证；后续接入前必须在独立集成分支再回归，不能把夹具通过称为七页Agent已接入。

## 本轮证明与未证明

已证明：实际程序可过滤pending卡、校验source与事实、拒绝恶意工具输出、控制一次导航提案/确认、处理取消/超时/重复，三尺寸原型可操作。

未证明：模型意图判断、检索召回、回答准确率、提示词注入抵抗、真实API兼容/延迟/费用/取消、持久上下文、线上部署、全站Agent兼容、语音、公共预算控制。这些都不计入R1-A成功指标。
