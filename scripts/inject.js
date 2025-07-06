hexo.extend.filter.register('theme_inject', function(injects) {
    injects.variable.push('source/_inject/variables')
    injects.postComments.file('default', 'source/_inject/comment.ejs');
    injects.linksComments.file('default', 'source/_inject/comment.ejs');
});
