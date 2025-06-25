const nunjucks = require('nunjucks');
const { spawn } = require('child_process');
const { readFileSync } = require('fs');
const { encodeURL, full_url_for } = require('hexo-util');

hexo.extend.generator.register('feed', async locals => {
    const args = ['-f', 'markdown-smart', '-t', 'html-smart', '--mathjax', '--no-highlight'];
    const tasks = locals.posts.filter(post => post.draft !== true).sort('-date').limit(10).map(post => {
        return new Promise((resolve, reject) => {
            const child = spawn('pandoc', args);
            child.stdin.write(post._content);
            child.stdin.end();
            let result = '', error = '';
            child.stdout.on('data', data => {
                result += data.toString('utf8');
            });
            child.stderr.on('data', data => {
                error += data.toString('utf8');
            });
            child.on('exit', code => {
                if (code === 0) {
                    resolve({
                        title: post.title,
                        permalink: post.permalink,
                        updated: post.updated,
                        date: post.date,
                        content: result,
                        image: post.image,
                        categories: post.categories,
                        tags: post.tags,
                    });
                } else {
                    reject(error);
                }
            });
        });
    });

    const env = new nunjucks.Environment();
    env.addFilter('uriencode', str => encodeURL(str));
    env.addFilter('formatUrl', str => full_url_for.call(hexo, str));
    const template = nunjucks.compile(readFileSync('source/_feed.xml', 'utf8'), env);

    const posts = await Promise.all(tasks);
    const config = hexo.config;
    let url = hexo.config.url;
    if (url[url.length - 1] !== '/') {
        url += '/';
    }
    const icon = full_url_for.call(hexo, 'img/avatar.png');
    const path = 'feed.xml';
    const feed_url = full_url_for.call(hexo, path);
    
    const data = template.render({config, url, icon, posts, feed_url});
    
    return {path, data};
});
