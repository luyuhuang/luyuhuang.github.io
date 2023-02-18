---
key: 24
title: Promise 和 Deferred
tag:
    - design
    - featured
---
## 1. 引言
这篇文章笔者想讨论一下 JavaScript 中的 Promise 和 Python Twisted 中的 Deferred(jQuery 中也有 Deferred, 它们的思路是一致的). 它们很有趣, 也有点复杂. 在协程被广泛应用之前, 它们在网络编程中起到了重要的作用. 在此之前, 我们先来看看一些基本概念.

## 2. 从请求说起

### 请求和响应

我们在进行网络编程的时候, 总是会用到**请求(request)**和**响应(response)**. 比如进程 A 需要传递一些数据给进程 B, 我们就可以说进程 A 给进程 B 发送了一个请求. 有的时候一个请求发送出去之后就不用关心后续了; 但是更多的时候, 我们关心目标进程对数据的处理结果, 并且希望对结果进行进一步的处理. 这个时候, 我们可以让目标进程收到发送的数据并且进行了相应的处理之后, 给源进程发送一个请求, 把处理结果传递给源进程. 我们把这一行为称为响应.

### 会话

仅有请求和响应是不够的. 考虑以下这种情况:

![session](/assets/images/promise-and-deferred_1.png)

由于发送请求的过程和处理响应的过程位于两个不同的方法, 处理响应时便无法获取发送请求的过程产生的上下文.

为了解决这个问题, 我们提出**会话(session)**这一概念. 我们认为, 每一个请求, 必然对应着一个响应, 用一个 session id 唯一标识一次对话, 并且在请求和响应中传递这个 session id. 如果在处理响应时要用到某些上下文, 就可以把这些上下文以 session id 为主键存起来, 在处理响应的过程通过 session id 获取所需的上下文.

![session](/assets/images/promise-and-deferred_2.png)

下面我简单写了个例子, 其中 `send` 方法给远程进程发送数据, 两个参数分别是远程进程句柄和数据; 当进程接收到数据的时候会回调 `on_receive_message` 方法, 两个参数分别是发送者进程句柄和数据; `request_handler` 为请求处理函数, 所有的请求都会回调它.

```js
function send_request(remote_process_handle, data, callback) {
    const session_id = generate_session_id();
    session_map[session_id] = callback;
    send(remote_process_handle, {type: 'request', session_id, data});
}

function on_receive_message(remote_process_handle, message) {
    if (message.type === 'request') {
        const response = request_handler(message.data);
        send(remote_process_handle, {
            type: 'response', session_id: message.session_id, data: response
        });
    } else if (message.type === 'response') {
        const callback = session_map[message.session_id];
        callback(message.data);
        delete session_map[message.session_id];
    }
}
```

`send_request` 函数接受三个参数: 远程进程句柄, 请求数据和回调函数. 每次调用 `send_request` 都会生成一个 session id, 并且以 session id 为主键, 存储回调函数. 收到响应时, 根据响应传回来的 session id 找到对于的回调函数, 然后调用回调函数. 这样就完成了一次会话.

在这个例子中, 我们利用了 js 的特性, 把回调函数作为上下文. 至于真正的上下文即 `ctx` 变量, 则是作为回调函数的上值被隐式地存储.

## 3. 引入问题

有了会话, 我们就可以很方便地发送请求和响应了. 比如说我们可以这样发送请求并接收响应:

```js
let ctx = dosth();
send_request(remote_process_handle, request, (response) => {
    calc(ctx, response);
    // ...
});
```

目标进程就可以这样接收请求并返回响应:

```js
function request_handler(request) {
    const response = deal_with(request);
    return response;
}
```

然而这样使用回调函数往往会有一些不便. 假如需要在请求处理函数中给别的进程发请求并拿到返回值然后响应呢?

```js
function request_handler(request) {
    let ctx = dosth();
    send_request(remote_process_handle, 'ask_for_response', (response) => {
        const res = calc(ctx, response);
        // Cannot return `res` as a response.
    });
}
```

我们无法将 `res` 作为 `request_handler` 的返回值返回给 `on_receive_message`, 也就无法传递请求的响应. 为了解决这个问题, 我们可以做一些改造:

```js
function on_receive_message(remote_process_handle, message) {
    if (message.type === 'request') {
        request_handler(message.data, (response) => {
            send(remote_process_handle, {
                type: 'response', session_id: message.session_id, data: response
            });
        });
    } else if (message.type === 'response') {
        ...
    }
}

function request_handler(request, cb) {
    let ctx = dosth();
    send_request(remote_process_handle, 'ask_for_response', (response) => {
        const res = calc(ctx, response);
        cb(res);
    });
}
```

现在不再由返回值传递响应, 而是增加一个参数传递回调函数, 然后通过调用回调函数传递响应. 这样就解决了这个问题.

然而这样做还是不太方便, 特别是涉及多层调用的时候, 就需要将回调函数通过参数层层传递. 此外在很多时候, 一次远程调用不一定会成功, 当错误发生的时候我们希望能够处理异常. 所以除了回调, 人们通常还会传入一个叫做 异常回调 的函数专门处理异常. 如果回调和异常回调都被层层传递, 这会使得代码难以维护, 包含远程调用的方法也难以封装成通用库.

## 4. Promise

为了解决这一矛盾, js 提出了 Promise 这一概念. 所谓 "承诺", 就是承诺将来会执行某些操作. 它最大的改变, <u>是把回调函数的传递从参数移到了返回值.</u> 一个 Promise 对象意味着一个未完成的工作, 它承诺将来会完成, 并期待着一个回调函数. 当这个工作在将来的某个时刻完成的时候, 会调用回调函数. 通过这个办法, 完美解决了上面所说的问题.

### 基本用法

我们来看下基本用法:

```js
const promise = new Promise((cb, eb) => {
    setTimeout(() => {
        if (1 + 1 == 2)
            cb('ok');
        else
            eb('what the hell');
    }, 1000);
});

promise.then((res) => {
    console.log("result:", res);
}).catch((err) => {
    console.log("error:", err);
});
```

使用一个函数构造 Promise 对象. 这个函数接收两个参数: 回调和异常回调. 我们说一个 Promise 对象意味着一个未完成的工作, 那么当工作完成的时候就调用回调函数, 当工作失败的时候调用异常回调函数. 构造完 Promise 对象之后, 调用 `Promise.prototype.then` 设置回调函数, 调用 `Promise.prototype.catch` 设置异常回调函数.

我们可以多次调用一个 Promise 对象的 `then` 方法设置多个回调函数. 这些回调函数会形成一条回调链, 前一个函数的返回值会成为后一个函数的参数:

```js
new Promise((cb) => cb(1)).then((res) => {
    console.log(res); // 1
    return res + 1;
}).then((res) => {
    console.log(res); // 2
    return res * 2;
}).then((res) => {
    console.log(res); // 4
});
```

这些回调函数也可以返回 Promise 对象, 形成嵌套 Promise 调用:

```js
new Promise((cb) => cb(1)).then((res) => {
    console.log(res); // 1
    return res + 1;
}).then((res) => {
    console.log(res); // 2
    return new Promise((cb) => cb(res * 2));
}).then((res) => {
    console.log(res); // 4
});
```

思路都是一样的, 总之就是把 Promise 对象想象成一个未完成的任务, 任务完成时会通过调用回调函数将任务的结果传递出来.

### 使用 Promise

上面的例子使用 Promise 就是这样:

```js
function send_request(remote_process_handle, data) {
    const session_id = generate_session_id();
    /*construct a promise object, which means an unfinished job*/
    const promise = new Promise((cb) => session_map[session_id] = cb);
    send(remote_process_handle, {type: 'request', session_id, data});
    return promise;
}

function on_receive_message(remote_process_handle, message) {
    if (message.type === 'request') {
        const res = request_handler(message.data);
        Promise.resolve(res).then((response) => {
            send(remote_process_handle, {
                type: 'response', session_id: message.session_id, data: response
            });
        });
    } else if (message.type === 'response') {
        const callback = session_map[message.session_id];
        callback(message.data); // call `callback` function, fulfill the promise
        delete session_map[message.session_id];
    }
}

function request_handler(request) {
    let ctx = dosth();
    return send_request(remote_process_handle, 'ask_for_response').then((response) => {
        const res = calc(ctx, response);
        return res;
    });
}
```

其中 `Promise.resolve` 会自动判断一个对象是否是 Promise 对象, 如果是则会等待就绪再回调, 如果不是则直接回调.

可以看到, 这样一来就不需要在参数中传递回调函数, 而是直接返回 Promise 对象, 调用者收到 Promise 对象之后通过它设置回调函数. 即使存在多层调用, 只需要依次返回 Promise 对象即可. 这就完美解决了这个问题.

### 异常处理

Promise 的另一个很强大的功能就是异常处理. 上面说了, 除了可以调用 `Promise.prototype.then` 设置回调函数, 还可以调用 `Promise.prototype.catch` 设置异常回调. 回调和异常回调都会形成一个回调链. 一旦有异常发生, 就会转而执行异常回调; 而若在异常回调中做了容错之后, 又会转而执行回调.

![promise](/assets/images/promise-and-deferred_3.png)

```js
new Promise((cb) => cb(1)).then((res) => {
    console.log(res); // 1
    if (res % 2 == 1)
        throw 'cannot be odd';
    return res + 1;
}).catch((err) => {
    console.log('error occurred:', err);
    // throw err;
    return 0;
}).then((res) => {
    console.log(res); // 0
}, (err) => {
    console.log('error occurred again:', err);
});
```

`Promise.prototype.then` 支持同时设置回调和异常回调, 如上所示, 第一个参数为回调第二个参数为异常回调. 如果把 `throw err` 解注, 则最后会打印出 `error occurred again: cannot be odd`.

## 5. Deferred

笔者最早接触到 Deferred 是使用 Python 的 twisted 库. 实际上 jQuery 中也有 Deferred, 它们实际是一样的. Deferred 的本质和核心思想与 Promise 是一样的, 只是表现有所不同.

### 基础用法

我们同样先来看一个简单的例子:

```py
from twisted.internet.defer import Deferred
from threading import Timer

def then(res):
    print("result:", res)

def catch(err):
    print("error:", err)

defer = Deferred()
defer.addCallback(then) \
     .addErrback(catch)

def on_timer():
    if 1 + 1 == 2:
        defer.callback('ok')
    else:
        defer.errback(Exception('what the hell'))

Timer(1, on_timer).start()
```

可以看到 Deferred 和 Promise 还是比较相像的, `Deferred.addCallback` 相当于 `Promise.prototype.then`, `Deferred.addErrback` 相当于 `Promise.prototype.catch`. 比较大的区别是, Deferred 不需要使用一个函数构造, 而是直接调用 `Deferred.callback` 或 `Deferred.errback` 来告诉它工作已经完成或失败.

Deferred 的回调链和嵌套 Deferred 跟 Promise 是一样的, 这里举一个同样的例子:

```py
from twisted.internet.defer import Deferred

def foo(res):
    print(res) # 1
    return res + 1

def bar(res):
    print(res) # 2
    defer = Deferred()
    defer.callback(res * 2)
    return defer

def baz(res):
    print(res) # 4

defer = Deferred()
defer.addCallback(foo) \
     .addCallback(bar) \
     .addCallback(baz)

defer.callback(1)
```

### 使用 Deferred

作为示例, 这里我用 Deferred 实现了上面的 `send_request` 和 `on_receive_message`.

```py
def send_request(remote_process_handle, data):
    session_id = generate_session_id()
    defer = Deferred() # construct a deferred object, which means an unfinished job
    session_map[session_id] = defer
    send(remote_process_handle, {
        'type': 'request', 'session_id': session_id,
        'data': data})
    return defer

def on_receive_message(remote_process_handle, message):
    if message['type'] == 'request':
        res = request_handler(message['data'])
        def foo(response):
            send(remote_process_handle, {
                'type': 'response', 'session_id': message['session_id'],
                'data': response}))

        Deferred().addCallback(foo).callback(res)
    elif message['type'] == 'response':
        defer = session_map[message['session_id']]
        defer.callback(message['data']) # call `callback` function, finish the job
        del session_map[message['session_id']]

def request_handler(request):
    ctx = dosth()
    def foo(response):
        res = calc(ctx, response)
        return res

    return send_request(remote_process_handle, 'ask_for_response').addCallback(foo)
```

Deferred 的异常处理基本上与 Promise 是一样的, 这里就不赘述了. 详细的使用请参阅文档.

## 6. 总结

笔者最早是在使用 Python 的 twisted 的时候接触到了 Deferred. 当时用的是 Python2, 还没有协程. 虽然不如协程方便, 但它解决了服务器编程中反复回调的问题, 提升了代码的可维护性. 后来在使用 js 的时候接触了 Promise, 发现它们竟有异曲同工之妙. 当然, 随着技术的发展, 这些慢慢会被协程取代. 然而它们这种巧妙的设计思路值得我们学习.

---

**参考资料**
- [Promise - JavaScript \| MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [Promise - 廖雪峰的官方网站](https://www.liaoxuefeng.com/wiki/1022910821149312/1023024413276544)
