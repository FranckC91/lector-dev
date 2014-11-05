/**
 * JavaScript code injected in the content <iframe>.
 *
 * Code from this file has access to the document representing the current chapter, but not to the
 * application. To communicate with the application, the code needs to send messages using
 * `window.parent.postMessage`.
 */
(function() {
"use strict";

window.Lector = {};

var columnGap = 40;
var currentPage = 0;
var gInnerWidth = window.innerWidth;
var gInnerHeight = window.innerHeight;

///////////////
// Adapting column size
//

function setupColumns() {
  gInnerWidth = window.innerWidth;
  gInnerHeight = window.innerHeight;
  var body = document.body;
  body.style.MozColumnWidth = gInnerWidth + "px";
  body.style.MozColumnGap = columnGap + "px";
//  body.style.height = innerHeight + "px";

}
var BUFFERING_DURATION_MS = 15;
var resizing = null;
window.addEventListener("resize", function() {
  if (resizing) {
    return;
  }
  resizing = setTimeout(setupColumns, BUFFERING_DURATION_MS);
});
window.addEventListener("DOMContentLoaded", function observer() {
  setupColumns();
  window.removeEventListener("DOMContentLoaded", observer);
});


///////////////
// Communicating with the parent window
//

window.Lector.goto = function(href) {
  var message = {method:"goto", args:[href]};
  window.parent.postMessage(message, "*");
};

///////////////
// Garbage-collecting urls
//

window.addEventListener("unload", function() {
  window.parent.postMessage({method: "unload", args:[window.location.href]}, "*");
});

//////////////
// Keyboard navigation
//

window.addEventListener("keypress", function(e) {
  switch (e.code) {
    case "ArrowLeft":
    case "ArrowUp":
    case "Left":
    case "Space":
      e.preventDefault();
      e.stopPropagation();
      scrollBy(-1);
      break;
    case "ArrowDown":
    case "ArrowRight":
    case "Right":
    case "Backspace":
      e.preventDefault();
      e.stopPropagation();
      scrollBy(1);
    default:
      break;
  }
});

/////////////
// Touch events
//

var gCurrentTouchStart = null;
var gCurrentTouchMove = null;
window.addEventListener("touchmove", function(event) {
  if (event.touches.length > 1) {
    // This is a multi-touch event, so probably the user
    // is zooming. Let's not interfere with it.
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  gCurrentTouchMove = event;
  requestAnimationFrame(function() {
    // Let's follow the swipe immediately.
    var originalX = gCurrentTouchStart.touches[0].clientX;
    var currentX = gCurrentTouchMove.touches[0].clientX;
    var deltaX = currentX - originalX;
    var width = gInnerWidth + columnGap;
    var defaultPosition = currentPage * width;
    scrollToPosition(defaultPosition - deltaX);
  });
});
window.addEventListener("touchstart", function(event) {
  console.log("touchstart", event);
  if (event.touches.length > 1) {
    // This is a multi-touch event, so probably the user
    // is zooming. Let's not interfere with it.
    return;
  }
  gCurrentTouchStart = event;
});
window.addEventListener("touchend", function(event) {
  console.log("touchend", event);
  if (event.touches.length >= 1) {
    // This is a multi-touch event, so probably the user
    // is zooming. Let's not interfere with it.
    return;
  }
  var originalX = gCurrentTouchStart.touches[0].clientX;
  var currentX = gCurrentTouchMove.touches[0].clientX;
  gCurrentTouchStart = null;
  gCurrentTouchMove = null;
  var deltaX = currentX - originalX;
  if (Math.abs(deltaX) < gInnerWidth * .1) {
    // The finger moved by less than 10% of the width of the screen, it's
    // probably not intended as a swipe, so let's ignore it.
    scrollBy(0);
  } else if (deltaX < 0) {
    scrollBy(1);
  } else {
    scrollBy(-1);
  }
});

/////////////
// Navigation
//

window.addEventListener("message", function(e) {
  switch (e.data.method) {
    case "scrollBy":
      scrollBy(e.data.args[0]);
      break;
    case "scrollToPage":
      scrollToPage(e.data.args[0]);
      break;
    default:
      break;
  }
});

function scrollToPosition(position) {
  var translation = "translateX(" + (-1 * position) + "px)";
  console.log("Translation", translation);
  document.body.style.transform = translation;
}

function scrollToPage(where) {
  console.log("scrollToPage", where);
  var width = gInnerWidth + columnGap;
  var scrollMaxX = document.body.scrollWidth;
  var lastPage = Math.floor(scrollMaxX / width);
  if (where == Infinity) {
    where = lastPage;
  }
  currentPage = where;
  window.parent.postMessage({method: "pagechange", args:[{page: where, lastPage: lastPage}]}, "*");
  scrollToPosition(currentPage * width);
}

window.Lector.scrollToPage = scrollToPage;

/**
 * Scroll forwards/backwards by a number of pages.
 *
 * @param {number} deltaPages The number of pages to scroll.
 * May be negative to scroll backwards. Ignored if 0.
 */
function scrollBy(deltaPages) {
  var scrollMaxX = document.body.scrollWidth;
  var nextPage = currentPage + deltaPages;
  var width = window.innerWidth + columnGap;
  if (nextPage < 0) {
    console.log("Next page is < 0");
    window.parent.postMessage({method: "changeChapterBy", args: [-1]}, "*");
    return;
  } else if (nextPage * width >= scrollMaxX) {
    window.parent.postMessage({method: "changeChapterBy", args: [1]}, "*");
    return;
  }
  scrollToPage(nextPage);
}

})();
