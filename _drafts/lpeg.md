---
title: 使用 LPeg 解析语法
tag:
    - tools
    - lua
---
LPeg 是一个 Lua 的模式匹配库. 笔者刚刚接触到 LPeg 时, 以为它只是另一种形式的正则表达式; 深入了解才发现, 它的功能远远强于正则表达式, 能够轻易匹配正则表达式难以匹配的复杂模式, 乃至解析语法. 事实上, LPeg 即是 Parsing Expression Grammars for Lua, 它设计出来就是用来解析语法的. 使用 LPeg 能够轻松地解析各种语法, 比如用四百行代码[将 Lua 源码解析成抽象语法树](https://github.com/andremm/lua-parser). 有了它, 静态分析代码, 自定义 DSL(Domain Specific Language) 将会变得易如反掌.

LPeg 是 PEG 的 Lua 实现. 我们先从 PEG 说起.

### PEG(Parsing Expression Grammars)

说到模式匹配, 很多同学首先想到的是正则表达式. 对于简单的模式而言, 正则表达式是很方便的; 然而一旦情况变得复杂, 正则表达式就显得力不从心了. 你能想象使用正则表达式匹配条件表达式吗? 此外正则表达式存在效率问题, 一些奇怪的正则表达式可能导致反复回溯, 甚至达到指数级的时间复杂度. 为了匹配复杂的模式, 我们需要更加强大的工具, PEG 就是其中一个.

PEG 最早是在 2004 年 MIT 的一篇论文 [Parsing Expression Grammars: A Recognition-Based Syntactic Foundation](http://pdos.csail.mit.edu/papers/parsing:popl04.pdf) 中提出的. 它很像 CFG(Context-Free Grammars), 不同的是 CFG 是对语言的描述, 而 PEG 是对语言的解析, 稍后我们能看到这一区别. [Lua 文档的最后一节](http://www.lua.org/manual/5.3/manual.html#9)有一份用 BNF(Backus Naur Form) 描述的完整语法, BNF 就是 CFG 的一种表示法. 下面是用 PEG 描述的 PEG 语法:

{% highlight peg linenos %}
grammar     <-  (nonterminal ’<-’ sp pattern)+
pattern     <-  alternative (’/’ sp alternative)*
alternative <-  ([!&]? sp suffix)+
suffix      <-  primary ([*+?] sp)*
primary     <-  ’(’ sp pattern ’)’ sp / ’.’ sp / literal /
                charclass / nonterminal !’<-’
literal     <-  [’] (![’] .)* [’] sp
charclass   <-  ’[’ (!’]’ (. ’-’ . / .))* ’]’ sp
nonterminal <-  [a-zA-Z]+ sp
sp          <-  [ \t\n]*
{% endhighlight %}

如第一行所示, PEG 语法由一条以上的规则组成, 每条规则均由 `<-` 分隔开的**非终结符(nonterminal)**和**模式(pattern)**组成. 接下来的规则会依次表示非终结符和模式又是由什么组成的, 直到字符级别. 其中的一些规则与正则表达式类似, 例如 `+` 表示前面的模式重复 1 次以上, `*` 表示重复 0 次以上, `?` 表示出现 1 次或 0 次; `[]` 表示字符的集合等. 为了消除歧义, 字面量需要放在 `’’` 之间. 如第二行所示, 每个模式可以包含多个可选项, 由斜杠 `/` 隔开, 这有点像 BNF 中的 `|`. 例如第五行表示非终结符 primary 可以由括号包裹的模式, 或者通配符 `.`, 或者字面量, 或者字符类, 或者后面不紧跟 `<-` 的非终结符组成. 需要说明的是, 这些可选项是有顺序的, 只有前面的选项匹配失败才会去匹配后面的选项.

### LPeg

### 应用

***

**参考资料:**

- [A Text Pattern-Matching Tool based on Parsing Expression Grammars](http://www.inf.puc-rio.br/~roberto/docs/peg.pdf)
- [LPeg - Parsing Expression Grammars For Lua](http://www.inf.puc-rio.br/~roberto/lpeg/)
