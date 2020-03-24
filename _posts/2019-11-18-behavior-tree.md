---
key: 17
title: 行为树及其实现
tag: design
---
在笔者的项目中 NPC 要有自动化的行为, 例如怪物的巡逻, 寻敌和攻击, 宠物的跟随和战斗等. 完成这些需求最好的做法是使用**行为树(Behavior Tree)**. 笔者查阅资料, 研究并实现了一个行为树, 可以满足游戏中相关的需求. 这里笔者简单作一些总结和分享, 推荐想要深入研究的同学去看文章最下面的参考资料, 这个一个非常好的行为树教程.

### 行为树的结构
顾名思义, 行为树首先是一棵树, 它有着标准的树状结构: 每个结点有零个或多个子结点, 没有父结点的结点称为根结点, 每一个非根结点有且只有一个父结点. 在行为树中, 每个节点都可以被执行, 并且返回 *Success*, *Failure* 或 *Running*, 分别表示成功, 失败或正在运行. 行为树会每隔一段时间执行一下根结点, 称为 tick. 当一个节点被执行时, 它往往会按照一定的规则执行自己的子节点, 然后又按照一定的规则根据子节点的返回在确定它自己的返回值. 行为树通常有4种控制流节点(Sequence 节点, Fallback 节点, Parallel 节点和 Decorator 节点)和两种执行节点(动作节点和条件节点):

#### Sequence 节点
每当 Sequence 节点被执行时, 它都会依次执行它的子节点, 直到有一个子节点返回 *Failure* 或 *Running*. Sequence 节点的返回值就是最后一个子节点的返回值. 写成代码就是这样的:

```python
def execute(self):
    for node in self.children:
        res = node.execute()
        if res != "Success":
            return res

    return "Success"
```

Sequence 节点有点像逻辑与的操作: 只有所有的节点返回成功它才返回成功. 我们通常用符号 "$\rightarrow$" 表示 Sequence 节点.

#### Fallback 节点
每当 Fallback 节点被执行时, 它都会依次执行它的子节点, 直到有一个子节点返回 *Success* 或 *Running*. Fallback 节点的返回值就是最后一个子节点的返回值. 写成代码就是这样的:

```python
def execute(self):
    for node in self.children:
        res = node.execute()
        if res != "Failure":
            return res

    return "Failure"
```

与 Sequence 节点相反, Fallback 节点有点像逻辑或的操作: 只要有一个节点返回成功它就返回成功. 我们通常用符号 "$?$" 表示 Fallback 节点.

> 有些资料把 Fallback 节点成为 Selector 节点. 它们本质上是一样的.

#### Parallel 节点
每当 Parallel 节点被执行时, 它都会执行它所有的子节点. 如果有至少 M 个节点返回 *Success*, Parallel 节点就返回 *Success*; 如果有至少 N - M + 1 个节点返回 *Failure*, Parallel 节点就返回 *Failure*, 这里 N 是其子节点的数量; 否则返回 *Running*. 代码如下:

```python
def execute(self):
    success_num = 0
    for node in self.children:
        res = node.execute()
        if res == "Success":
            success_num += 1

    if success_num >= self.M:
        return "Success"
    elif success_num > len(self.children) - self.M:
        return "Failure"
    else:
        return "Running"
```

我们通常用符号 "$\rightrightarrows$" 表示 Parallel 节点.

#### Decorator 节点
有的时候会有一些特殊的需求, 需要用自己的方式执行子节点和处理其返回结果. Decorator 节点就是为此而设计的, 它的行为都是自定义的. 可以说, Sequence, Fallback 和 Parallel 节点都是特殊的 Decorator 节点. 我们通常用 "$\delta$" 表示 Decorator 节点.

#### 动作节点和条件节点
一般来说, 动作节点和条件节点是行为树中的叶子节点, 它们都是根据具体需求具体实现的. 当动作节点被执行时, 它会执行一个具体的动作, 视情况返回 *Success*, *Failure* 或 *Running*. 当条件节点被执行时, 它会做一些条件判断, 返回 *Success* 或 *Failure*. 行为树并不关心一个节点具体做了什么事--是所谓的 "执行动作" 或是 "判断条件", 所以说它们唯一的区别就是动作节点有可能会返回 *Running* 而条件节点不会.

#### 带记忆的控制流节点
正如上面我们看到的, 控制流节点在每次 tick 的时候都会依次执行其所有的子节点并获取其返回值. 然而有时对于某些节点, 一旦执行了一次, 就不必再执行第二次了. 记忆节点便是用来解决这一问题的. 在控制流节点中, Sequence 节点和 Fallback 节点可以是带记忆的. 当子节点返回 *Success* 或 *Failure* 时, 记忆节点总是会把返回值缓存起来; 一旦一个子节点的返回值被缓存了, 就不会执行这个子节点了, 而是直接取缓存中的值; 直到这个节点返回 *Success* 或 *Failure*, 便清空缓存. 以带记忆的 Sequence 节点为例, 代码如下:

```python
def execute(self):
    for i, node in enumerate(self.children):
        if i in self.cache:
            res = self.cache[i]
        else:
            res = node.execute()
            if res != "Running":
                self.cache[i] = res

        if res != "Success":
            if res == "Failure":
                self.cache = {}
            return res

    self.cache = {}
    return "Success"
```

稍后可以看到, 记忆节点有一些非常巧妙的应用. 我们通常在节点的右上角加上 \* 号表示这个节点是记忆节点. 比如说记忆 Sequence 节点记作 "$\rightarrow^\*$".

### 行为树的实现
首先解决如何描述一个行为树. Excel 很难表示出树状关系; 即使是直接使用 json 或者 dict, 也不便于表示行为树结构. 一开始我想使用一些图形化的编辑器, 例如 [behavior3editor](https://github.com/behavior3/behavior3editor), 但是环境配置起来有些复杂. 后来受到[这个repo](https://github.com/ayongm2/BehaviorTree)的启发, 我使用一个字符串描述一棵行为树, 我们可以称之为行为树脚本; 然后读取并解析这个字符串. 我希望行为树脚本一行便是一个节点, 使用缩进表示父子级关系; 对于每个节点, 我们还可以指定它的参数. 这样的话, 配置起来比较方便直观.

为了尽可能地简化解析, 我做了一些限制, 例如节点的名字必须是一个合法标识符, 参数是一个合法的 Python 表达式. 最终整个解析行为树脚本的代码不到40行.

```python
def parse_script(script):
    root = {"level": 0}
    stack = [root]
    indent = None

    for i, row in enumerate(script.split("\n")):
        row = re.sub(r"^(.*)#.*", lambda m: m.group(1), row) # comment
        if len(row) == 0 or row.isspace(): continue

        m = re.match(r"(\s*)([a-zA-Z_]\w*)(.*)", row)
        assert m, "Syntax error in line " + str(i + 1)
        space, name, param = m.groups()

        if len(space) > 0 and indent == None:
            indent = len(space)
        level = 1 if indent is None else len(space) / indent + 1

        node = {"name": name, "level": level}
        try:
            node["param"] = eval(param)
        except: pass

        top = stack[-1]
        while level < top["level"]:
            stack.pop()
            top = stack[-1]

        if level == top["level"]:
            parent = stack[-2]
            stack[-1] = node
        elif level > top["level"]:
            parent = top
            stack.append(node)

        parent.setdefault("children", []).append(node)

    return root["children"][0]
```

最终 `parse_script` 会返回一个 dict, 便是这个行为树的根节点. 例如, 让机器人打球的行为树脚本大概是这样的:

```python
SEQUENCE
    FALLBACK
        ball_found # whether found the ball
        find_ball
    FALLBACK
        is_close {"target": "ball"}
        approach {"target": "ball"}
    FALLBACK
        ball_grasped
        grasp_ball
    FALLBACK
        is_colse {"target": "bin"}
        approach {"target": "bin"}
    FALLBACK
        ball_placed
        place_ball
```

最终会编译成这这样的 dict:

```python
{
    "name": "SEQUENCE",
    "level": 1,
    "children": [
        {
            "name": "FALLBACK",
            "level": 2,
            "children": [
                {"name": "ball_found", "level": 3},
                {"name": "find_ball", "level": 3}
            ]
        },
        {
            "name": "FALLBACK",
            "level": 2,
            "children": [
                {"name": "is_close", "param": {"target": "ball"}, "level": 3},
                {"name": "approach", "param": {"target": "ball"}, "level": 3}
            ]
        },
        {
            "name": "FALLBACK",
            "level": 2,
            "children": [
                {"name": "ball_grasped", "level": 3},
                {"name": "grasp_ball", "level": 3}
            ]
        },
        {
            "name": "FALLBACK",
            "level": 2,
            "children": [
                {"name": "is_colse", "param": {"target": "bin"}, "level": 3},
                {"name": "approach", "param": {"target": "bin"}, "level": 3}
            ]
        },
        {
            "name": "FALLBACK",
            "level": 2,
            "children": [
                {"name": "ball_placed", "level": 3},
                {"name": "place_ball", "level": 3}
            ]
        }
    ]
}
```

可以看到, 生成的 dict 就是一个标准的树状结构. 接下来我们只需根据上面的规则, 实现各个节点就可以了.

```python
class BT:
    @staticmethod
    def parse_script(script):
        "..."

    def __init__(self, desc, obj):
        if isinstance(desc, (str, unicode)):
            self.root = TinyBT.parse_script(desc)
        else:
            self.root = desc
        self.caches = {}
        self.obj = obj

    def tick(self):
        self.execute(self.root)

    def execute(self, node):
        name = node["name"]
        if name == "SEQUENCE":
            return self._sequence(node)
        elif name == "FALLBACK":
            return self._fallback(node)
        elif name == "PARALLEL":
            return self._parallel(node)
        else:
            # for condition node, action node and decorator node.
            f = getattr(self.obj, name)
            res = f(node.get("param"), node)
            assert res in ("Success", "Failure", "Running")
            return res

    def _sequence(self, node):
        is_mem = node.get("param")
        if is_mem:
            cache = self.caches.setdefault(id(node), {})

        for i, n in enumerate(node["children"]):
            res = is_mem and cache.get(i, None) or self.execute(n)
            if is_mem and res != "Running": cache[i] = res
            if res != "Success": break

        if is_mem and res != "Running":
            self.caches[id(node)] = {}

        return res

    def _fallback(self, node):
        is_mem = node.get("param")
        if is_mem:
            cache = self.caches.setdefault(id(node), {})

        for i, n in enumerate(node["children"]):
            res = is_mem and cache.get(i, None) or self.execute(n)
            if is_mem and res != "Running": cache[i] = res
            if res != "Failure": break

        if is_mem and res != "Running":
            self.caches[id(node)] = {}

        return res

    def _parallel(self, node):
        M = node["param"]
        success_num = 0
        for n in node["children"]:
            res = self.execute(n)
            if res == "Success":
                success_num += 1

        if success_num >= M:
            return "Success"
        elif success_num > len(node["children"]) - M:
            return "Failure"
        else:
            return "Running"
```

行为树在初始化时需要提供一个对象 `obj`, 这个对象可能是游戏中的宠物或怪物对象; 然后在对象中实现像条件节点, 动作节点和装饰节点这样的自定义节点. 对于 Sequence 和 Fallback 节点, 参数为 `True` 表示是记忆节点; 对于 Parallel, 参数即是值 `M`. 整个行为树的代码仅100行左右, 可以说是一个短小精悍的实现.

### 设计行为树的思路
行为树本身并不复杂, 但是要设计一个精巧的行为树却不简单. 这里我们讨论一下行为树的设计思路.

#### PPA 模式
我们来看这种情况: 现一个 Sequence 节点下有两个子节点. 那么, 根据 Sequence 的特性, 只有当第一个子节点返回 *Success* 的时候, 才会执行第二个子节点. 如果第一个子节点是一个条件节点, 我们就可以认为它是第二个子节点的条件. 如下所示:

```python
SEQUENCE
    is_door_open    # precondition
    go_inside       # action
```

这样的行为树可以保证只有当条件成立, 才会执行动作. 我们称前一个节点是后一个节点的**前置条件(precondition)**

在来看另一种情况: 现一个 Fallback 节点下有两个子节点. 根据 Fallback 的特性, 只有当第一个节点返回 *Failure* 的时候, 才会执行第二个节点. 同样地, 这里我们也认为第一个节点是条件节点. 这意味着什么呢? 看下面这个例子:

```python
FALLBACK
    is_in_house     # postcondition
    enter_house     # action
```

注意行为树是每隔一段时间会 tick 一次的. 所以, 如果条件不满足, 行为树就会一直执行动作, 直到条件满足为止. 也就是说, 条件节点(第一个节点)是一个保证, 保证整个行为树返回 *Success* 的时候, 条件必然成立. 我们称这个条件节点为**后置条件(postcondition)**

我们综合使用前置条件, 后置条件和动作, 如下所示:

```python
FALLBACK
    is_in_house # postcondition
    SEQUENCE
        is_door_open # precondition
        go_inside #action
```

这种结构在行为树设计中使用非常广泛, 被称为**PPA行为树(Postcondition-Precondition-Action Behavior Tree)**. 这个例子中有一个非常有趣的现象: 整颗行为树可以看做一个条件节点, 而它的条件就是后置条件节点 `is_in_house`. 这样我们可以自顶向下, 分层地设计行为树. 在这个例子中, `is_door_open` 节点, 就可以进一步设计:

```python
FALLBACK
    is_door_open # postcondition
    SEQUENCE
        is_door_unlocked # precondition
        open_door # action
    SEQUENCE
        has_crowbar # precondition
        door_is_weak # precondition
        brake_door_open # action
```

后置条件 `is_door_open` 保证整颗行为树返回 *Success* 时门已经被打开. 后面的两颗子树可以看做两个动作节点: 如果门没锁, 就直接打开门; 否则如果带了撬棒, 且门不结实, 就撬开门. 然后我们可以用这颗行为树代替上面的 `is_door_open` 节点, 得到进入屋子的行为树:

```python
FALLBACK
    is_in_house # postcondition
    SEQUENCE
        FALLBACK
            is_door_open # postcondition
            SEQUENCE
                is_door_unlocked # precondition
                open_door # action
            SEQUENCE
                has_crowbar # precondition
                door_is_weak # precondition
                brake_door_open # action
        go_inside #action
```

#### 记忆节点的妙用
假设现在我们要让一个 NPC 在 a, b, c 三点之间巡逻. 这么做到这一点呢? 首先要有三个动作, 分别为走到 a 点, 走到 b 点和走到 c 点. 当 NPC 到达目标点时返回 *Success* 否则返回 *Running*. 直接把这三个动作挂到一个 Sequence 节点上是行不通的, 因为这样的话 NPC 会在 a 点附近鬼畜(可以想想为什么会这样). 所以我们要有一个记录, 记录 NPC 有没有到过某个点; 只有当它没有到过某个点时才会往那个点走. 最后还要清除记录. 如下所示:

```python
SEQUENCE
    FALLBACK
        has_been_to_point "a"
        go_to_point "a"
    FALLBACK
        has_been_to_point "b"
        go_to_point "b"
    FALLBACK
        has_been_to_point "c"
        go_to_point "c"
    clean_record
```

这样虽然可以满足需求, 但是太过复杂了. 其实我们可以使用记忆节点巧妙地解决这个问题. 注意到记忆节点会缓存其子节点返回的 *Success* 和 *Failure*, 一旦一个节点返回值被缓存了, 就不会再执行这个节点了, 并且会在这个节点返回非 *Running* 时清空缓存. 这就跟上面的行为树非常相像了. 所以我们只需这样就可以实现三点之间的巡逻:

```python
SEQUENCE True
    go_to_point "a"
    go_to_point "b"
    go_to_point "c"
```

使用记忆节点实现循环动作在行为树的设计中应用地非常普遍.

***
**参考资料**:
- [Behavior Trees in Robotics and AI](https://arxiv.org/pdf/1709.00084.pdf)
- [ayongm2/BehaviorTree](https://github.com/ayongm2/BehaviorTree)
