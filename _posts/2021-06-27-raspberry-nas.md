---
key: 54
title: 用树莓派搭建一个能在外网访问的 NAS
tag: practice
---
我最近买了一个树莓派, 想用它搭建一个 NAS. 对此我有几点要求:

- 能在外网访问
- 启用 HTTPS
- 内外网使用相同的访问方式, 无缝切换

我准备使用 NextCloud, 因为它支持 WebDAV, 这样可以作为 Joplin 的同步服务器. 我之前在外网 VPS 上搭建过一个 NextCloud, 现在我准备把它迁移到我的树莓派上, 感觉数据还是放在自己身边更可靠些.

我购买的是树莓派 4B, 内存 4GB, 32GB 空白存储卡; 再加上我 2 TB 的西部数据移动硬盘作为数据盘. 这篇文章记录我是怎么做的.

![raspberry](/assets/images/raspberry-nas_1.jpg){:width="600"}

### 安装操作系统

操作系统的安装比较简单. 我安装的是 Ubuntu Server 20.04. Ubuntu 对树莓派的支持还是非常好的, [官网](https://ubuntu.com/raspberry-pi)上也有详细的教程. 首先我们在官网下载 Ubuntu 树莓派版镜像, 然后到[树莓派官网](https://www.raspberrypi.org/software/)下载树莓派 Imager, 用于将操作系统镜像写入存储卡.

![imager](/assets/images/raspberry-nas_2.png){:width="700"}

将存储卡插入电脑, 打开 Imager. 选择我们刚下载的系统镜像, 再选择存储卡, 点击 Write. 等待一段时间, 操作系统就写入存储卡了.

由于我们的树莓派是 "无头" 模式 (Headless Mode), 即没有显示器和键盘等 IO 设备, 我们只能通过网络使用 SSH 与之交互. 因此要让树莓派连上网络. 我们在电脑上编辑存储卡根目录下的 `network-config` 文件, 配置树莓派的无线网络.

```yml
wifis:
  wlan0:
    dhcp4: true
    optional: true
    access-points:
      "<wifi network name>":
        password: "<wifi password>"
```

这是一个 Yaml 文件, 我们将 `<wifi network name>` 和 `<wifi password>` 替换成 Wifi 的 SSID 和密码, 这样树莓派启动后就能连接上 Wifi 了.

接下来将存储卡插入树莓派, 接通电源. 正常情况下, 绿灯会不规则地闪烁, 每次闪烁代表磁盘 (存储卡) 的读写操作. 接下来我们要确定树莓派的 IP 地址, 以便 SSH 登录.

根据官网的教程, 我们可以使用命令 `arp -na | grep -i "dc:a6:32"` 在 ARP 表中搜索树莓派的 MAC 地址, 以确定它的 IP 地址. 不过, 也许是我的路由器屏蔽了免费 ARP (Gratuitous ARP) 的广播, 这个方法并不奏效 (并且我的树莓派的 MAC 地址也不包含 `dc:a6:32`). 因此我选择打开路由器的管理页面, 直接查看树莓派的 IP 地址.

获取到树莓派的 IP 地址后, 我们便可以 SSH 登录它了. 用户名和初始密码都是 `ubuntu`, 初次登录会要求修改密码. 这样, 树莓派便配置完毕了.

### 挂载硬盘

存储卡的容量有限, 可靠性也比较低. 因此我们给树莓派挂载一块移动硬盘作为数据盘. 移动硬盘初始是 NTFS 格式, 它的优点是 Windows 和 Linux 都能读写; 缺点是, 在 Linux 下要使用 `mount.ntfs` 才能读写, 而 `mount.ntfs` 进程会占用 CPU, 在 CPU 运算能力有限的树莓派上性能会十分低下. FAT 格式虽然同时在 Linux, Windows 和 Mac 上使用, 但是它不是日志文件系统, 可靠性不好. 因此我们需要把移动硬盘格式化成 ext4 格式.

我们将硬盘插入树莓派, 使用 `fdisk -l` 确定磁盘的设备文件:

```sh
$ sudo fdisk -l
Disk /dev/sda: 1.84 TiB, 2000365289472 bytes, 3906963456 sectors
Disk model: Elements SE 2623
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
```

可以看到磁盘的设备文件是 `/dev/sda`. 接着我们运行磁盘分区工具 `parted`, 对磁盘进行分区.

```sh
$ sudo parted /dev/sda
GNU Parted 3.3
Using /dev/sda
Welcome to GNU Parted! Type 'help' to view a list of commands.
(parted)
```

parted 的交互界面比较友好, 使用也比较简单. 首先我们使用 `mklabel` 命令创建一张新的磁盘分区表:

```
(parted) mklabel gpt
Warning: The existing disk label on /dev/sda will be destroyed and all data on this disk will be lost. Do you want to
continue?
Yes/No? yes
```

我们这里创建了一张 GUID 分区表. 接着我们使用 `mkpart` 命令创建一个 ext4 分区. 我还创建了一个 ntfs 分区以便在 Windows 下使用.

```
(parted) mkpart linux-ext4 ext4 0% 50%
(parted) mkpart win-ntfs ntfs 50% 75%
(parted)
(parted) print
Model: WD Elements SE 2623 (scsi)
Disk /dev/sda: 2000GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags:

Number  Start   End     Size    File system  Name        Flags
 1      1049kB  1000GB  1000GB  ext4         linux-ext4
 2      1000GB  1500GB  500GB   ntfs         win-ntfs    msftdata

```

我分配了一半的空间给 ext4 分区, 又分配了 1/4 的空间给 ntfs 分区. 剩下 1/4 的空间先暂时空着. 接着就可以退出 parted 了. 现在我们执行 `fdisk -l` 查看分区的设备文件.

```sh
$ sudo fdisk -l
Disk /dev/sda: 1.84 TiB, 2000365289472 bytes, 3906963456 sectors
Disk model: Elements SE 2623
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: gpt

Device          Start        End    Sectors   Size Type
/dev/sda1        2048 1953480703 1953478656 931.5G Linux filesystem
/dev/sda2  1953480704 2930223103  976742400 465.8G Microsoft basic data
```

可以看到两个分区的设备文件分别是 `/dev/sda1` 和 `/dev/sda2`. 接下来执行 `mkfs.ext4` 和 `mkfs.ntfs` 格式化分区.

```sh
$ sudo mkfs.ext4 /dev/sda1
$ sudo mkfs.ntfs -f /dev/sda2
```

NTFS 格式化比较慢, 这里我们使用 `-f` 快速格式化. 最后, 我们挂载硬盘的 ext4 分区:

```sh
$ sudo mkdir /data
$ sudo mount /dev/sda1 /data
```

这样硬盘的 ext4 分区就成功挂载到 `/data` 下了. 为了方便, 我们还可以设置自动挂载. 首先使用 `blkid` 命令确定磁盘分区的 UUID:

```sh
$ sudo blkid
/dev/sda1: UUID="ae65b749-4e1e-4209-ae57-15ec83578c5c" TYPE="ext4" PARTLABEL="linux-ext4" PARTUUID="31492686-ba22-42da-b93a-f41f70d2ff72"
/dev/sda2: UUID="275BD50F72DEC43C" TYPE="ntfs" PTTYPE="dos" PARTLABEL="ntfs" PARTUUID="a7b57b84-33c3-4000-a055-5dee14a61730"
```

可以看到 ext4 分区的 UUID 为 `ae65b749-4e1e-4209-ae57-15ec83578c5c`. 接着编辑 `/etc/fstab`, 新增一行配置, 指定设备, 挂载点, 磁盘格式等信息.

```
UUID=ae65b749-4e1e-4209-ae57-15ec83578c5c       /data   ext4    defaults        0       0
```

这样, 下次重启后, 硬盘就会自动挂载了.

### 安装 NextCloud

PHP 的环境比较复杂, 我选择用 Docker. 我们首先根据[Docker 官网的说明](https://docs.docker.com/engine/install/ubuntu/)安装 Docker:

```bash
$ sudo apt update
$ sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release
$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
$ echo \
  "deb [arch=arm64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
$ sudo apt update
$ sudo apt install docker-ce docker-ce-cli containerd.io docker-compose
```

我们使用 docker-compose. 创建一个 `docker-compose.yml`:

```yml
version: '2'

services:
  app:
    image: nextcloud
    ports:
      - '127.0.0.1:8080:80'
    volumes:
      - /data/nextcloud-data:/var/www/html/data
    restart: always
```

这里我们将 NextCloud 的数据目录用 Volume 映射到数据盘的 `/data/nextcloud-data` 目录. 容器内会使用 www-data 用户访问数据目录, 因此要把这个目录的所有者改成 www-data.

国内访问 Docker Hub 的速度非常慢, 因此需要使用镜像加速器. 目前相对比较有效的是[阿里云的镜像加速器](https://cr.console.aliyun.com/cn-hangzhou/instances/mirrors). 修改 `/etc/docker/daemon.json` 将 `registry-mirrors` 改成加速器地址, 然后再重启 Docker.

最后我们启动容器:

```
$ sudo docker-compose up -d
```

### 配置 Nginx

我这里使用 Nginx 做一次反向代理. 因为考虑到将来会在树莓派上部署其他服务, 不能让 NextCloud 独占 80 (或者 443) 端口. 这样做也方便配置 HTTPS. Nginx 的安装比较简单, 到官网下载稳定版源码, 编译安装即可.

```sh
# install dependencies
apt update
apt install -y gcc make zlib1g-dev libpcre3-dev libssl-dev

# download nginx
wget http://nginx.org/download/nginx-1.20.1.tar.gz
tar -zxvf nginx-1.20.1.tar.gz
cd nginx-1.20.1

# build
mkdir ~/nginx # installation directory
./configure --prefix=~/nginx --with-http_ssl_module
make && make install
```

然后编辑 Nginx 配置文件, 配置一个到 `https://127.0.0.1:8000` 的反向代理:

```
server {
    listen       80;
    server_name  localhost;

    location / {
        client_max_body_size 100m;
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $proxy_host;
    }
}
```

NextCloud 对反向代理对支持非常不友好, 我的做法是将 Host 首部置为 `$proxy_host`, 也就是 `127.0.0.1:8080`, 不让 NextCloud 感知到代理. 然后启动 Nginx, 打开浏览器访问.

![nextcloud](/assets/images/raspberry-nas_3.jpg)

初次访问会进入 NextCloud 的初始化页面. 数据存储路径为 `/var/www/html/data`, 这个路径会被 Volume 映射到数据盘中. 数据库直接使用 SQLite, db 文件会在数据存储路径下, 方便以后迁移.

### 开启外网访问

内网穿透的方案有很多, 我的要求是外网访问需开启 HTTPS. 如果使用国内节点, 域名就需要备案, 比较麻烦. 我最终选择的是 Cloudflare Tunnel, 它能解决 HTTPS 证书的问题, 而且是免费的. 缺点就是访问速度比较慢.

首先, 我们需要在树莓派上安装 `cloudflared`. 直接到 [Release 页](https://github.com/cloudflare/cloudflared/releases)下载二进制文件, 然后复制到一个 PATH 目录下, 如 `/usr/local/bin`.

接着登录 Cloudflare 账号. 执行命令:

```sh
$ cloudflared tunnel login
```

它会打印出一条用于登录的 URL. 在浏览器中访问这个 URL, 登录 Cloudflare 账号, 并且选择一个站点. 这一步成功后, `cloudflared` 就会得到一个证书, 位于 `~/.cloudflared/cert.pem` 下. 有了这个证书, `cloudflared` 就可以操作账号了.

然后我们创建一个隧道:

```sh
$ cloudflared tunnel create raspberry
$ cloudflared tunnel list
ID                                   NAME      CREATED              CONNECTIONS
6ff42ae2-765d-4adf-8112-31c55c1551ef raspberry 2021-06-07T16:35:24Z 2xLAX, 2xMAD
```

这里我们创建了一个名为 `raspberry` 的隧道. `cloudflared tunnel list` 可以列出当前所有的隧道. 我们刚创建的隧道 ID 为 `6ff42ae2-765d-4adf-8112-31c55c1551ef`.

接着再创建一个隧道配置文件 `~/.cloudflared/config.yml`:

```yml
tunnel: 6ff42ae2-765d-4adf-8112-31c55c1551ef
credentials-file: /home/ubuntu/.cloudflared/6ff42ae2-765d-4adf-8112-31c55c1551ef.json

ingress:
  - hostname: home.luyuhuang.tech
    service: http://127.0.0.1:80
  - service: http_status:404
```

在这个配置文件中, 我们指定了隧道的 ID, 隧道的 credentials file; 然后将流量指向了 `http://127.0.0.1:80`. 然后只需要执行 `cloudflared tunnel run` 就能启动隧道了.

最后我们进入 Cloudflare 的 DNS 管理后台, 增加一条 CNAME 记录, 指向 `TUNNEL-ID.cfargotunnel.com`. 在我们的例子中为 `6ff42ae2-765d-4adf-8112-31c55c1551ef.cfargotunnel.com`.

![dns](/assets/images/raspberry-nas_4.png)

DNS 生效后, 就可以通过在外网用这个域名访问树莓派上部署的 NextCloud 了.

我们可以让 `cloudflared` 运行在后台. 执行以下命令配置 cloudflared 服务:

```sh
$ sudo cloudflared service install
```

这会将配置文件复制到 `/etc/cloudflared/config.yml` 下. 之后我们便可以使用 `systemctl start cloudflared` 启动 cloudflared 服务了.

### 部署 DNS 服务器

外网使用域名访问, 内网却要使用 IP 地址访问, 这样并不是很方便. 因此我准备在树莓派上部署一个 DNS 服务器, 将域名解析到树莓派的内网 IP.

我使用的是 [CoreDNS](https://github.com/coredns/coredns). 它部署简单, 只有一个二进制文件. 创建一个配置文件 `Corefile`:

```
.:53 {
  bind 192.168.8.246
  hosts {
    192.168.8.246 home.luyuhuang.tech

    ttl 60
    reload 1m
    fallthrough
  }

  forward . /etc/resolv.conf
  cache 120
  reload 6s
  log
  errors
}
```

这里我们配置了一个静态 DNS, 将 `home.luyuhuang.tech` 解析到内网 IP `192.168.8.246`. 其余的域名 forward 到系统 DNS. 注意我们不能绑定 `0.0.0.0`, 因为系统 DNS 服务 systemd-resolv 绑定了 `127.0.0.53:53`.

启动 CoreDNS, 将电脑的 DNS 服务器地址修改成树莓派的地址, 用 `dig` 测试下:

```
$ dig home.luyuhuang.tech

; <<>> DiG 9.10.6 <<>> home.luyuhuang.tech
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 27485
;; flags: qr aa rd; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;home.luyuhuang.tech.		IN	A

;; ANSWER SECTION:
home.luyuhuang.tech.	58	IN	A	192.168.8.246

;; Query time: 21 msec
;; SERVER: 192.168.8.246#53(192.168.8.246)
;; WHEN: Sun Jun 27 16:53:12 CST 2021
;; MSG SIZE  rcvd: 83
```

结果显示 `home.luyuhuang.tech` 的 A 记录为 `192.168.8.246`, 使用的 DNS 服务器为 `192.168.8.246`. 现在我们在浏览器用域名访问 NextCloud 了.

### 配置内网 HTTPS 证书

Cloudflare 会启用强制 HTTPS, HTTP 请求会 301 重定向到 HTTPS. 301 是永久重定向, 浏览器会缓存这个重定向, 这会导致内网访问 HTTP 时也被重定向到 HTTPS. 为了解决这个问题, 我们给内网也配置 HTTPS, 让内外网的访问方式完全相同.

我的做法是使用自签名证书, 然后让计算机信任自签名证书. 首先创建 CA 的私钥:

```sh
$ openssl genrsa -out rootCA.key 4096
```

然后创建 CA 的证书:

```sh
$ openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 1024 -out rootCA.crt
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) []:US
State or Province Name (full name) []:NY
Locality Name (eg, city) []:New York
Organization Name (eg, company) []:Luyu
Organizational Unit Name (eg, section) []:luyu
Common Name (eg, fully qualified host name) []:luyuhuang.tech
Email Address []:root@luyuhuang.tech
```

openssl 会提示我们输入国家, 州, 城市, 组织, 部门, Common Name 和邮件地址. 完成之后我们创建了根证书 `rootCA.crt`. 接着我们再创建服务器的证书. 首先生成服务器的私钥:

```sh
$ openssl genrsa -out server.key 2048
```

然后创建证书申请文件:

```sh
$ openssl req -new -sha256 \
    -key server.key \
    -subj "/C=US/ST=NY/L=New York/O=Luyu/OU=luyu/CN=home.luyuhuang.tech/emailAddress=i@luyuhuang.tech" \
    -reqexts SAN \
    -config <(cat /etc/ssl/openssl.cnf \
        <(printf "\n[SAN]\nsubjectAltName=DNS:home.luyuhuang.tech")) \
    -out server.csr
```

证书必须要有 Subject Alternative Name, 其中指定了证书的域名. 最后我们用 CA 的私钥对服务器对证书签名:

```
$ openssl x509 -req -days 365 -CA rootCA.crt -CAkey rootCA.key -CAcreateserial \
    -extensions SAN \
    -extfile <(cat /etc/ssl/openssl.cnf \
        <(printf "\n[SAN]\nsubjectAltName=DNS:home.luyuhuang.tech")) \
    -in server.csr -out server.crt
```

`-days` 指定证书有效期. 这个有效期不能太长, 否则 Chrome 会认为证书不安全. 最后生成的 `server.crt` 就是服务器的证书了. 我们修改 Nginx 的配置, 新增一个 HTTPS 服务:

```
server {
    listen       443 ssl;
    server_name  home.luyuhuang.tech;

    ssl_certificate      cert/server.crt;
    ssl_certificate_key  cert/server.key;

    ssl_session_cache    shared:SSL:1m;
    ssl_session_timeout  5m;

    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers  on;

    location / {
        client_max_body_size 100m;
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $proxy_host;
    }
}
```

`ssl_certificate` 和 `ssl_certificate_key` 指令指定了服务器的证书和私钥. 重新加载 Nginx, 在电脑上安装根证书 `rootCA.crt`, 我们就能在内网使用 HTTPS 访问 NextCloud 了.

***

**参考资料:**

- [How to install Ubuntu Server on your Raspberry Pi](https://ubuntu.com/tutorials/how-to-install-ubuntu-on-your-raspberry-pi#1-overview)
- [Connect applications](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps)
