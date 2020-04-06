---
key: 29
title: 给 VSCode 做了个 RSS 阅读器插件
tag: tools
---
一直比较喜欢使用 RSS 订阅一些新闻和技术博客, 但总觉得 Windows 上除了雷鸟外没有什么好用的阅读器. 后来突然想到既然平时 VSCode 用得这么多, 为什么不给它写个 RSS 阅读插件呢, 而且 VSCode 扩展性这么强, 又天生支持 HTML 渲染. 于是清明节这几天就搞出了这个: [luyuhuang/vscode-rss](https://github.com/luyuhuang/vscode-rss). 在 VSCode 扩展商店中搜 "RSS" 就能找到它. 它用起来就像这样:

![demonstrate](/assets/images/vscode-rss_1.gif)

嗯, 这样以后写代码写累了就可以~~摸鱼~~看看 RSS 订阅了.

目前已经实现了一个 RSS 阅读器所需的基本功能了, 自动刷新, 已读未读标记, 识别相对 URL 等都是有的. 它的配置非常简单, 直接在 `settings.json` 中加一个 RSS 源列表即可:

```json
{
    "rss.feeds": [
        "https://realpython.com/atom.xml",
        "https://luyuhuang.github.io/feed.xml",
        "https://www.ruanyifeng.com/blog/atom.xml"
    ]
}
```

BTW, VSCode 的扩展十分强大, 有了它你就可以把一切你觉得不爽的地方都变爽. 可以说 VSCode 是一个可高度定制的工具, 这一点对于程序员来说十分重要. 我认为这也是 Vim 之所以仍有什么多人喜欢的原因.
