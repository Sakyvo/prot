# CONTEXT — prot

## 介绍

面向 Minecraft Java 1.8.9 玩家与数值调试者的伤害 / 减伤计算器，托管于 GitHub 仓库 `Sakyvo/prot`，域名 `prot.loc.cc`。将一次近战攻击的武器、附魔、药水效果与目标的护甲、保护、抗性串联；保护随机量以期望值呈现，也接受手动伤害与假想配置。

## 术语表

- **armor points（护甲值）**: 1.8.9 盔甲提供的护甲点，每点 = 4% 减伤，合计上限 20（80%）。材质 → 头/胸/腿/靴：皮革 1/3/2/1，金 2/5/3/1，锁链 2/5/4/1，铁 2/6/5/2，钻石 3/8/6/3。
- **protection level(保护等级)**: 每件装备输入的保护附魔等级。工具内允许任意整数(0–32767),含不占格(`none`)装备——见下方「假想模式」。等级按下方 EPF 公式换算,四件求和,再经 25/20 双封顶与随机 roll。
- **EPF(保护附魔因子)**: 源码口径(1.8.9)分四步:
  1. 每件 `floor((6 + 等级²) / 3 × 0.75)`(`EnchantmentProtection.calcModifierDamage`,通用保护类型 0);等级 0 → 0,等级 1/2/3/4 → 1/2/3/5。
  2. 四件求和后预封顶 25:`if (m > 25) m = 25;`(`EnchantmentHelper.getEnchantmentModifierDamage`)。
  3. 随机 roll:修正量在 `[ceil(m/2), m]` 上均匀(`(m+1>>1) + rand((m>>1)+1)`)。
  4. 有效封顶 20:`if (k > 20) k = 20;`(`EntityLivingBase.applyPotionDamageCalculations`),每点 = 4% 减伤。

  保护因此是**随机量**,工具显示其**期望值**(roll 均值):全身保护 IV = 每件 5、原始和 20(未触 25 预封顶),roll 期望修正量 15 → **60%**(而非旧线性模型的 64%)。单段保护单独可达上限 ≈ **71.38%**(m=25),永远够不到 80% 天花板。预封顶 25 之后继续加等级无变化,界面提示 `epf capped`。
- **resistance level（抗性提升等级）**: 工具内限制 0–5。每级 = 20% 减伤；5 级 = 100%（承伤为 0）。
- **减伤比率 / damage reduction**: 1 − 承伤比率。总减伤 = `1 − (1−armor%) × (1−epf%) × (1−res%)`。
- **承伤比率 / damage taken ratio**: 伤害的通过比例，三段乘法 `(1−armor%) × (1−epf%) × (1−res%)`。
- **伤害值 / damage（dmg）**: 输入与输出均以 HP（半颗心，half-hearts）为单位，2 HP = 1 颗心；减伤前伤害与减伤后承伤是两个不同的读数。
- **基础攻击 / fist**: 玩家固有攻击力为 1 HP，持武器时仍计入，并非只在空手时才存在。
- **武器加成 / weapon**: 未附魔武器对攻击属性的加成，不含玩家基础 1 HP、锋利或药水效果；木铲填 1，钻石剑填 6。附魔物品的 1.8.9 tooltip 可能已经计入锋利，不能照抄后再重复填锋利等级。
- **锋利等级 / sharpness level**: 每级增加 1.25 HP，在力量、虚弱与暴击结算之后相加，不受力量或暴击倍率影响。
- **力量等级 / strength level**: 在虚弱平减后，将攻击属性乘以 `1 + 1.3 × 等级`；I 级为 ×2.3，II 级为 ×3.6，不是现代版本的每级 +3 HP。
- **虚弱等级 / weakness level**: 从 `1 + weapon` 中每级扣除 0.5 HP，再应用力量倍率；不是现代版本的每级 −4 HP。锋利、力量、虚弱在本工具中均接受 0–32767 的整数等级，0 表示没有该附魔 / 效果，超常等级是数值假想而非游戏获取或存储保证。
- **攻击属性 / attack damage attribute**: `clamp((1 + weapon − 0.5 × weakness) × (1 + 1.3 × strength), 0, 2048)`；上下限在药水修饰完成后生效。2048 只限制属性段，不限制后续暴击和锋利相加后的总伤害。
- **暴击 / crit**: 一次满足暴击条件的近战命中，将攻击属性乘以 1.5，再加锋利伤害；工具通过勾选表达该次攻击是暴击，不模拟跳跃等触发条件。
- **计算伤害 / ccl**: 减伤前伤害 = `攻击属性 × (crit ? 1.5 : 1) + 1.25 × sharpness`。
- **手动伤害 / mnl**: 直接指定减伤前伤害，不再叠加基础攻击、武器、附魔、力量、虚弱或暴击；与 ccl 使用相同的护甲 → 抗性 → 保护减伤链路。
- **承伤值 / damage taken**: 减伤前伤害 × 承伤比率；保护存在随机性时为期望承伤，心数为该值 / 2。
- **durability（耐久度）**: 仅展示信息量，不参与计算。材质 → 头/胸/腿/靴：皮革 55/80/75/65，金 77/112/105/91，锁链 165/240/225/195，铁 165/240/225/195，钻石 363/528/495/429。`none` 不显示。
- **假想模式 / hypothetical mode**: 「无」装备也允许选保护等级，且该等级计入 EPF——刻意偏离游戏语义（裸装部位无法附魔）。见 `.docs/adr/0001-enchant-on-empty-slot-counts.md`。
- **none**: 装备选项之一，空槽，贴图用资源包内 `empty_armor_slot_*`。

## 示例对话

- 玩家：木铲写 +1，对 8 HP 的羊为什么四下就够？
- 开发者：玩家基础 1 + 武器加成 1 = 2 HP；不暴击、无其他效果且每次命中正常结算时四下共 8 HP。输入 weapon = 1，不是总攻击力 2。
- 玩家：钻石剑、力量 II、锋利 V，勾 crit 后呢？
- 开发者：`(1 + 6) × 3.6 × 1.5 + 6.25 = 44.05 HP`；普通攻击为 31.45 HP。若目标全钻保护 IV、无抗性，期望承伤分别为 3.524 与 2.516 HP；mnl 填 44.05 会得到相同的暴击承伤，不会再乘一次 crit。

## 来源

- Java 1.8.9 反编译源码：[MavenMCP-1.8.9](https://github.com/Marcelektro/MavenMCP-1.8.9/tree/master/src/main/java/net/minecraft)，`realms/RealmsSharedConstants.java` 明确版本为 1.8.9、协议 47。攻击核验点：`EntityPlayer.applyEntityAttributes` / `attackTargetEntityWithCurrentItem`、`PotionAttackDamage.getAttributeModifierAmount`、`Potion` 的属性 operation、`ModifiableAttributeInstance.computeValue`、`SharedMonsterAttributes.attackDamage` 的 0–2048 范围、`EnchantmentDamage.calcDamageByCreature`、`ItemStack.getTooltip`。
- 同一 1.8.9 源码的防御核验点：`EnchantmentProtection.calcModifierDamage` / `EnchantmentHelper.getEnchantmentModifierDamage` / `EntityLivingBase.applyPotionDamageCalculations`、`applyArmorCalculations`。计算顺序 armor → resistance → protection；保护段随机、工具取期望值；抗性负伤害由 `if (damage <= 0) return 0` 截断。
- 历史本机参考 `K:\Projects\sourcecodes\CheatBreaker\CheatBreaker\src\main\java\net\minecraft\` 的 `RealmsSharedConstants.VERSION_STRING` 实为 **1.7.10**，不是 1.8.9；此前标注已更正，不以它代替目标版本证据。`K:\Projects\sourcecodes\PolyPatcher\...\ArmorStatusRenderer.java` 是保护随机 → 期望值的实现形态参考，不是版本数值事实源。
- 版本史交叉核验：[Strength](https://minecraft.wiki/w/Strength#History) / [Weakness](https://minecraft.wiki/w/Weakness#History)：力量每级 +3 HP、虚弱每级 −4 HP 是 1.9 快照 15w33a 的变化，不适用于 1.8.9。
- 贴图：仓库内 `!!!!Eum3 Blue Revamp` 资源包（`assets/minecraft/textures/items/`）。
- 字体:Minecraft AE Bold(源文件 `K:\PvP\MinecraftAE-Bold.ttf`,经 `tools/subset-font.sh` 子集化后入库 `assets/fonts/`)。
