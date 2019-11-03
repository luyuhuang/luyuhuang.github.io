---
title: 行为树及其实现
category: design
---
在笔者的项目中 NPC 要有自动化的行为, 例如怪物的巡逻, 寻敌和攻击, 宠物的跟随和战斗等. 完成这些需求最好的做法是使用**行为树(Behavior Tree)**. 笔者查阅资料, 研究并实现了一个行为树, 可以实现游戏中相关的需求. 这里笔者简单作一些总结和分享, 推荐想要深入研究的同学去看文章最下面的参考资料, 这个一个非常好的行为树教程.

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
    success_num, failure_num = 0, 0
    for node in self.children:
        res = node.execute()
        if res == "Success":
            success_num += 1
        elif res == "Failure":
            failure_num += 1

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
一般来说, 动作节点和条件节点是行为树中的叶子节点, 它们都是根据具体需求具体实现的. 当动作节点被执行时, 它会执行一个具体的动作, 使情况返回 *Success*, *Failure* 或 *Running*. 当条件节点被执行时, 它会做一些条件判断, 返回 Success* 或 *Failure*. 行为树并不关心一个节点具体做了什么事--是所谓的 "执行动作" 或是 "判断条件", 所以说它们唯一的区别就是动作节点有可能会返回 *Running* 而条件节点不会.

#### 带记忆的控制流节点
正如上面我们看到的, 控制流节点在每次 tick 的时候都会依次执行其所有的子节点并获取其返回值. 然而有时对于某些节点, 一旦执行了一次, 就不必再执行第二次了. 记忆节点便是用来解决这一问题的. 带记忆的控制流节点总是会将其子节点的返回值缓存起来, 一旦一个子节点的返回值被缓存了, 就不会执行这个子节点了, 而是直接取缓存中的值; 直到这个节点返回 *Success* 或 *Failure*, 便清空缓存. 以带记忆的 Sequence 节点为例, 代码如下:

```python
def execute(self):
    for i, node in enumerate(self.children):
        if i in self.cache:
            res = self.cache[i]
        else:
            res = node.execute()
            self.cache[i] = res

        if res != "Success":
            if res == "Failure":
                self.cache = {}
            return res

    self.cache = {}
    return "Success"
```

稍后可以看到, 记忆节点有一些非常巧妙的应用. 我们通常在节点的右上角加上 \* 号表示这个节点是记忆节点. 比如说记忆 Sequence 节点记作 "$\rightarrow^\*$".

### 设计行为树的思路
行为树本身并不复杂, 但是要设计一个精巧的行为树却不简单. 这里我们讨论一下行为树的设计思路.


### 行为树的实现

***
**参考资料**: [Behavior Trees in Robotics and AI](https://arxiv.org/pdf/1709.00084.pdf)