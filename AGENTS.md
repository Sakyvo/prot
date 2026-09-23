## 项目定位

prot：Minecraft 1.8.9 减伤计算器（盔甲 + 保护附魔 + 抗性提升 → 减伤/承伤比率），纯静态单页，托管 GitHub Pages（仓库 `Sakyvo/prot`，域名 `prot.loc.cc`）。领域术语与数值事实源见 `CONTEXT.md`。

## 常驻法则

- 纯静态零构建：`index.html` + 原生 js/css，不引入构建工具与框架。
- 公式、护甲/耐久数值一律以 `CONTEXT.md` 为唯一事实源，改数值先改 `CONTEXT.md`。
- 全英文、全小写文案；视觉只准米白底 + 黑线框，无红黄蓝等彩色点缀。
- 字体只用本地 assets 中的 Minecraft AE Bold(源字型 `K:\PvP\MinecraftAE-Bold.ttf`,用 `tools/subset-font.sh` 重新生成子集);贴图只从站点 assets 读取,运行时不引用资源包目录。
- `!!!!Eum3 Blue Revamp/` 是素材源不入选址资源；站点只用资产副本。

## 按需读取索引

- 涉及术语 / 数值 / 公式时，读 `CONTEXT.md`。
- 讨论设计或新需求时，读 `.docs/tasks/000-prot-calc-launch.md` 与 `.docs/adr/`。

## 优先级

1. 用户当前明确指令。2. 更近目录的 `AGENTS.md`。3. 本文件。4. 路由到的 `.docs/*.md`。
