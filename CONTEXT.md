# CONTEXT — prot

Minecraft 1.8.9 减伤计算器，托管于 GitHub 仓库 `Sakyvo/prot`，域名 `prot.loc.cc`。

## 术语表

- **armor points（护甲值）**: 1.8.9 盔甲提供的护甲点，每点 = 4% 减伤，合计上限 20（80%）。材质 → 头/胸/腿/靴：皮革 1/3/2/1，金 2/5/3/1，锁链 2/5/4/1，铁 2/6/5/2，钻石 3/8/6/3。
- **protection level（保护等级）**: 每件装备输入的保护附魔等级。工具内允许任意整数（0–32767），含不占格（`none`）装备——见下方「假想模式」。游戏公式按 EPF 计算并封顶 20。
- **EPF**: 四件装备保护等级之和（保护类附魔每级 1 EPF），代入公式前封顶 20，每点 = 4% 减伤；全身保护 IV = EPF 16（64%），达不到 20。超过 20 时界面提示 `epf capped`（源码：`EntityLivingBase.applyPotionDamageCalculations` 中 `if (k > 20) k = 20;`）。
- **resistance level（抗性提升等级）**: 工具内限制 0–5。每级 = 20% 减伤；5 级 = 100%（承伤为 0）。
- **减伤比率 / damage reduction**: 1 − 承伤比率。总减伤 = `1 − (1−armor%) × (1−epf%) × (1−res%)`。
- **承伤比率 / damage taken ratio**: 伤害的通过比例，三段乘法 `(1−armor%) × (1−epf%) × (1−res%)`。
- **伤害值 / damage**: 输入与输出的单位是半颗心（half-hearts，游戏内 HP 数值）。
- **durability（耐久度）**: 仅展示信息量，不参与计算。材质 → 头/胸/腿/靴：皮革 55/80/75/65，金 77/112/105/91，锁链 165/240/225/195，铁 165/240/225/195，钻石 363/528/495/429。`none` 不显示。
- **假想模式 / hypothetical mode**: 「无」装备也允许选保护等级，且该等级计入 EPF——刻意偏离游戏语义（裸装部位无法附魔）。见 `.docs/adr/0001-enchant-on-empty-slot-counts.md`。
- **none**: 装备选项之一，空槽，贴图用资源包内 `empty_armor_slot_*`。

## 来源

- 公式与数值核验：MCP-919（1.8.9 decompiled）`net/minecraft/entity/EntityLivingBase.java`：计算顺序 armor → resistance → protection；EPF 封顶 20；抗性负伤害截断为 0。
- 贴图：仓库内 `!!!!Eum3 Blue Revamp` 资源包（`assets/minecraft/textures/items/`）。
- 字体：Minecraft AE（外部下载）。
