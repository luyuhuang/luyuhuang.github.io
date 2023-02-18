---
key: 55
title: Beware of Hash Collisions in Lua Tables
tag: [lua, english]
aside: false
---
We all know that a Lua table is a hash table, which uses a hash function to map a key into one of the table's slots. However, the result of the hash function is not unique. There exist some keys that have the same hash value, i.e., it may map some different keys into the same slot. We call it **Hash Collision**.

To observe hash collisions in a Lua table, we add a function to count how many keys in a table are in their main positions. A position (index of the slot) is the main position if the position is exactly determined by the hash value. Ideally, if there is no collision, each key is in its main position. However, we may found an existing key occupied the new key's main position when we insert a new key into a table. In that case, we get a hash collision and we have to move the new key to another position that is not the main position.

It's easy to determine if a key is in its main position. The macro `mainposition` returns the main position of a specific key. The following function returns the number of keys in their main positions.

```c
int luaH_mainposnum(Table *t) {
    int n = 0;
    for (int i = 0; i < sizenode(t); i++) {
        if (!ttisnil(gval(gnode(t, i)))) {
            if (mainposition(t, gkey(gnode(t, i))) == gnode(t, i)) {
                ++n;
            }
        }
    }
    return n;
}
```

We add it to the `table` module, so we can call it by `table.mainposnum`.

```c
static const luaL_Reg tab_funcs[] = {
    ...
    {"remove", tremove},
    {"move", tmove},
    {"sort", sort},
    {"mainposnum", mainposnum}, // return the number of keys in main positions
    {NULL, NULL}
};
```

Let's see the collisions in a table. The following code inserts random integer keys into a table, then calls `table.mainposnum` and prints the number of keys in main positions.

```lua
for i = 2, 5 do
    local T = {}
    for _ = 1, 10 ^ i do
        T[math.random(10000000, 99999999)] = true
    end
    local N = table.count(T)
    local M = table.mainposnum(T)
    print("T", N, M, M/N)
end
```

The output looks like this

```
T	100	66	0.66
T	1000	655	0.655
T	9998	7486	0.74874974994999
T	99946	69755	0.69792688051548
```

About 30% of the keys collide, It seems the Lua table performs well. Unfortunately, however, it is not so perfect in all cases. Let's look at an example.

### Combined ID

A common way to generate a numerical global unique id is to combine from several different parts. For instance, we can let a timestamp as the high 32 bits of the ID, an auto-increment serial number as the middle 16 bits, and the server ID as the low 16 bits of the ID.

```lua
local seq = 0
function gen_id(server_id)
    seq = (seq + 1) % 0x10000
    local now = os.time()
    return (now << 32) | (seq << 16) | (server_id & 0xffff)
end
```

Let's generate some IDs and insert them into a table and to see what happens.

```lua
local server_id = 10001

local T = {}
for _ = 1, 1000 do
    local id = gen_id(server_id)
    T[id] = true
end

local N = table.count(T)
local M = table.mainposnum(T)
print("T", N, M, M/N)
```

Output:

```
T	1000	1	0.001
```

WTF? All keys collide and only one key in its main position, we turned the hash table into a linked list! But why?

The problem is due to the hash function of the Lua table. Lua table uses the simplest hash function -- modulo. The position of an integer key in a table is equal to the key modulo the capacity of the table. The bad news is that the capacity of a table is always a power of 2 and that a number modulo of a power of 2 is just its n-bit suffix. In our example, hash results of these Combined IDs are exactly equal, because the lowest 16 bits of these keys are the same server ID. As the result, all keys are mapped to the same slot.

Although fixing a low 16 bit of an ID is foolish, a dynamic low n bits ID is not safe neither. A suffix is not a valid abstract of the whole ID anyway, especially in a combined ID -- there is always some information in its high n bits. In our example, if we generate IDs in other orders:

- Server ID + serial number + timestamp: all IDs generated at the same time collision, unless the capacity of the table is not less than $2^{32}$;
- Timestamp + server ID + serial number: if the capacity is less than $2^{32}$, in the same server, the table has at most $2^{16}$ main positions;
- Server ID + timestamp + serial number: maybe this is the only acceptable result.

So, in conclusion, if you use combined IDs, be very cautious to put them into a hash table.

### Distribution by Modulo

To distribute requests to several work services, we often use modulo. For example, assume we have 64 work services. When we receive a request from a user whose ID is 10001, we distribute the request to the number `10001 % 64 = 17` service. After that, the service received that request:

```lua
function request_handler(user_id, data)
    cache[user_id] = data
end
```

So the problem happened then. What, don't you believe it? Let's experiment.

```lua
cache = {}

function request_handler(user_id, data)
    cache[user_id] = data
end

for id = 10000, 19999 do
    if id % 64 == 17 then -- requests distributed to service 17
        request_handler(id, {id = id})
    end
end

local N = table.count(cache)
local M = table.mainposnum(cache)

print("cache", N, M, M/N)
```

And this is the output:

```
cache	157	4	0.025477707006369
```

Only 5 keys are in their main positions and the collision rate is as high as 97.5% !

The reason is very clear: all the IDs distributed to service 17 have the same suffix, because their modulo 64, a power of 2, is 17. These same suffixes caused hash collisions.

As we see, modulo a power of 2 is a bad hash function. We need a better hash function.

### Better Hash Function

The following algorithm was found by [Thomas Mueller](https://stackoverflow.com/users/382763/thomas-mueller). This is based on [splitmix64](https://xorshift.di.unimi.it/splitmix64.c), which seems to be based on the blog article [Better Bit Mixing](http://zimbry.blogspot.it/2011/09/better-bit-mixing-improving-on.html).

```c
inline uint64_t betterhash(uint64_t x) {
    x = (x ^ (x >> 30)) * UINT64_C(0xbf58476d1ce4e5b9);
    x = (x ^ (x >> 27)) * UINT64_C(0x94d049bb133111eb);
    x = x ^ (x >> 31);
    return x;
}
```

In this algorithm, every bit of a number is considered, instead of just cut the tail. Let's modify the implementation of the Lua table and change the hash function:

```c
#define hashint(t,i)		hashpow2(t, betterhash(i))
```

Let's run the previous examples again:

```
combined ID:
T	1000	640	0.64

distribution by modulo:
cache	157	117	0.74522292993631
```

Finally, the results become normal.

***

**Reference:** [What integer hash function are good that accepts an integer hash key?
](https://stackoverflow.com/questions/664014/what-integer-hash-function-are-good-that-accepts-an-integer-hash-key)
