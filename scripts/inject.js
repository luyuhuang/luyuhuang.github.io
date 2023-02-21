hexo.extend.filter.register('theme_inject', function(injects) {
    injects.postComments.file('default', 'source/_inject/comment.ejs');
    injects.linksComments.file('default', 'source/_inject/comment.ejs');
});

hexo.extend.injector.register('head_end', `<style>
.markdown-body img {
  box-shadow: unset !important;
  border-radius: 0px !important;
}</style>`)

hexo.extend.injector.register('head_end',
    `<link rel="alternate" href="/feed.xml" title="Luyu Huang's Blog" type="application/atom+xml">`)
hexo.extend.injector.register('head_end',
    `<link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">`)

