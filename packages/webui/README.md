# Web 界面（Preact 组件）

提供基于 Web 的游戏界面（棋盘）显示和用户交互。

## 使用方法

1. 使用 `usePlayer` 钩子获取 `[playerIO, chessboardProps]`；
2. 将 `playerIO` 传入 `startGame`；
3. 将 `chessboardProps` 传入 `<Chessboard />`。

### 例子

```tsx
import { startGame } from "@gi-tcg/core";
import data from "@gi-tcg/data";

function App() {
  // 获取双方玩家的 io 和传入组件的 props
  const [io0, props0] = usePlayer(0);
  const [io1, props1] = usePlayer(1);

  // 游戏全局 io 对象
  const io = useRef<GameIO>({
    pause: /** a global async pause handler here */,
    players: [io0, io1],
  });

  // 首次渲染时启动游戏
  useEffect(() => {
    startGame({
      data,
      io: io.current,
      playerConfigs: [playerConfig0, playerConfig1],
    });
  }, []);

  return (
    <div>
      <Chessboard {...props0} />
      <Chessboard {...props1} />
    </div>
  );
}
```

### 使用智能体而非用户操作

智能体应满足以下接口：

```ts
interface AgentActions {
  onNotify?: (msg: NotificationMessage) => void;
  onSwitchHands: () => Promise<SwitchHandsResponse>;
  onChooseActive: (req: ChooseActiveRequest) => Promise<ChooseActiveResponse>;
  onRerollDice: () => Promise<RerollDiceResponse>;
  onAction: (req: ActionRequest) => Promise<ActionResponse>;
}
```

将该接口对象传入 `<Chessboard />` 即可：

```tsx
const agentActions: AgentActions = /** [...] */;

<Chessboard {...props} agent={agentActions} />
```
