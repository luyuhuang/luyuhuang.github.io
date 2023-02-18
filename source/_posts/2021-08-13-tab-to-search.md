---
key: 56
title: 在自己的博客上启用 Tab 键搜索
tag: practice
aside: false
---
Chrome 浏览器有一个功能, 在地址栏输入域名后按下 Tab 键, 就可进入搜索状态. 这让我们很方便地搜索一个网站的内容.

<video src="/assets/videos/tab-to-search_1.mp4" controls="controls" width="700"></video>

这个功能称作 Tab to Search. 当然不是每个网站都支持, 毕竟不同网站的搜索接口都不一样. 不过, 这个功能并不是 Chrome 专门为一些知名网站做的适配, 而是通过一个开放性标准 [OpenSearch description format](https://developer.mozilla.org/en-US/docs/Web/OpenSearch) 实现的. 只要你的网站符合这个规范就能支持 Tab to Search.

实现起来非常简单. 首先在网站主页的 `<head>` 标签里加一个链接, 指向一个 OpenSearch description.

```html
<head>
    <link rel="search" type="application/opensearchdescription+xml" title="Luyu's Blog" href="/opensearch.xml">
</head>
```

接着创建一个 OpenSearch description. 在这个例子中我们需要在网站根目录创建一个 `opensearch.xml`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
    <ShortName>Luyu's Blog</ShortName>
    <Url type="text/html" template="https://luyuhuang.tech/?search={searchTerms}"/>
</OpenSearchDescription>
```

其中 `<Url>` 标签指定搜索链接的模版, `{searchTerms}` 表示搜索的关键词. OpenSearch description 还支持更多配置字段, 详细格式参考它的[文档](https://developer.mozilla.org/en-US/docs/Web/OpenSearch). 不过对于 Tab to Search, 这样就足够了.

我的博客是静态网站, 搜索也是纯前端行为. 所以我还要做一些处理, 读取 URL 的 search 字段.

```js
if (window.location.pathname === '/' && window.location.search.startsWith('?search=')) {
    var val = decodeURIComponent(window.location.search.replace(/^\?search=/, ''));
    search.onInputNotEmpty(val);
}
```

大功告成! 效果就像这样:

<video src="/assets/videos/tab-to-search_2.mp4" controls="controls" width="700"></video>

虽然我的博客一共没多少文章, 搜索的作用比较有限, 不过效果还是不错的.

***

**参考资料:** [Tab to Search](https://www.chromium.org/tab-to-search)
