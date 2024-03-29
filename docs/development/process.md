# 结算流程设计

本项目**不追求 100% 和官方结算流程实现一致**。本项目的流程实现细节可能与官方行为有很大出入，底线是尽可能保证**符合官方规则说明的要求**。

建议阅读 [state](./state.md) 了解本项目对游戏状态的基本操作原语：mutations 和技能。

总而言之，`Game` 对对局状态的修改只包含这几类：
- 各游戏阶段的显然操作，如步进回合数、翻转行动轮次，以及玩家 IO 的结果；
- 使用主动技能；
- 技能执行或常规流程引发（emit）了事件，执行对这一事件的所有实体的响应技能。

每一次转移游戏阶段都会到达一个暂停点。

当任何一个技能（包括主动技能）*执行* 时：
1. 检查技能的发起者是否存在于现有状态；若否，不做任何事；
1. 以事件**引发的时刻的状态**，检查 `filter` 确定该技能是否能被执行；若否，不做任何事；
1. 调用技能描述，以技能描述返回的 `GameState` 替换现有状态；
1. 到达一个暂停点，进行 IO；
1. 检查是否有角色倒下；若有，进行 IO，可选地 *引发并处理* `onSwitchActive`、`onDefeated` 等事件；
1. 若上一步导致游戏状态变化，再次到达暂停点，进行 IO；
1. 遍历技能描述返回的 `EventAndRequest`：对于异步请求，执行这些异步操作；对于引发的事件，*处理* 它们；

*引发并处理* 是指：
1. 将当前的游戏状态记作事件**引发的时刻的状态**；
1. 在 *引发的时刻的状态* 下按规定顺序遍历实体，获得它们对此事件的响应技能；
1. 按顺序 *执行* 这些技能；（按照上述描述执行，在每一技能执行完后递归地 *处理* 或 *引发并处理*。

*处理* 和 *引发并处理* 基本相同，只是 *引发的时刻的状态* 由技能返回的 `EventAndRequest` 的参数给出。
