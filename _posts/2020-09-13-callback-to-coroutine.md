---
key: 40
title: A simple way to turn callback pattern to coroutine pattern in Lua
tag: [lua, english]
aside: false
---
My game project is written by Lua. However, its framework does not provide a coroutine pattern, it uses a simple callback pattern instead. For example, to send an http request and receive the response, you must write like this:

```lua
http_get("https://luyuhuang.tech/sitemap.xml", function(code, content)
    if code ~= 200 then
        print("an error occured:", content)
        return
    end
    print("data received:", content)
end)
```

For simple requests, it' OK. However, in some scenarios, maybe there are several successive requests in one procedure. For example, you must request A and then request B, and then request C. It makes you fall in the **callback hell**. Worse yet, sometimes you should call A again if request C fails. As we all know, coroutines can resolve this problem easily, but how can we use coroutines without changing the framework? Inspired by Javascript's Promise, I found an easy way to turn callback pattern to coroutine pattern. Review how JS's Promise is made:

```js
async function get_sitemap(url) {
    const [code, content] = await new Promise((resolve) => {
        http_get(url, resolve);
    });
    if (code !== 200) {
        console.log('an error occured:', content);
        return;
    }
    console.log('data received:', content);
}
```

JS can await for a Promise object and then suspend the coroutine. After calling `resolve`, the coroutine resumes. That's a good idea but I don't need a Promise object since I dont't need so many methods like `then` and `catch`. So I decided to implement a simple mechanism.

The key is we should suspend the coroutine and resume it after calling the callback `resolve`. Therefore, instead of yield an object, we can just yield a function whose parameter is the callback function `resolve`. We pass the `resolve` function to the yielded function after the coroutine suspended. In the `resolve` function, we resume the coroutine and pass its parameters to the coroutine, so the coroutine will be resumed after calling the `resolve` function. The code is as follows:

```lua
function coroutinize(f, ...)
    local co = coroutine.create(f)
    local function exec(...)
        local ok, data = coroutine.resume(co, ...)
        if not ok then
            error(debug.traceback(co, data))
        end
        if coroutine.status(co) ~= "dead" then
            data(exec)
        end
    end
    exec(...)
end
```

Well, it's a very simple implementation. No such sophisticated mechanism as JS's Promise, but it works well! You can use it like this:

```lua
function get_sitemap(url)
    local code, content = coroutine.yield(function(resolve)
        http_get(url, resolve)
    end)
    if code ~= 200 then
        print("an error occured:", content)
        return
    end
    print("data received:", content)
end

coroutinize(get_sitemap, "https://luyuhuang.tech/sitemap.xml")
```

It's easy for several successive requests too. You can also encapsulate a function suitable for coroutines. Here is a complex example that is hard to write in callback pattern:

```lua
function http_get_co(url)
    return coroutine.yield(function(resolve)
        http_get(url, resolve)
    end)
end

function successive_requests(cb)
    local code, arg1 = http_get_co(URL_A)
    assert(code == 200)

    local code, arg2 = http_get_co(URL_B)
    assert(code == 200)

    local code, res = http_get_co(URL_C .. "?arg1=" .. arg1 .. "&arg2=" .. arg2)
    if code ~= 200 then
        -- try again
        return successive_requests(cb)
    end

    cb(res)
end

coroutinize(successive_requests, function(res)
    print("the result is", res)
end)
```
