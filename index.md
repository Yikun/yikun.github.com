---
layout: home
title : Sometime we don't lack strength , But lack will.
tagline: Welcome To Yikun's Blog
---
{% include JB/setup %}


### Here's my recent posts: 

<br>
<ul class="posts">
  {% for post in site.posts %}
    <li><span>{{ post.date | date_to_string }}</span> &raquo; <a href="{{ BASE_PATH }}{{ post.url }}">{{ post.title }}</a></li>
  {% endfor %}
</ul>


