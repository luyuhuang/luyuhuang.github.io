const nunjucks = require('nunjucks');
const { readFileSync } = require('fs');
const { encodeURL, full_url_for } = require('hexo-util');
const { parse } = require('node-html-parser');

hexo.extend.generator.register('feed', locals => {
    const posts = locals.posts.filter(post => post.draft !== true).sort('-date').limit(10).map(post => {
        const root = parse(post.content);
        root.querySelectorAll('figure.highlight').forEach(elem => {
            const code = elem.querySelectorAll('table td.code > pre').toString();
            elem.replaceWith(code);
        });
        return {
            title: post.title,
            permalink: post.permalink,
            updated: post.updated,
            date: post.date,
            content: root.toString(),
            summary: root.textContent.substring(0, 150),
            image: post.image,
            categories: post.categories,
            tags: post.tags,
        };
    });

    const config = hexo.config;
    let url = hexo.config.url;
    if (url[url.length - 1] !== '/') {
        url += '/';
    }
    const icon = full_url_for.call(hexo, 'img/avatar.png');
    const path = 'feed.xml';
    const feed_url = full_url_for.call(hexo, path);
    
    const env = new nunjucks.Environment();
    env.addFilter('uriencode', str => encodeURL(str));
    env.addFilter('formatUrl', str => full_url_for.call(hexo, str));
    const template = nunjucks.compile(readFileSync('source/_feed.xml', 'utf8'), env);
    const data = template.render({config, url, icon, posts, feed_url});
    
    return {path, data};
});
