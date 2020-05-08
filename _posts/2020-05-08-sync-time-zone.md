---
key: 31
title: Synchronize time and time zone between client and server
tag: experience
---
The time in online games is generally based on the server time, which include the time used by the client for calculation and display, since the time in the client may be incorrect. In addition, my game project'll be released globally, so it's important to synchronize time zone between client and server. I have to deal with the time zone problems manually since the game is written in Lua and there are no related functions in Lua.

### Synchronize time

Since the function `os.time()` always returns a UTC timestamp, as long as your clock is accurate, the function `os.time()` always returns a same value at the same moment regardless of the time zone. So, when the client calls `os.time()`, it only needs to consider the accuracy of the clock, not the time zone.

The server returns the server's timestamp `server_timestamp` to the client when the client logs in, and client calculates the difference between server's time and client's time `time_diff = os.time() - server_timestamp`. Next, the server's timestamp will be periodically sent by the server to the client and the client will calibrate the time difference continuously.

If the client wants to get current accurate timestamp, it should execute `os.time() - time_diff`. Since the client should always use server time, we rewrite `os.time()` as:

```lua
local os_time = os.time
local time_diff = 0

function calibrate_time(server_timestamp)
    time_diff = os_time() - server_timestamp
end

function os.time()
    return os_time() - time_diff
end
```

### Synchronize time zone

Synchronization of the time zone is more complicated compared with synchronization of time. If the client uses timestamps only, we don't need to care about time zone, since the timestamp is independent of time zone. However, a readable time, i.e. consists of year, month, day, hour, minute, second, is time zone related. If we discuss about converting a timestamp to a readable time or converting a readable time to a timestamp, the premise is that in a certain time zone.

In Lua, call `os.time` and pass in a argument describing the readable time to convert the readable time to a timestamp; call `os.date` and pass the format string and timestamp to convert the timestamp to a readable time. However, Lua will use the local time zone(i.e. the machine time zone) for these conversions, which is not what we want. Therefore, we must calculate the time zone conversion.

To converting a specific readable time such as `yyyy-MM-dd HH:mm:ss` to a timestamp, first, we can calculate how many days have passed since January 1, 1970, according to the leap year rule; then count the number of seconds, and get a "timestamp". However, it is incorrect, because the readable time `yyyy-MM-dd HH:mm:ss` includes time zone. The correct way is to subtract the time zone after counting the number of seconds to eliminate the time zone effect.

Therefore, to converting time `yyyy-MM-dd HH:mm:ss` to a timestamp in server time zone, we should:

```lua
count_number_of_seconds_since_1970(yyyy-MM-dd HH:mm:ss) - SERVER_TIMEZONE
```

However, when we call `os.time` and pass the time, the result is:

```lua
os.time(yyyy-MM-dd HH:mm:ss) = count_number_of_seconds_since_1970(yyyy-MM-dd HH:mm:ss) - CLIENT_TIMEZONE
```

So, to get the timestamp in server time zone, we should:

```lua
os.time(yyyy-MM-dd HH:mm:ss) + CLIENT_TIMEZONE - SERVER_TIMEZONE
```

Similarly, to converting a specific timestamp `n` to a readable time, we can calculate the year, month, day and time after `n` seconds have passed since January 1, 1970. This result is incorrect either since it's the conversion in UTC time zone. To get the correct time, we should:

```lua
calculate_the_datetime_since_1970(n + SERVER_TIMEZONE)
```

However, when we call `os.date` and pass the format string and `n`, the result is:

```lua
os.date("%Y-%m-%d %H:%M:%S", n) = calculate_the_datetime_since_1970(n + CLIENT_TIMEZONE)
```

So, to get the readable time in server time zone, we should:

```lua
os.date("%Y-%m-%d %H:%M:%S", n - CLIENT_TIMEZONE + SERVER_TIMEZONE)
```

### Put Them Together

After the client logs in, server tells the client its time and timezone. Server will also tell clients its time periodically. We rewrite `os.time` and `os.date`:

```lua
local os_time = os.time
local os_date = os.date
local time_diff = 0
local CLIENT_TIMEZONE = math.floor(os.difftime(now, ostime(osdate("!*t", now))))
local SERVER_TIMEZONE = CLIENT_TIMEZONE

-- call it when the client loged in
function init_time(server_timezone, server_timestamp)
    SERVER_TIMEZONE = server_timezone
    time_diff = os_time() - server_timestamp
end

-- call it periodically
function calibrate_time(server_timestamp)
    time_diff = os_time() - server_timestamp
end

function os.time(date)
    if date != nil then
        return os_time(date) + CLIENT_TIMEZONE - SERVER_TIMEZONE
    else
        return os_time() - time_diff
    end
end

function os.date(format, time)
    if time == nil then
        time = os.time()
    end
    return os_date(format, time - CLIENT_TIMEZONE + SERVER_TIMEZONE)
end
```
