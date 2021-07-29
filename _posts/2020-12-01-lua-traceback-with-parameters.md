---
key: 43
title: Printing parameters in Lua traceback
tag: [lua, english]
aside: false
---
When an error occurs, Lua will print a traceback of the call stack, it helps us to find bugs. In many cases, however, a call stack traceback is not enough for us to find out the problem. We need more information, such as the environment, parameters of each function call, even all local variables of the stack.

I decide to modify Lua to improve traceback printing. Printing parameters of each function call does not yield too much output and can help us find bugs much better.

Just modify `luaL_traceback`. `lua_Debug.nparams` holds the number of parameters of the function, `lua_getlocal` returns the local variable of the given function and index. Not difficult to do this.

```c
LUALIB_API void luaL_traceback (lua_State *L, lua_State *L1,
                                const char *msg, int level) {
  lua_Debug ar;
  int top = lua_gettop(L);
  int last = lastlevel(L1);
  int n1 = (last - level > LEVELS1 + LEVELS2) ? LEVELS1 : -1;
  if (msg)
    lua_pushfstring(L, "%s\n", msg);
  luaL_checkstack(L, 10, NULL);
  lua_pushliteral(L, "stack traceback:");
  while (lua_getstack(L1, level++, &ar)) {
    if (n1-- == 0) {  /* too many levels? */
      lua_pushliteral(L, "\n\t...");  /* add a '...' */
      level = last - LEVELS2 + 1;  /* and skip to last ones */
    }
    else {
      lua_getinfo(L1, "Slntu", &ar);
      lua_pushfstring(L, "\n\t%s:", ar.short_src);
      if (ar.currentline > 0)
        lua_pushfstring(L, "%d:", ar.currentline);
      lua_pushliteral(L, " in ");
      pushfuncname(L, &ar);

      if (ar.nparams > 0) {
        lua_pushliteral(L, ", params:");
      }
      for (int i = 1; i <= ar.nparams; ++i) {
        const char *name = lua_getlocal(L1, &ar, i);
        if (name) {
          lua_xmove(L1, L, 1); // -3
          const char *val = luaL_tolstring(L, -1, NULL); // -2
          lua_pushfstring(L, " %s = %s;", name, val); // -1
          lua_insert(L, -3);
          lua_pop(L, 2);
        }
      }

      if (ar.istailcall)
        lua_pushliteral(L, "\n\t(...tail calls...)");
      lua_concat(L, lua_gettop(L) - top);
    }
  }
  lua_concat(L, lua_gettop(L) - top);
}
```

Now, when an error occurs, we get the following output:

```
src/lua: t.lua:2: attempt to perform arithmetic on a string value (local 's')
stack traceback:
        t.lua:2: in upvalue 'foo', params: n = 22.46; s = I'm a string;
        t.lua:6: in local 'bar', params: n = 11.23; s = I'm a string;
        t.lua:9: in main chunk
        [C]: in ?
```
