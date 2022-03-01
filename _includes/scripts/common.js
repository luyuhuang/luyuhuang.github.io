(function () {
  var $root = document.getElementsByClassName('root')[0];
  if (window.hasEvent('touchstart')) {
    $root.dataset.isTouch = true;
    document.addEventListener('touchstart', function(){}, false);
  }

  var links = document.links, hostname = window.location.hostname;
  for (var i = 0; i < links.length; ++i) {
    if (links[i].hostname != hostname) {
      links[i].target = '_blank';
    }
  }

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
