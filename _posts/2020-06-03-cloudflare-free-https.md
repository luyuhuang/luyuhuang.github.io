---
key: 33
title: 使用 Cloudflare 免费搭建 HTTPS 服务
tag: practice
---
细心的朋友可能发现博客的域名变了. 笔者最近买了一个域名, 让它映射到我的 Github Pages 上. 然后我还在搬瓦工买了一个廉价 VPS 用于搭建一些服务, 比如 RSSHub 和 TTRSS, 同样把域名映射到这上面. 为什么要用域名而不直接使用 IP 地址呢? 一是域名要比 IP 地址好记, 可以使用主机名区分不同的服务 (而不是端口); 二是可以使用 HTTPS. SSL 证书通常很贵, 这里我使用 Cloudflare 的免费代理服务实现免费 HTTPS. 这篇文章总结一下我是怎么做的.

### Cloudflare 代理

HTTPS 证书实在是太贵了, 一个通配符域名证书一年要至少花上一两千. 那么如何满足广大人民群众建站需求呢? Cloudflare 就是一个很好的选择. Cloudflare 是一家 CDN 提供商, 可以为网站提供反向代理. 它的做法是, 将域名解析到 Cloudflare 的服务器 (或者说代理) 上, 然后浏览器使用 Cloudflare 的证书与代理建立 SSL 连接; 接着代理会与目标服务器使用自签名的证书建立 SSL 连接, 接下来的数据都由代理转发. Cloudflare 会信任这个自签名证书, 所以整个过程都是没问题的.

![cloudflare](/assets/images/cloudflare_1.png)

由于浏览器到代理的连接和代理到服务器的连接都是加密认证的, 所以这两个连接都是安全的, 不怕窃听和篡改. 唯一的问题就是, Cloudflare 成了中间人. 鉴于我们搭建的只是用于个人用途的小网站, 且 Cloudflare 也是跨国大公司, 我们可以认为这个中间人是信得过的. 事实上, 有大量的网站都在使用 Cloudflare, 包括 V2EX, 萌娘百科, TTRSS 官网等. 我们在网上冲浪的时候时常会看到的如下的错误信息, 就是因为站点使用了 Cloudflare 作代理, 但是代理背后的目标服务器挂掉了.

![server error](/assets/images/cloudflare_2.png)

### 域名与 DNS 解析服务

首先需要注册一个域名, 可以在阿里云或者腾讯云等平台注册. 域名相对比较便宜, 笔者的这个域名 69 元人民币 3 年. 需要说明的是, 域名与 DNS 解析服务是不一样的, 注册域名只是向机构交钱把这个域名注册到你名下, 为了把域名映射到 IP 地址, 还需要 DNS 解析服务. 不过现在的各大平台都提供免费的 DNS 解析服务, 比如在阿里云购买域名之后, 点击 "解析" 进入阿里云的域名解析控制台, 就可以看到虽然基础的解析服务是免费的, 但还是有一些高级功能需要额外付费的. 不过这不重要, 因为我们要使用 Cloudflare 的 DNS 解析服务.

首先注册一个 Cloudflare 账号, 然后输入你的域名, 选择免费计划 (土豪随意), 然后它会要你到你的域名注册商将 DNS 解析服务地址改为 Cloudflare 的 DNS 地址. 以阿里云为例, 进入域名控制台, 选择 "DNS 修改" 并点击 "修改 DNS 服务器" 把原来的阿里云的 DNS 服务器修改为 Cloudflare 的 DNS 服务器. 修改生效需要等待一段时间, 完成后 Cloudflare 会以邮件通知你修改生效了.

### 将域名解析到 Github Pages

进入 Cloudflare 的 DNS 控制台, 我们就可以为域名添加解析记录了. 为了将域名解析到 Github Pages, 我们添加一条 CNAME 记录, 将内容设为对应的 Github Pages 的域名, 比如说:

![server error](/assets/images/cloudflare_3.png)

Again, Cloudflare 会为我们的服务做代理, 所以无论是 A 记录还是 CNAME 记录, 实际都会解析到 Cloudflare 的代理服务器上. 这个时候如果我们直接那这个域名访问, Github Pages 是会返回 404 的. 因为这样的话 HTTP 请求的 HOST 首部是我们的自定义域名, Github Pages 不认. 所以我们还要在 Github Pages 的设置中告诉 Github 使用自定义域名:

![server error](/assets/images/cloudflare_4.png)

这样就可以使用我们的域名访问 Github Pages 了. 为了提高安全性, 还应该在 Cloudflare 的 SSL/TLS 设置中开启 Always Use HTTPS.

### 将域名解析到 VPS

在 Cloudflare 的 DNS 控制台中添加一条 A 记录将内容设置为 VPS 的 IP 地址即可把域名解析到对应的 VPS 了. 不过在此之前, 我们还应该在 VPS 上搭建 HTTP 服务, 要不然解析了也没东西可访问. 这里笔者使用 Nginx. 稍后可以看到, 我们会配置 Nginx 为 RSSHub 和 TTRSS 作反向代理. 直接使用源码编译 Nginx 有时是个好主意, 因为这样比较好控制.

```bash
# install dependencies
apt update
apt install -y gcc make zlib1g-dev libpcre3-dev libssl-dev

# download nginx
wget http://nginx.org/download/nginx-1.18.0.tar.gz # replace with any version you like
tar -zxvf nginx-1.18.0.tar.gz
cd nginx-1.18.0

# build
mkdir -p /data/nginx # installation directory
./configure --prefix=/data/nginx --with-http_ssl_module
make && make install
```

然后启动 Nginx, 在浏览器中用 IP 地址访问, 看到 "Welcome to nginx!" 就说明安装成功了.

接下来我们让 Cloudflare 将域名解析到 VPS. 正如前面提到的, 我们要让 Cloudflare 与 VPS 之间建立 SSL 连接. 首先要创建证书. 在 SSL/TLS 下选择 Origin Server, 点击 Create Certificate. 这里我直接让 Cloudflare 生成私钥和证书, 然后设置好域名和有效期, 点击下一步就能生成私钥和证书了. 将私钥(Private key)存为文件 `cert.key` 并将证书(Origin Certificate)存为文件 `cert.pem`, 都放在 Nginx 的 `conf` 目录下, 然后编辑 Nginx 配置文件配置一个 HTTPS 服务:

```conf
server {
    listen       443 ssl;
    server_name  localhost;

    ssl_certificate      cert.pem;
    ssl_certificate_key  cert.key;

    ssl_session_cache    shared:SSL:1m;
    ssl_session_timeout  5m;

    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers  on;

    location / {
        root   html;
        index  index.html index.htm;
    }
}
```

然后在 Cloudflare 的 DNS 控制台添加一条 A 记录将内容设置为 VPS 的 IP 地址就可以了. 这样在浏览器中使用域名访问也能看到熟悉的 "Welcome to nginx!" 了.

最后要注意的是, 一定要打开防火墙. 在 Ubuntu 上通常使用 ufw 防火墙.

```bash
apt install ufw # install ufw
ufw default deny # default deny all
ufw allow 22/tcp # allow ssh
ufw allow 443/tcp # allow https
ufw enable # enable ufw
```

可以使用 `ufw status verbose` 查看防火墙状态.

```
# ufw status verbose
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), deny (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
22/tcp                  ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
22/tcp (v6)             ALLOW IN    Anywhere (v6)
443/tcp (v6)               ALLOW IN    Anywhere (v6)
```

### 搭建 RSSHub 和 TTRSS 服务

最简单的做法就是使用 Docker 了. 首先安装好 Docker, 对于 RSSHub, 可参照[官方文档](https://docs.rsshub.app/install/), 下载它的 `docker-compose.yml` 然后执行 `docker-compose up -d` 即可. **且慢!** 这里有一个大问题, Docker 是有坑的, 它开放的端口会绕过防火墙规则, 非常危险. 可以在 `/etc/docker/daemon.json` 配置 `"iptables": false` 来规避这一问题, 但是这会导致容器中的 DNS 无法解析, 进而导致 RSSHub 无法使用. 这里笔者暂时没有找到解决办法, 如果有同学有更好的办法麻烦告知我. 这里笔者的做法是修改 `docker-compose.yml` 让容器的端口不对外开放. 接下来我们修改 Nginx 的配置添加一个到 RSSHub 的反向代理:

```conf
server {
    listen       443 ssl;
    server_name  rsshub.luyuhuang.tech;

    ssl_certificate      cert.pem;
    ssl_certificate_key  cert.key;

    ssl_session_cache    shared:SSL:1m;
    ssl_session_timeout  5m;

    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers  on;

    location / {
        proxy_pass http://127.0.0.1:1200;
    }
}
```

这里 RSSHub 的域名是 `rsshub.luyuhuang.tech`, 因此只需要添加一条 A 记录将域名指向这台主机即可.

对于 TTRSS, 同样参照[官方文档](https://git.tt-rss.org/fox/ttrss-docker-compose/src/static-dockerhub/README.md), 得到 Docker 相关的文件, 然后编辑 `.env` 设置域名, URL 等必要的环境变量. TTRSS 似乎要求 URL 必须是 `*/tt-rss/`, 这里笔者暂时也没找到修改它的办法, 只能先这样配置, 如果有同学有更好的办法麻烦告知我.

```bash
HTTP_HOST=ttrss.luyuhuang.tech
SELF_URL_PATH=https://ttrss.luyuhuang.tech/tt-rss/
HTTP_PORT=127.0.0.1:8280
```

接着执行 `docker-compose up -d` 启动容器. 然后同样地, 配置 Nginx 添加一个到 TTRSS 的反向代理:

```conf
server {
    listen       443 ssl;
    server_name  ttrss.luyuhuang.tech;

    ssl_certificate      cert.pem;
    ssl_certificate_key  cert.key;

    ssl_session_cache    shared:SSL:1m;
    ssl_session_timeout  5m;

    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers  on;

    location / {
        proxy_pass http://127.0.0.1:8280/tt-rss/;
        proxy_set_header HOST ttrss.luyuhuang.tech;
    }

    location /tt-rss/ {
        rewrite ^/tt-rss/(.*)$ /$1 permanent;
    }
}
```

因为我非常不想让 URL 带一个 `/tt-rss/`, 于是在 Nginx 这边做了点处理. 此外还需要将 HOST 首部设置为相应的域名以骗过 TTRSS, 否则它还是会报 `SELF_URL_PATH` 配置错误.

同样在 DNS 控制台中添加一条 A 记录将域名指向这台主机. Nginx 会根据域名的不同转发给不同的服务.

最后, 最好禁用掉 IP 访问. 编辑 Nginx 配置, 在这两个 server 的上面添加一个不限定 `server_name` 但直接拒绝所有请求的 server 配置:

```conf
server {
    listen       443 ssl;

    ssl_certificate      cert.pem;
    ssl_certificate_key  cert.key;

    ssl_session_cache    shared:SSL:1m;
    ssl_session_timeout  5m;

    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers  on;

    location / {
        deny all;
    }
}
```

### 总结

最后整个服务的架构图如下:

![server error](/assets/images/cloudflare_5.svg)
