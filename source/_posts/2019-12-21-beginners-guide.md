---
key: 20
title: 如何优雅地实现一个新手引导系统
tag: design
---
笔者最近要在项目中实现一个新手引导系统. 新手引导其实上是一个比较复杂的系统, 与许多具体的功能紧密相关, 其中涉及到的特殊处理也比较多. 这篇文章我想谈谈新手引导的设计思路, 尽量不涉及具体的引擎框架和实现.

### 事件驱动

整个新手引导的流程应是事件驱动的. 比如说当宠物功能开启时在宠物功能按钮上显示引导提示, 当点击 A 按钮时把引导提示移动到 B 按钮上. 对于特殊的事件, 我们可以在必要的地方单独处理; 但是对于一些非常通用的事件, 比如说 点击按钮, 打开一个界面, 切换场景等, 我们就应该充分利用引擎和框架, 提供通用的事件, 而不是为每个按钮, 每个界面单独作处理. 抛出事件应该带上必要的数据. 这里举几个笔者项目中的例子:

- 对于按钮点击事件, 根据 UI 组织结构, 给每个按钮定义一个唯一的名字. 这有点像 jQuery 选择器: 比如说宠物界面右边面板上的激活按钮, 它的名字就是 `dialog_pet.right_panel.btn_activate`. 然后, 在点击每一个按钮时都抛出一个 `click_button` 事件, 并带上按钮的名字.
- 对于打开界面的事件, 由于笔者的项目中每个界面都有唯一的名字, 所有只需在打开界面时抛出 `pop_dialog` 事件并带上界面的名字即可.
- 对于一些特殊的事件, 就在必要的地方单独作处理: 比如说通关某一关卡, 就在结算时抛出 `mission_finished` 事件, 并且带上通关关卡 ID, 通关成绩等数据.

### 不要跟具体的功能相耦合

新手引导需要引导玩家点击各种按钮, 这与许多具体的功能紧密相关. 那么很重要的一点就是不要把新手引导跟它们耦合起来. 上面提到的**事件驱动**也是为了避免耦合.

新手引导中用的最多的表现就是在某个按钮上显示引导提示, 比如说手, 箭头等. 最糟糕的做法是修改具体的界面, 把引导提示摆在适当的位置, 并控制其显隐. 这样改动的东西太多, 不便于维护. 比较好的做法把新手引导相关的代码提取出来, 做一个引导管理器; 然后再做一个类似于 jQuery 选择器的东西, 可以通过名字选择一个具体的 UI 组件, 然后由引导管理器负责把引导提示动态地加载到这个 UI 组件上.

这里我的做法跟上面提到的按钮点击事件类似: 给每个 UI 组件定义一个唯一的名字, 通过这个名字查找到对应的 UI, 然后在这个位置加载引导提示. 同时保证引导提示的显隐和层级跟这个 UI 组件一致. 引导提示的完全由引导管理器控制, 不用修改具体功能的代码.

### 使用状态机抽象引导逻辑

引导逻辑实际上是最头疼的. 举个例子, 一个完整的引导流程通常是这样的:

1. 点击右侧按钮 -> 展开功能面板
2. 点击宠物按钮 -> 打开宠物界面
3. 点击选择第一个宠物 -> 第一个宠物被选中
4. 点击激活按钮 -> 宠物被激活
5. 引导结束

在这个流程中, 每当某一步完成, 就应该推进到下一步: 比如说第三步中点击选中了第一个宠物, 引导就推进到第四步. 但是现实总是事与愿违, 玩家有可能不按照引导进行操作: 玩家有可能在第三步点击关闭按钮退出了宠物界面, 或者点击选择第二个宠物, 又或者点击了宠物预览按钮. 另外在第一步的时候, 有可能在引导第一步开始时功能面板已经展开, 这个时候就不应该引导玩家点击右侧按钮, 而应该直接引导玩家点击宠物按钮. 这里就存在很多特殊处理. 如何描述这些特殊的逻辑使其一般化呢? 答案是使用**有穷状态机**.

使用有穷状态机可以完美地抽象引导逻辑. 引导流程不是线性的, 而是一个有向图. 对于上面的例子, 用状态机描述就是这样的:

![fsm](/assets/images/beginners-guide_1.png)

每一个状态都是引导的的一个步骤, 箭头上的都是事件.

上文中我们实现的事件都是比较抽象并且带数据的, 而状态中状态转移的事件都是非常具体的. i.e. 打开界面的事件为 `pop_dialog` 附带数据为界面的 ID, 而状态机中事件都是 "宠物界面打开" 这样具体的, 不带数据的事件. 因此我做了一个事件分发器, 把抽象的, 带数据的事件分发成具体的, 不带数据的事件, 通过对其携带的数据作判断. 例如:

```lua
pop_dialog = {
    pop_pet_dialog = function(id)
        return id == "dialog_pet"
    end,
    ...
}
...
```

每触发一个事件都会经过事件分发器, 转换成具体的子事件. 这样 `pop_dialog` 事件就被转换成 `pop_pet_dialog` 事件.

### Put Them Together

做个总结就是:

- 使用一个引导管理类管理引导相关的逻辑, 包括监听事件, 事件分发, 用事件控制引导的开启与关闭, 管理各个引导的状态机等;
- 使用状态机抽象引导逻辑, 在状态机的各个状态中实现具体的引导表现;
- 为每个 UI 组件定义一个唯一的名字, 使用这样的名字来抛出事件, 寻找组件;

以上便是我实现新手引导系统的的思路. 如果你有其他的想法, 欢迎与我讨论.