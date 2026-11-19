# prot — 伤害/减伤计算器（Minecraft 1.8.9）

纯静态单页：`index.html` + 原生 js/css，无构建工具。托管 GitHub Pages（`Sakyvo/prot`，`prot.loc.cc`）。领域术语与数值事实源见 `CONTEXT.md`。

## 结构

- `js/calc.js` — 计算内核（UMD，浏览器 + node 双端）。护甲/耐久表、EPF 期望值、`compute()`、`applyDamage()`。
- `js/selftest.js` — 内核断言用例（node 与浏览器共用），期望值来自 `CONTEXT.md` / 1.8.9 反编译，绝不由实现反推。
- `js/ui.js` — DOM 挂载，无框架。
- `css/style.css` — 语义配色变量 + 布局。
- `tests/ui.test.html` — 浏览器 DOM 断言（桌面 / 移动两套）。
- `tools/test.sh` — 测试入口：node 内核断言 + headless Chrome（1200×900 / 420×760）两断点跑 `tests/ui.test.html`。

## 常用命令

```
tools/test.sh        # 全部测试；退出码非 0 即失败
```

依赖：node + Chrome（headless，无窗口、不干扰桌面）。`CHROME` 环境变量可覆盖浏览器路径。

## 约定

- 数值与公式的唯一事实源是 `CONTEXT.md`；改数值先改它。伤害输入口径同样以它为准：`weapon` = 未附魔加成，不是 tooltip 总值。
- 测试只走公开缝：`ProtCalc` 纯函数（`js/selftest.js`）与 `ProtUI.mount()` 产出的 DOM（`tests/ui.test.html`）。
- 单页无构建，改动后不需要打包；`index.html` 直接加载源码。勿引入打包器、框架或 `node_modules`。
- 文案全英文小写；配色只用 `css/style.css` 的语义变量——淡蓝底 + 近黑线框 + 六色（`--enchanted` 紫 / `--durability` 浅绿 / `--reduction` 深绿 / `--taken` 深红 / `--def` 深蓝 / `--dmg` 深红），不另引入其他饱和色。
- 字体只用本地 assets 中的 Minecraft AE Bold（源字型 `K:\PvP\MinecraftAE-Bold.ttf`，用 `tools/subset-font.sh` 重新生成子集）；贴图只从站点 assets 读取，运行时不引用资源包目录。
- `!!!!Eum3 Blue Revamp/` 是素材源，不入选址资源；站点只用资产副本。
- 每个 task 收尾后运行 `tools/test.sh` 全绿，再 `git push origin main`；本地不得积压未推送提交（GitHub Pages 直接发布）。

## 按需读取索引

- 涉及术语 / 数值 / 公式时，读 `CONTEXT.md`。
- 讨论设计或新需求时，读 `.docs/tasks/000-prot-calc-launch.md` 与 `.docs/adr/`。

## 优先级

1. 用户当前明确指令。2. 更近目录的 `AGENTS.md`。3. 本文件。4. 路由到的 `.docs/*.md`。