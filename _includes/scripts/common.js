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
})();
