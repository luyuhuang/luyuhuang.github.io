const url_for = hexo.extend.helper.get('url_for').bind(hexo);
hexo.extend.helper.register('url_for', function(path) {
    if (path && path.startsWith('mailto:')) {
        const rand = Math.floor(Math.random() * 0x100);
        return '#' + rand.toString(16).padStart(2, '0') + Array.from(new TextEncoder().encode(path))
            .map(c => (c ^ rand).toString(16).padStart(2, '0'))
            .join('')
    }
    return url_for(path);
});

const decoder = (function() {
    function byte(s, i) {
        return parseInt(s.substr(i, 2), 16);
    };

    function decode(s) {
        if (!s) return s;
        s = s.substr(1);
        for (var a = '', t = byte(s, 0), i = 2; i < s.length; i += 2) {
            a += String.fromCharCode(byte(s, i) ^ t);
        }
        return a;
    };

    document.querySelectorAll('a').forEach(function(el) {
        var s = decode(el.getAttribute('href'));
        if (s && s.startsWith('mailto:')) {
            el.setAttribute('href', s);
        }
    });
}).toString();

hexo.extend.injector.register('body_end', `<script type="text/javascript">(${decoder})()</script>`)
