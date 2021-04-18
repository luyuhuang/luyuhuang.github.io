---
title: ZooKeeper 入门指南
tag: tools
---
[ZooKeeper](https://zookeeper.apache.org/) 是一个分布式服务中间件, 乍一看有点像一个 NoSQL 数据库系统. 不过它的主要功能不是存储数据, 而是提供一种共享数据和服务间通信的方式, 使用它我们能够更方便地开发分布式软件. 这篇文章介绍 ZooKeeper 的主要特性, 使用方式和应用场景.

## 主要特性

我们先来看一下 ZooKeeper 的主要特性, 以及它跟 NoSQL 数据库系统不同的地方.

### 数据存储

不同于 Redis 的 key-value 结构, ZooKeeper 将所有的数据管理在一个树状结构中. 这个结构很像文件系统, 一个路径标识一个节点, 由若干个用斜杠隔开的名字组成. 根结点路径为 `/`, 因此路径总是由斜杠开头.

![hierarchy](/assets/images/zookeeper_1.jpg)

与文件系统不同的是, ZooKeeper 中叶子结点和内部节点都可以存储数据, 这就好比允许一个文件同时也是一个目录. 我们通常称 ZooKeeper 中的节点为 *znode*. 每个 znode 数据的存取是原子的, 要么一次性取出全部数据, 要么覆盖掉全部数据. znode 的操作十分简单:

- *create* : 创建一个节点
- *delete* : 删除一个节点
- *exists* : 判断节点是否存在
- *get data* : 获取指定节点的数据
- *set data* : 设置指定节点的数据
- *get children* : 获取指定节点的子节点列表
- *sync* : 等待数据同步 (稍后可以看到, 在集群化部署时需要考虑同步的问题)

#### 观察一个节点

除了可以主动获取一个节点的数据, 我们还可以观察一个节点. *exists*, *get data* 和 *get children* 都可以设置观察. 如果设置了观察一个节点, 那么当这个节点发生改变当时候, 观察者就会收到通知. 例如观察 *get data*, 就会在节点的数据发生改变时收到通知.

对节点对观察通常是一次性的. 也就是说, 当一个观察会在它触发后立刻被移除. 如果需要继续观察这个节点, 就必须再次设置观察.

#### 节点的权限

ZooKeeper 的每个节点都可以单独设置权限, 称为访问控制列表 ACL (Access Control List). 节点都支持以下几种权限:

- **CREATE**: 可以在这个节点下创建一个子节点
- **READ**: 可以读取这个节点的数据
- **WRITE**: 可以设置这个节点的数据
- **DELETE**: 可以删除这个节点下的子节点
- **ADMIN**: 可以修改这个节点的权限

注意 ZooKeeper 的权限仅作用于当前节点, 并不会影响其子节点. 也就是说可以将权限设置成 `/app` 可读但是 `/app/status` 不可读.

不同于 UNIX 文件系统中 user, group, other 三种权限作用域, ZooKeeper 会为每个节点维护一个 id 及其对应权限的集合. 每个 id 的格式为 `scheme:expression`, scheme 为这个 id 的方案, expression 则具体定义这个 id. 例如 `ip:172.16.16.1` 就是一个 id, 它的方案为 IP, 标识 IP 地址为 172.16.16.1 的用户. ZooKeeper 权限有以下几种方案:

- **world**: 代表所有用户.
- **auth**: 代表当前用户. 当一个用户想创建一个仅能被它自己访问的节点时就可以使用 auth 代表它自己.
- **digest**: 使用字符串 `username:password` 生成的 MD5 哈希作为 id.
- **ip**: 使用 IP 地址作为 id.
- **x509**: 使用 x509 证书作为 id.

#### 持久化

ZooKeeper 会将整个树状结构的数据都存储在内存中. 然而仅存储在内存中是不够的, 为了防止数据丢失, 还必须持久化在硬盘上. ZooKeeper 的做法有些类似于 Redis 的 AOF: 所有的更新操作都会实时记录在一个日志文件中; 当这个日志文件变得足够大了, ZooKeeper 就会生成一个包含当前所有 znode 数据的快照文件, 然后创建一个新的日志文件, 之后的操作事务就会记录在这个新的日志文件中. 在生成快照的过程中产生的操作事务仍然记录在旧的日志文件中. 需要说明的是 ZooKeeper 不会自动清理旧的日志文件和快照文件, 这需要管理者定期手动清理.

### 集群部署

ZooKeeper 的一个重要特性就是支持集群部署, 因此健壮性很高.

ZooKeeper 可以配置为多台机器协同工作, 这几台机器整体作为一个 ZooKeeper 服务. 数据会自动在这些服务器之间同步, 客户端可连接其中的任意一台服务器. 如果客户端连接的服务器宕机, 它可以立刻转而连接另外的服务器, 而保持原有的会话状态. ZooKeeper 保证只要大部分服务器可用, 整个 ZooKeeper 服务就是可用的.

![hierarchy](/assets/images/zookeeper_2.jpg)

ZooKeeper 要求一半以上的服务器可用, 整个服务就可用, 因此 ZooKeeper 服务器的数量通常是奇数个. 3 台机器可承受 1 台机器故障, 5 台机器可承受 2 台机器故障; 然而 4 台机器 只能承受 1 台机器故障, 2 台机器无法承受机器故障.

由于 ZooKeeper 的服务器之间要互相同步数据, 因此 znode 中不宜存储过大的数据, 一般大小在字节到千字节到范围内. 过大的数据会导致存取效率低下.

### 一致性保证

尽管 ZooKeeper 是分布式的, 它仍然提供了一系列的一致性保证:

- **顺序一致性**: 来自客户端的更新请求会按照发送到顺序依次执行.
- **原子性**: 更新要么成功, 要么失败. 不会有中间状态.
- **单系统映像**: 无论客户端连接 ZooKeeper 服务中的哪个服务器, 它看到的东西都是一样的. 即使客户端由于一些故障改变了连接的服务器, 只要在同一个会话中, 它看到的数据也总是最新的.
- **可靠性**: 一旦应用了一次更新操作, 就会保持这个状态直到下次更新覆盖它. 这个保证有两个结果:
    - 如果
- **及时性**: 整个系统中客户端看到的东西能保证在一定的时间范围 (大约几十秒) 内是最新的. 可通过 *sync* 操作等待当前数据更到最新.

## 安装

### 二进制安装

ZooKeeper 使用 Java 编写, 安装前先确保你的机器上有 Java 环境.

从[发布页](https://zookeeper.apache.org/releases.html)下载 ZooKeeper 的二进制发布版. 下载到到压缩包到文件名一般是 `apache-zookeeper-X.X.X-bin.tar.gz`, 解压之后的目录是这样的:

```
apache-zookeeper-3.7.0-bin $ ls
LICENSE.txt         README.md           bin                 docs                logs
NOTICE.txt          README_packaging.md conf                lib
```

然后执行 `bin/zkServer.sh version`, 看到 ZooKeeper 的版本信息就说明安装成功了:

```
apache-zookeeper-3.7.0-bin $ bin/zkServer.sh version
ZooKeeper JMX enabled by default
Using config: /home/luyuhuang/apache-zookeeper-3.7.0-bin/bin/../conf/zoo.cfg
grep: /home/luyuhuang/apache-zookeeper-3.7.0-bin/bin/../conf/zoo.cfg: No such file or directory
grep: /home/luyuhuang/apache-zookeeper-3.7.0-bin/bin/../conf/zoo.cfg: No such file or directory
mkdir: : No such file or directory
Apache ZooKeeper, version 3.7.0 2021-03-17 09:46 UTC
```

### 源码安装

也可以使用源码自行编译. 当然, 要求你的机器已经安装好 JDK. 此外还需要安装 Maven, 一种 Java 项目的构建工具.

从[发布页](https://zookeeper.apache.org/releases.html)下载 ZooKeeper 的源码发布版. 下载到到压缩包到文件名一般是 `apache-zookeeper-X.X.X.tar.gz`, 解压后执行 `mvn package` 进行编译 (或者使用 `mvn package -Dmaven.test.skip=true` 跳过单元测试). 一切顺利的话, 同样执行 `bin/zkServer.sh version` 就能看到版本信息了.`

## 使用

### 单点部署

新建一个文件 `conf/zoo.cfg`, 内容如下:

```
tickTime=2000
dataDir=/var/lib/zookeeper
clientPort=2181
```

这是一个最简单的配置. 它有三个字段:

- `tickTime`
- `dataDir`
- `clientPort`

我们执行 `bin/zkServer.sh start` 启动服务器:

```
apache-zookeeper-3.7.0 $ bin/zkServer.sh start
ZooKeeper JMX enabled by default
Using config: /home/luyuhuang/apache-zookeeper-3.7.0/bin/../conf/zoo.cfg
Starting zookeeper ... STARTED
```

看到如上的输出便说明 ZooKeeper 启动成功了.

### 多点部署

## 编程

ZooKeeper 支持 Java 和 C 的编程接口. 这篇文章我们介绍 C 编程接口.

### 安装环境

安装 ZooKeeper 的 C 开发环境需要先下载并编译 ZooKeeper 的源码发行版, 这个过程前面讲安装 ZooKeeper 的时候有介绍. 之后进入目录 `zookeeper-client/zookeeper-client-c`, 这里包含了 ZooKeeper C API 的源码. 为了编译这些源码, 我们需要安装 autoconf, automake 和 libtool, 此外还需要安装一个 C++ 单元测试库 cppnuit. 准备就绪后执行 `autoreconf -if` 生成 configure 脚本.

> 注意: 如果 cppunit 没有安装在标准路径下 (如使用源码编译安装或者使用 brew 安装), 会导致 autoconf 找不到 cppunit. 这必须手动指定 `cppunit.m4` 文件的路径. 例如 `cppunit.m4` 的路径为 `/usr/local/share/aclocal/cppunit.m4`, 就应执行 `ACLOCAL="aclocal -I /usr/local/share/aclocal" autoreconf -if`. 但是最新版的 cppunit 已经不会自动安装 `cppunit.m4` 文件了, 这就需要手动将这个文件拷贝到相应的路径下.

得到 configure 脚本之后再依次执行 `./configure`, `make` 和 `make install` 即可.

### 使用

环境安装成功后就可以开始编程了. ZooKeeper 官方并没有提供 C API 的文档, 不过 `zookeeper.h` 中有很详细的注释, 相当于是文档了.

下面的例子展示了 ZooKeeper 的 *get children*, *exists*, *create*, *set* 和 *get* 操作:

```c++
#include <iostream>

#define THREADED
#include <zookeeper/zookeeper.h>

int main() {
    zhandle_t *z = zookeeper_init("localhost:2181", nullptr, 10000, nullptr, nullptr, 0);
    if (!z) {
        std::cout << "init failed" << std::endl;
        return -1;
    }

    int rc;
    if (zoo_exists(z, "/data", 0, nullptr) == ZNONODE) {
        if ((rc = zoo_create(z, "/data", nullptr, -1, &ZOO_OPEN_ACL_UNSAFE, 0, nullptr, 0)) != 0) {
            std::cout << "create failed: " << rc << std::endl;
            return -1;
        }
    }

    String_vector children;
    if ((rc = zoo_get_children(z, "/", 0, &children)) != 0) {
        std::cout << "list failed: " << rc << std::endl;
        return -1;
    }

    std::cout << "= list /" << std::endl;
    for (int i = 0; i < children.count; ++i) {
        std::cout << "  - " << children.data[i] << std::endl;
    }


    if ((rc = zoo_set(z, "/data", "Hello world", 12, -1)) != 0) {
        std::cout << "set failed: " << rc << std::endl;
        return -1;
    }

    char buf[512];
    int len = 511;
    Stat stat;
    if ((rc = zoo_get(z, "/data", 1, buf, &len, &stat)) != 0) {
        std::cout << "get failed: " << rc << std::endl;
        return -1;
    }

    buf[len] = '\0';
    std::cout << "= " << buf << std::endl;

    return 0;
}
```

编译并运行:

```
playground $ g++ -std=c++11 -o zk zk.cc -lzookeeper_mt
playground $ ./zk 2>/dev/null
= list /
  - zookeeper
  - data
= Hello world
```

## 应用

***

**参考资料:**

- [ZooKeeper Overview](https://zookeeper.apache.org/doc/current/zookeeperOver.html)
- [ZooKeeper Getting Started Guide](https://zookeeper.apache.org/doc/current/zookeeperStarted.html)
- [ZooKeeper Programmer's Guide](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html)
- [ZooKeeper Recipes and Solutions](https://zookeeper.apache.org/doc/current/recipes.html)
