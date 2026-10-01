/* zirvo.ai — shared behaviour. No dependencies, no network requests.
 *
 * Progressive enhancement only: without this file every page is complete and
 * fully visible (static header, all sections shown, the whole demo
 * conversation on screen). With "reduce motion" nothing animates.
 *
 *  1. Footer year.
 *  2. Sticky header that compacts into a floating bar on scroll.
 *  3. Staggered reveal of blocks that start below the fold.
 *  4. Legal pages: table of contents open on desktop + current section.
 *  5. Zirvo Risto hero demo: WhatsApp conversation, pausable.
 */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduceQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function prefersReduced() {
    return !!(reduceQuery && reduceQuery.matches);
  }

  function onMediaChange(query, handler) {
    if (!query) return;
    if (query.addEventListener) query.addEventListener("change", handler);
    else if (query.addListener) query.addListener(handler);
  }

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  function onScrollFrame(fn) {
    var ticking = false;
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          ticking = false;
          fn();
        });
      },
      { passive: true }
    );
  }

  /* 1. Footer year ------------------------------------------------------------ */
  function initYear() {
    var year = String(new Date().getFullYear());
    each(doc.querySelectorAll("[data-year]"), function (el) {
      el.textContent = year;
    });
  }

  /* 2. Header ------------------------------------------------------------------- */
  function initHeader() {
    var header = doc.querySelector("[data-header]");
    if (!header) return;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    }
    onScrollFrame(update);
    update();
  }

  /* 3. Reveal on scroll ------------------------------------------------------- */
  function initReveal() {
    var items = doc.querySelectorAll("[data-reveal]");
    if (!items.length || prefersReduced() || !("IntersectionObserver" in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          observer.unobserve(el);
          el.classList.add("is-revealed");
          var cleaned = false;
          var cleanup = function (event) {
            if (cleaned || (event && event.target !== el)) return;
            cleaned = true;
            el.classList.remove("reveal-pending", "is-revealed");
            el.style.removeProperty("--reveal-delay");
            el.removeEventListener("transitionend", cleanup);
          };
          el.addEventListener("transitionend", cleanup);
          window.setTimeout(cleanup, 1800);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 }
    );

    var viewport = window.innerHeight || root.clientHeight;
    each(items, function (el) {
      // Only blocks that are still off-screen get hidden: what is already in
      // view never blinks, and nothing is hidden before this code runs.
      if (el.getBoundingClientRect().top < viewport * 0.92) return;
      var siblings = Array.prototype.filter.call(el.parentElement.children, function (child) {
        return child.hasAttribute("data-reveal");
      });
      el.style.setProperty("--reveal-delay", Math.min(siblings.indexOf(el), 4) * 90 + "ms");
      el.classList.add("reveal-pending");
      observer.observe(el);
    });
  }

  /* 4. Legal table of contents -------------------------------------------------- */
  function initToc() {
    var toc = doc.querySelector("[data-toc]");
    if (!toc) return;

    var desktop = window.matchMedia ? window.matchMedia("(min-width: 1024px)") : null;
    function syncOpen() {
      if (desktop && desktop.matches) toc.open = true;
    }
    syncOpen();
    onMediaChange(desktop, syncOpen);

    toc.addEventListener("click", function (event) {
      var link = event.target.closest ? event.target.closest("a") : null;
      if (link && desktop && !desktop.matches) toc.open = false;
    });

    var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var byId = {};
    var headings = [];
    links.forEach(function (link) {
      var id = decodeURIComponent(link.getAttribute("href").slice(1));
      var heading = doc.getElementById(id);
      if (!heading) return;
      byId[id] = link;
      headings.push(heading);
    });
    if (!headings.length) return;

    var current = null;
    function update() {
      var line = (window.innerHeight || root.clientHeight) * 0.3;
      var active = headings[0];
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].getBoundingClientRect().top <= line) active = headings[i];
        else break;
      }
      if (window.innerHeight + window.scrollY >= root.scrollHeight - 2) {
        active = headings[headings.length - 1];
      }
      if (active === current) return;
      if (current) byId[current.id].removeAttribute("aria-current");
      current = active;
      byId[current.id].setAttribute("aria-current", "true");
    }
    onScrollFrame(update);
    window.addEventListener("resize", update);
    update();
  }

  /* 5. Zirvo Risto demo ------------------------------------------------------------ */
  function initDemo(demo) {
    var messages = Array.prototype.slice.call(demo.querySelectorAll("[data-msg]"));
    var booking = demo.querySelector("[data-demo-booking]");
    var toggle = demo.querySelector("[data-demo-toggle]");
    var toggleLabel = toggle ? toggle.querySelector("[data-demo-label]") : null;
    if (!messages.length) return;

    function showAll() {
      messages.forEach(function (el) {
        el.classList.remove("is-typing");
        el.classList.add("is-shown");
      });
      if (booking) booking.classList.add("is-shown");
      demo.classList.remove("is-typing");
    }

    function clear() {
      messages.forEach(function (el) {
        el.classList.remove("is-shown", "is-typing");
      });
      if (booking) booking.classList.remove("is-shown");
      demo.classList.remove("is-typing");
    }

    function typing(el) {
      el.classList.add("is-typing");
      demo.classList.add("is-typing");
    }

    function say(el) {
      el.classList.remove("is-typing");
      el.classList.add("is-shown");
      demo.classList.remove("is-typing");
    }

    // [wait before the step in ms, step]. It opens on the finished conversation
    // (what a visitor without JS sees too), then replays it in a loop.
    var script = [[3400, clear]];
    messages.forEach(function (el, index) {
      if (el.getAttribute("data-msg") === "in") {
        script.push([800, function () { typing(el); }]);
        script.push([1500, function () { say(el); }]);
      } else {
        script.push([index === 0 ? 700 : 1200, function () { say(el); }]);
      }
    });
    if (booking) {
      script.push([900, function () { booking.classList.add("is-shown"); }]);
    }
    script.push([4800, clear]);
    // After the last `clear` the loop goes back to the first message.
    var loopStart = 1;

    var step = 0;
    var timer = 0;
    var dueAt = 0;
    var remaining = -1;
    var running = false;
    var armed = false;
    var userPaused = false;
    var inView = true;

    function schedule(wait) {
      dueAt = Date.now() + wait;
      timer = window.setTimeout(tick, wait);
    }

    function tick() {
      script[step][1]();
      step = step + 1 < script.length ? step + 1 : loopStart;
      schedule(script[step][0]);
    }

    function start() {
      if (running) return;
      running = true;
      demo.classList.add("is-playing");
      schedule(remaining >= 0 ? remaining : script[step][0]);
      remaining = -1;
    }

    function stop() {
      if (!running) return;
      running = false;
      demo.classList.remove("is-playing");
      window.clearTimeout(timer);
      remaining = Math.max(0, dueAt - Date.now());
    }

    function update() {
      if (!armed) return;
      if (!userPaused && inView && !doc.hidden) start();
      else stop();
      demo.classList.toggle("is-paused", userPaused);
    }

    function arm() {
      if (armed) return;
      armed = true;
      step = 0;
      remaining = -1;
      showAll();
      demo.classList.add("is-armed");
      if (toggle) toggle.hidden = false;
      update();
    }

    function disarm() {
      stop();
      armed = false;
      showAll();
      demo.classList.remove("is-armed", "is-playing", "is-paused", "is-typing");
      if (toggle) toggle.hidden = true;
    }

    if (toggle) {
      toggle.addEventListener("click", function () {
        userPaused = !userPaused;
        if (userPaused) {
          // Paused means still and complete: the whole conversation, and a
          // fresh start (from that same complete view) when played again.
          stop();
          showAll();
          step = 0;
          remaining = -1;
        }
        if (toggleLabel) {
          toggleLabel.textContent = userPaused
            ? toggle.getAttribute("data-label-play")
            : toggle.getAttribute("data-label-pause");
        }
        update();
      });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          inView = entries[entries.length - 1].isIntersecting;
          update();
        },
        { threshold: 0.2 }
      ).observe(demo);
    }

    doc.addEventListener("visibilitychange", update);
    onMediaChange(reduceQuery, function () {
      if (prefersReduced()) disarm();
      else arm();
    });

    if (!prefersReduced()) arm();
  }

  /* Boot ----------------------------------------------------------------------- */
  function safely(fn) {
    try {
      fn();
    } catch (error) {
      // A failed enhancement must never hide content.
      root.classList.remove("js");
      each(doc.querySelectorAll(".reveal-pending"), function (el) {
        el.classList.remove("reveal-pending");
      });
      each(doc.querySelectorAll("[data-demo]"), function (el) {
        el.classList.remove("is-armed", "is-playing");
      });
      if (window.console && console.error) console.error(error);
    }
  }

  function boot() {
    root.classList.add("js");
    safely(initYear);
    safely(initHeader);
    safely(initReveal);
    safely(initToc);
    each(doc.querySelectorAll("[data-demo]"), function (demo) {
      safely(function () {
        initDemo(demo);
      });
    });
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
