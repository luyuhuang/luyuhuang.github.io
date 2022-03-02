---
key: 64
title: Jekyll Email Protection
tag: [english, practice]
aside: false
---
A few months ago, I [migrated](/2021/12/12/service-migration.html) my blog from Cloudflare to my cloud server. Since then, I've received more spam than before. I found the reason is that Cloudflare has a feature that protects email from crawlers. Cloudflare scans your HTML pages and replaces all `mailto` links with encoded URLs, then insert a Javascript that will decode them when the browser loads that page. For example, suppose we have such an email link:

```html
<a href="mailto:luyu@huang.com" target="_blank">send me an email!</a>
```

Then Cloudflare replaces it to:

```html
<a href="/cdn-cgi/l/email-protection#523e272b27123a27333c357c313d3f" target="_blank">send me an email!</a>
<script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script>
```

So it looks like a normal link. That string `523e272b27123a27333c357c313d3f` is the encoded email. If a crawler gets that, it's hard to know that's an email link, except run the page, like a true browser. In that case, the following Javascript would be run and the link would be decoded. It's a large overhead for crawlers to parse a page like browsers.

The encoding algorithm is pretty simple. We choose a random one-byte number and xor it with each character of the email string. Convert each xor result to hex and join them to get the encoded string. The random number also be converted to hex and inserted into the beginning of that encoded string.

To decode it to get the original email, we regard every two characters as a one-byte hex number. Just xor the remaining numbers with the first number and convert them to characters.

I'd like to do the same thing on my self-hosted blog. I want Jekyll to encode email links when building the site, then add a piece of Javascript to decode them when the browser loads the page. Liquid, the template language used by Jekyll,  has limited functions, it can't handle string and characters. Lucky, Jekyll provided a convenient way to extend Liquid. In that case, we add a Liquid filter `email_encode` to encode email. Just add a Ruby script to the directory `_plugins`:

```ruby
# _plugins/email_encode.rb

module Jekyll::CustomFilters
  def email_encode(email)
    @token = rand(1..0xff)
    '#%02x%s' % [@token, email.each_byte.map{|n| '%02x' % (n ^ @token)}.join('')]
  end
end

Liquid::Template.register_filter(Jekyll::CustomFilters)
```

It uses the same way as Cloudflare to encode the email and place a '#' at the beginning the make it an anchor link. So we can use it like the following:

{% raw %}
```html
<a class="encoded-email" href="{{ site.author.email | email_encode }}" target="_blank">send me an email!</a>
```
{% endraw %}

And Jekyll would generate such results:

```html
<a class="encoded-email" href="#e38f969a96bc8b96828d84a3858c9b8e828a8fcd808c8e" target="_blank">send me an email!</a>
```

The last thing is adding a piece of Javascript to decode that link:

```js
(function () {
  function byte(s, i) {
    return parseInt(s.substr(i, 2), 16);
  };

  function decode(s) {
    s = s.substr(1);
    for (var a = '', t = byte(s, 0), i = 2; i < s.length; i += 2) {
      a += String.fromCharCode(byte(s, i) ^ t);
    }
    return a;
  };

  document.querySelectorAll('a.encoded-email').forEach(function(el) {
    el.setAttribute('href', 'mailto:' + decode(el.getAttribute('href')));
  });
})();
```

**Reference:** <https://jekyllrb.com/docs/plugins/>
