---
layout: page
title: Friends
key: page-friends
---
This is a link exchange page. If you have an independent blog with any content about technology and want to exchange a link with me, feel free to leave a comment, or send me a mail.

{% assign _articles = site.data.friends %}
<div class="layout--articles">
    {%- include article-list.html articles=_articles type='grid' size='sm' open_blank=true -%}
</div>
