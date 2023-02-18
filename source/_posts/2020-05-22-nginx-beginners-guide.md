---
key: 32
title: "[翻译] Nginx 入门指南"
tag:
    - translations
    - tools
---
> 本文由 Luyu Huang 翻译, 原文地址 [http://nginx.org/en/docs/beginners_guide.html](http://nginx.org/en/docs/beginners_guide.html). 欢迎提 [issue](https://github.com/luyuhuang/luyuhuang.github.io/issues) 来帮助我改进翻译

本文给出一个 nginx 的基本介绍并展示一些能用 nginx 实现的简单例子. 这里假设你的机器上已经安装好了 nginx, 如果没有, 请先参见 [nginx 安装](http://nginx.org/en/docs/install.html). 本文介绍如何启动和停止 nginx, 如何重新加载配置, 介绍配置文件的结构以及介绍如何设置 nginx 来提供静态内容服务, 如何配置 nginx 作为代理服务器, 还有如何连接 FastCGI 应用.

Nginx 由一个主进程(master process)和若干个工作进程(worker process)组成. 主进程的作用是读取并解析配置, 以及管理工作进程. 工作进程实际处理请求. Nginx 使用基于事件的模型并依赖操作系统的机制以高效地在工作进程间分配请求. 工作进程的数量定义在配置文件中, 可以是一个固定配置的数量, 也可以根据 CPU 的核心数自动调整 (见 [worker_processes](http://nginx.org/en/docs/ngx_core_module.html#worker_processes))

Nginx 和它的各个模块的工作方式取决于配置文件. 默认情况下, 配置文件名为 `nginx.conf`, 位于目录 `/usr/local/nginx/conf`, `/etc/nginx` 或 `/usr/local/etc/nginx` 中.

### 启动, 停止, 以及重新加载配置

直接运行可执行文件即可启动 nginx. 一旦启动, 就可以通过运行可执行文件并附上 `-s` 参数来对其进行控制. 使用如下的语法:

```bash
nginx -s signal
```

其中 `signal` 可能是如下的几个值之一:

- `stop` -- -- 快速停止
- `quit` -- -- 优雅地停止
- `reload` -- -- 重新加载配置文件
- `reopen` -- -- 重新打开日志文件

例如, 要停止 nginx 进程并等待工作进程处理完当前请求, 应该执行以下命令:

```bash
nginx -s quit
```

> 此命令应在启动 nginx 的同一用户下执行.

在重新加载配置的命令发送到 nginx 或重新启动它之前, 对配置文件所做的修改是不会生效的. 要重新加载配置, 应当执行:

```bash
nginx -s reload
```

一旦主进程收到了重新加载配置的信号, 它首先会检查新配置文件语法的有效性并尝试应用配置. 如果成功了, 主进程就会先启动一组新的工作进程并且向旧的工作进程发送消息, 要求他们关闭. 否则, 主进程会回滚修改并继续使用旧的配置. 旧的进程收到主进程发送的关闭消息时, 会停止接受新的连接并继续为当前请求提供服务, 直到所有的请求结束; 在这之后, 旧的进程才会退出.

信号也可以通过诸如 `kill` 之类的 Unix 命令发送给 nginx 进程. 这样的话信号会直接发送给具有给定进程 ID 的进程. 默认情况下, nginx 主进程的进程 ID 会被写入 `nginx.pid` 文件中, 位于目录 `/usr/local/nginx/logs` 或 `/var/run`. 例如, 主进程的进程 ID 为 1628, 要发送 QUIT 信号让 nginx 优雅地关闭, 执行:

```bash
kill -s QUIT 1628
```

要列出 nginx 的所有正在运行的进程, 可以使用 `ps` 命令, 如下所示:

```bash
ps -ax | grep nginx
```

有关将信号发送到 nginx 的更多信息，请参见[控制 nginx](http://nginx.org/en/docs/control.html).

### 配置文件的结构

Nginx 由一系列模块组成, 它们由配置文件中指定的一系列指令(directive)控制. 指令可以分为简单指令和块指令(block directive). 简单指令由一个名字和若干个参数组成, 它们之间由空格分隔, 并以一个分号 (`;`) 结束. 块指令有着与简单指令相同的结构, 但不是以分号结尾, 而是附加一组由花括号(`{` 和 `}`)包裹的附加指令. 如果一个块指令可以在括号内包含其他指令, 则称之为上下文(context) (例如: [events](http://nginx.org/en/docs/ngx_core_module.html#events), [http](http://nginx.org/en/docs/http/ngx_http_core_module.html#http), [server](http://nginx.org/en/docs/http/ngx_http_core_module.html#server), 和 [location](http://nginx.org/en/docs/http/ngx_http_core_module.html#location)).

在配置文件中位于任何上下文之外的指令被认为在 [main](http://nginx.org/en/docs/ngx_core_module.html) 上下文中. `events` 和 `http` 指令就在 `main` 上下文中, `server` 在 `http` 中, `location` 在 `server` 中.

`#` 号后的其余行被视为注释.

### 静态内容服务

Web服务器的一项重要任务就是分发文件(例如图像或静态HTML页面). 你将实现的一个例子要根据不同的请求从不同的本地目录中提供文件: `/data/www` (其中可能包含 HTML 文件) 和 `/data/images` (包含图片). 这需要你编辑配置文件并设置一个在 [http](http://nginx.org/en/docs/http/ngx_http_core_module.html#http) 块中的 [server](http://nginx.org/en/docs/http/ngx_http_core_module.html#server) 块, 其中又包含两个 [location](http://nginx.org/en/docs/http/ngx_http_core_module.html#location) 块.

首先, 创建 `/data/www` 目录并将包含任意文本内容的 `index.html` 文件放入其中, 然后创建 `data/images` 目录, 将一些图片放入其中.

接下来, 打开配置文件. 默认的配置文件已经包含了一些 `server` 块的例子, 大部分被注释掉了. 现在我们注释掉所有的这些块并新建一个新的 `server` 块:

```conf
http {
    server {

    }
}
```

通常来说, 配置文件可能包含若干个 `server` 块, 通过它们[监听(listen)](http://nginx.org/en/docs/http/ngx_http_core_module.html#listen)的端口号和[服务器名(server_name)](http://nginx.org/en/docs/http/server_names.html)加以[区分](http://nginx.org/en/docs/http/request_processing.html). 一旦决定了使用哪个 `server` 来处理请求, 它就会测试请求首部所指定的 URI, 将其与 `server` 块中定义的 `location` 块相对照.

在 `server` 块中添加如下的 `location` 块:

```conf
location / {
    root /data/www;
}
```

这个 `location` 块指定了 `"/"` 前缀, 这会与请求中的 URI 相比较. 对于匹配上的请求, 会将它的 URI 追加到 [root](http://nginx.org/en/docs/http/ngx_http_core_module.html#root) 指令所指定的路径后, 也就是 `/data/www`, 以得到访问本地文件系统中文件的路径. 如果匹配上了多个 `location` 块, nginx 会选择前缀最长的一个. 上面的 `location` 块指定了一个最短的前缀, 长度为 1, 所以只有当其他的 `location` 块都匹配失败时, 才会使用这个块.

接下来, 添加第二个 `location` 块:

```conf
location /images/ {
    root /data;
}
```

这将会匹配以 `/images/` 开头的请求 (`location /` 也会匹配这些请求, 但是前缀更短).

`server` 块的最终配置应如下所示:

```conf
server {
    location / {
        root /data/www;
    }

    location /images/ {
        root /data;
    }
}
```

这已经是一个可以工作的服务器配置, 它会监听标准的 80 端口, 可以在本地计算机上通过 `http://localhost/` 访问. 对于以 `/images/` 开头的 URI, 服务器会发送 `/data/images` 目录下的文件作为响应. 如果对应的文件不存在, nginx 会发送 404 错误的响应. 不以 `/images/` 开头的 URI 的请求会映射到 `/data/www` 目录. 例如, 对于 `http://localhost/some/example.html` 的请求 nginx 会发送文件 `/data/www/some/example.html` 作为响应.

要应用新的配置, 如果尚未启动就启动 nginx, 否则执行如下命令给 nginx 主进程发送 `reload` 信号:

```bash
nginx -s reload
```

> 如果某些操作不能按预期进行, 可以尝试在 `/usr/local/nginx/logs` 或 `/var/log/nginx` 目录下的 `access.log` 和 `error.log` 日志文件中查找原因.

### 配置一个简单的代理服务器

Nginx 的一个常见用法是作为代理服务器, 这意味着服务器会接收请求, 将它们转发给被代理的服务器, 然后接收它们的响应并转发给客户端.

我们将配置一个基础的代理服务器, 它会用本地目录下的文件为图片请求提供服务, 并且将其他所有的请求转发给被代理的服务器. 在这个例子中, 两个服务器都将在单个 nginx 实例上定义.

首先, 我们在 nginx 的配置文件中添加一个包含如下内容的 `server` 块来定义被代理的服务器:

```conf
server {
    listen 8080;
    root /data/up1;

    location / {
    }
}
```

这是一个简单的服务器, 监听 8080 端口 (在之前的例子中, 因为使用标准的 80 端口, 所以没有指定 `listen` 指令) 并且将所有的请求映射到本地文件系统的 `/data/up1` 目录下. 创建这个目录并将 `index.html` 文件放入其中. 注意 `root` 指令放在 `server` 上下文中. 当选择用于服务请求的 `location` 块中没有自己的 `root` 指令时, 就会使用 `server` 上下文中的 `root` 指令.

接下来, 使用上一部分中的服务器配置并对其进行修改使其成为代理服务器的配置. 在第一个 `location` 块中, 添加 [proxy_pass](http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass) 指令并在参数中指定被代理服务器的协议, 名字和端口 (在我们的例子中, 它是 `http://localhost:8080`):

```conf
server {
    location / {
        proxy_pass http://localhost:8080;
    }

    location /images/ {
        root /data;
    }
}
```

我们将修改第二个 `location` 块, 它现在是将所有有着 `/images/` 前缀的请求映射到 `/data/images` 目录中, 我们要改成让它匹配典型的图片文件扩展名. 修改后的 `location` 块就像这样:

```conf
location ~ \.(gif|jpg|png)$ {
    root /data/images;
}
```

这里的参数是一个正则表达式, 匹配所有以 `.gif`, `.jpg` 和 `.png` 结尾的 URI. 正则表达式应跟在一个波浪线 `~` 后. 对应的请求会被映射到 `/data/images` 目录中.

当 nginx 要选择一个 `location` 块服务请求时, 它先检查指定前缀的 `location` 指令, 并记住有着最长前缀的 `location` 指令, 然后再检查正则表达式. 如果匹配上了一个正则表达式, nginx 就会选择这个 `location`, 否则选择之前记住的那个.

代理服务器的最终配置如下所示:

```conf
server {
    location / {
        proxy_pass http://localhost:8080/;
    }

    location ~ \.(gif|jpg|png)$ {
        root /data/images;
    }
}
```

这个服务器会过滤所有以 `.gif`, `.jpg` 和 `.png` 结尾的请求并将它们映射到 `/data/images` 目录中 (通过将 URI 追加到 `root` 指定的参数后) 并将其他所有的请求转发给上面配置的被代理的服务器.

要应用新配置, 按照前面几节所说明的方法将重载配置的信号发送给 nginx 即可.

这里有许多[其他指令](http://nginx.org/en/docs/http/ngx_http_proxy_module.html)可用于进一步配置代理连接.

### 配置 FastCGI 代理

Nginx 可以用于将请求路由到 FastCGI 服务器, 它们通常运行着各种框架和编程语言, 比如 PHP.

最基础的能与 FastCGI 应用一起工作的 nginx 配置通常包括使用 [fastcgi_pass](http://nginx.org/en/docs/http/ngx_http_fastcgi_module.html#fastcgi_pass) 指令 (而不是上一节的 `proxy_pass` 指令), 以及 [fastcgi_param](http://nginx.org/en/docs/http/ngx_http_fastcgi_module.html#fastcgi_param) 指令来设置传递给 FastCGI 服务器的参数. 假设 FastCGI 服务器可通过 `localhost:9000` 访问. 以上一节的代理配置为基础, 把 `proxy_pass` 指令替换成 `fastcgi_pass` 指令, 并且把参数修改为 `localhost:9000`. 在 PHP 中, `SCRIPT_FILENAME` 参数用于确定脚本名字, `QUERY_STRING` 参数用于传递请求参数. 结果配置为:

```conf
server {
    location / {
        fastcgi_pass  localhost:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param QUERY_STRING    $query_string;
    }

    location ~ \.(gif|jpg|png)$ {
        root /data/images;
    }
}
```

这将设置服务器将除静态图片之外的所有请求通过 FastCGI 协议路由到 `localhost:9000` 上运行的服务器.
