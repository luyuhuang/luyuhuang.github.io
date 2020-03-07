---
title: 关于容错和断言的一些思考
tag: experience
---
实际项目中的代码总是多多少少会有一些问题的. 面对一些问题, 我们有两种做法: 一种是容错, 把错误自行消化掉, 让代码能够继续往下运行; 另一种是加断言, 让错误发生时抛出异常, 把错误暴露出来, 并且能中断当前过程, 避免后续行为未定义. 这两种策略中, 笔者更偏爱后者. 因为无脑的容错最后会导致问题的根源不被解决, 使问题堆积, 导致代码腐败. 毕竟解决问题的第一步是面对问题, 而不是回避它.

然而事情并没有这么简单. 无论是容错, 还是加断言, 都是要根据不同的场景进行思考. 无脑地容错和无脑地加断言都是不可取的. 我们来看两个例子:

#### 1. 排行榜结算
游戏服务器中一个常见的需求就是结算排行榜, 给排行榜中的玩家发奖. 这样的代码通常是这样的:

```lua
function settlement(ranking_list)
    for ranking, player_id in ipairs(ranking_list) do
        award(player_id, ranking)
    end
    clean_ranking_list()
end

function award(player_id, ranking)
    local reward = config.ranking_reward[ranking]
    assert(reward ~= nil, "No configuration of ranking " .. ranking)
    send_mail_with_reward(player_id, reward)
end
```

在 `award` 函数中, 需要读取配置, 获取各个名次所对应的奖励. 然而有可能策划粗心大意没有配置某一名的奖励, 导致发奖无法进行. 根据 "不要隐藏问题" 的原则, 我在第二行加上了断言, 把策划的错误暴露了出来. 这个思路本身没错的, 但是在这里是不正确的. 因为这个异常会中断 `settlement` 函数, 导致之后的玩家都无法收到奖励. 也就是说, 你**把问题扩大化了**. 在这个情况下, 我们应该在 `settlement` 函数中捕获 `award` 函数的异常, 并打印错误日志, 使其不影响接下来的代码. 然而很多情况下, 大家都不会把函数包在 `try cache` 语句中, 特别是 Lua 这种连 `try cache` 语句都没有的语言. 因此, 作为一个公共函数, 应该自己处理异常, 不让上层调用者操心. 这里更好的做法是 `award` 函数发现没有配置, 打印错误日志, 取消发奖.

```lua
function award(player_id, ranking)
    local reward = config.ranking_reward[ranking]
    if not reward then
        error_log("No configuration of ranking " .. ranking)
        return false
    end
    send_mail_with_reward(player_id, reward)
    return true
end
```

> 这里我不得不说 Java 在这一点上做得非常好: 如果一个声明了不会抛出异常的函数调用了一个可能抛出异常的函数却没有捕获其异常的话, 编译会报错. 这就直接解决了这一问题, 公共函数可以放心地抛出异常, 基本不用担心会把问题扩大化.

#### 2. 自增函数
我们通常会对数据库作一层封装, 避免直接写 SQL 语句. 假设我们把 `player` 表封装了一个 `Player` 类, 这个类里面有一个 `Player:add(field, num)` 方法, 给 `field` 字段自增 `num`. 现在 `player` 类中有两个字段, `level` 和 `exp` 分别表示玩家的的等级和当前经验. 再假设 `config.upgrade[i]` 表示从 `i - 1` 级升到 `i` 级所需要的经验. 需求是玩家会在某些时刻获取经验, 经验达到升级条件自动升级. 很典型很常见的需求对不对? 那么获取经验升级的代码通常是这样的:

```lua
function get_experiences(player, num)
    player:add("exp", num)
    while player.level < MAX_LEVEL and player.exp >= config.upgrade[player.level + 1] do
        player:add("exp", -config.upgrade[player.level + 1])
        player:add("level", 1)
    end
end

function Player:add(field, num)
    self[field] = self[field] + num
    DB.run("update player set " .. field .. " = " .. self[field])
end
```

这样看上去没什么问题对不对? 然而等你提交完代码, 测试完毕, 产品上线了, 随后发现生产环境有时候数据库连接不稳定, 导致 `DB.run` 运行报错. 为了解决这个报错, **不要让问题扩大化**, 团队中有一位程序员就加上了这样一行代码:

```lua
function Player:add(field, num)
    if not DB.connected then return end
    self[field] = self[field] + num
    DB.run("update player set " .. field .. " = " .. self[field])
end
```

这就直接导致了灾难性的后果: 一旦运行到 `add` 函数时 `DB.connected` 为假, 直接导致程序死循环. 我想没有比这更严重的问题了, 这便是无脑容错的代价. 你容错可以, 但至少要让上层调用者知道, 比如说连接断开返回 `false`, 成功自增返回 `true`. 也就是说, **容错绝对不是隐瞒问题**, 一定要用某种方式将错误暴露出来. 但我认为这里应该用一种更强的方式把问题暴露出来--那就是抛出异常.

所以我总结出两条原则:
- **不能隐瞒问题, 一定要把问题暴露出来;**
- **抛出异常是最强的暴露问题的方式, 一定要考虑抛出的异常会不会扩大问题(特别是对某些语言而言).**

总而言之, 既不能无脑容错, 也不能无脑断言. 一定要根据不同的情况采取不同的策略, 特别是对某些语言而言. 顺便多说一句, 与 Java, C# 相比, Lua, Python 这样的脚本语言反而对程序员要求更高, 特别是在大项目中. 它们灵活, 开发效率高, 但是没有完善的流程和代码规范, 也很容易出问题.
