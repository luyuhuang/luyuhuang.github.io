---
title: 在Jekyll中使用LaTeX
category: tools
---
我准备用 Jekyll + Github page 搭建自己的技术博客. 但是有个问题, 技术文章中不可避免地需要使用到数学公式, Jekyll 原生的 Markdown 解释器总是不能很好地使用 Latex. 通过查阅资料, 我最终解决了这个问题. 下面是我的做法:

1. 禁用 Kramdown 自带的公式解释器:

    在 `_config.yml` 中加入:
    ```yml
    kramdown:
      math_engine: null
    ```
2. 导入 mathjax 的 javascript 代码:
    在 `_includes` 下新建文件 `latex.html`, 粘贴上以下内容:
    ```html
    <script type="text/x-mathjax-config">
    MathJax.Hub.Config({
        TeX: {
            equationNumbers: {
                autoNumber: "AMS"
            }
        },
        tex2jax: {
            inlineMath: [ ['$','$'] ],
            displayMath: [ ['$$','$$'] ],
            processEscapes: true,
        }
    });
    </script>
    <script type="text/javascript" src="http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML">
    </script>
    ```
3. 把 mathjax include 到 html 的 `<head>` 标签中：
    这一步根据你使用的主题的不同, 修改 _layouts 文件 或是 _includes 文件. 总之就是找到 `<head>` 标签定义的地方然后加入 include 代码. 我使用的主题是 minima, minima 的 `<head>` 标签定义在 `_includes/head.html` 中. 因此我在自己的博客目录下新建文件 `_includes/head.html` 来覆盖主题默认的文件, 粘贴上以下内容:
    ```html
    <head>
        <meta charset="utf-8">
        ...

        {% raw %}{% unless page.no_latex %}
            {% include latex.html %}
        {% endunless %}{% endraw %}
    </head>
    ```

大功告成! 在 \\$ \\$ 之间的 LaTex 会变成行内公式就像这样: `$e^{\pi i}+1=0$` 转换成 $e^{\pi i}+1=0$ ; 新起一段并且在 \\$\\$ \\$\\$ 之间的 LaTeX 会变成段落公式就像这样:
```

$$ 
H_n=1+\frac{1}{2}+\frac{1}{3}+...+\frac{1}{n}=\sum_{i=1}^{n}\frac{1}{n}=O(\log n)
$$
```
转换成

$$
H_n=1+\frac{1}{2}+\frac{1}{3}+...+\frac{1}{n}=\sum_{i=1}^{n}\frac{1}{n}=O(\log n)
$$