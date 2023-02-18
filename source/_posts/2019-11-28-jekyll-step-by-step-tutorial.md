---
key: 19
title: "[翻译] Jekyll 手把手教学"
tag:
  - tools
  - translations
  - featured
---
> 本文由 Luyu Huang 翻译, 原文地址 [https://jekyllrb.com/docs/step-by-step/01-setup/](https://jekyllrb.com/docs/step-by-step/01-setup/). 欢迎提 [issue](https://github.com/luyuhuang/luyuhuang.github.io/issues) 来帮助我改进翻译

## 1. 配置

欢迎来到 Jekyll 的手把手教学. 这个教程的目标是让你从只有一点点 web 开发经验到能够构建一个 Jekyll 站点 -- 不依赖于默认的主题. 现在就开始吧!

### 安装

Jekyll 是使用 Ruby 编写而成, 所以首先需要在你的机器上安装 Ruby. 请先阅读[安装指南](https://jekyllrb.com/docs/installation/)并按照操作系统的说明进行操作.

安装并配置完 Ruby 之后就可以开始安装 Jekyll 了. 打开终端并键入以下命令:

```sh
gem install jekyll bundler
```

然后需要创建一个 `Gemfile` 来配置项目所需的依赖项:

```sh
bundle init
```

现在打开 `Gemfile` 并且在其中加入 Jekyll 的依赖项:

```ruby
gem "jekyll"
```

最后执行 `bundle` 命令来为你的项目安装 Jekyll.

之后本教程列出的所有命令你执行的时候都需要在前面加上 `bundle exec ` 来确保你使用的 Jekyll 版本是 `Gemfile` 中定义的.

### 创建一个网站

是时候来创建一个网站了! 首先为你的网站创建一个目录, 你可以起一个你喜欢的名字. 本教程的其余部分中, 我们称此目录为根目录.

如果你有探索精神, 你也可以在这里初始化一个 Git 仓库. 这是一件好事, 因为 Jekyll 没有数据库, 所有的内容和站点结构都是 Git 仓库的版本化文件. 使用一个仓库完全是可选的, 但这是一个很好的习惯. 你可以阅读 [Git 手册](https://guides.github.com/introduction/git-handbook/) 了解更多相关的信息.

我们来创建第一个文件. 在根目录中创建一个 `index.html`, 内容如下:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Home</title>
  </head>
  <body>
    <h1>Hello World!</h1>
  </body>
</html>
```

### 构建

Jekyll 是一个静态网站生成器, 所以在我们看到网站的最终效果之前需要先用 Jekyll 构建它. 你可以在根目录运行以下两个命令来构建你的站点:

- `jekyll build` - 构建网站并在 `_site` 目录中生成静态站点文件.
- `jekyll serve` - 做同样的事情, 并且在 `http://localhost:4000` 运行一个 web 服务. 每当你修改文件, 都会自动重新构建.

当处于开发状态时你应该使用 `jekyll serve` 这样每当你改变文件时它都会自动更新.

运行 `jekyll serve` 命令, 然后在浏览器中访问 `http://localhost:4000` 你就可以看到 "Hello World!" 了.

好吧, 你可能在想这有什么意义? Jekyll 只是把一个 HTML 文件从一个地方复制到了另一个地方. 耐心点, 小可爱, 下面还有很多东西要学呢!

## 2. Liquid

有了 Liquid, Jekyll 就开始变得有趣了. Liquid 是一个模板语言, 它有以下几部分: **对象(object)**, **标签(tags)**和**过滤器(filters)**.

### 对象

对象告诉 Liquid 在哪输出内容. 它由一对双花括号(`{{`和`}}`)标识. 例如:

```liquid
{{ page.title }}
```

它会输出在当前页面的一个叫 `page.title` 的变量.

### 标签

标签为模板创建逻辑和控制流. 它由一个花括号后跟一个百分号标识: `{%` 和 `%}`. 例如

```liquid
{% if page.show_sidebar %}
  <div class="sidebar">
    sidebar content
  </div>
{% endif %}
```

它会输出那个侧边栏如果 `page.show_sidebar` 为真. 你可以看[这里](https://jekyllrb.com/docs/liquid/tags/)了解更多有关 Jekyll 标签的信息.

### 过滤器

过滤器会改变 Liquid 对象的输出, 它在输出中使用并且用竖线 `|` 隔开. 例如:

```liquid
{{ "hi" | capitalize }}
```

它会输出 `Hi`. 你可以看[这里](https://jekyllrb.com/docs/liquid/tags/)了解更多有关 Jekyll 过滤器的信息.

### 使用 Liquid

现在轮到你动手操作了. 把你页面中的 "Hello World!" 转换成小写字母:

```liquid
<h1>{{ "Hello World!" | downcase }}</h1>
```

为了让 Jekyll 能够解析 Liquid 语句, 我们还需要在文件头部添加一段**头信息(front matter)**:

```yaml
---
# front matter tells Jekyll to process Liquid
---
```

这样 "Hello World!" 就会转换成小写字母显示了.

现在看上去好像没什么, 但是结合 Liquid 和 Jekyll 的其他特性就能实现很多强大的功能.

为了看到 Liquid 过滤器 `downcase` 的效果, 我们添加了一段头信息. 那么什么是头信息呢? 往下看.

## 3. 头信息(Front Matter)

头信息是一段写在文件头部的 [YAML](http://yaml.org/), 它夹在两段三连杠中间. 头信息用来设置这个页面的相关变量, 例如:

```yaml
---
my_number: 5
---
```

头信息中的变量可以通过 Liquid 在 `page` 变量中获取. 比如说输出上面的变量就可以这样用:

```liquid
{{ page.my_number }}
```
### 使用头信息

现在我们来改变 `<title>`, 使用头信息中的变量填充它:

```html
---
title: Home
---
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>{{ page.title }}</title>
  </head>
  <body>
    <h1>{{ "Hello World!" | downcase }}</h1>
  </body>
</html>
```

你可能还是会问为什么要这样做, 这样写的代码比用纯 HTML 还要多. 很快, 下一步你就会知道这样做的理由了.

## 4. 布局(Layout)

一个网站通常由多个页面组成, 我们的网站也不例外.

Jekyll 支持 [Markdown](https://daringfireball.net/projects/markdown/syntax) 和 HTML. 对于简单内容的网页(包含标题, 段落和图片)来说, Markdown 是一个很好地选择, 它比 HTML 要精简得多. 在下个页面中我们来尝试使用它.

在根目录下创建 `about.md` 作为我们的"关于"页面.

为了构建网页结构, 你可以复制 `index.html` 并且修改它, 但是问题是这样做会带来重复的代码. 假如你想为你的网站添加样式表, 那么你需要修改每个页面的 `<head>`, 在其中添加样式表. 如果你的网站只有两页面还好, 可是想象一下如果你的网站有 100 个页面时该怎么办. 即使是很简单的修改也要花费相当长的时间.

### 创建一个布局

使用布局是一个更好的选择. 布局是一个模板, 它会包住你的内容. 它们放在 `_layouts` 目录中.

在 `_layouts/default.html` 创建你的第一个布局, 内容如下:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>{{ page.title }}</title>
  </head>
  <body>
    {{ content }}
  </body>
</html>
```

你会注意到它跟 `index.html` 很像, 除了没有头信息, 并且它的内容被 `content` 变量替换了. `content` 是一个特殊变量, 它代表了调用这个布局的页面的内容.

要让 `index.html` 使用这个布局, 你可以在头信息中设置变量 `layout`. 布局会包住页面的全部内容, 因此你要做的仅仅是:

```html
---
layout: default
title: Home
---
<h1>{{ "Hello World!" | downcase }}</h1>
```

这么做了之后, 输出就会跟之前完全一样. 注意你可以在布局中访问到这个页面的头信息中的变量. 在这个例子中, `title` 就是在 index 页面的头信息中定义的, 但是是在布局中输出的.

### "关于"页面

回到我们的"关于"页面. 现在你不需要复制 `index.html`, 而是可以使用布局.

在 `about.md` 中加入以下内容:

```md
---
layout: default
title: About
---
# About page

This page tells you a little bit about me.
```

在浏览器中打开 [http://localhost:4000/about.html](http://localhost:4000/about.html) 来看看你的新页面吧. 恭喜! 你现在有了一个有着两个页面的网站了. 但是你如何从一个页面跳转到另一个页面呢？ 接着往下看.

## 5. 包含(Includes)

网站慢慢成形了; 但是现在没法从一个页面跳转到另一个页面. 现在我们来解决这个问题.

导航栏需要放在每个页面上, 所以我们可以把它放在布局的相应位置. 不过与其直接添加在布局里, 不如借此机会来学习一下包含.

### 包含标签

`include` 标签语序你包含另一个保存在 `_includes` 文件夹下文件的内容. 这对于在网站中需要重复使用的代码非常有用, 并且能够提高代码的可读性.

导航栏的代码有时会比较复杂, 所以把它移到 `_includes` 里是一个比较好的做法.

### 使用方法

在 `_includes/navigation.html` 为导航栏创建一个文件, 内容如下:

```html
<nav>
  <a href="/">Home</a>
  <a href="/about.html">About</a>
</nav>
```

我们来尝试使用包含标签把导航栏加到 `_layouts/default.html` 中:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>{{ page.title }}</title>
  </head>
  <body>
    {% include navigation.html %}
    {{ content }}
  </body>
</html>
```

在浏览器中打开 [http://localhost:4000/about.html](http://localhost:4000/about.html) 并尝试切换页面吧.

### 让当前页面高亮

现在让我们更进一步, 在导航栏中让当前页面高亮.

`_includes/navigation.html` 需要知道当前插入页面的 URL 从而添加相应的样式. Jekyll 提供了一些很有用的变量, 其中一个就是 `page.url`

使用 `page.url` 你可以检查一个链接是否是当前页面的, 从而改变它的颜色:

```html
<nav>
  <a href="/" {% if page.url == "/" %}style="color: red;"{% endif %}>
    Home
  </a>
  <a href="/about.html" {% if page.url == "/about.html" %}style="color: red;"{% endif %}>
    About
  </a>
</nav>
```

打开 [http://localhost:4000/about.html](http://localhost:4000/about.html) 看看当前页面的红色链接吧.

这样还是有很多重复: 如果你在导航栏内加入新元素, 或者改变高亮的颜色. 下一步我们将解决这个问题.

## 6. 数据文件

Jekyll 支持从位于 `_data` 目录下的 YAML, JSON 和 CSV 文件中加载数据. 数据文件是一种将内容与源代码分离的好方法, 它可以使网站更易于维护.

在这一步教程中你将把导航栏的内容存储在数据文件中, 然后在导航栏里遍历它们.

### 使用方法

在 Ruby 的生态中, YAML 是一种通用的格式. 你将使用它来存储一系列导航项, 包括它们的名字和链接.

在 `_data/navigation.yml` 为导航栏创建一个数据文件, 内容如下:

```yaml
- name: Home
  link: /
- name: About
  link: /about.html
```

Jekyll 会让你能够在变量 `site.data.navigation` 中拿到这些数据. 现在我们不必把每个链接都写到 `_includes/navigation.html` 中, 而是可以遍历数据文件:

```html
<nav>
  {% for item in site.data.navigation %}
    <a href="{{ item.link }}" {% if page.url == item.link %}style="color: red;"{% endif %}>
      {{ item.name }}
    </a>
  {% endfor %}
</nav>
```

输出和之前一模一样. 不同的是现在添加新的导航栏元素和改变 HTML 结构变得容易了.

没有 CSS, JS 和图片怎么算得上好网站呢? 接下来我们来看看在 Jekyll 中如何处理它们.

## 7. 资源文件

使用 CSS, JS, 图片和其他资源对 Jekyll 来说很简单. 把它们放在网站的文件夹下, 它们将复制到构建的站点中.

Jekyll 站点通常使用这样的结构来保存资源文件:

```
.
├── assets
|   ├── css
|   ├── images
|   └── js
```

### Sass

像 `_includes/navigation.html` 一样使用行内 CSS 不是一个最好的做法. 我们使用 class 来确定当前页面的样式:

```html
<nav>
  {% for item in site.data.navigation %}
    <a href="{{ item.link }}" {% if page.url == item.link %}class="current"{% endif %}>{{ item.name }}</a>
  {% endfor %}
</nav>
```

你可以使用标准的 CSS 来定义样式, 不过我们会更进一步: 使用 Sass. Sass 是 CSS 在 Jekyll 中的一个极好的扩展.

首先在 `/assets/css/styles.scss` 创建一个 Sass 文件, 内容如下:

```sass
---
---
@import "main";
```

文件头部空的头信息告诉 Jekyll 它需要处理这个文件. `@import "main"` 告诉 Sass 在 sass 的目录(默认为你网站的根目录下的`_sass/`)下寻找一个叫 `main.scss` 文件.

在这一步你将有一个主 css 文件. 对于大型项目来说, 这是一个很好的维护 CSS 文件组织结构的方式.

在 `/_sass/main.scss` 创建一个 Sass 文件, 内容如下:

```sass
.current {
  color: green;
}
```

你需要在布局中应用这个样式表. 打开 `_layouts/default.html` 并在 `<head>` 中加入样式表:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>{{ page.title }}</title>
    <link rel="stylesheet" href="/assets/css/styles.css">
  </head>
  <body>
    {% include navigation.html %}
    {{ content }}
  </body>
</html>
```

打开 [http://localhost:4000/about.html](http://localhost:4000/about.html) 检查下当前连接是不是绿色的.

下一步我们来看 Jekyll 最受欢迎的一个功能, 博客.

## 8. 博客

你可能想知道如何才能搞一个不使用数据库的博客. 在真正的 Jekyll 风格中, 博客仅仅由文本文件驱动.

### 帖子

博客的帖子存在于一个叫 `_posts` 的文件夹下. 帖子的文件名有着特殊的格式: 一个发布日志, 一个标题, 后跟一个扩展名.

在 `_posts/2018-08-20-bananas.md` 创建你的第一篇帖子, 内容如下:

```markdown
---
layout: post
author: jill
---
A banana is an edible fruit – botanically a berry – produced by several kinds
of large herbaceous flowering plants in the genus Musa.

In some countries, bananas used for cooking may be called "plantains",
distinguishing them from dessert bananas. The fruit is variable in size, color,
and firmness, but is usually elongated and curved, with soft flesh rich in
starch covered with a rind, which may be green, yellow, red, purple, or brown
when ripe.
```

这就像你之前创建的 `about.md` 一样, 只不过它有一个作者和一个不同的布局. `author` 是一个自定义的变量, 它不是必须的, 你也可以起一个别的名字比如 `creator`.

### 布局

`post` 布局并不存在, 所以你需要在 `_layouts/post.html` 创建它, 内容如下:

```html
---
layout: default
---
<h1>{{ page.title }}</h1>
<p>{{ page.date | date_to_string }} - {{ page.author }}</p>

{{ content }}
```

这是一个布局继承的例子. 它输出标题, 日期, 作者和正文; 整个布局又会被 `default` 布局包住.

注意到过滤器 `date_to_string`, 它会把日期格式化成一个更好的格式.

### 帖子列表

现在还没法访问到帖子. 通常来说博客都有一个页面来列出所有的帖子. 接下来我们来做这个.

Jekyll 提供了 `site.posts` 变量可以访问到所有的帖子.

在根目录创建 `blog.html`, 内容如下:

```html
---
layout: default
title: Blog
---
<h1>Latest Posts</h1>

<ul>
  {% for post in site.posts %}
    <li>
      <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
      <p>{{ post.excerpt }}</p>
    </li>
  {% endfor %}
</ul>
```

这段代码中有几个需要注意的地方:
- `post.url` 被 Jekyll 自动设置, 输出这篇帖子的路径
- `post.title` 标题, 从帖子的文件名中提取, 也可以在被头信息中的 `title` 变量覆盖
- `poet.excerpt` 摘要, 默认为帖子的第一段

你还需要把这个页面放到导航栏里. 打开 `_data/navigation.yml` 为博客页面添加条目:

```yaml
- name: Home
  link: /
- name: About
  link: /about.html
- name: Blog
  link: /blog.html
```

### 更多的帖子

只有一篇帖子的博客不够一颗赛艇. 来添加更多吧!

`_posts/2018-08-21-apples.md`:

```markdown
---
layout: post
author: jill
---
An apple is a sweet, edible fruit produced by an apple tree.

Apple trees are cultivated worldwide, and are the most widely grown species in
the genus Malus. The tree originated in Central Asia, where its wild ancestor,
Malus sieversii, is still found today. Apples have been grown for thousands of
years in Asia and Europe, and were brought to North America by European
colonists.
```

`_posts/2018-08-22-kiwifruit.md`:

```markdown
---
layout: post
author: ted
---
Kiwifruit (often abbreviated as kiwi), or Chinese gooseberry is the edible
berry of several species of woody vines in the genus Actinidia.

The most common cultivar group of kiwifruit is oval, about the size of a large
hen's egg (5–8 cm (2.0–3.1 in) in length and 4.5–5.5 cm (1.8–2.2 in) in
diameter). It has a fibrous, dull greenish-brown skin and bright green or
golden flesh with rows of tiny, black, edible seeds. The fruit has a soft
texture, with a sweet and unique flavor.
```

打开 [http://localhost:4000/about.html](http://localhost:4000/about.html) 浏览下你的博客吧.

下一步我们将专注于为每篇帖子的作者创建一个页面.

## 9. 集合(Collections)

现在我们来专注于作者们, 为每个作者创建一个自己的页面, 其中有他们的简介和他们发表的文章.

为了做到这点你需要使用**集合(collections)**. 集合跟帖子很像, 不过他们不必像帖子一样根据日期分组.

### 配置

你需要告诉 Jekyll 你要使用集合. Jekyll 的配置信息默认在一个叫 `_config.yml` 的文件中.

在根目录创建文件 `_config.yml`, 内容如下:

```yaml
collections:
  authors:
```

为了重新加载配置文件, 你需要重启 Jekyll. 在终端按下 `Ctrl` + `C` 来关闭服务器, 然后键入 `jekyll serve` 重启它.

### 添加作者

**文档(documents)**(也就是集合的元素)放在根目录下的一个叫 `_*collection_name*` 的文件夹中. 对于这个例子来说是 `_authors`.

为每个作者创建一个文档:

`_authors/jill.md`:

```markdown
---
short_name: jill
name: Jill Smith
position: Chief Editor
---
Jill is an avid fruit grower based in the south of France.
```

`_authors/ted.md`:

```markdown
---
short_name: ted
name: Ted Doe
position: Writer
---
Ted has been eating fruit since he was baby.
```

### 作者页面

我们现在添加一个页面来列出这个网站的所有作者页面. Jekyll 提供了 `site.authors` 变量可以拿到集合(也就是这个例子中所有的作者页面).

创建 `staff.html` 并遍历 `site.authors` 来输出所有的作者:

```html
---
layout: default
title: Staff
---
<h1>Staff</h1>

<ul>
  {% for author in site.authors %}
    <li>
      <h2>{{ author.name }}</h2>
      <h3>{{ author.position }}</h3>
      <p>{{ author.content | markdownify }}</p>
    </li>
  {% endfor %}
</ul>
```

因为页面的内容是 markdown, 所以你需要使用过滤器 `markdownify`. 这会在当你在布局中使用 `{{ content }}` 时自动执行.

你还需要把这个页面放到导航栏里. 打开 `_data/navigation.yml` 为作者页面添加条目:

```yaml
- name: Home
  link: /
- name: About
  link: /about.html
- name: Blog
  link: /blog.html
- name: Staff
  link: /staff.html
```

### 输出一个页面

默认情况下, 文档不会输出页面. 在这个例子中我们希望每个作者都有他们自己的页面, 所以我们需要稍加修改配置文件. 打开 `_config.yml` 在 `author` 下增加 `output: true`:

```yaml
collections:
  authors:
    output: true
```

这样你可以使用 `author.url` 链接到输出的页面了. 在 `staff.html` 中增加链接:

```html
---
layout: default
title: Staff
---
<h1>Staff</h1>

<ul>
  {% for author in site.authors %}
    <li>
      <h2><a href="{{ author.url }}">{{ author.name }}</a></h2>
      <h3>{{ author.position }}</h3>
      <p>{{ author.content | markdownify }}</p>
    </li>
  {% endfor %}
</ul>
```

跟帖子一样, 你将需要为作者页面添加布局. 创建布局文件 `_layouts/author.html`, 内容如下:

```html
---
layout: default
---
<h1>{{ page.name }}</h1>
<h2>{{ page.position }}</h2>

{{ content }}
```

### 默认的头信息

现在你需要把作者页面的布局配置为 `author`. 你可以直接编辑每个作者页面的头信息就像之前做的那样, 但是这样太重复了.

你真正想要的是帖子自动使用 `post` 布局, 作者页面自动使用 `author` 布局, 所有的东西都应该有个默认值.

你可以使用[默认头信息](https://jekyllrb.com/docs/configuration/front-matter-defaults/)来做到这一点.

你需要设置默认值适用的范围, 然后设置你想要的默认头信息.

在 `_config.yml` 中配置默认的布局:

```yaml
collections:
  authors:
    output: true

defaults:
  - scope:
      path: ""
      type: "authors"
    values:
      layout: "author"
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"
  - scope:
      path: ""
    values:
      layout: "default"
```

现在你就可以删除所有帖子的头信息中布局配置了. 注意每次你修改 `_config.yml` 你都需要重启 Jekyll 才能是更改生效.

### 列出作者的帖子

现在我们在页面上来列出作者发布的所有帖子. 为了做到这一点你需要把作者页面的 `short_name` 和帖子的 `author` 相匹配. 你可以使用过滤器来按作者筛选文章.

在 `_layouts/author.html` 中遍历筛选过后的列表来输出作者的帖子:

```html
---
layout: default
---
<h1>{{ page.name }}</h1>
<h2>{{ page.position }}</h2>

{{ content }}

<h2>Posts</h2>
<ul>
  {% assign filtered_posts = site.posts | where: 'author', page.short_name %}
  {% for post in filtered_posts %}
    <li><a href="{{ post.url }}">{{ post.title }}</a></li>
  {% endfor %}
</ul>
```

### 链接到作者页

现在帖子都引用了作者, 所以我们把它链接到作者的页面. 你同样可以在 `_layouts/post.html` 使用过滤器技术:

```html
---
layout: default
---
<h1>{{ page.title }}</h1>

<p>
  {{ page.date | date_to_string }}
  {% assign author = site.authors | where: 'short_name', page.author | first %}
  {% if author %}
    - <a href="{{ author.url }}">{{ author.name }}</a>
  {% endif %}
</p>

{{ content }}
```

打开 [http://localhost:4000/about.html](http://localhost:4000/about.html) 来浏览作者页和与其链接的帖子, 检查所有的链接是否正确.

接下来就是这个教程最后一步了, 我们将对这个网站最最后的打磨并准备部署到生产环境.

## 10. 部署

在最后一步我们将准备把网站部署到生产环境.

### Gemfile

最好为你的网站准备一个 [Gemfile](https://jekyllrb.com/docs/ruby-101/#gemfile). 它可以保证你的 Jekyll 和其他 gem 依赖的版本在各个环境下的保持一致.

在根目录创建一个 `Gemfile`, 内容如下:

```gemfile
source 'https://rubygems.org'

gem 'jekyll'
```

> 译者注: 国内用户建议使用 `source "https://gems.ruby-china.com/"`

在你的终端运行 `bundle install`. 这会安装响应的 gem 包并且创建 `Gemfile.lock`, 它会为将来再次运行 `bundle install` 锁定当前 gem 包的版本. 如果你之后想更新 gem 包的版本你可以运行 `bundle update`.

当你使用了 `Gemfile` 之后, 我们推荐你在运行像 `jekyll serve` 这样的命令时前面加上 `bundle exec`. 所以完整的命令就是:

```sh
bundle exec jekyll serve
```

这会约束你的 Ruby 环境只使用 `Gemfile` 中指定的 gem 包.

### 插件

Jekyll 插件允许你创建自定义的内容特定于你的网站. 有很多[插件](https://jekyllrb.com/docs/plugins/)可供你使用, 你甚至可以自己写一个.

有三个官方插件在几乎所有的 Jekyll 网站上都很有用:
- [jekyll-sitemap](https://github.com/jekyll/jekyll-sitemap) - 创建一个站点地图来帮助搜索引擎索引内容.
- [jekyll-feed](https://github.com/jekyll/jekyll-feed) - 为你的帖子创建 RSS 订阅
- [jekyll-seo-tag](https://github.com/jekyll/jekyll-seo-tag) - 添加元标记以帮助搜索引擎优化

要想使用这些插件你需要先把他们加到你的 `Gemfile` 中. 如果你把他们放到一个 `jekyll_plugins` 组里, 他们就会被自动加入到 Jekyll 中.

```gemfile
source 'https://rubygems.org'

gem 'jekyll'

group :jekyll_plugins do
  gem 'jekyll-sitemap'
  gem 'jekyll-feed'
  gem 'jekyll-seo-tag'
end
```

然后把以下这些加入到你的 `_config.yml` 中:

```yaml
plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-seo-tag
```

现在运行 `bundle update` 安装它们.

`jekyll-sitemap` 不需要任何配置, 它会在你构建网站时自动创建.

对于 `jekyll-feed` 和 `jekyll-seo-tag` 来说, 你还需要在 `_layouts/default.html` 增加几个 tag:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>{{ page.title }}</title>
    <link rel="stylesheet" href="/assets/css/styles.css">
    {% feed_meta %}
    {% seo %}
  </head>
  <body>
    {% include navigation.html %}
    {{ content }}
  </body>
</html>
```

重启 Jekyll 服务, 检查下这些 tag: 是否都加到 `<head>` 中了.

### 环境

有时你可能希望在生产环境下输出某些内容但是不希望在开发环境输出它们. 分析脚本就是其中最常见的例子.

为了做到这一点你可以使用[环境](https://jekyllrb.com/docs/configuration/environments/). 你可以在你执行命令的时候设置环境变量 `JEKYLL_ENV`. 例如:

```sh
JEKYLL_ENV=production bundle exec jekyll build
```

默认情况下 `JEKYLL_ENV` 为 `development`. `JEKYLL_ENV` 的值可以在 Liquid 中通过变量 `jekyll.environment` 获取. 所以要使分析脚本仅在生产环境中输出, 你需要执行以下操作:

```liquid
{% if jekyll.environment == "production" %}
  <script src="my-analytics-script.js"></script>
{% endif %}
```

### 部署

最后一步就是把你的网站放到生产服务器上了. 最基础的方法是运行一次生产构建:

```sh
JEKYLL_ENV=production bundle exec jekyll build
```

然后把 `_site` 下的内容放到你的服务器上.

一个更好的办法是使用 [CI](https://jekyllrb.com/docs/deployment/automated/) 或者 [第三方工具](https://jekyllrb.com/docs/deployment/third-party/) 自动完成这一步.

### 总结

这个手把手 Jekyll 教程到这里就要结束了, 现在开始你的 Jekyll 之旅吧!

- 来[社区论坛](https://talk.jekyllrb.com/)打个招呼
- 通过参与[贡献](https://jekyllrb.com/docs/contributing/)帮助 Jekyll 做得更好
- 坚持建设 Jekyll 网站!

