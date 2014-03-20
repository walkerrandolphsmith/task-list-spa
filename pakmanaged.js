var global = Function("return this;")();
/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var oldRequire = require
    , modules = {}
    ;

  function newRequire(modulename) {
    var err
      , mod
      , metamod
      ;

    try {
      mod = oldRequire(modulename);
    } catch(e) {
      err = e;
    }

    if (mod) {
      return mod;
    }

    metamod = modules[modulename];
    
    if (metamod) {
      mod = metamod();
      return mod;
    }

    // make it possible to require 'process', etc
    mod = global[modulename];

    if (mod) {
      return mod;
    }

    console.error(modulename);
    throw err;
  }

  function provide(modulename, factory) {
    var modReal
      ;

    function metamod() {
      if (modReal) {
        return modReal;
      }

      if (!factory.__pakmanager_factory__) {
        modReal = factory;
        return factory;
      }

      if (factory.__factoryIsResolving) {
        console.error('Your circular dependencies are too powerful!');
        return factory.__moduleExports;
      }

      factory.__factoryIsResolving = true;
      factory.__moduleExports = {};
      modReal = factory(factory.__moduleExports);
      factory.__factoryIsResolving = false;

      return modReal;
    }

    modules[modulename] = metamod;
    // somewhat of a dirty hack since I don't have a plug for loading the "main" module otherwise
    modules['pakmanager.main'] = metamod;
  }

  require = newRequire;
  global.require = newRequire;
  global.provide = provide;
}());

// pakmanager:sigmund
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  module.exports = sigmund
    function sigmund (subject, maxSessions) {
        maxSessions = maxSessions || 10;
        var notes = [];
        var analysis = '';
        var RE = RegExp;
    
        function psychoAnalyze (subject, session) {
            if (session > maxSessions) return;
    
            if (typeof subject === 'function' ||
                typeof subject === 'undefined') {
                return;
            }
    
            if (typeof subject !== 'object' || !subject ||
                (subject instanceof RE)) {
                analysis += subject;
                return;
            }
    
            if (notes.indexOf(subject) !== -1 || session === maxSessions) return;
    
            notes.push(subject);
            analysis += '{';
            Object.keys(subject).forEach(function (issue, _, __) {
                // pseudo-private values.  skip those.
                if (issue.charAt(0) === '_') return;
                var to = typeof subject[issue];
                if (to === 'function' || to === 'undefined') return;
                analysis += issue;
                psychoAnalyze(subject[issue], session + 1);
            });
        }
        psychoAnalyze(subject, 0);
        return analysis;
    }
    
    // vim: set softtabstop=4 shiftwidth=4:
    
  provide("sigmund", module.exports);
}(global));

// pakmanager:minimatch
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  ;(function (require, exports, module, platform) {
    
    if (module) module.exports = minimatch
    else exports.minimatch = minimatch
    
    if (!require) {
      require = function (id) {
        switch (id) {
          case "sigmund": return function sigmund (obj) {
            return JSON.stringify(obj)
          }
          case "path": return { basename: function (f) {
            f = f.split(/[\/\\]/)
            var e = f.pop()
            if (!e) e = f.pop()
            return e
          }}
          case "lru-cache": return function LRUCache () {
            // not quite an LRU, but still space-limited.
            var cache = {}
            var cnt = 0
            this.set = function (k, v) {
              cnt ++
              if (cnt >= 100) cache = {}
              cache[k] = v
            }
            this.get = function (k) { return cache[k] }
          }
        }
      }
    }
    
    minimatch.Minimatch = Minimatch
    
    var LRU = require("lru-cache")
      , cache = minimatch.cache = new LRU({max: 100})
      , GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {}
      , sigmund = require("sigmund")
    
    var path = require("path")
      // any single thing other than /
      // don't need to escape / when using new RegExp()
      , qmark = "[^/]"
    
      // * => any number of characters
      , star = qmark + "*?"
    
      // ** when dots are allowed.  Anything goes, except .. and .
      // not (^ or / followed by one or two dots followed by $ or /),
      // followed by anything, any number of times.
      , twoStarDot = "(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?"
    
      // not a ^ or / followed by a dot,
      // followed by anything, any number of times.
      , twoStarNoDot = "(?:(?!(?:\\\/|^)\\.).)*?"
    
      // characters that need to be escaped in RegExp.
      , reSpecials = charSet("().*{}+?[]^$\\!")
    
    // "abc" -> { a:true, b:true, c:true }
    function charSet (s) {
      return s.split("").reduce(function (set, c) {
        set[c] = true
        return set
      }, {})
    }
    
    // normalizes slashes.
    var slashSplit = /\/+/
    
    minimatch.filter = filter
    function filter (pattern, options) {
      options = options || {}
      return function (p, i, list) {
        return minimatch(p, pattern, options)
      }
    }
    
    function ext (a, b) {
      a = a || {}
      b = b || {}
      var t = {}
      Object.keys(b).forEach(function (k) {
        t[k] = b[k]
      })
      Object.keys(a).forEach(function (k) {
        t[k] = a[k]
      })
      return t
    }
    
    minimatch.defaults = function (def) {
      if (!def || !Object.keys(def).length) return minimatch
    
      var orig = minimatch
    
      var m = function minimatch (p, pattern, options) {
        return orig.minimatch(p, pattern, ext(def, options))
      }
    
      m.Minimatch = function Minimatch (pattern, options) {
        return new orig.Minimatch(pattern, ext(def, options))
      }
    
      return m
    }
    
    Minimatch.defaults = function (def) {
      if (!def || !Object.keys(def).length) return Minimatch
      return minimatch.defaults(def).Minimatch
    }
    
    
    function minimatch (p, pattern, options) {
      if (typeof pattern !== "string") {
        throw new TypeError("glob pattern string required")
      }
    
      if (!options) options = {}
    
      // shortcut: comments match nothing.
      if (!options.nocomment && pattern.charAt(0) === "#") {
        return false
      }
    
      // "" only matches ""
      if (pattern.trim() === "") return p === ""
    
      return new Minimatch(pattern, options).match(p)
    }
    
    function Minimatch (pattern, options) {
      if (!(this instanceof Minimatch)) {
        return new Minimatch(pattern, options, cache)
      }
    
      if (typeof pattern !== "string") {
        throw new TypeError("glob pattern string required")
      }
    
      if (!options) options = {}
      pattern = pattern.trim()
    
      // windows: need to use /, not \
      // On other platforms, \ is a valid (albeit bad) filename char.
      if (platform === "win32") {
        pattern = pattern.split("\\").join("/")
      }
    
      // lru storage.
      // these things aren't particularly big, but walking down the string
      // and turning it into a regexp can get pretty costly.
      var cacheKey = pattern + "\n" + sigmund(options)
      var cached = minimatch.cache.get(cacheKey)
      if (cached) return cached
      minimatch.cache.set(cacheKey, this)
    
      this.options = options
      this.set = []
      this.pattern = pattern
      this.regexp = null
      this.negate = false
      this.comment = false
      this.empty = false
    
      // make the set of regexps etc.
      this.make()
    }
    
    Minimatch.prototype.debug = function() {}
    
    Minimatch.prototype.make = make
    function make () {
      // don't do it more than once.
      if (this._made) return
    
      var pattern = this.pattern
      var options = this.options
    
      // empty patterns and comments match nothing.
      if (!options.nocomment && pattern.charAt(0) === "#") {
        this.comment = true
        return
      }
      if (!pattern) {
        this.empty = true
        return
      }
    
      // step 1: figure out negation, etc.
      this.parseNegate()
    
      // step 2: expand braces
      var set = this.globSet = this.braceExpand()
    
      if (options.debug) this.debug = console.error
    
      this.debug(this.pattern, set)
    
      // step 3: now we have a set, so turn each one into a series of path-portion
      // matching patterns.
      // These will be regexps, except in the case of "**", which is
      // set to the GLOBSTAR object for globstar behavior,
      // and will not contain any / characters
      set = this.globParts = set.map(function (s) {
        return s.split(slashSplit)
      })
    
      this.debug(this.pattern, set)
    
      // glob --> regexps
      set = set.map(function (s, si, set) {
        return s.map(this.parse, this)
      }, this)
    
      this.debug(this.pattern, set)
    
      // filter out everything that didn't compile properly.
      set = set.filter(function (s) {
        return -1 === s.indexOf(false)
      })
    
      this.debug(this.pattern, set)
    
      this.set = set
    }
    
    Minimatch.prototype.parseNegate = parseNegate
    function parseNegate () {
      var pattern = this.pattern
        , negate = false
        , options = this.options
        , negateOffset = 0
    
      if (options.nonegate) return
    
      for ( var i = 0, l = pattern.length
          ; i < l && pattern.charAt(i) === "!"
          ; i ++) {
        negate = !negate
        negateOffset ++
      }
    
      if (negateOffset) this.pattern = pattern.substr(negateOffset)
      this.negate = negate
    }
    
    // Brace expansion:
    // a{b,c}d -> abd acd
    // a{b,}c -> abc ac
    // a{0..3}d -> a0d a1d a2d a3d
    // a{b,c{d,e}f}g -> abg acdfg acefg
    // a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
    //
    // Invalid sets are not expanded.
    // a{2..}b -> a{2..}b
    // a{b}c -> a{b}c
    minimatch.braceExpand = function (pattern, options) {
      return new Minimatch(pattern, options).braceExpand()
    }
    
    Minimatch.prototype.braceExpand = braceExpand
    function braceExpand (pattern, options) {
      options = options || this.options
      pattern = typeof pattern === "undefined"
        ? this.pattern : pattern
    
      if (typeof pattern === "undefined") {
        throw new Error("undefined pattern")
      }
    
      if (options.nobrace ||
          !pattern.match(/\{.*\}/)) {
        // shortcut. no need to expand.
        return [pattern]
      }
    
      var escaping = false
    
      // examples and comments refer to this crazy pattern:
      // a{b,c{d,e},{f,g}h}x{y,z}
      // expected:
      // abxy
      // abxz
      // acdxy
      // acdxz
      // acexy
      // acexz
      // afhxy
      // afhxz
      // aghxy
      // aghxz
    
      // everything before the first \{ is just a prefix.
      // So, we pluck that off, and work with the rest,
      // and then prepend it to everything we find.
      if (pattern.charAt(0) !== "{") {
        this.debug(pattern)
        var prefix = null
        for (var i = 0, l = pattern.length; i < l; i ++) {
          var c = pattern.charAt(i)
          this.debug(i, c)
          if (c === "\\") {
            escaping = !escaping
          } else if (c === "{" && !escaping) {
            prefix = pattern.substr(0, i)
            break
          }
        }
    
        // actually no sets, all { were escaped.
        if (prefix === null) {
          this.debug("no sets")
          return [pattern]
        }
    
       var tail = braceExpand.call(this, pattern.substr(i), options)
        return tail.map(function (t) {
          return prefix + t
        })
      }
    
      // now we have something like:
      // {b,c{d,e},{f,g}h}x{y,z}
      // walk through the set, expanding each part, until
      // the set ends.  then, we'll expand the suffix.
      // If the set only has a single member, then'll put the {} back
    
      // first, handle numeric sets, since they're easier
      var numset = pattern.match(/^\{(-?[0-9]+)\.\.(-?[0-9]+)\}/)
      if (numset) {
        this.debug("numset", numset[1], numset[2])
        var suf = braceExpand.call(this, pattern.substr(numset[0].length), options)
          , start = +numset[1]
          , end = +numset[2]
          , inc = start > end ? -1 : 1
          , set = []
        for (var i = start; i != (end + inc); i += inc) {
          // append all the suffixes
          for (var ii = 0, ll = suf.length; ii < ll; ii ++) {
            set.push(i + suf[ii])
          }
        }
        return set
      }
    
      // ok, walk through the set
      // We hope, somewhat optimistically, that there
      // will be a } at the end.
      // If the closing brace isn't found, then the pattern is
      // interpreted as braceExpand("\\" + pattern) so that
      // the leading \{ will be interpreted literally.
      var i = 1 // skip the \{
        , depth = 1
        , set = []
        , member = ""
        , sawEnd = false
        , escaping = false
    
      function addMember () {
        set.push(member)
        member = ""
      }
    
      this.debug("Entering for")
      FOR: for (i = 1, l = pattern.length; i < l; i ++) {
        var c = pattern.charAt(i)
        this.debug("", i, c)
    
        if (escaping) {
          escaping = false
          member += "\\" + c
        } else {
          switch (c) {
            case "\\":
              escaping = true
              continue
    
            case "{":
              depth ++
              member += "{"
              continue
    
            case "}":
              depth --
              // if this closes the actual set, then we're done
              if (depth === 0) {
                addMember()
                // pluck off the close-brace
                i ++
                break FOR
              } else {
                member += c
                continue
              }
    
            case ",":
              if (depth === 1) {
                addMember()
              } else {
                member += c
              }
              continue
    
            default:
              member += c
              continue
          } // switch
        } // else
      } // for
    
      // now we've either finished the set, and the suffix is
      // pattern.substr(i), or we have *not* closed the set,
      // and need to escape the leading brace
      if (depth !== 0) {
        this.debug("didn't close", pattern)
        return braceExpand.call(this, "\\" + pattern, options)
      }
    
      // x{y,z} -> ["xy", "xz"]
      this.debug("set", set)
      this.debug("suffix", pattern.substr(i))
      var suf = braceExpand.call(this, pattern.substr(i), options)
      // ["b", "c{d,e}","{f,g}h"] ->
      //   [["b"], ["cd", "ce"], ["fh", "gh"]]
      var addBraces = set.length === 1
      this.debug("set pre-expanded", set)
      set = set.map(function (p) {
        return braceExpand.call(this, p, options)
      }, this)
      this.debug("set expanded", set)
    
    
      // [["b"], ["cd", "ce"], ["fh", "gh"]] ->
      //   ["b", "cd", "ce", "fh", "gh"]
      set = set.reduce(function (l, r) {
        return l.concat(r)
      })
    
      if (addBraces) {
        set = set.map(function (s) {
          return "{" + s + "}"
        })
      }
    
      // now attach the suffixes.
      var ret = []
      for (var i = 0, l = set.length; i < l; i ++) {
        for (var ii = 0, ll = suf.length; ii < ll; ii ++) {
          ret.push(set[i] + suf[ii])
        }
      }
      return ret
    }
    
    // parse a component of the expanded set.
    // At this point, no pattern may contain "/" in it
    // so we're going to return a 2d array, where each entry is the full
    // pattern, split on '/', and then turned into a regular expression.
    // A regexp is made at the end which joins each array with an
    // escaped /, and another full one which joins each regexp with |.
    //
    // Following the lead of Bash 4.1, note that "**" only has special meaning
    // when it is the *only* thing in a path portion.  Otherwise, any series
    // of * is equivalent to a single *.  Globstar behavior is enabled by
    // default, and can be disabled by setting options.noglobstar.
    Minimatch.prototype.parse = parse
    var SUBPARSE = {}
    function parse (pattern, isSub) {
      var options = this.options
    
      // shortcuts
      if (!options.noglobstar && pattern === "**") return GLOBSTAR
      if (pattern === "") return ""
    
      var re = ""
        , hasMagic = !!options.nocase
        , escaping = false
        // ? => one single character
        , patternListStack = []
        , plType
        , stateChar
        , inClass = false
        , reClassStart = -1
        , classStart = -1
        // . and .. never match anything that doesn't start with .,
        // even when options.dot is set.
        , patternStart = pattern.charAt(0) === "." ? "" // anything
          // not (start or / followed by . or .. followed by / or end)
          : options.dot ? "(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))"
          : "(?!\\.)"
        , self = this
    
      function clearStateChar () {
        if (stateChar) {
          // we had some state-tracking character
          // that wasn't consumed by this pass.
          switch (stateChar) {
            case "*":
              re += star
              hasMagic = true
              break
            case "?":
              re += qmark
              hasMagic = true
              break
            default:
              re += "\\"+stateChar
              break
          }
          self.debug('clearStateChar %j %j', stateChar, re)
          stateChar = false
        }
      }
    
      for ( var i = 0, len = pattern.length, c
          ; (i < len) && (c = pattern.charAt(i))
          ; i ++ ) {
    
        this.debug("%s\t%s %s %j", pattern, i, re, c)
    
        // skip over any that are escaped.
        if (escaping && reSpecials[c]) {
          re += "\\" + c
          escaping = false
          continue
        }
    
        SWITCH: switch (c) {
          case "/":
            // completely not allowed, even escaped.
            // Should already be path-split by now.
            return false
    
          case "\\":
            clearStateChar()
            escaping = true
            continue
    
          // the various stateChar values
          // for the "extglob" stuff.
          case "?":
          case "*":
          case "+":
          case "@":
          case "!":
            this.debug("%s\t%s %s %j <-- stateChar", pattern, i, re, c)
    
            // all of those are literals inside a class, except that
            // the glob [!a] means [^a] in regexp
            if (inClass) {
              this.debug('  in class')
              if (c === "!" && i === classStart + 1) c = "^"
              re += c
              continue
            }
    
            // if we already have a stateChar, then it means
            // that there was something like ** or +? in there.
            // Handle the stateChar, then proceed with this one.
            self.debug('call clearStateChar %j', stateChar)
            clearStateChar()
            stateChar = c
            // if extglob is disabled, then +(asdf|foo) isn't a thing.
            // just clear the statechar *now*, rather than even diving into
            // the patternList stuff.
            if (options.noext) clearStateChar()
            continue
    
          case "(":
            if (inClass) {
              re += "("
              continue
            }
    
            if (!stateChar) {
              re += "\\("
              continue
            }
    
            plType = stateChar
            patternListStack.push({ type: plType
                                  , start: i - 1
                                  , reStart: re.length })
            // negation is (?:(?!js)[^/]*)
            re += stateChar === "!" ? "(?:(?!" : "(?:"
            this.debug('plType %j %j', stateChar, re)
            stateChar = false
            continue
    
          case ")":
            if (inClass || !patternListStack.length) {
              re += "\\)"
              continue
            }
    
            clearStateChar()
            hasMagic = true
            re += ")"
            plType = patternListStack.pop().type
            // negation is (?:(?!js)[^/]*)
            // The others are (?:<pattern>)<type>
            switch (plType) {
              case "!":
                re += "[^/]*?)"
                break
              case "?":
              case "+":
              case "*": re += plType
              case "@": break // the default anyway
            }
            continue
    
          case "|":
            if (inClass || !patternListStack.length || escaping) {
              re += "\\|"
              escaping = false
              continue
            }
    
            clearStateChar()
            re += "|"
            continue
    
          // these are mostly the same in regexp and glob
          case "[":
            // swallow any state-tracking char before the [
            clearStateChar()
    
            if (inClass) {
              re += "\\" + c
              continue
            }
    
            inClass = true
            classStart = i
            reClassStart = re.length
            re += c
            continue
    
          case "]":
            //  a right bracket shall lose its special
            //  meaning and represent itself in
            //  a bracket expression if it occurs
            //  first in the list.  -- POSIX.2 2.8.3.2
            if (i === classStart + 1 || !inClass) {
              re += "\\" + c
              escaping = false
              continue
            }
    
            // finish up the class.
            hasMagic = true
            inClass = false
            re += c
            continue
    
          default:
            // swallow any state char that wasn't consumed
            clearStateChar()
    
            if (escaping) {
              // no need
              escaping = false
            } else if (reSpecials[c]
                       && !(c === "^" && inClass)) {
              re += "\\"
            }
    
            re += c
    
        } // switch
      } // for
    
    
      // handle the case where we left a class open.
      // "[abc" is valid, equivalent to "\[abc"
      if (inClass) {
        // split where the last [ was, and escape it
        // this is a huge pita.  We now have to re-walk
        // the contents of the would-be class to re-translate
        // any characters that were passed through as-is
        var cs = pattern.substr(classStart + 1)
          , sp = this.parse(cs, SUBPARSE)
        re = re.substr(0, reClassStart) + "\\[" + sp[0]
        hasMagic = hasMagic || sp[1]
      }
    
      // handle the case where we had a +( thing at the *end*
      // of the pattern.
      // each pattern list stack adds 3 chars, and we need to go through
      // and escape any | chars that were passed through as-is for the regexp.
      // Go through and escape them, taking care not to double-escape any
      // | chars that were already escaped.
      var pl
      while (pl = patternListStack.pop()) {
        var tail = re.slice(pl.reStart + 3)
        // maybe some even number of \, then maybe 1 \, followed by a |
        tail = tail.replace(/((?:\\{2})*)(\\?)\|/g, function (_, $1, $2) {
          if (!$2) {
            // the | isn't already escaped, so escape it.
            $2 = "\\"
          }
    
          // need to escape all those slashes *again*, without escaping the
          // one that we need for escaping the | character.  As it works out,
          // escaping an even number of slashes can be done by simply repeating
          // it exactly after itself.  That's why this trick works.
          //
          // I am sorry that you have to see this.
          return $1 + $1 + $2 + "|"
        })
    
        this.debug("tail=%j\n   %s", tail, tail)
        var t = pl.type === "*" ? star
              : pl.type === "?" ? qmark
              : "\\" + pl.type
    
        hasMagic = true
        re = re.slice(0, pl.reStart)
           + t + "\\("
           + tail
      }
    
      // handle trailing things that only matter at the very end.
      clearStateChar()
      if (escaping) {
        // trailing \\
        re += "\\\\"
      }
    
      // only need to apply the nodot start if the re starts with
      // something that could conceivably capture a dot
      var addPatternStart = false
      switch (re.charAt(0)) {
        case ".":
        case "[":
        case "(": addPatternStart = true
      }
    
      // if the re is not "" at this point, then we need to make sure
      // it doesn't match against an empty path part.
      // Otherwise a/* will match a/, which it should not.
      if (re !== "" && hasMagic) re = "(?=.)" + re
    
      if (addPatternStart) re = patternStart + re
    
      // parsing just a piece of a larger pattern.
      if (isSub === SUBPARSE) {
        return [ re, hasMagic ]
      }
    
      // skip the regexp for non-magical patterns
      // unescape anything in it, though, so that it'll be
      // an exact match against a file etc.
      if (!hasMagic) {
        return globUnescape(pattern)
      }
    
      var flags = options.nocase ? "i" : ""
        , regExp = new RegExp("^" + re + "$", flags)
    
      regExp._glob = pattern
      regExp._src = re
    
      return regExp
    }
    
    minimatch.makeRe = function (pattern, options) {
      return new Minimatch(pattern, options || {}).makeRe()
    }
    
    Minimatch.prototype.makeRe = makeRe
    function makeRe () {
      if (this.regexp || this.regexp === false) return this.regexp
    
      // at this point, this.set is a 2d array of partial
      // pattern strings, or "**".
      //
      // It's better to use .match().  This function shouldn't
      // be used, really, but it's pretty convenient sometimes,
      // when you just want to work with a regex.
      var set = this.set
    
      if (!set.length) return this.regexp = false
      var options = this.options
    
      var twoStar = options.noglobstar ? star
          : options.dot ? twoStarDot
          : twoStarNoDot
        , flags = options.nocase ? "i" : ""
    
      var re = set.map(function (pattern) {
        return pattern.map(function (p) {
          return (p === GLOBSTAR) ? twoStar
               : (typeof p === "string") ? regExpEscape(p)
               : p._src
        }).join("\\\/")
      }).join("|")
    
      // must match entire pattern
      // ending in a * or ** will make it less strict.
      re = "^(?:" + re + ")$"
    
      // can match anything, as long as it's not this.
      if (this.negate) re = "^(?!" + re + ").*$"
    
      try {
        return this.regexp = new RegExp(re, flags)
      } catch (ex) {
        return this.regexp = false
      }
    }
    
    minimatch.match = function (list, pattern, options) {
      var mm = new Minimatch(pattern, options)
      list = list.filter(function (f) {
        return mm.match(f)
      })
      if (options.nonull && !list.length) {
        list.push(pattern)
      }
      return list
    }
    
    Minimatch.prototype.match = match
    function match (f, partial) {
      this.debug("match", f, this.pattern)
      // short-circuit in the case of busted things.
      // comments, etc.
      if (this.comment) return false
      if (this.empty) return f === ""
    
      if (f === "/" && partial) return true
    
      var options = this.options
    
      // windows: need to use /, not \
      // On other platforms, \ is a valid (albeit bad) filename char.
      if (platform === "win32") {
        f = f.split("\\").join("/")
      }
    
      // treat the test path as a set of pathparts.
      f = f.split(slashSplit)
      this.debug(this.pattern, "split", f)
    
      // just ONE of the pattern sets in this.set needs to match
      // in order for it to be valid.  If negating, then just one
      // match means that we have failed.
      // Either way, return on the first hit.
    
      var set = this.set
      this.debug(this.pattern, "set", set)
    
      var splitFile = path.basename(f.join("/")).split("/")
    
      for (var i = 0, l = set.length; i < l; i ++) {
        var pattern = set[i], file = f
        if (options.matchBase && pattern.length === 1) {
          file = splitFile
        }
        var hit = this.matchOne(file, pattern, partial)
        if (hit) {
          if (options.flipNegate) return true
          return !this.negate
        }
      }
    
      // didn't get any hits.  this is success if it's a negative
      // pattern, failure otherwise.
      if (options.flipNegate) return false
      return this.negate
    }
    
    // set partial to true to test if, for example,
    // "/a/b" matches the start of "/*/b/*/d"
    // Partial means, if you run out of file before you run
    // out of pattern, then that's fine, as long as all
    // the parts match.
    Minimatch.prototype.matchOne = function (file, pattern, partial) {
      var options = this.options
    
      this.debug("matchOne",
                  { "this": this
                  , file: file
                  , pattern: pattern })
    
      this.debug("matchOne", file.length, pattern.length)
    
      for ( var fi = 0
              , pi = 0
              , fl = file.length
              , pl = pattern.length
          ; (fi < fl) && (pi < pl)
          ; fi ++, pi ++ ) {
    
        this.debug("matchOne loop")
        var p = pattern[pi]
          , f = file[fi]
    
        this.debug(pattern, p, f)
    
        // should be impossible.
        // some invalid regexp stuff in the set.
        if (p === false) return false
    
        if (p === GLOBSTAR) {
          this.debug('GLOBSTAR', [pattern, p, f])
    
          // "**"
          // a/**/b/**/c would match the following:
          // a/b/x/y/z/c
          // a/x/y/z/b/c
          // a/b/x/b/x/c
          // a/b/c
          // To do this, take the rest of the pattern after
          // the **, and see if it would match the file remainder.
          // If so, return success.
          // If not, the ** "swallows" a segment, and try again.
          // This is recursively awful.
          //
          // a/**/b/**/c matching a/b/x/y/z/c
          // - a matches a
          // - doublestar
          //   - matchOne(b/x/y/z/c, b/**/c)
          //     - b matches b
          //     - doublestar
          //       - matchOne(x/y/z/c, c) -> no
          //       - matchOne(y/z/c, c) -> no
          //       - matchOne(z/c, c) -> no
          //       - matchOne(c, c) yes, hit
          var fr = fi
            , pr = pi + 1
          if (pr === pl) {
            this.debug('** at the end')
            // a ** at the end will just swallow the rest.
            // We have found a match.
            // however, it will not swallow /.x, unless
            // options.dot is set.
            // . and .. are *never* matched by **, for explosively
            // exponential reasons.
            for ( ; fi < fl; fi ++) {
              if (file[fi] === "." || file[fi] === ".." ||
                  (!options.dot && file[fi].charAt(0) === ".")) return false
            }
            return true
          }
    
          // ok, let's see if we can swallow whatever we can.
          WHILE: while (fr < fl) {
            var swallowee = file[fr]
    
            this.debug('\nglobstar while',
                        file, fr, pattern, pr, swallowee)
    
            // XXX remove this slice.  Just pass the start index.
            if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
              this.debug('globstar found match!', fr, fl, swallowee)
              // found a match.
              return true
            } else {
              // can't swallow "." or ".." ever.
              // can only swallow ".foo" when explicitly asked.
              if (swallowee === "." || swallowee === ".." ||
                  (!options.dot && swallowee.charAt(0) === ".")) {
                this.debug("dot detected!", file, fr, pattern, pr)
                break WHILE
              }
    
              // ** swallows a segment, and continue.
              this.debug('globstar swallow a segment, and continue')
              fr ++
            }
          }
          // no match was found.
          // However, in partial mode, we can't say this is necessarily over.
          // If there's more *pattern* left, then 
          if (partial) {
            // ran out of file
            this.debug("\n>>> no match, partial?", file, fr, pattern, pr)
            if (fr === fl) return true
          }
          return false
        }
    
        // something other than **
        // non-magic patterns just have to match exactly
        // patterns with magic have been turned into regexps.
        var hit
        if (typeof p === "string") {
          if (options.nocase) {
            hit = f.toLowerCase() === p.toLowerCase()
          } else {
            hit = f === p
          }
          this.debug("string match", p, f, hit)
        } else {
          hit = f.match(p)
          this.debug("pattern match", p, f, hit)
        }
    
        if (!hit) return false
      }
    
      // Note: ending in / means that we'll get a final ""
      // at the end of the pattern.  This can only match a
      // corresponding "" at the end of the file.
      // If the file ends in /, then it can only match a
      // a pattern that ends in /, unless the pattern just
      // doesn't have any more for it. But, a/b/ should *not*
      // match "a/b/*", even though "" matches against the
      // [^/]*? pattern, except in partial mode, where it might
      // simply not be reached yet.
      // However, a/b/ should still satisfy a/*
    
      // now either we fell off the end of the pattern, or we're done.
      if (fi === fl && pi === pl) {
        // ran out of pattern and filename at the same time.
        // an exact hit!
        return true
      } else if (fi === fl) {
        // ran out of file, but still had pattern left.
        // this is ok if we're doing the match as part of
        // a glob fs traversal.
        return partial
      } else if (pi === pl) {
        // ran out of pattern, still have file left.
        // this is only acceptable if we're on the very last
        // empty segment of a file with a trailing slash.
        // a/* should match a/b/
        var emptyFileEnd = (fi === fl - 1) && (file[fi] === "")
        return emptyFileEnd
      }
    
      // should be unreachable.
      throw new Error("wtf?")
    }
    
    
    // replace stuff like \* with *
    function globUnescape (s) {
      return s.replace(/\\(.)/g, "$1")
    }
    
    
    function regExpEscape (s) {
      return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
    }
    
    })( typeof require === "function" ? require : null,
        this,
        typeof module === "object" ? module : null,
        typeof process === "object" ? process.platform : "win32"
      )
    
  provide("minimatch", module.exports);
}(global));

// pakmanager:inherits
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  module.exports = require('util').inherits
    
  provide("inherits", module.exports);
}(global));

// pakmanager:underscore
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  //     Underscore.js 1.5.2
    //     http://underscorejs.org
    //     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
    //     Underscore may be freely distributed under the MIT license.
    
    (function() {
    
      // Baseline setup
      // --------------
    
      // Establish the root object, `window` in the browser, or `exports` on the server.
      var root = this;
    
      // Save the previous value of the `_` variable.
      var previousUnderscore = root._;
    
      // Establish the object that gets returned to break out of a loop iteration.
      var breaker = {};
    
      // Save bytes in the minified (but not gzipped) version:
      var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
    
      // Create quick reference variables for speed access to core prototypes.
      var
        push             = ArrayProto.push,
        slice            = ArrayProto.slice,
        concat           = ArrayProto.concat,
        toString         = ObjProto.toString,
        hasOwnProperty   = ObjProto.hasOwnProperty;
    
      // All **ECMAScript 5** native function implementations that we hope to use
      // are declared here.
      var
        nativeForEach      = ArrayProto.forEach,
        nativeMap          = ArrayProto.map,
        nativeReduce       = ArrayProto.reduce,
        nativeReduceRight  = ArrayProto.reduceRight,
        nativeFilter       = ArrayProto.filter,
        nativeEvery        = ArrayProto.every,
        nativeSome         = ArrayProto.some,
        nativeIndexOf      = ArrayProto.indexOf,
        nativeLastIndexOf  = ArrayProto.lastIndexOf,
        nativeIsArray      = Array.isArray,
        nativeKeys         = Object.keys,
        nativeBind         = FuncProto.bind;
    
      // Create a safe reference to the Underscore object for use below.
      var _ = function(obj) {
        if (obj instanceof _) return obj;
        if (!(this instanceof _)) return new _(obj);
        this._wrapped = obj;
      };
    
      // Export the Underscore object for **Node.js**, with
      // backwards-compatibility for the old `require()` API. If we're in
      // the browser, add `_` as a global object via a string identifier,
      // for Closure Compiler "advanced" mode.
      if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
          exports = module.exports = _;
        }
        exports._ = _;
      } else {
        root._ = _;
      }
    
      // Current version.
      _.VERSION = '1.5.2';
    
      // Collection Functions
      // --------------------
    
      // The cornerstone, an `each` implementation, aka `forEach`.
      // Handles objects with the built-in `forEach`, arrays, and raw objects.
      // Delegates to **ECMAScript 5**'s native `forEach` if available.
      var each = _.each = _.forEach = function(obj, iterator, context) {
        if (obj == null) return;
        if (nativeForEach && obj.forEach === nativeForEach) {
          obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
          for (var i = 0, length = obj.length; i < length; i++) {
            if (iterator.call(context, obj[i], i, obj) === breaker) return;
          }
        } else {
          var keys = _.keys(obj);
          for (var i = 0, length = keys.length; i < length; i++) {
            if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
          }
        }
      };
    
      // Return the results of applying the iterator to each element.
      // Delegates to **ECMAScript 5**'s native `map` if available.
      _.map = _.collect = function(obj, iterator, context) {
        var results = [];
        if (obj == null) return results;
        if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
        each(obj, function(value, index, list) {
          results.push(iterator.call(context, value, index, list));
        });
        return results;
      };
    
      var reduceError = 'Reduce of empty array with no initial value';
    
      // **Reduce** builds up a single result from a list of values, aka `inject`,
      // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
      _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
        var initial = arguments.length > 2;
        if (obj == null) obj = [];
        if (nativeReduce && obj.reduce === nativeReduce) {
          if (context) iterator = _.bind(iterator, context);
          return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
        }
        each(obj, function(value, index, list) {
          if (!initial) {
            memo = value;
            initial = true;
          } else {
            memo = iterator.call(context, memo, value, index, list);
          }
        });
        if (!initial) throw new TypeError(reduceError);
        return memo;
      };
    
      // The right-associative version of reduce, also known as `foldr`.
      // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
      _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
        var initial = arguments.length > 2;
        if (obj == null) obj = [];
        if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
          if (context) iterator = _.bind(iterator, context);
          return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
        }
        var length = obj.length;
        if (length !== +length) {
          var keys = _.keys(obj);
          length = keys.length;
        }
        each(obj, function(value, index, list) {
          index = keys ? keys[--length] : --length;
          if (!initial) {
            memo = obj[index];
            initial = true;
          } else {
            memo = iterator.call(context, memo, obj[index], index, list);
          }
        });
        if (!initial) throw new TypeError(reduceError);
        return memo;
      };
    
      // Return the first value which passes a truth test. Aliased as `detect`.
      _.find = _.detect = function(obj, iterator, context) {
        var result;
        any(obj, function(value, index, list) {
          if (iterator.call(context, value, index, list)) {
            result = value;
            return true;
          }
        });
        return result;
      };
    
      // Return all the elements that pass a truth test.
      // Delegates to **ECMAScript 5**'s native `filter` if available.
      // Aliased as `select`.
      _.filter = _.select = function(obj, iterator, context) {
        var results = [];
        if (obj == null) return results;
        if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
        each(obj, function(value, index, list) {
          if (iterator.call(context, value, index, list)) results.push(value);
        });
        return results;
      };
    
      // Return all the elements for which a truth test fails.
      _.reject = function(obj, iterator, context) {
        return _.filter(obj, function(value, index, list) {
          return !iterator.call(context, value, index, list);
        }, context);
      };
    
      // Determine whether all of the elements match a truth test.
      // Delegates to **ECMAScript 5**'s native `every` if available.
      // Aliased as `all`.
      _.every = _.all = function(obj, iterator, context) {
        iterator || (iterator = _.identity);
        var result = true;
        if (obj == null) return result;
        if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
        each(obj, function(value, index, list) {
          if (!(result = result && iterator.call(context, value, index, list))) return breaker;
        });
        return !!result;
      };
    
      // Determine if at least one element in the object matches a truth test.
      // Delegates to **ECMAScript 5**'s native `some` if available.
      // Aliased as `any`.
      var any = _.some = _.any = function(obj, iterator, context) {
        iterator || (iterator = _.identity);
        var result = false;
        if (obj == null) return result;
        if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
        each(obj, function(value, index, list) {
          if (result || (result = iterator.call(context, value, index, list))) return breaker;
        });
        return !!result;
      };
    
      // Determine if the array or object contains a given value (using `===`).
      // Aliased as `include`.
      _.contains = _.include = function(obj, target) {
        if (obj == null) return false;
        if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
        return any(obj, function(value) {
          return value === target;
        });
      };
    
      // Invoke a method (with arguments) on every item in a collection.
      _.invoke = function(obj, method) {
        var args = slice.call(arguments, 2);
        var isFunc = _.isFunction(method);
        return _.map(obj, function(value) {
          return (isFunc ? method : value[method]).apply(value, args);
        });
      };
    
      // Convenience version of a common use case of `map`: fetching a property.
      _.pluck = function(obj, key) {
        return _.map(obj, function(value){ return value[key]; });
      };
    
      // Convenience version of a common use case of `filter`: selecting only objects
      // containing specific `key:value` pairs.
      _.where = function(obj, attrs, first) {
        if (_.isEmpty(attrs)) return first ? void 0 : [];
        return _[first ? 'find' : 'filter'](obj, function(value) {
          for (var key in attrs) {
            if (attrs[key] !== value[key]) return false;
          }
          return true;
        });
      };
    
      // Convenience version of a common use case of `find`: getting the first object
      // containing specific `key:value` pairs.
      _.findWhere = function(obj, attrs) {
        return _.where(obj, attrs, true);
      };
    
      // Return the maximum element or (element-based computation).
      // Can't optimize arrays of integers longer than 65,535 elements.
      // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
      _.max = function(obj, iterator, context) {
        if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
          return Math.max.apply(Math, obj);
        }
        if (!iterator && _.isEmpty(obj)) return -Infinity;
        var result = {computed : -Infinity, value: -Infinity};
        each(obj, function(value, index, list) {
          var computed = iterator ? iterator.call(context, value, index, list) : value;
          computed > result.computed && (result = {value : value, computed : computed});
        });
        return result.value;
      };
    
      // Return the minimum element (or element-based computation).
      _.min = function(obj, iterator, context) {
        if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
          return Math.min.apply(Math, obj);
        }
        if (!iterator && _.isEmpty(obj)) return Infinity;
        var result = {computed : Infinity, value: Infinity};
        each(obj, function(value, index, list) {
          var computed = iterator ? iterator.call(context, value, index, list) : value;
          computed < result.computed && (result = {value : value, computed : computed});
        });
        return result.value;
      };
    
      // Shuffle an array, using the modern version of the 
      // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
      _.shuffle = function(obj) {
        var rand;
        var index = 0;
        var shuffled = [];
        each(obj, function(value) {
          rand = _.random(index++);
          shuffled[index - 1] = shuffled[rand];
          shuffled[rand] = value;
        });
        return shuffled;
      };
    
      // Sample **n** random values from an array.
      // If **n** is not specified, returns a single random element from the array.
      // The internal `guard` argument allows it to work with `map`.
      _.sample = function(obj, n, guard) {
        if (arguments.length < 2 || guard) {
          return obj[_.random(obj.length - 1)];
        }
        return _.shuffle(obj).slice(0, Math.max(0, n));
      };
    
      // An internal function to generate lookup iterators.
      var lookupIterator = function(value) {
        return _.isFunction(value) ? value : function(obj){ return obj[value]; };
      };
    
      // Sort the object's values by a criterion produced by an iterator.
      _.sortBy = function(obj, value, context) {
        var iterator = lookupIterator(value);
        return _.pluck(_.map(obj, function(value, index, list) {
          return {
            value: value,
            index: index,
            criteria: iterator.call(context, value, index, list)
          };
        }).sort(function(left, right) {
          var a = left.criteria;
          var b = right.criteria;
          if (a !== b) {
            if (a > b || a === void 0) return 1;
            if (a < b || b === void 0) return -1;
          }
          return left.index - right.index;
        }), 'value');
      };
    
      // An internal function used for aggregate "group by" operations.
      var group = function(behavior) {
        return function(obj, value, context) {
          var result = {};
          var iterator = value == null ? _.identity : lookupIterator(value);
          each(obj, function(value, index) {
            var key = iterator.call(context, value, index, obj);
            behavior(result, key, value);
          });
          return result;
        };
      };
    
      // Groups the object's values by a criterion. Pass either a string attribute
      // to group by, or a function that returns the criterion.
      _.groupBy = group(function(result, key, value) {
        (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
      });
    
      // Indexes the object's values by a criterion, similar to `groupBy`, but for
      // when you know that your index values will be unique.
      _.indexBy = group(function(result, key, value) {
        result[key] = value;
      });
    
      // Counts instances of an object that group by a certain criterion. Pass
      // either a string attribute to count by, or a function that returns the
      // criterion.
      _.countBy = group(function(result, key) {
        _.has(result, key) ? result[key]++ : result[key] = 1;
      });
    
      // Use a comparator function to figure out the smallest index at which
      // an object should be inserted so as to maintain order. Uses binary search.
      _.sortedIndex = function(array, obj, iterator, context) {
        iterator = iterator == null ? _.identity : lookupIterator(iterator);
        var value = iterator.call(context, obj);
        var low = 0, high = array.length;
        while (low < high) {
          var mid = (low + high) >>> 1;
          iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
        }
        return low;
      };
    
      // Safely create a real, live array from anything iterable.
      _.toArray = function(obj) {
        if (!obj) return [];
        if (_.isArray(obj)) return slice.call(obj);
        if (obj.length === +obj.length) return _.map(obj, _.identity);
        return _.values(obj);
      };
    
      // Return the number of elements in an object.
      _.size = function(obj) {
        if (obj == null) return 0;
        return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
      };
    
      // Array Functions
      // ---------------
    
      // Get the first element of an array. Passing **n** will return the first N
      // values in the array. Aliased as `head` and `take`. The **guard** check
      // allows it to work with `_.map`.
      _.first = _.head = _.take = function(array, n, guard) {
        if (array == null) return void 0;
        return (n == null) || guard ? array[0] : slice.call(array, 0, n);
      };
    
      // Returns everything but the last entry of the array. Especially useful on
      // the arguments object. Passing **n** will return all the values in
      // the array, excluding the last N. The **guard** check allows it to work with
      // `_.map`.
      _.initial = function(array, n, guard) {
        return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
      };
    
      // Get the last element of an array. Passing **n** will return the last N
      // values in the array. The **guard** check allows it to work with `_.map`.
      _.last = function(array, n, guard) {
        if (array == null) return void 0;
        if ((n == null) || guard) {
          return array[array.length - 1];
        } else {
          return slice.call(array, Math.max(array.length - n, 0));
        }
      };
    
      // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
      // Especially useful on the arguments object. Passing an **n** will return
      // the rest N values in the array. The **guard**
      // check allows it to work with `_.map`.
      _.rest = _.tail = _.drop = function(array, n, guard) {
        return slice.call(array, (n == null) || guard ? 1 : n);
      };
    
      // Trim out all falsy values from an array.
      _.compact = function(array) {
        return _.filter(array, _.identity);
      };
    
      // Internal implementation of a recursive `flatten` function.
      var flatten = function(input, shallow, output) {
        if (shallow && _.every(input, _.isArray)) {
          return concat.apply(output, input);
        }
        each(input, function(value) {
          if (_.isArray(value) || _.isArguments(value)) {
            shallow ? push.apply(output, value) : flatten(value, shallow, output);
          } else {
            output.push(value);
          }
        });
        return output;
      };
    
      // Flatten out an array, either recursively (by default), or just one level.
      _.flatten = function(array, shallow) {
        return flatten(array, shallow, []);
      };
    
      // Return a version of the array that does not contain the specified value(s).
      _.without = function(array) {
        return _.difference(array, slice.call(arguments, 1));
      };
    
      // Produce a duplicate-free version of the array. If the array has already
      // been sorted, you have the option of using a faster algorithm.
      // Aliased as `unique`.
      _.uniq = _.unique = function(array, isSorted, iterator, context) {
        if (_.isFunction(isSorted)) {
          context = iterator;
          iterator = isSorted;
          isSorted = false;
        }
        var initial = iterator ? _.map(array, iterator, context) : array;
        var results = [];
        var seen = [];
        each(initial, function(value, index) {
          if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
            seen.push(value);
            results.push(array[index]);
          }
        });
        return results;
      };
    
      // Produce an array that contains the union: each distinct element from all of
      // the passed-in arrays.
      _.union = function() {
        return _.uniq(_.flatten(arguments, true));
      };
    
      // Produce an array that contains every item shared between all the
      // passed-in arrays.
      _.intersection = function(array) {
        var rest = slice.call(arguments, 1);
        return _.filter(_.uniq(array), function(item) {
          return _.every(rest, function(other) {
            return _.indexOf(other, item) >= 0;
          });
        });
      };
    
      // Take the difference between one array and a number of other arrays.
      // Only the elements present in just the first array will remain.
      _.difference = function(array) {
        var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
        return _.filter(array, function(value){ return !_.contains(rest, value); });
      };
    
      // Zip together multiple lists into a single array -- elements that share
      // an index go together.
      _.zip = function() {
        var length = _.max(_.pluck(arguments, "length").concat(0));
        var results = new Array(length);
        for (var i = 0; i < length; i++) {
          results[i] = _.pluck(arguments, '' + i);
        }
        return results;
      };
    
      // Converts lists into objects. Pass either a single array of `[key, value]`
      // pairs, or two parallel arrays of the same length -- one of keys, and one of
      // the corresponding values.
      _.object = function(list, values) {
        if (list == null) return {};
        var result = {};
        for (var i = 0, length = list.length; i < length; i++) {
          if (values) {
            result[list[i]] = values[i];
          } else {
            result[list[i][0]] = list[i][1];
          }
        }
        return result;
      };
    
      // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
      // we need this function. Return the position of the first occurrence of an
      // item in an array, or -1 if the item is not included in the array.
      // Delegates to **ECMAScript 5**'s native `indexOf` if available.
      // If the array is large and already in sort order, pass `true`
      // for **isSorted** to use binary search.
      _.indexOf = function(array, item, isSorted) {
        if (array == null) return -1;
        var i = 0, length = array.length;
        if (isSorted) {
          if (typeof isSorted == 'number') {
            i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
          } else {
            i = _.sortedIndex(array, item);
            return array[i] === item ? i : -1;
          }
        }
        if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
        for (; i < length; i++) if (array[i] === item) return i;
        return -1;
      };
    
      // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
      _.lastIndexOf = function(array, item, from) {
        if (array == null) return -1;
        var hasIndex = from != null;
        if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
          return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
        }
        var i = (hasIndex ? from : array.length);
        while (i--) if (array[i] === item) return i;
        return -1;
      };
    
      // Generate an integer Array containing an arithmetic progression. A port of
      // the native Python `range()` function. See
      // [the Python documentation](http://docs.python.org/library/functions.html#range).
      _.range = function(start, stop, step) {
        if (arguments.length <= 1) {
          stop = start || 0;
          start = 0;
        }
        step = arguments[2] || 1;
    
        var length = Math.max(Math.ceil((stop - start) / step), 0);
        var idx = 0;
        var range = new Array(length);
    
        while(idx < length) {
          range[idx++] = start;
          start += step;
        }
    
        return range;
      };
    
      // Function (ahem) Functions
      // ------------------
    
      // Reusable constructor function for prototype setting.
      var ctor = function(){};
    
      // Create a function bound to a given object (assigning `this`, and arguments,
      // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
      // available.
      _.bind = function(func, context) {
        var args, bound;
        if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
        if (!_.isFunction(func)) throw new TypeError;
        args = slice.call(arguments, 2);
        return bound = function() {
          if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
          ctor.prototype = func.prototype;
          var self = new ctor;
          ctor.prototype = null;
          var result = func.apply(self, args.concat(slice.call(arguments)));
          if (Object(result) === result) return result;
          return self;
        };
      };
    
      // Partially apply a function by creating a version that has had some of its
      // arguments pre-filled, without changing its dynamic `this` context.
      _.partial = function(func) {
        var args = slice.call(arguments, 1);
        return function() {
          return func.apply(this, args.concat(slice.call(arguments)));
        };
      };
    
      // Bind all of an object's methods to that object. Useful for ensuring that
      // all callbacks defined on an object belong to it.
      _.bindAll = function(obj) {
        var funcs = slice.call(arguments, 1);
        if (funcs.length === 0) throw new Error("bindAll must be passed function names");
        each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
        return obj;
      };
    
      // Memoize an expensive function by storing its results.
      _.memoize = function(func, hasher) {
        var memo = {};
        hasher || (hasher = _.identity);
        return function() {
          var key = hasher.apply(this, arguments);
          return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
        };
      };
    
      // Delays a function for the given number of milliseconds, and then calls
      // it with the arguments supplied.
      _.delay = function(func, wait) {
        var args = slice.call(arguments, 2);
        return setTimeout(function(){ return func.apply(null, args); }, wait);
      };
    
      // Defers a function, scheduling it to run after the current call stack has
      // cleared.
      _.defer = function(func) {
        return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
      };
    
      // Returns a function, that, when invoked, will only be triggered at most once
      // during a given window of time. Normally, the throttled function will run
      // as much as it can, without ever going more than once per `wait` duration;
      // but if you'd like to disable the execution on the leading edge, pass
      // `{leading: false}`. To disable execution on the trailing edge, ditto.
      _.throttle = function(func, wait, options) {
        var context, args, result;
        var timeout = null;
        var previous = 0;
        options || (options = {});
        var later = function() {
          previous = options.leading === false ? 0 : new Date;
          timeout = null;
          result = func.apply(context, args);
        };
        return function() {
          var now = new Date;
          if (!previous && options.leading === false) previous = now;
          var remaining = wait - (now - previous);
          context = this;
          args = arguments;
          if (remaining <= 0) {
            clearTimeout(timeout);
            timeout = null;
            previous = now;
            result = func.apply(context, args);
          } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
          }
          return result;
        };
      };
    
      // Returns a function, that, as long as it continues to be invoked, will not
      // be triggered. The function will be called after it stops being called for
      // N milliseconds. If `immediate` is passed, trigger the function on the
      // leading edge, instead of the trailing.
      _.debounce = function(func, wait, immediate) {
        var timeout, args, context, timestamp, result;
        return function() {
          context = this;
          args = arguments;
          timestamp = new Date();
          var later = function() {
            var last = (new Date()) - timestamp;
            if (last < wait) {
              timeout = setTimeout(later, wait - last);
            } else {
              timeout = null;
              if (!immediate) result = func.apply(context, args);
            }
          };
          var callNow = immediate && !timeout;
          if (!timeout) {
            timeout = setTimeout(later, wait);
          }
          if (callNow) result = func.apply(context, args);
          return result;
        };
      };
    
      // Returns a function that will be executed at most one time, no matter how
      // often you call it. Useful for lazy initialization.
      _.once = function(func) {
        var ran = false, memo;
        return function() {
          if (ran) return memo;
          ran = true;
          memo = func.apply(this, arguments);
          func = null;
          return memo;
        };
      };
    
      // Returns the first function passed as an argument to the second,
      // allowing you to adjust arguments, run code before and after, and
      // conditionally execute the original function.
      _.wrap = function(func, wrapper) {
        return function() {
          var args = [func];
          push.apply(args, arguments);
          return wrapper.apply(this, args);
        };
      };
    
      // Returns a function that is the composition of a list of functions, each
      // consuming the return value of the function that follows.
      _.compose = function() {
        var funcs = arguments;
        return function() {
          var args = arguments;
          for (var i = funcs.length - 1; i >= 0; i--) {
            args = [funcs[i].apply(this, args)];
          }
          return args[0];
        };
      };
    
      // Returns a function that will only be executed after being called N times.
      _.after = function(times, func) {
        return function() {
          if (--times < 1) {
            return func.apply(this, arguments);
          }
        };
      };
    
      // Object Functions
      // ----------------
    
      // Retrieve the names of an object's properties.
      // Delegates to **ECMAScript 5**'s native `Object.keys`
      _.keys = nativeKeys || function(obj) {
        if (obj !== Object(obj)) throw new TypeError('Invalid object');
        var keys = [];
        for (var key in obj) if (_.has(obj, key)) keys.push(key);
        return keys;
      };
    
      // Retrieve the values of an object's properties.
      _.values = function(obj) {
        var keys = _.keys(obj);
        var length = keys.length;
        var values = new Array(length);
        for (var i = 0; i < length; i++) {
          values[i] = obj[keys[i]];
        }
        return values;
      };
    
      // Convert an object into a list of `[key, value]` pairs.
      _.pairs = function(obj) {
        var keys = _.keys(obj);
        var length = keys.length;
        var pairs = new Array(length);
        for (var i = 0; i < length; i++) {
          pairs[i] = [keys[i], obj[keys[i]]];
        }
        return pairs;
      };
    
      // Invert the keys and values of an object. The values must be serializable.
      _.invert = function(obj) {
        var result = {};
        var keys = _.keys(obj);
        for (var i = 0, length = keys.length; i < length; i++) {
          result[obj[keys[i]]] = keys[i];
        }
        return result;
      };
    
      // Return a sorted list of the function names available on the object.
      // Aliased as `methods`
      _.functions = _.methods = function(obj) {
        var names = [];
        for (var key in obj) {
          if (_.isFunction(obj[key])) names.push(key);
        }
        return names.sort();
      };
    
      // Extend a given object with all the properties in passed-in object(s).
      _.extend = function(obj) {
        each(slice.call(arguments, 1), function(source) {
          if (source) {
            for (var prop in source) {
              obj[prop] = source[prop];
            }
          }
        });
        return obj;
      };
    
      // Return a copy of the object only containing the whitelisted properties.
      _.pick = function(obj) {
        var copy = {};
        var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
        each(keys, function(key) {
          if (key in obj) copy[key] = obj[key];
        });
        return copy;
      };
    
       // Return a copy of the object without the blacklisted properties.
      _.omit = function(obj) {
        var copy = {};
        var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
        for (var key in obj) {
          if (!_.contains(keys, key)) copy[key] = obj[key];
        }
        return copy;
      };
    
      // Fill in a given object with default properties.
      _.defaults = function(obj) {
        each(slice.call(arguments, 1), function(source) {
          if (source) {
            for (var prop in source) {
              if (obj[prop] === void 0) obj[prop] = source[prop];
            }
          }
        });
        return obj;
      };
    
      // Create a (shallow-cloned) duplicate of an object.
      _.clone = function(obj) {
        if (!_.isObject(obj)) return obj;
        return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
      };
    
      // Invokes interceptor with the obj, and then returns obj.
      // The primary purpose of this method is to "tap into" a method chain, in
      // order to perform operations on intermediate results within the chain.
      _.tap = function(obj, interceptor) {
        interceptor(obj);
        return obj;
      };
    
      // Internal recursive comparison function for `isEqual`.
      var eq = function(a, b, aStack, bStack) {
        // Identical objects are equal. `0 === -0`, but they aren't identical.
        // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
        if (a === b) return a !== 0 || 1 / a == 1 / b;
        // A strict comparison is necessary because `null == undefined`.
        if (a == null || b == null) return a === b;
        // Unwrap any wrapped objects.
        if (a instanceof _) a = a._wrapped;
        if (b instanceof _) b = b._wrapped;
        // Compare `[[Class]]` names.
        var className = toString.call(a);
        if (className != toString.call(b)) return false;
        switch (className) {
          // Strings, numbers, dates, and booleans are compared by value.
          case '[object String]':
            // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
            // equivalent to `new String("5")`.
            return a == String(b);
          case '[object Number]':
            // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
            // other numeric values.
            return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
          case '[object Date]':
          case '[object Boolean]':
            // Coerce dates and booleans to numeric primitive values. Dates are compared by their
            // millisecond representations. Note that invalid dates with millisecond representations
            // of `NaN` are not equivalent.
            return +a == +b;
          // RegExps are compared by their source patterns and flags.
          case '[object RegExp]':
            return a.source == b.source &&
                   a.global == b.global &&
                   a.multiline == b.multiline &&
                   a.ignoreCase == b.ignoreCase;
        }
        if (typeof a != 'object' || typeof b != 'object') return false;
        // Assume equality for cyclic structures. The algorithm for detecting cyclic
        // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
        var length = aStack.length;
        while (length--) {
          // Linear search. Performance is inversely proportional to the number of
          // unique nested structures.
          if (aStack[length] == a) return bStack[length] == b;
        }
        // Objects with different constructors are not equivalent, but `Object`s
        // from different frames are.
        var aCtor = a.constructor, bCtor = b.constructor;
        if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                                 _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
          return false;
        }
        // Add the first object to the stack of traversed objects.
        aStack.push(a);
        bStack.push(b);
        var size = 0, result = true;
        // Recursively compare objects and arrays.
        if (className == '[object Array]') {
          // Compare array lengths to determine if a deep comparison is necessary.
          size = a.length;
          result = size == b.length;
          if (result) {
            // Deep compare the contents, ignoring non-numeric properties.
            while (size--) {
              if (!(result = eq(a[size], b[size], aStack, bStack))) break;
            }
          }
        } else {
          // Deep compare objects.
          for (var key in a) {
            if (_.has(a, key)) {
              // Count the expected number of properties.
              size++;
              // Deep compare each member.
              if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
            }
          }
          // Ensure that both objects contain the same number of properties.
          if (result) {
            for (key in b) {
              if (_.has(b, key) && !(size--)) break;
            }
            result = !size;
          }
        }
        // Remove the first object from the stack of traversed objects.
        aStack.pop();
        bStack.pop();
        return result;
      };
    
      // Perform a deep comparison to check if two objects are equal.
      _.isEqual = function(a, b) {
        return eq(a, b, [], []);
      };
    
      // Is a given array, string, or object empty?
      // An "empty" object has no enumerable own-properties.
      _.isEmpty = function(obj) {
        if (obj == null) return true;
        if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
        for (var key in obj) if (_.has(obj, key)) return false;
        return true;
      };
    
      // Is a given value a DOM element?
      _.isElement = function(obj) {
        return !!(obj && obj.nodeType === 1);
      };
    
      // Is a given value an array?
      // Delegates to ECMA5's native Array.isArray
      _.isArray = nativeIsArray || function(obj) {
        return toString.call(obj) == '[object Array]';
      };
    
      // Is a given variable an object?
      _.isObject = function(obj) {
        return obj === Object(obj);
      };
    
      // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
      each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
        _['is' + name] = function(obj) {
          return toString.call(obj) == '[object ' + name + ']';
        };
      });
    
      // Define a fallback version of the method in browsers (ahem, IE), where
      // there isn't any inspectable "Arguments" type.
      if (!_.isArguments(arguments)) {
        _.isArguments = function(obj) {
          return !!(obj && _.has(obj, 'callee'));
        };
      }
    
      // Optimize `isFunction` if appropriate.
      if (typeof (/./) !== 'function') {
        _.isFunction = function(obj) {
          return typeof obj === 'function';
        };
      }
    
      // Is a given object a finite number?
      _.isFinite = function(obj) {
        return isFinite(obj) && !isNaN(parseFloat(obj));
      };
    
      // Is the given value `NaN`? (NaN is the only number which does not equal itself).
      _.isNaN = function(obj) {
        return _.isNumber(obj) && obj != +obj;
      };
    
      // Is a given value a boolean?
      _.isBoolean = function(obj) {
        return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
      };
    
      // Is a given value equal to null?
      _.isNull = function(obj) {
        return obj === null;
      };
    
      // Is a given variable undefined?
      _.isUndefined = function(obj) {
        return obj === void 0;
      };
    
      // Shortcut function for checking if an object has a given property directly
      // on itself (in other words, not on a prototype).
      _.has = function(obj, key) {
        return hasOwnProperty.call(obj, key);
      };
    
      // Utility Functions
      // -----------------
    
      // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
      // previous owner. Returns a reference to the Underscore object.
      _.noConflict = function() {
        root._ = previousUnderscore;
        return this;
      };
    
      // Keep the identity function around for default iterators.
      _.identity = function(value) {
        return value;
      };
    
      // Run a function **n** times.
      _.times = function(n, iterator, context) {
        var accum = Array(Math.max(0, n));
        for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
        return accum;
      };
    
      // Return a random integer between min and max (inclusive).
      _.random = function(min, max) {
        if (max == null) {
          max = min;
          min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
      };
    
      // List of HTML entities for escaping.
      var entityMap = {
        escape: {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;'
        }
      };
      entityMap.unescape = _.invert(entityMap.escape);
    
      // Regexes containing the keys and values listed immediately above.
      var entityRegexes = {
        escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
        unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
      };
    
      // Functions for escaping and unescaping strings to/from HTML interpolation.
      _.each(['escape', 'unescape'], function(method) {
        _[method] = function(string) {
          if (string == null) return '';
          return ('' + string).replace(entityRegexes[method], function(match) {
            return entityMap[method][match];
          });
        };
      });
    
      // If the value of the named `property` is a function then invoke it with the
      // `object` as context; otherwise, return it.
      _.result = function(object, property) {
        if (object == null) return void 0;
        var value = object[property];
        return _.isFunction(value) ? value.call(object) : value;
      };
    
      // Add your own custom functions to the Underscore object.
      _.mixin = function(obj) {
        each(_.functions(obj), function(name) {
          var func = _[name] = obj[name];
          _.prototype[name] = function() {
            var args = [this._wrapped];
            push.apply(args, arguments);
            return result.call(this, func.apply(_, args));
          };
        });
      };
    
      // Generate a unique integer id (unique within the entire client session).
      // Useful for temporary DOM ids.
      var idCounter = 0;
      _.uniqueId = function(prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
      };
    
      // By default, Underscore uses ERB-style template delimiters, change the
      // following template settings to use alternative delimiters.
      _.templateSettings = {
        evaluate    : /<%([\s\S]+?)%>/g,
        interpolate : /<%=([\s\S]+?)%>/g,
        escape      : /<%-([\s\S]+?)%>/g
      };
    
      // When customizing `templateSettings`, if you don't want to define an
      // interpolation, evaluation or escaping regex, we need one that is
      // guaranteed not to match.
      var noMatch = /(.)^/;
    
      // Certain characters need to be escaped so that they can be put into a
      // string literal.
      var escapes = {
        "'":      "'",
        '\\':     '\\',
        '\r':     'r',
        '\n':     'n',
        '\t':     't',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
      };
    
      var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
    
      // JavaScript micro-templating, similar to John Resig's implementation.
      // Underscore templating handles arbitrary delimiters, preserves whitespace,
      // and correctly escapes quotes within interpolated code.
      _.template = function(text, data, settings) {
        var render;
        settings = _.defaults({}, settings, _.templateSettings);
    
        // Combine delimiters into one regular expression via alternation.
        var matcher = new RegExp([
          (settings.escape || noMatch).source,
          (settings.interpolate || noMatch).source,
          (settings.evaluate || noMatch).source
        ].join('|') + '|$', 'g');
    
        // Compile the template source, escaping string literals appropriately.
        var index = 0;
        var source = "__p+='";
        text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
          source += text.slice(index, offset)
            .replace(escaper, function(match) { return '\\' + escapes[match]; });
    
          if (escape) {
            source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
          }
          if (interpolate) {
            source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
          }
          if (evaluate) {
            source += "';\n" + evaluate + "\n__p+='";
          }
          index = offset + match.length;
          return match;
        });
        source += "';\n";
    
        // If a variable is not specified, place data values in local scope.
        if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';
    
        source = "var __t,__p='',__j=Array.prototype.join," +
          "print=function(){__p+=__j.call(arguments,'');};\n" +
          source + "return __p;\n";
    
        try {
          render = new Function(settings.variable || 'obj', '_', source);
        } catch (e) {
          e.source = source;
          throw e;
        }
    
        if (data) return render(data, _);
        var template = function(data) {
          return render.call(this, data, _);
        };
    
        // Provide the compiled function source as a convenience for precompilation.
        template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';
    
        return template;
      };
    
      // Add a "chain" function, which will delegate to the wrapper.
      _.chain = function(obj) {
        return _(obj).chain();
      };
    
      // OOP
      // ---------------
      // If Underscore is called as a function, it returns a wrapped object that
      // can be used OO-style. This wrapper holds altered versions of all the
      // underscore functions. Wrapped objects may be chained.
    
      // Helper function to continue chaining intermediate results.
      var result = function(obj) {
        return this._chain ? _(obj).chain() : obj;
      };
    
      // Add all of the Underscore functions to the wrapper object.
      _.mixin(_);
    
      // Add all mutator Array functions to the wrapper.
      each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
          var obj = this._wrapped;
          method.apply(obj, arguments);
          if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
          return result.call(this, obj);
        };
      });
    
      // Add all accessor Array functions to the wrapper.
      each(['concat', 'join', 'slice'], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
          return result.call(this, method.apply(this._wrapped, arguments));
        };
      });
    
      _.extend(_.prototype, {
    
        // Start chaining a wrapped Underscore object.
        chain: function() {
          this._chain = true;
          return this;
        },
    
        // Extracts the result from a wrapped and chained object.
        value: function() {
          return this._wrapped;
        }
    
      });
    
    }).call(this);
    
  provide("underscore", module.exports);
}(global));

// pakmanager:glob
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  // Approach:
    //
    // 1. Get the minimatch set
    // 2. For each pattern in the set, PROCESS(pattern)
    // 3. Store matches per-set, then uniq them
    //
    // PROCESS(pattern)
    // Get the first [n] items from pattern that are all strings
    // Join these together.  This is PREFIX.
    //   If there is no more remaining, then stat(PREFIX) and
    //   add to matches if it succeeds.  END.
    // readdir(PREFIX) as ENTRIES
    //   If fails, END
    //   If pattern[n] is GLOBSTAR
    //     // handle the case where the globstar match is empty
    //     // by pruning it out, and testing the resulting pattern
    //     PROCESS(pattern[0..n] + pattern[n+1 .. $])
    //     // handle other cases.
    //     for ENTRY in ENTRIES (not dotfiles)
    //       // attach globstar + tail onto the entry
    //       PROCESS(pattern[0..n] + ENTRY + pattern[n .. $])
    //
    //   else // not globstar
    //     for ENTRY in ENTRIES (not dotfiles, unless pattern[n] is dot)
    //       Test ENTRY against pattern[n]
    //       If fails, continue
    //       If passes, PROCESS(pattern[0..n] + item + pattern[n+1 .. $])
    //
    // Caveat:
    //   Cache all stats and readdirs results to minimize syscall.  Since all
    //   we ever care about is existence and directory-ness, we can just keep
    //   `true` for files, and [children,...] for directories, or `false` for
    //   things that don't exist.
    
    
    
    module.exports = glob
    
    var fs = require("fs")
    , minimatch = require("minimatch")
    , Minimatch = minimatch.Minimatch
    , inherits = require("inherits")
    , EE = require("events").EventEmitter
    , path = require("path")
    , isDir = {}
    , assert = require("assert").ok
    
    function glob (pattern, options, cb) {
      if (typeof options === "function") cb = options, options = {}
      if (!options) options = {}
    
      if (typeof options === "number") {
        deprecated()
        return
      }
    
      var g = new Glob(pattern, options, cb)
      return g.sync ? g.found : g
    }
    
    glob.fnmatch = deprecated
    
    function deprecated () {
      throw new Error("glob's interface has changed. Please see the docs.")
    }
    
    glob.sync = globSync
    function globSync (pattern, options) {
      if (typeof options === "number") {
        deprecated()
        return
      }
    
      options = options || {}
      options.sync = true
      return glob(pattern, options)
    }
    
    
    glob.Glob = Glob
    inherits(Glob, EE)
    function Glob (pattern, options, cb) {
      if (!(this instanceof Glob)) {
        return new Glob(pattern, options, cb)
      }
    
      if (typeof options === "function") {
        cb = options
        options = null
      }
    
      if (typeof cb === "function") {
        this.on("error", cb)
        this.on("end", function (matches) {
          cb(null, matches)
        })
      }
    
      options = options || {}
    
      this.EOF = {}
      this._emitQueue = []
    
      this.maxDepth = options.maxDepth || 1000
      this.maxLength = options.maxLength || Infinity
      this.cache = options.cache || {}
      this.statCache = options.statCache || {}
    
      this.changedCwd = false
      var cwd = process.cwd()
      if (!options.hasOwnProperty("cwd")) this.cwd = cwd
      else {
        this.cwd = options.cwd
        this.changedCwd = path.resolve(options.cwd) !== cwd
      }
    
      this.root = options.root || path.resolve(this.cwd, "/")
      this.root = path.resolve(this.root)
      if (process.platform === "win32")
        this.root = this.root.replace(/\\/g, "/")
    
      this.nomount = !!options.nomount
    
      if (!pattern) {
        throw new Error("must provide pattern")
      }
    
      // base-matching: just use globstar for that.
      if (options.matchBase && -1 === pattern.indexOf("/")) {
        if (options.noglobstar) {
          throw new Error("base matching requires globstar")
        }
        pattern = "**/" + pattern
      }
    
      this.strict = options.strict !== false
      this.dot = !!options.dot
      this.mark = !!options.mark
      this.sync = !!options.sync
      this.nounique = !!options.nounique
      this.nonull = !!options.nonull
      this.nosort = !!options.nosort
      this.nocase = !!options.nocase
      this.stat = !!options.stat
    
      this.debug = !!options.debug || !!options.globDebug
      if (this.debug)
        this.log = console.error
    
      this.silent = !!options.silent
    
      var mm = this.minimatch = new Minimatch(pattern, options)
      this.options = mm.options
      pattern = this.pattern = mm.pattern
    
      this.error = null
      this.aborted = false
    
      // list of all the patterns that ** has resolved do, so
      // we can avoid visiting multiple times.
      this._globstars = {}
    
      EE.call(this)
    
      // process each pattern in the minimatch set
      var n = this.minimatch.set.length
    
      // The matches are stored as {<filename>: true,...} so that
      // duplicates are automagically pruned.
      // Later, we do an Object.keys() on these.
      // Keep them as a list so we can fill in when nonull is set.
      this.matches = new Array(n)
    
      this.minimatch.set.forEach(iterator.bind(this))
      function iterator (pattern, i, set) {
        this._process(pattern, 0, i, function (er) {
          if (er) this.emit("error", er)
          if (-- n <= 0) this._finish()
        })
      }
    }
    
    Glob.prototype.log = function () {}
    
    Glob.prototype._finish = function () {
      assert(this instanceof Glob)
    
      var nou = this.nounique
      , all = nou ? [] : {}
    
      for (var i = 0, l = this.matches.length; i < l; i ++) {
        var matches = this.matches[i]
        this.log("matches[%d] =", i, matches)
        // do like the shell, and spit out the literal glob
        if (!matches) {
          if (this.nonull) {
            var literal = this.minimatch.globSet[i]
            if (nou) all.push(literal)
            else all[literal] = true
          }
        } else {
          // had matches
          var m = Object.keys(matches)
          if (nou) all.push.apply(all, m)
          else m.forEach(function (m) {
            all[m] = true
          })
        }
      }
    
      if (!nou) all = Object.keys(all)
    
      if (!this.nosort) {
        all = all.sort(this.nocase ? alphasorti : alphasort)
      }
    
      if (this.mark) {
        // at *some* point we statted all of these
        all = all.map(function (m) {
          var sc = this.cache[m]
          if (!sc)
            return m
          var isDir = (Array.isArray(sc) || sc === 2)
          if (isDir && m.slice(-1) !== "/") {
            return m + "/"
          }
          if (!isDir && m.slice(-1) === "/") {
            return m.replace(/\/+$/, "")
          }
          return m
        }, this)
      }
    
      this.log("emitting end", all)
    
      this.EOF = this.found = all
      this.emitMatch(this.EOF)
    }
    
    function alphasorti (a, b) {
      a = a.toLowerCase()
      b = b.toLowerCase()
      return alphasort(a, b)
    }
    
    function alphasort (a, b) {
      return a > b ? 1 : a < b ? -1 : 0
    }
    
    Glob.prototype.abort = function () {
      this.aborted = true
      this.emit("abort")
    }
    
    Glob.prototype.pause = function () {
      if (this.paused) return
      if (this.sync)
        this.emit("error", new Error("Can't pause/resume sync glob"))
      this.paused = true
      this.emit("pause")
    }
    
    Glob.prototype.resume = function () {
      if (!this.paused) return
      if (this.sync)
        this.emit("error", new Error("Can't pause/resume sync glob"))
      this.paused = false
      this.emit("resume")
      this._processEmitQueue()
      //process.nextTick(this.emit.bind(this, "resume"))
    }
    
    Glob.prototype.emitMatch = function (m) {
      if (!this.stat || this.statCache[m] || m === this.EOF) {
        this._emitQueue.push(m)
        this._processEmitQueue()
      } else {
        this._stat(m, function(exists, isDir) {
          if (exists) {
            this._emitQueue.push(m)
            this._processEmitQueue()
          }
        })
      }
    }
    
    Glob.prototype._processEmitQueue = function (m) {
      while (!this._processingEmitQueue &&
             !this.paused) {
        this._processingEmitQueue = true
        var m = this._emitQueue.shift()
        if (!m) {
          this._processingEmitQueue = false
          break
        }
    
        this.log('emit!', m === this.EOF ? "end" : "match")
    
        this.emit(m === this.EOF ? "end" : "match", m)
        this._processingEmitQueue = false
      }
    }
    
    Glob.prototype._process = function (pattern, depth, index, cb_) {
      assert(this instanceof Glob)
    
      var cb = function cb (er, res) {
        assert(this instanceof Glob)
        if (this.paused) {
          if (!this._processQueue) {
            this._processQueue = []
            this.once("resume", function () {
              var q = this._processQueue
              this._processQueue = null
              q.forEach(function (cb) { cb() })
            })
          }
          this._processQueue.push(cb_.bind(this, er, res))
        } else {
          cb_.call(this, er, res)
        }
      }.bind(this)
    
      if (this.aborted) return cb()
    
      if (depth > this.maxDepth) return cb()
    
      // Get the first [n] parts of pattern that are all strings.
      var n = 0
      while (typeof pattern[n] === "string") {
        n ++
      }
      // now n is the index of the first one that is *not* a string.
    
      // see if there's anything else
      var prefix
      switch (n) {
        // if not, then this is rather simple
        case pattern.length:
          prefix = pattern.join("/")
          this._stat(prefix, function (exists, isDir) {
            // either it's there, or it isn't.
            // nothing more to do, either way.
            if (exists) {
              if (prefix && isAbsolute(prefix) && !this.nomount) {
                if (prefix.charAt(0) === "/") {
                  prefix = path.join(this.root, prefix)
                } else {
                  prefix = path.resolve(this.root, prefix)
                }
              }
    
              if (process.platform === "win32")
                prefix = prefix.replace(/\\/g, "/")
    
              this.matches[index] = this.matches[index] || {}
              this.matches[index][prefix] = true
              this.emitMatch(prefix)
            }
            return cb()
          })
          return
    
        case 0:
          // pattern *starts* with some non-trivial item.
          // going to readdir(cwd), but not include the prefix in matches.
          prefix = null
          break
    
        default:
          // pattern has some string bits in the front.
          // whatever it starts with, whether that's "absolute" like /foo/bar,
          // or "relative" like "../baz"
          prefix = pattern.slice(0, n)
          prefix = prefix.join("/")
          break
      }
    
      // get the list of entries.
      var read
      if (prefix === null) read = "."
      else if (isAbsolute(prefix) || isAbsolute(pattern.join("/"))) {
        if (!prefix || !isAbsolute(prefix)) {
          prefix = path.join("/", prefix)
        }
        read = prefix = path.resolve(prefix)
    
        // if (process.platform === "win32")
        //   read = prefix = prefix.replace(/^[a-zA-Z]:|\\/g, "/")
    
        this.log('absolute: ', prefix, this.root, pattern, read)
      } else {
        read = prefix
      }
    
      this.log('readdir(%j)', read, this.cwd, this.root)
    
      return this._readdir(read, function (er, entries) {
        if (er) {
          // not a directory!
          // this means that, whatever else comes after this, it can never match
          return cb()
        }
    
        // globstar is special
        if (pattern[n] === minimatch.GLOBSTAR) {
          // test without the globstar, and with every child both below
          // and replacing the globstar.
          var s = [ pattern.slice(0, n).concat(pattern.slice(n + 1)) ]
          entries.forEach(function (e) {
            if (e.charAt(0) === "." && !this.dot) return
            // instead of the globstar
            s.push(pattern.slice(0, n).concat(e).concat(pattern.slice(n + 1)))
            // below the globstar
            s.push(pattern.slice(0, n).concat(e).concat(pattern.slice(n)))
          }, this)
    
          s = s.filter(function (pattern) {
            var key = gsKey(pattern)
            var seen = !this._globstars[key]
            this._globstars[key] = true
            return seen
          }, this)
    
          if (!s.length)
            return cb()
    
          // now asyncForEach over this
          var l = s.length
          , errState = null
          s.forEach(function (gsPattern) {
            this._process(gsPattern, depth + 1, index, function (er) {
              if (errState) return
              if (er) return cb(errState = er)
              if (--l <= 0) return cb()
            })
          }, this)
    
          return
        }
    
        // not a globstar
        // It will only match dot entries if it starts with a dot, or if
        // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
        var pn = pattern[n]
        var rawGlob = pattern[n]._glob
        , dotOk = this.dot || rawGlob.charAt(0) === "."
    
        entries = entries.filter(function (e) {
          return (e.charAt(0) !== "." || dotOk) &&
                 e.match(pattern[n])
        })
    
        // If n === pattern.length - 1, then there's no need for the extra stat
        // *unless* the user has specified "mark" or "stat" explicitly.
        // We know that they exist, since the readdir returned them.
        if (n === pattern.length - 1 &&
            !this.mark &&
            !this.stat) {
          entries.forEach(function (e) {
            if (prefix) {
              if (prefix !== "/") e = prefix + "/" + e
              else e = prefix + e
            }
            if (e.charAt(0) === "/" && !this.nomount) {
              e = path.join(this.root, e)
            }
    
            if (process.platform === "win32")
              e = e.replace(/\\/g, "/")
    
            this.matches[index] = this.matches[index] || {}
            this.matches[index][e] = true
            this.emitMatch(e)
          }, this)
          return cb.call(this)
        }
    
    
        // now test all the remaining entries as stand-ins for that part
        // of the pattern.
        var l = entries.length
        , errState = null
        if (l === 0) return cb() // no matches possible
        entries.forEach(function (e) {
          var p = pattern.slice(0, n).concat(e).concat(pattern.slice(n + 1))
          this._process(p, depth + 1, index, function (er) {
            if (errState) return
            if (er) return cb(errState = er)
            if (--l === 0) return cb.call(this)
          })
        }, this)
      })
    
    }
    
    function gsKey (pattern) {
      return '**' + pattern.map(function (p) {
        return (p === minimatch.GLOBSTAR) ? '**' : (''+p)
      }).join('/')
    }
    
    Glob.prototype._stat = function (f, cb) {
      assert(this instanceof Glob)
      var abs = f
      if (f.charAt(0) === "/") {
        abs = path.join(this.root, f)
      } else if (this.changedCwd) {
        abs = path.resolve(this.cwd, f)
      }
    
      if (f.length > this.maxLength) {
        var er = new Error("Path name too long")
        er.code = "ENAMETOOLONG"
        er.path = f
        return this._afterStat(f, abs, cb, er)
      }
    
      this.log('stat', [this.cwd, f, '=', abs])
    
      if (!this.stat && this.cache.hasOwnProperty(f)) {
        var exists = this.cache[f]
        , isDir = exists && (Array.isArray(exists) || exists === 2)
        if (this.sync) return cb.call(this, !!exists, isDir)
        return process.nextTick(cb.bind(this, !!exists, isDir))
      }
    
      var stat = this.statCache[abs]
      if (this.sync || stat) {
        var er
        try {
          stat = fs.statSync(abs)
        } catch (e) {
          er = e
        }
        this._afterStat(f, abs, cb, er, stat)
      } else {
        fs.stat(abs, this._afterStat.bind(this, f, abs, cb))
      }
    }
    
    Glob.prototype._afterStat = function (f, abs, cb, er, stat) {
      var exists
      assert(this instanceof Glob)
    
      if (abs.slice(-1) === "/" && stat && !stat.isDirectory()) {
        this.log("should be ENOTDIR, fake it")
    
        er = new Error("ENOTDIR, not a directory '" + abs + "'")
        er.path = abs
        er.code = "ENOTDIR"
        stat = null
      }
    
      var emit = !this.statCache[abs]
      this.statCache[abs] = stat
    
      if (er || !stat) {
        exists = false
      } else {
        exists = stat.isDirectory() ? 2 : 1
        if (emit)
          this.emit('stat', f, stat)
      }
      this.cache[f] = this.cache[f] || exists
      cb.call(this, !!exists, exists === 2)
    }
    
    Glob.prototype._readdir = function (f, cb) {
      assert(this instanceof Glob)
      var abs = f
      if (f.charAt(0) === "/") {
        abs = path.join(this.root, f)
      } else if (isAbsolute(f)) {
        abs = f
      } else if (this.changedCwd) {
        abs = path.resolve(this.cwd, f)
      }
    
      if (f.length > this.maxLength) {
        var er = new Error("Path name too long")
        er.code = "ENAMETOOLONG"
        er.path = f
        return this._afterReaddir(f, abs, cb, er)
      }
    
      this.log('readdir', [this.cwd, f, abs])
      if (this.cache.hasOwnProperty(f)) {
        var c = this.cache[f]
        if (Array.isArray(c)) {
          if (this.sync) return cb.call(this, null, c)
          return process.nextTick(cb.bind(this, null, c))
        }
    
        if (!c || c === 1) {
          // either ENOENT or ENOTDIR
          var code = c ? "ENOTDIR" : "ENOENT"
          , er = new Error((c ? "Not a directory" : "Not found") + ": " + f)
          er.path = f
          er.code = code
          this.log(f, er)
          if (this.sync) return cb.call(this, er)
          return process.nextTick(cb.bind(this, er))
        }
    
        // at this point, c === 2, meaning it's a dir, but we haven't
        // had to read it yet, or c === true, meaning it's *something*
        // but we don't have any idea what.  Need to read it, either way.
      }
    
      if (this.sync) {
        var er, entries
        try {
          entries = fs.readdirSync(abs)
        } catch (e) {
          er = e
        }
        return this._afterReaddir(f, abs, cb, er, entries)
      }
    
      fs.readdir(abs, this._afterReaddir.bind(this, f, abs, cb))
    }
    
    Glob.prototype._afterReaddir = function (f, abs, cb, er, entries) {
      assert(this instanceof Glob)
      if (entries && !er) {
        this.cache[f] = entries
        // if we haven't asked to stat everything for suresies, then just
        // assume that everything in there exists, so we can avoid
        // having to stat it a second time.  This also gets us one step
        // further into ELOOP territory.
        if (!this.mark && !this.stat) {
          entries.forEach(function (e) {
            if (f === "/") e = f + e
            else e = f + "/" + e
            this.cache[e] = true
          }, this)
        }
    
        return cb.call(this, er, entries)
      }
    
      // now handle errors, and cache the information
      if (er) switch (er.code) {
        case "ENOTDIR": // totally normal. means it *does* exist.
          this.cache[f] = 1
          return cb.call(this, er)
        case "ENOENT": // not terribly unusual
        case "ELOOP":
        case "ENAMETOOLONG":
        case "UNKNOWN":
          this.cache[f] = false
          return cb.call(this, er)
        default: // some unusual error.  Treat as failure.
          this.cache[f] = false
          if (this.strict) this.emit("error", er)
          if (!this.silent) console.error("glob error", er)
          return cb.call(this, er)
      }
    }
    
    var isAbsolute = process.platform === "win32" ? absWin : absUnix
    
    function absWin (p) {
      if (absUnix(p)) return true
      // pull off the device/UNC bit from a windows path.
      // from node's lib/path.js
      var splitDeviceRe =
          /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/
        , result = splitDeviceRe.exec(p)
        , device = result[1] || ''
        , isUnc = device && device.charAt(1) !== ':'
        , isAbsolute = !!result[2] || isUnc // UNC paths are always absolute
    
      return isAbsolute
    }
    
    function absUnix (p) {
      return p.charAt(0) === "/" || p === ""
    }
    
  provide("glob", module.exports);
}(global));

// pakmanager:argparse
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  module.exports = require('./lib/argparse');
    
  provide("argparse", module.exports);
}(global));

// pakmanager:esprima
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*
      Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
      Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
      Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
      Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
      Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
      Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
      Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>
    
      Redistribution and use in source and binary forms, with or without
      modification, are permitted provided that the following conditions are met:
    
        * Redistributions of source code must retain the above copyright
          notice, this list of conditions and the following disclaimer.
        * Redistributions in binary form must reproduce the above copyright
          notice, this list of conditions and the following disclaimer in the
          documentation and/or other materials provided with the distribution.
    
      THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
      AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
      IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
      ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
      DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
      (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
      LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
      ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
      (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
      THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    */
    
    /*jslint bitwise:true plusplus:true */
    /*global esprima:true, define:true, exports:true, window: true,
    throwError: true, createLiteral: true, generateStatement: true,
    parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
    parseFunctionDeclaration: true, parseFunctionExpression: true,
    parseFunctionSourceElements: true, parseVariableIdentifier: true,
    parseLeftHandSideExpression: true,
    parseStatement: true, parseSourceElement: true */
    
    (function (root, factory) {
        'use strict';
    
        // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
        // Rhino, and plain browser loading.
        if (typeof define === 'function' && define.amd) {
            define(['exports'], factory);
        } else if (typeof exports !== 'undefined') {
            factory(exports);
        } else {
            factory((root.esprima = {}));
        }
    }(this, function (exports) {
        'use strict';
    
        var Token,
            TokenName,
            Syntax,
            PropertyKind,
            Messages,
            Regex,
            source,
            strict,
            index,
            lineNumber,
            lineStart,
            length,
            buffer,
            state,
            extra;
    
        Token = {
            BooleanLiteral: 1,
            EOF: 2,
            Identifier: 3,
            Keyword: 4,
            NullLiteral: 5,
            NumericLiteral: 6,
            Punctuator: 7,
            StringLiteral: 8
        };
    
        TokenName = {};
        TokenName[Token.BooleanLiteral] = 'Boolean';
        TokenName[Token.EOF] = '<end>';
        TokenName[Token.Identifier] = 'Identifier';
        TokenName[Token.Keyword] = 'Keyword';
        TokenName[Token.NullLiteral] = 'Null';
        TokenName[Token.NumericLiteral] = 'Numeric';
        TokenName[Token.Punctuator] = 'Punctuator';
        TokenName[Token.StringLiteral] = 'String';
    
        Syntax = {
            AssignmentExpression: 'AssignmentExpression',
            ArrayExpression: 'ArrayExpression',
            BlockStatement: 'BlockStatement',
            BinaryExpression: 'BinaryExpression',
            BreakStatement: 'BreakStatement',
            CallExpression: 'CallExpression',
            CatchClause: 'CatchClause',
            ConditionalExpression: 'ConditionalExpression',
            ContinueStatement: 'ContinueStatement',
            DoWhileStatement: 'DoWhileStatement',
            DebuggerStatement: 'DebuggerStatement',
            EmptyStatement: 'EmptyStatement',
            ExpressionStatement: 'ExpressionStatement',
            ForStatement: 'ForStatement',
            ForInStatement: 'ForInStatement',
            FunctionDeclaration: 'FunctionDeclaration',
            FunctionExpression: 'FunctionExpression',
            Identifier: 'Identifier',
            IfStatement: 'IfStatement',
            Literal: 'Literal',
            LabeledStatement: 'LabeledStatement',
            LogicalExpression: 'LogicalExpression',
            MemberExpression: 'MemberExpression',
            NewExpression: 'NewExpression',
            ObjectExpression: 'ObjectExpression',
            Program: 'Program',
            Property: 'Property',
            ReturnStatement: 'ReturnStatement',
            SequenceExpression: 'SequenceExpression',
            SwitchStatement: 'SwitchStatement',
            SwitchCase: 'SwitchCase',
            ThisExpression: 'ThisExpression',
            ThrowStatement: 'ThrowStatement',
            TryStatement: 'TryStatement',
            UnaryExpression: 'UnaryExpression',
            UpdateExpression: 'UpdateExpression',
            VariableDeclaration: 'VariableDeclaration',
            VariableDeclarator: 'VariableDeclarator',
            WhileStatement: 'WhileStatement',
            WithStatement: 'WithStatement'
        };
    
        PropertyKind = {
            Data: 1,
            Get: 2,
            Set: 4
        };
    
        // Error messages should be identical to V8.
        Messages = {
            UnexpectedToken:  'Unexpected token %0',
            UnexpectedNumber:  'Unexpected number',
            UnexpectedString:  'Unexpected string',
            UnexpectedIdentifier:  'Unexpected identifier',
            UnexpectedReserved:  'Unexpected reserved word',
            UnexpectedEOS:  'Unexpected end of input',
            NewlineAfterThrow:  'Illegal newline after throw',
            InvalidRegExp: 'Invalid regular expression',
            UnterminatedRegExp:  'Invalid regular expression: missing /',
            InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
            InvalidLHSInForIn:  'Invalid left-hand side in for-in',
            MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
            NoCatchOrFinally:  'Missing catch or finally after try',
            UnknownLabel: 'Undefined label \'%0\'',
            Redeclaration: '%0 \'%1\' has already been declared',
            IllegalContinue: 'Illegal continue statement',
            IllegalBreak: 'Illegal break statement',
            IllegalReturn: 'Illegal return statement',
            StrictModeWith:  'Strict mode code may not include a with statement',
            StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
            StrictVarName:  'Variable name may not be eval or arguments in strict mode',
            StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
            StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
            StrictFunctionName:  'Function name may not be eval or arguments in strict mode',
            StrictOctalLiteral:  'Octal literals are not allowed in strict mode.',
            StrictDelete:  'Delete of an unqualified identifier in strict mode.',
            StrictDuplicateProperty:  'Duplicate data property in object literal not allowed in strict mode',
            AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
            AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
            StrictLHSAssignment:  'Assignment to eval or arguments is not allowed in strict mode',
            StrictLHSPostfix:  'Postfix increment/decrement may not have eval or arguments operand in strict mode',
            StrictLHSPrefix:  'Prefix increment/decrement may not have eval or arguments operand in strict mode',
            StrictReservedWord:  'Use of future reserved word in strict mode'
        };
    
        // See also tools/generate-unicode-regex.py.
        Regex = {
            NonAsciiIdentifierStart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]'),
            NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]')
        };
    
        // Ensure the condition is true, otherwise throw an error.
        // This is only to have a better contract semantic, i.e. another safety net
        // to catch a logic error. The condition shall be fulfilled in normal case.
        // Do NOT use this to enforce a certain condition on any user input.
    
        function assert(condition, message) {
            if (!condition) {
                throw new Error('ASSERT: ' + message);
            }
        }
    
        function sliceSource(from, to) {
            return source.slice(from, to);
        }
    
        if (typeof 'esprima'[0] === 'undefined') {
            sliceSource = function sliceArraySource(from, to) {
                return source.slice(from, to).join('');
            };
        }
    
        function isDecimalDigit(ch) {
            return '0123456789'.indexOf(ch) >= 0;
        }
    
        function isHexDigit(ch) {
            return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
        }
    
        function isOctalDigit(ch) {
            return '01234567'.indexOf(ch) >= 0;
        }
    
    
        // 7.2 White Space
    
        function isWhiteSpace(ch) {
            return (ch === ' ') || (ch === '\u0009') || (ch === '\u000B') ||
                (ch === '\u000C') || (ch === '\u00A0') ||
                (ch.charCodeAt(0) >= 0x1680 &&
                 '\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF'.indexOf(ch) >= 0);
        }
    
        // 7.3 Line Terminators
    
        function isLineTerminator(ch) {
            return (ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029');
        }
    
        // 7.6 Identifier Names and Identifiers
    
        function isIdentifierStart(ch) {
            return (ch === '$') || (ch === '_') || (ch === '\\') ||
                (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
                ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierStart.test(ch));
        }
    
        function isIdentifierPart(ch) {
            return (ch === '$') || (ch === '_') || (ch === '\\') ||
                (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
                ((ch >= '0') && (ch <= '9')) ||
                ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierPart.test(ch));
        }
    
        // 7.6.1.2 Future Reserved Words
    
        function isFutureReservedWord(id) {
            switch (id) {
    
            // Future reserved words.
            case 'class':
            case 'enum':
            case 'export':
            case 'extends':
            case 'import':
            case 'super':
                return true;
            }
    
            return false;
        }
    
        function isStrictModeReservedWord(id) {
            switch (id) {
    
            // Strict Mode reserved words.
            case 'implements':
            case 'interface':
            case 'package':
            case 'private':
            case 'protected':
            case 'public':
            case 'static':
            case 'yield':
            case 'let':
                return true;
            }
    
            return false;
        }
    
        function isRestrictedWord(id) {
            return id === 'eval' || id === 'arguments';
        }
    
        // 7.6.1.1 Keywords
    
        function isKeyword(id) {
            var keyword = false;
            switch (id.length) {
            case 2:
                keyword = (id === 'if') || (id === 'in') || (id === 'do');
                break;
            case 3:
                keyword = (id === 'var') || (id === 'for') || (id === 'new') || (id === 'try');
                break;
            case 4:
                keyword = (id === 'this') || (id === 'else') || (id === 'case') || (id === 'void') || (id === 'with');
                break;
            case 5:
                keyword = (id === 'while') || (id === 'break') || (id === 'catch') || (id === 'throw');
                break;
            case 6:
                keyword = (id === 'return') || (id === 'typeof') || (id === 'delete') || (id === 'switch');
                break;
            case 7:
                keyword = (id === 'default') || (id === 'finally');
                break;
            case 8:
                keyword = (id === 'function') || (id === 'continue') || (id === 'debugger');
                break;
            case 10:
                keyword = (id === 'instanceof');
                break;
            }
    
            if (keyword) {
                return true;
            }
    
            switch (id) {
            // Future reserved words.
            // 'const' is specialized as Keyword in V8.
            case 'const':
                return true;
    
            // For compatiblity to SpiderMonkey and ES.next
            case 'yield':
            case 'let':
                return true;
            }
    
            if (strict && isStrictModeReservedWord(id)) {
                return true;
            }
    
            return isFutureReservedWord(id);
        }
    
        // 7.4 Comments
    
        function skipComment() {
            var ch, blockComment, lineComment;
    
            blockComment = false;
            lineComment = false;
    
            while (index < length) {
                ch = source[index];
    
                if (lineComment) {
                    ch = source[index++];
                    if (isLineTerminator(ch)) {
                        lineComment = false;
                        if (ch === '\r' && source[index] === '\n') {
                            ++index;
                        }
                        ++lineNumber;
                        lineStart = index;
                    }
                } else if (blockComment) {
                    if (isLineTerminator(ch)) {
                        if (ch === '\r' && source[index + 1] === '\n') {
                            ++index;
                        }
                        ++lineNumber;
                        ++index;
                        lineStart = index;
                        if (index >= length) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    } else {
                        ch = source[index++];
                        if (index >= length) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                        if (ch === '*') {
                            ch = source[index];
                            if (ch === '/') {
                                ++index;
                                blockComment = false;
                            }
                        }
                    }
                } else if (ch === '/') {
                    ch = source[index + 1];
                    if (ch === '/') {
                        index += 2;
                        lineComment = true;
                    } else if (ch === '*') {
                        index += 2;
                        blockComment = true;
                        if (index >= length) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    } else {
                        break;
                    }
                } else if (isWhiteSpace(ch)) {
                    ++index;
                } else if (isLineTerminator(ch)) {
                    ++index;
                    if (ch ===  '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                } else {
                    break;
                }
            }
        }
    
        function scanHexEscape(prefix) {
            var i, len, ch, code = 0;
    
            len = (prefix === 'u') ? 4 : 2;
            for (i = 0; i < len; ++i) {
                if (index < length && isHexDigit(source[index])) {
                    ch = source[index++];
                    code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
                } else {
                    return '';
                }
            }
            return String.fromCharCode(code);
        }
    
        function scanIdentifier() {
            var ch, start, id, restore;
    
            ch = source[index];
            if (!isIdentifierStart(ch)) {
                return;
            }
    
            start = index;
            if (ch === '\\') {
                ++index;
                if (source[index] !== 'u') {
                    return;
                }
                ++index;
                restore = index;
                ch = scanHexEscape('u');
                if (ch) {
                    if (ch === '\\' || !isIdentifierStart(ch)) {
                        return;
                    }
                    id = ch;
                } else {
                    index = restore;
                    id = 'u';
                }
            } else {
                id = source[index++];
            }
    
            while (index < length) {
                ch = source[index];
                if (!isIdentifierPart(ch)) {
                    break;
                }
                if (ch === '\\') {
                    ++index;
                    if (source[index] !== 'u') {
                        return;
                    }
                    ++index;
                    restore = index;
                    ch = scanHexEscape('u');
                    if (ch) {
                        if (ch === '\\' || !isIdentifierPart(ch)) {
                            return;
                        }
                        id += ch;
                    } else {
                        index = restore;
                        id += 'u';
                    }
                } else {
                    id += source[index++];
                }
            }
    
            // There is no keyword or literal with only one character.
            // Thus, it must be an identifier.
            if (id.length === 1) {
                return {
                    type: Token.Identifier,
                    value: id,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
    
            if (isKeyword(id)) {
                return {
                    type: Token.Keyword,
                    value: id,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
    
            // 7.8.1 Null Literals
    
            if (id === 'null') {
                return {
                    type: Token.NullLiteral,
                    value: id,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
    
            // 7.8.2 Boolean Literals
    
            if (id === 'true' || id === 'false') {
                return {
                    type: Token.BooleanLiteral,
                    value: id,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
    
            return {
                type: Token.Identifier,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }
    
        // 7.7 Punctuators
    
        function scanPunctuator() {
            var start = index,
                ch1 = source[index],
                ch2,
                ch3,
                ch4;
    
            // Check for most common single-character punctuators.
    
            if (ch1 === ';' || ch1 === '{' || ch1 === '}') {
                ++index;
                return {
                    type: Token.Punctuator,
                    value: ch1,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
    
            if (ch1 === ',' || ch1 === '(' || ch1 === ')') {
                ++index;
                return {
                    type: Token.Punctuator,
                    value: ch1,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
    
            // Dot (.) can also start a floating-point number, hence the need
            // to check the next character.
    
            ch2 = source[index + 1];
            if (ch1 === '.' && !isDecimalDigit(ch2)) {
                return {
                    type: Token.Punctuator,
                    value: source[index++],
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
    
            // Peek more characters.
    
            ch3 = source[index + 2];
            ch4 = source[index + 3];
    
            // 4-character punctuator: >>>=
    
            if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
                if (ch4 === '=') {
                    index += 4;
                    return {
                        type: Token.Punctuator,
                        value: '>>>=',
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                }
            }
    
            // 3-character punctuators: === !== >>> <<= >>=
    
            if (ch1 === '=' && ch2 === '=' && ch3 === '=') {
                index += 3;
                return {
                    type: Token.Punctuator,
                    value: '===',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
    
            if (ch1 === '!' && ch2 === '=' && ch3 === '=') {
                index += 3;
                return {
                    type: Token.Punctuator,
                    value: '!==',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
    
            if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
                index += 3;
                return {
                    type: Token.Punctuator,
                    value: '>>>',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
    
            if (ch1 === '<' && ch2 === '<' && ch3 === '=') {
                index += 3;
                return {
                    type: Token.Punctuator,
                    value: '<<=',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
    
            if (ch1 === '>' && ch2 === '>' && ch3 === '=') {
                index += 3;
                return {
                    type: Token.Punctuator,
                    value: '>>=',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
    
            // 2-character punctuators: <= >= == != ++ -- << >> && ||
            // += -= *= %= &= |= ^= /=
    
            if (ch2 === '=') {
                if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
                    index += 2;
                    return {
                        type: Token.Punctuator,
                        value: ch1 + ch2,
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                }
            }
    
            if (ch1 === ch2 && ('+-<>&|'.indexOf(ch1) >= 0)) {
                if ('+-<>&|'.indexOf(ch2) >= 0) {
                    index += 2;
                    return {
                        type: Token.Punctuator,
                        value: ch1 + ch2,
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                }
            }
    
            // The remaining 1-character punctuators.
    
            if ('[]<>+-*%&|^!~?:=/'.indexOf(ch1) >= 0) {
                return {
                    type: Token.Punctuator,
                    value: source[index++],
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }
    
        // 7.8.3 Numeric Literals
    
        function scanNumericLiteral() {
            var number, start, ch;
    
            ch = source[index];
            assert(isDecimalDigit(ch) || (ch === '.'),
                'Numeric literal must start with a decimal digit or a decimal point');
    
            start = index;
            number = '';
            if (ch !== '.') {
                number = source[index++];
                ch = source[index];
    
                // Hex number starts with '0x'.
                // Octal number starts with '0'.
                if (number === '0') {
                    if (ch === 'x' || ch === 'X') {
                        number += source[index++];
                        while (index < length) {
                            ch = source[index];
                            if (!isHexDigit(ch)) {
                                break;
                            }
                            number += source[index++];
                        }
    
                        if (number.length <= 2) {
                            // only 0x
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
    
                        if (index < length) {
                            ch = source[index];
                            if (isIdentifierStart(ch)) {
                                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                            }
                        }
                        return {
                            type: Token.NumericLiteral,
                            value: parseInt(number, 16),
                            lineNumber: lineNumber,
                            lineStart: lineStart,
                            range: [start, index]
                        };
                    } else if (isOctalDigit(ch)) {
                        number += source[index++];
                        while (index < length) {
                            ch = source[index];
                            if (!isOctalDigit(ch)) {
                                break;
                            }
                            number += source[index++];
                        }
    
                        if (index < length) {
                            ch = source[index];
                            if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
                                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                            }
                        }
                        return {
                            type: Token.NumericLiteral,
                            value: parseInt(number, 8),
                            octal: true,
                            lineNumber: lineNumber,
                            lineStart: lineStart,
                            range: [start, index]
                        };
                    }
    
                    // decimal number starts with '0' such as '09' is illegal.
                    if (isDecimalDigit(ch)) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                }
    
                while (index < length) {
                    ch = source[index];
                    if (!isDecimalDigit(ch)) {
                        break;
                    }
                    number += source[index++];
                }
            }
    
            if (ch === '.') {
                number += source[index++];
                while (index < length) {
                    ch = source[index];
                    if (!isDecimalDigit(ch)) {
                        break;
                    }
                    number += source[index++];
                }
            }
    
            if (ch === 'e' || ch === 'E') {
                number += source[index++];
    
                ch = source[index];
                if (ch === '+' || ch === '-') {
                    number += source[index++];
                }
    
                ch = source[index];
                if (isDecimalDigit(ch)) {
                    number += source[index++];
                    while (index < length) {
                        ch = source[index];
                        if (!isDecimalDigit(ch)) {
                            break;
                        }
                        number += source[index++];
                    }
                } else {
                    ch = 'character ' + ch;
                    if (index >= length) {
                        ch = '<end>';
                    }
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
            }
    
            if (index < length) {
                ch = source[index];
                if (isIdentifierStart(ch)) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
            }
    
            return {
                type: Token.NumericLiteral,
                value: parseFloat(number),
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }
    
        // 7.8.4 String Literals
    
        function scanStringLiteral() {
            var str = '', quote, start, ch, code, unescaped, restore, octal = false;
    
            quote = source[index];
            assert((quote === '\'' || quote === '"'),
                'String literal must starts with a quote');
    
            start = index;
            ++index;
    
            while (index < length) {
                ch = source[index++];
    
                if (ch === quote) {
                    quote = '';
                    break;
                } else if (ch === '\\') {
                    ch = source[index++];
                    if (!isLineTerminator(ch)) {
                        switch (ch) {
                        case 'n':
                            str += '\n';
                            break;
                        case 'r':
                            str += '\r';
                            break;
                        case 't':
                            str += '\t';
                            break;
                        case 'u':
                        case 'x':
                            restore = index;
                            unescaped = scanHexEscape(ch);
                            if (unescaped) {
                                str += unescaped;
                            } else {
                                index = restore;
                                str += ch;
                            }
                            break;
                        case 'b':
                            str += '\b';
                            break;
                        case 'f':
                            str += '\f';
                            break;
                        case 'v':
                            str += '\x0B';
                            break;
    
                        default:
                            if (isOctalDigit(ch)) {
                                code = '01234567'.indexOf(ch);
    
                                // \0 is not octal escape sequence
                                if (code !== 0) {
                                    octal = true;
                                }
    
                                if (index < length && isOctalDigit(source[index])) {
                                    octal = true;
                                    code = code * 8 + '01234567'.indexOf(source[index++]);
    
                                    // 3 digits are only allowed when string starts
                                    // with 0, 1, 2, 3
                                    if ('0123'.indexOf(ch) >= 0 &&
                                            index < length &&
                                            isOctalDigit(source[index])) {
                                        code = code * 8 + '01234567'.indexOf(source[index++]);
                                    }
                                }
                                str += String.fromCharCode(code);
                            } else {
                                str += ch;
                            }
                            break;
                        }
                    } else {
                        ++lineNumber;
                        if (ch ===  '\r' && source[index] === '\n') {
                            ++index;
                        }
                    }
                } else if (isLineTerminator(ch)) {
                    break;
                } else {
                    str += ch;
                }
            }
    
            if (quote !== '') {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
    
            return {
                type: Token.StringLiteral,
                value: str,
                octal: octal,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }
    
        function scanRegExp() {
            var str, ch, start, pattern, flags, value, classMarker = false, restore, terminated = false;
    
            buffer = null;
            skipComment();
    
            start = index;
            ch = source[index];
            assert(ch === '/', 'Regular expression literal must start with a slash');
            str = source[index++];
    
            while (index < length) {
                ch = source[index++];
                str += ch;
                if (ch === '\\') {
                    ch = source[index++];
                    // ECMA-262 7.8.5
                    if (isLineTerminator(ch)) {
                        throwError({}, Messages.UnterminatedRegExp);
                    }
                    str += ch;
                } else if (classMarker) {
                    if (ch === ']') {
                        classMarker = false;
                    }
                } else {
                    if (ch === '/') {
                        terminated = true;
                        break;
                    } else if (ch === '[') {
                        classMarker = true;
                    } else if (isLineTerminator(ch)) {
                        throwError({}, Messages.UnterminatedRegExp);
                    }
                }
            }
    
            if (!terminated) {
                throwError({}, Messages.UnterminatedRegExp);
            }
    
            // Exclude leading and trailing slash.
            pattern = str.substr(1, str.length - 2);
    
            flags = '';
            while (index < length) {
                ch = source[index];
                if (!isIdentifierPart(ch)) {
                    break;
                }
    
                ++index;
                if (ch === '\\' && index < length) {
                    ch = source[index];
                    if (ch === 'u') {
                        ++index;
                        restore = index;
                        ch = scanHexEscape('u');
                        if (ch) {
                            flags += ch;
                            str += '\\u';
                            for (; restore < index; ++restore) {
                                str += source[restore];
                            }
                        } else {
                            index = restore;
                            flags += 'u';
                            str += '\\u';
                        }
                    } else {
                        str += '\\';
                    }
                } else {
                    flags += ch;
                    str += ch;
                }
            }
    
            try {
                value = new RegExp(pattern, flags);
            } catch (e) {
                throwError({}, Messages.InvalidRegExp);
            }
    
            return {
                literal: str,
                value: value,
                range: [start, index]
            };
        }
    
        function isIdentifierName(token) {
            return token.type === Token.Identifier ||
                token.type === Token.Keyword ||
                token.type === Token.BooleanLiteral ||
                token.type === Token.NullLiteral;
        }
    
        function advance() {
            var ch, token;
    
            skipComment();
    
            if (index >= length) {
                return {
                    type: Token.EOF,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [index, index]
                };
            }
    
            token = scanPunctuator();
            if (typeof token !== 'undefined') {
                return token;
            }
    
            ch = source[index];
    
            if (ch === '\'' || ch === '"') {
                return scanStringLiteral();
            }
    
            if (ch === '.' || isDecimalDigit(ch)) {
                return scanNumericLiteral();
            }
    
            token = scanIdentifier();
            if (typeof token !== 'undefined') {
                return token;
            }
    
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
    
        function lex() {
            var token;
    
            if (buffer) {
                index = buffer.range[1];
                lineNumber = buffer.lineNumber;
                lineStart = buffer.lineStart;
                token = buffer;
                buffer = null;
                return token;
            }
    
            buffer = null;
            return advance();
        }
    
        function lookahead() {
            var pos, line, start;
    
            if (buffer !== null) {
                return buffer;
            }
    
            pos = index;
            line = lineNumber;
            start = lineStart;
            buffer = advance();
            index = pos;
            lineNumber = line;
            lineStart = start;
    
            return buffer;
        }
    
        // Return true if there is a line terminator before the next token.
    
        function peekLineTerminator() {
            var pos, line, start, found;
    
            pos = index;
            line = lineNumber;
            start = lineStart;
            skipComment();
            found = lineNumber !== line;
            index = pos;
            lineNumber = line;
            lineStart = start;
    
            return found;
        }
    
        // Throw an exception
    
        function throwError(token, messageFormat) {
            var error,
                args = Array.prototype.slice.call(arguments, 2),
                msg = messageFormat.replace(
                    /%(\d)/g,
                    function (whole, index) {
                        return args[index] || '';
                    }
                );
    
            if (typeof token.lineNumber === 'number') {
                error = new Error('Line ' + token.lineNumber + ': ' + msg);
                error.index = token.range[0];
                error.lineNumber = token.lineNumber;
                error.column = token.range[0] - lineStart + 1;
            } else {
                error = new Error('Line ' + lineNumber + ': ' + msg);
                error.index = index;
                error.lineNumber = lineNumber;
                error.column = index - lineStart + 1;
            }
    
            throw error;
        }
    
        function throwErrorTolerant() {
            try {
                throwError.apply(null, arguments);
            } catch (e) {
                if (extra.errors) {
                    extra.errors.push(e);
                } else {
                    throw e;
                }
            }
        }
    
    
        // Throw an exception because of the token.
    
        function throwUnexpected(token) {
            if (token.type === Token.EOF) {
                throwError(token, Messages.UnexpectedEOS);
            }
    
            if (token.type === Token.NumericLiteral) {
                throwError(token, Messages.UnexpectedNumber);
            }
    
            if (token.type === Token.StringLiteral) {
                throwError(token, Messages.UnexpectedString);
            }
    
            if (token.type === Token.Identifier) {
                throwError(token, Messages.UnexpectedIdentifier);
            }
    
            if (token.type === Token.Keyword) {
                if (isFutureReservedWord(token.value)) {
                    throwError(token, Messages.UnexpectedReserved);
                } else if (strict && isStrictModeReservedWord(token.value)) {
                    throwErrorTolerant(token, Messages.StrictReservedWord);
                    return;
                }
                throwError(token, Messages.UnexpectedToken, token.value);
            }
    
            // BooleanLiteral, NullLiteral, or Punctuator.
            throwError(token, Messages.UnexpectedToken, token.value);
        }
    
        // Expect the next token to match the specified punctuator.
        // If not, an exception will be thrown.
    
        function expect(value) {
            var token = lex();
            if (token.type !== Token.Punctuator || token.value !== value) {
                throwUnexpected(token);
            }
        }
    
        // Expect the next token to match the specified keyword.
        // If not, an exception will be thrown.
    
        function expectKeyword(keyword) {
            var token = lex();
            if (token.type !== Token.Keyword || token.value !== keyword) {
                throwUnexpected(token);
            }
        }
    
        // Return true if the next token matches the specified punctuator.
    
        function match(value) {
            var token = lookahead();
            return token.type === Token.Punctuator && token.value === value;
        }
    
        // Return true if the next token matches the specified keyword
    
        function matchKeyword(keyword) {
            var token = lookahead();
            return token.type === Token.Keyword && token.value === keyword;
        }
    
        // Return true if the next token is an assignment operator
    
        function matchAssign() {
            var token = lookahead(),
                op = token.value;
    
            if (token.type !== Token.Punctuator) {
                return false;
            }
            return op === '=' ||
                op === '*=' ||
                op === '/=' ||
                op === '%=' ||
                op === '+=' ||
                op === '-=' ||
                op === '<<=' ||
                op === '>>=' ||
                op === '>>>=' ||
                op === '&=' ||
                op === '^=' ||
                op === '|=';
        }
    
        function consumeSemicolon() {
            var token, line;
    
            // Catch the very common case first.
            if (source[index] === ';') {
                lex();
                return;
            }
    
            line = lineNumber;
            skipComment();
            if (lineNumber !== line) {
                return;
            }
    
            if (match(';')) {
                lex();
                return;
            }
    
            token = lookahead();
            if (token.type !== Token.EOF && !match('}')) {
                throwUnexpected(token);
            }
        }
    
        // Return true if provided expression is LeftHandSideExpression
    
        function isLeftHandSide(expr) {
            return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
        }
    
        // 11.1.4 Array Initialiser
    
        function parseArrayInitialiser() {
            var elements = [];
    
            expect('[');
    
            while (!match(']')) {
                if (match(',')) {
                    lex();
                    elements.push(null);
                } else {
                    elements.push(parseAssignmentExpression());
    
                    if (!match(']')) {
                        expect(',');
                    }
                }
            }
    
            expect(']');
    
            return {
                type: Syntax.ArrayExpression,
                elements: elements
            };
        }
    
        // 11.1.5 Object Initialiser
    
        function parsePropertyFunction(param, first) {
            var previousStrict, body;
    
            previousStrict = strict;
            body = parseFunctionSourceElements();
            if (first && strict && isRestrictedWord(param[0].name)) {
                throwErrorTolerant(first, Messages.StrictParamName);
            }
            strict = previousStrict;
    
            return {
                type: Syntax.FunctionExpression,
                id: null,
                params: param,
                defaults: [],
                body: body,
                rest: null,
                generator: false,
                expression: false
            };
        }
    
        function parseObjectPropertyKey() {
            var token = lex();
    
            // Note: This function is called only from parseObjectProperty(), where
            // EOF and Punctuator tokens are already filtered out.
    
            if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
                if (strict && token.octal) {
                    throwErrorTolerant(token, Messages.StrictOctalLiteral);
                }
                return createLiteral(token);
            }
    
            return {
                type: Syntax.Identifier,
                name: token.value
            };
        }
    
        function parseObjectProperty() {
            var token, key, id, param;
    
            token = lookahead();
    
            if (token.type === Token.Identifier) {
    
                id = parseObjectPropertyKey();
    
                // Property Assignment: Getter and Setter.
    
                if (token.value === 'get' && !match(':')) {
                    key = parseObjectPropertyKey();
                    expect('(');
                    expect(')');
                    return {
                        type: Syntax.Property,
                        key: key,
                        value: parsePropertyFunction([]),
                        kind: 'get'
                    };
                } else if (token.value === 'set' && !match(':')) {
                    key = parseObjectPropertyKey();
                    expect('(');
                    token = lookahead();
                    if (token.type !== Token.Identifier) {
                        expect(')');
                        throwErrorTolerant(token, Messages.UnexpectedToken, token.value);
                        return {
                            type: Syntax.Property,
                            key: key,
                            value: parsePropertyFunction([]),
                            kind: 'set'
                        };
                    } else {
                        param = [ parseVariableIdentifier() ];
                        expect(')');
                        return {
                            type: Syntax.Property,
                            key: key,
                            value: parsePropertyFunction(param, token),
                            kind: 'set'
                        };
                    }
                } else {
                    expect(':');
                    return {
                        type: Syntax.Property,
                        key: id,
                        value: parseAssignmentExpression(),
                        kind: 'init'
                    };
                }
            } else if (token.type === Token.EOF || token.type === Token.Punctuator) {
                throwUnexpected(token);
            } else {
                key = parseObjectPropertyKey();
                expect(':');
                return {
                    type: Syntax.Property,
                    key: key,
                    value: parseAssignmentExpression(),
                    kind: 'init'
                };
            }
        }
    
        function parseObjectInitialiser() {
            var properties = [], property, name, kind, map = {}, toString = String;
    
            expect('{');
    
            while (!match('}')) {
                property = parseObjectProperty();
    
                if (property.key.type === Syntax.Identifier) {
                    name = property.key.name;
                } else {
                    name = toString(property.key.value);
                }
                kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;
                if (Object.prototype.hasOwnProperty.call(map, name)) {
                    if (map[name] === PropertyKind.Data) {
                        if (strict && kind === PropertyKind.Data) {
                            throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                        } else if (kind !== PropertyKind.Data) {
                            throwErrorTolerant({}, Messages.AccessorDataProperty);
                        }
                    } else {
                        if (kind === PropertyKind.Data) {
                            throwErrorTolerant({}, Messages.AccessorDataProperty);
                        } else if (map[name] & kind) {
                            throwErrorTolerant({}, Messages.AccessorGetSet);
                        }
                    }
                    map[name] |= kind;
                } else {
                    map[name] = kind;
                }
    
                properties.push(property);
    
                if (!match('}')) {
                    expect(',');
                }
            }
    
            expect('}');
    
            return {
                type: Syntax.ObjectExpression,
                properties: properties
            };
        }
    
        // 11.1.6 The Grouping Operator
    
        function parseGroupExpression() {
            var expr;
    
            expect('(');
    
            expr = parseExpression();
    
            expect(')');
    
            return expr;
        }
    
    
        // 11.1 Primary Expressions
    
        function parsePrimaryExpression() {
            var token = lookahead(),
                type = token.type;
    
            if (type === Token.Identifier) {
                return {
                    type: Syntax.Identifier,
                    name: lex().value
                };
            }
    
            if (type === Token.StringLiteral || type === Token.NumericLiteral) {
                if (strict && token.octal) {
                    throwErrorTolerant(token, Messages.StrictOctalLiteral);
                }
                return createLiteral(lex());
            }
    
            if (type === Token.Keyword) {
                if (matchKeyword('this')) {
                    lex();
                    return {
                        type: Syntax.ThisExpression
                    };
                }
    
                if (matchKeyword('function')) {
                    return parseFunctionExpression();
                }
            }
    
            if (type === Token.BooleanLiteral) {
                lex();
                token.value = (token.value === 'true');
                return createLiteral(token);
            }
    
            if (type === Token.NullLiteral) {
                lex();
                token.value = null;
                return createLiteral(token);
            }
    
            if (match('[')) {
                return parseArrayInitialiser();
            }
    
            if (match('{')) {
                return parseObjectInitialiser();
            }
    
            if (match('(')) {
                return parseGroupExpression();
            }
    
            if (match('/') || match('/=')) {
                return createLiteral(scanRegExp());
            }
    
            return throwUnexpected(lex());
        }
    
        // 11.2 Left-Hand-Side Expressions
    
        function parseArguments() {
            var args = [];
    
            expect('(');
    
            if (!match(')')) {
                while (index < length) {
                    args.push(parseAssignmentExpression());
                    if (match(')')) {
                        break;
                    }
                    expect(',');
                }
            }
    
            expect(')');
    
            return args;
        }
    
        function parseNonComputedProperty() {
            var token = lex();
    
            if (!isIdentifierName(token)) {
                throwUnexpected(token);
            }
    
            return {
                type: Syntax.Identifier,
                name: token.value
            };
        }
    
        function parseNonComputedMember() {
            expect('.');
    
            return parseNonComputedProperty();
        }
    
        function parseComputedMember() {
            var expr;
    
            expect('[');
    
            expr = parseExpression();
    
            expect(']');
    
            return expr;
        }
    
        function parseNewExpression() {
            var expr;
    
            expectKeyword('new');
    
            expr = {
                type: Syntax.NewExpression,
                callee: parseLeftHandSideExpression(),
                'arguments': []
            };
    
            if (match('(')) {
                expr['arguments'] = parseArguments();
            }
    
            return expr;
        }
    
        function parseLeftHandSideExpressionAllowCall() {
            var expr;
    
            expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
    
            while (match('.') || match('[') || match('(')) {
                if (match('(')) {
                    expr = {
                        type: Syntax.CallExpression,
                        callee: expr,
                        'arguments': parseArguments()
                    };
                } else if (match('[')) {
                    expr = {
                        type: Syntax.MemberExpression,
                        computed: true,
                        object: expr,
                        property: parseComputedMember()
                    };
                } else {
                    expr = {
                        type: Syntax.MemberExpression,
                        computed: false,
                        object: expr,
                        property: parseNonComputedMember()
                    };
                }
            }
    
            return expr;
        }
    
    
        function parseLeftHandSideExpression() {
            var expr;
    
            expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
    
            while (match('.') || match('[')) {
                if (match('[')) {
                    expr = {
                        type: Syntax.MemberExpression,
                        computed: true,
                        object: expr,
                        property: parseComputedMember()
                    };
                } else {
                    expr = {
                        type: Syntax.MemberExpression,
                        computed: false,
                        object: expr,
                        property: parseNonComputedMember()
                    };
                }
            }
    
            return expr;
        }
    
        // 11.3 Postfix Expressions
    
        function parsePostfixExpression() {
            var expr = parseLeftHandSideExpressionAllowCall(), token;
    
            token = lookahead();
            if (token.type !== Token.Punctuator) {
                return expr;
            }
    
            if ((match('++') || match('--')) && !peekLineTerminator()) {
                // 11.3.1, 11.3.2
                if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                    throwErrorTolerant({}, Messages.StrictLHSPostfix);
                }
                if (!isLeftHandSide(expr)) {
                    throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
                }
    
                expr = {
                    type: Syntax.UpdateExpression,
                    operator: lex().value,
                    argument: expr,
                    prefix: false
                };
            }
    
            return expr;
        }
    
        // 11.4 Unary Operators
    
        function parseUnaryExpression() {
            var token, expr;
    
            token = lookahead();
            if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
                return parsePostfixExpression();
            }
    
            if (match('++') || match('--')) {
                token = lex();
                expr = parseUnaryExpression();
                // 11.4.4, 11.4.5
                if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                    throwErrorTolerant({}, Messages.StrictLHSPrefix);
                }
    
                if (!isLeftHandSide(expr)) {
                    throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
                }
    
                expr = {
                    type: Syntax.UpdateExpression,
                    operator: token.value,
                    argument: expr,
                    prefix: true
                };
                return expr;
            }
    
            if (match('+') || match('-') || match('~') || match('!')) {
                expr = {
                    type: Syntax.UnaryExpression,
                    operator: lex().value,
                    argument: parseUnaryExpression(),
                    prefix: true
                };
                return expr;
            }
    
            if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
                expr = {
                    type: Syntax.UnaryExpression,
                    operator: lex().value,
                    argument: parseUnaryExpression(),
                    prefix: true
                };
                if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                    throwErrorTolerant({}, Messages.StrictDelete);
                }
                return expr;
            }
    
            return parsePostfixExpression();
        }
    
        // 11.5 Multiplicative Operators
    
        function parseMultiplicativeExpression() {
            var expr = parseUnaryExpression();
    
            while (match('*') || match('/') || match('%')) {
                expr = {
                    type: Syntax.BinaryExpression,
                    operator: lex().value,
                    left: expr,
                    right: parseUnaryExpression()
                };
            }
    
            return expr;
        }
    
        // 11.6 Additive Operators
    
        function parseAdditiveExpression() {
            var expr = parseMultiplicativeExpression();
    
            while (match('+') || match('-')) {
                expr = {
                    type: Syntax.BinaryExpression,
                    operator: lex().value,
                    left: expr,
                    right: parseMultiplicativeExpression()
                };
            }
    
            return expr;
        }
    
        // 11.7 Bitwise Shift Operators
    
        function parseShiftExpression() {
            var expr = parseAdditiveExpression();
    
            while (match('<<') || match('>>') || match('>>>')) {
                expr = {
                    type: Syntax.BinaryExpression,
                    operator: lex().value,
                    left: expr,
                    right: parseAdditiveExpression()
                };
            }
    
            return expr;
        }
        // 11.8 Relational Operators
    
        function parseRelationalExpression() {
            var expr, previousAllowIn;
    
            previousAllowIn = state.allowIn;
            state.allowIn = true;
    
            expr = parseShiftExpression();
    
            while (match('<') || match('>') || match('<=') || match('>=') || (previousAllowIn && matchKeyword('in')) || matchKeyword('instanceof')) {
                expr = {
                    type: Syntax.BinaryExpression,
                    operator: lex().value,
                    left: expr,
                    right: parseShiftExpression()
                };
            }
    
            state.allowIn = previousAllowIn;
            return expr;
        }
    
        // 11.9 Equality Operators
    
        function parseEqualityExpression() {
            var expr = parseRelationalExpression();
    
            while (match('==') || match('!=') || match('===') || match('!==')) {
                expr = {
                    type: Syntax.BinaryExpression,
                    operator: lex().value,
                    left: expr,
                    right: parseRelationalExpression()
                };
            }
    
            return expr;
        }
    
        // 11.10 Binary Bitwise Operators
    
        function parseBitwiseANDExpression() {
            var expr = parseEqualityExpression();
    
            while (match('&')) {
                lex();
                expr = {
                    type: Syntax.BinaryExpression,
                    operator: '&',
                    left: expr,
                    right: parseEqualityExpression()
                };
            }
    
            return expr;
        }
    
        function parseBitwiseXORExpression() {
            var expr = parseBitwiseANDExpression();
    
            while (match('^')) {
                lex();
                expr = {
                    type: Syntax.BinaryExpression,
                    operator: '^',
                    left: expr,
                    right: parseBitwiseANDExpression()
                };
            }
    
            return expr;
        }
    
        function parseBitwiseORExpression() {
            var expr = parseBitwiseXORExpression();
    
            while (match('|')) {
                lex();
                expr = {
                    type: Syntax.BinaryExpression,
                    operator: '|',
                    left: expr,
                    right: parseBitwiseXORExpression()
                };
            }
    
            return expr;
        }
    
        // 11.11 Binary Logical Operators
    
        function parseLogicalANDExpression() {
            var expr = parseBitwiseORExpression();
    
            while (match('&&')) {
                lex();
                expr = {
                    type: Syntax.LogicalExpression,
                    operator: '&&',
                    left: expr,
                    right: parseBitwiseORExpression()
                };
            }
    
            return expr;
        }
    
        function parseLogicalORExpression() {
            var expr = parseLogicalANDExpression();
    
            while (match('||')) {
                lex();
                expr = {
                    type: Syntax.LogicalExpression,
                    operator: '||',
                    left: expr,
                    right: parseLogicalANDExpression()
                };
            }
    
            return expr;
        }
    
        // 11.12 Conditional Operator
    
        function parseConditionalExpression() {
            var expr, previousAllowIn, consequent;
    
            expr = parseLogicalORExpression();
    
            if (match('?')) {
                lex();
                previousAllowIn = state.allowIn;
                state.allowIn = true;
                consequent = parseAssignmentExpression();
                state.allowIn = previousAllowIn;
                expect(':');
    
                expr = {
                    type: Syntax.ConditionalExpression,
                    test: expr,
                    consequent: consequent,
                    alternate: parseAssignmentExpression()
                };
            }
    
            return expr;
        }
    
        // 11.13 Assignment Operators
    
        function parseAssignmentExpression() {
            var token, expr;
    
            token = lookahead();
            expr = parseConditionalExpression();
    
            if (matchAssign()) {
                // LeftHandSideExpression
                if (!isLeftHandSide(expr)) {
                    throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
                }
    
                // 11.13.1
                if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                    throwErrorTolerant(token, Messages.StrictLHSAssignment);
                }
    
                expr = {
                    type: Syntax.AssignmentExpression,
                    operator: lex().value,
                    left: expr,
                    right: parseAssignmentExpression()
                };
            }
    
            return expr;
        }
    
        // 11.14 Comma Operator
    
        function parseExpression() {
            var expr = parseAssignmentExpression();
    
            if (match(',')) {
                expr = {
                    type: Syntax.SequenceExpression,
                    expressions: [ expr ]
                };
    
                while (index < length) {
                    if (!match(',')) {
                        break;
                    }
                    lex();
                    expr.expressions.push(parseAssignmentExpression());
                }
    
            }
            return expr;
        }
    
        // 12.1 Block
    
        function parseStatementList() {
            var list = [],
                statement;
    
            while (index < length) {
                if (match('}')) {
                    break;
                }
                statement = parseSourceElement();
                if (typeof statement === 'undefined') {
                    break;
                }
                list.push(statement);
            }
    
            return list;
        }
    
        function parseBlock() {
            var block;
    
            expect('{');
    
            block = parseStatementList();
    
            expect('}');
    
            return {
                type: Syntax.BlockStatement,
                body: block
            };
        }
    
        // 12.2 Variable Statement
    
        function parseVariableIdentifier() {
            var token = lex();
    
            if (token.type !== Token.Identifier) {
                throwUnexpected(token);
            }
    
            return {
                type: Syntax.Identifier,
                name: token.value
            };
        }
    
        function parseVariableDeclaration(kind) {
            var id = parseVariableIdentifier(),
                init = null;
    
            // 12.2.1
            if (strict && isRestrictedWord(id.name)) {
                throwErrorTolerant({}, Messages.StrictVarName);
            }
    
            if (kind === 'const') {
                expect('=');
                init = parseAssignmentExpression();
            } else if (match('=')) {
                lex();
                init = parseAssignmentExpression();
            }
    
            return {
                type: Syntax.VariableDeclarator,
                id: id,
                init: init
            };
        }
    
        function parseVariableDeclarationList(kind) {
            var list = [];
    
            do {
                list.push(parseVariableDeclaration(kind));
                if (!match(',')) {
                    break;
                }
                lex();
            } while (index < length);
    
            return list;
        }
    
        function parseVariableStatement() {
            var declarations;
    
            expectKeyword('var');
    
            declarations = parseVariableDeclarationList();
    
            consumeSemicolon();
    
            return {
                type: Syntax.VariableDeclaration,
                declarations: declarations,
                kind: 'var'
            };
        }
    
        // kind may be `const` or `let`
        // Both are experimental and not in the specification yet.
        // see http://wiki.ecmascript.org/doku.php?id=harmony:const
        // and http://wiki.ecmascript.org/doku.php?id=harmony:let
        function parseConstLetDeclaration(kind) {
            var declarations;
    
            expectKeyword(kind);
    
            declarations = parseVariableDeclarationList(kind);
    
            consumeSemicolon();
    
            return {
                type: Syntax.VariableDeclaration,
                declarations: declarations,
                kind: kind
            };
        }
    
        // 12.3 Empty Statement
    
        function parseEmptyStatement() {
            expect(';');
    
            return {
                type: Syntax.EmptyStatement
            };
        }
    
        // 12.4 Expression Statement
    
        function parseExpressionStatement() {
            var expr = parseExpression();
    
            consumeSemicolon();
    
            return {
                type: Syntax.ExpressionStatement,
                expression: expr
            };
        }
    
        // 12.5 If statement
    
        function parseIfStatement() {
            var test, consequent, alternate;
    
            expectKeyword('if');
    
            expect('(');
    
            test = parseExpression();
    
            expect(')');
    
            consequent = parseStatement();
    
            if (matchKeyword('else')) {
                lex();
                alternate = parseStatement();
            } else {
                alternate = null;
            }
    
            return {
                type: Syntax.IfStatement,
                test: test,
                consequent: consequent,
                alternate: alternate
            };
        }
    
        // 12.6 Iteration Statements
    
        function parseDoWhileStatement() {
            var body, test, oldInIteration;
    
            expectKeyword('do');
    
            oldInIteration = state.inIteration;
            state.inIteration = true;
    
            body = parseStatement();
    
            state.inIteration = oldInIteration;
    
            expectKeyword('while');
    
            expect('(');
    
            test = parseExpression();
    
            expect(')');
    
            if (match(';')) {
                lex();
            }
    
            return {
                type: Syntax.DoWhileStatement,
                body: body,
                test: test
            };
        }
    
        function parseWhileStatement() {
            var test, body, oldInIteration;
    
            expectKeyword('while');
    
            expect('(');
    
            test = parseExpression();
    
            expect(')');
    
            oldInIteration = state.inIteration;
            state.inIteration = true;
    
            body = parseStatement();
    
            state.inIteration = oldInIteration;
    
            return {
                type: Syntax.WhileStatement,
                test: test,
                body: body
            };
        }
    
        function parseForVariableDeclaration() {
            var token = lex();
    
            return {
                type: Syntax.VariableDeclaration,
                declarations: parseVariableDeclarationList(),
                kind: token.value
            };
        }
    
        function parseForStatement() {
            var init, test, update, left, right, body, oldInIteration;
    
            init = test = update = null;
    
            expectKeyword('for');
    
            expect('(');
    
            if (match(';')) {
                lex();
            } else {
                if (matchKeyword('var') || matchKeyword('let')) {
                    state.allowIn = false;
                    init = parseForVariableDeclaration();
                    state.allowIn = true;
    
                    if (init.declarations.length === 1 && matchKeyword('in')) {
                        lex();
                        left = init;
                        right = parseExpression();
                        init = null;
                    }
                } else {
                    state.allowIn = false;
                    init = parseExpression();
                    state.allowIn = true;
    
                    if (matchKeyword('in')) {
                        // LeftHandSideExpression
                        if (!isLeftHandSide(init)) {
                            throwErrorTolerant({}, Messages.InvalidLHSInForIn);
                        }
    
                        lex();
                        left = init;
                        right = parseExpression();
                        init = null;
                    }
                }
    
                if (typeof left === 'undefined') {
                    expect(';');
                }
            }
    
            if (typeof left === 'undefined') {
    
                if (!match(';')) {
                    test = parseExpression();
                }
                expect(';');
    
                if (!match(')')) {
                    update = parseExpression();
                }
            }
    
            expect(')');
    
            oldInIteration = state.inIteration;
            state.inIteration = true;
    
            body = parseStatement();
    
            state.inIteration = oldInIteration;
    
            if (typeof left === 'undefined') {
                return {
                    type: Syntax.ForStatement,
                    init: init,
                    test: test,
                    update: update,
                    body: body
                };
            }
    
            return {
                type: Syntax.ForInStatement,
                left: left,
                right: right,
                body: body,
                each: false
            };
        }
    
        // 12.7 The continue statement
    
        function parseContinueStatement() {
            var token, label = null;
    
            expectKeyword('continue');
    
            // Optimize the most common form: 'continue;'.
            if (source[index] === ';') {
                lex();
    
                if (!state.inIteration) {
                    throwError({}, Messages.IllegalContinue);
                }
    
                return {
                    type: Syntax.ContinueStatement,
                    label: null
                };
            }
    
            if (peekLineTerminator()) {
                if (!state.inIteration) {
                    throwError({}, Messages.IllegalContinue);
                }
    
                return {
                    type: Syntax.ContinueStatement,
                    label: null
                };
            }
    
            token = lookahead();
            if (token.type === Token.Identifier) {
                label = parseVariableIdentifier();
    
                if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                    throwError({}, Messages.UnknownLabel, label.name);
                }
            }
    
            consumeSemicolon();
    
            if (label === null && !state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }
    
            return {
                type: Syntax.ContinueStatement,
                label: label
            };
        }
    
        // 12.8 The break statement
    
        function parseBreakStatement() {
            var token, label = null;
    
            expectKeyword('break');
    
            // Optimize the most common form: 'break;'.
            if (source[index] === ';') {
                lex();
    
                if (!(state.inIteration || state.inSwitch)) {
                    throwError({}, Messages.IllegalBreak);
                }
    
                return {
                    type: Syntax.BreakStatement,
                    label: null
                };
            }
    
            if (peekLineTerminator()) {
                if (!(state.inIteration || state.inSwitch)) {
                    throwError({}, Messages.IllegalBreak);
                }
    
                return {
                    type: Syntax.BreakStatement,
                    label: null
                };
            }
    
            token = lookahead();
            if (token.type === Token.Identifier) {
                label = parseVariableIdentifier();
    
                if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                    throwError({}, Messages.UnknownLabel, label.name);
                }
            }
    
            consumeSemicolon();
    
            if (label === null && !(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }
    
            return {
                type: Syntax.BreakStatement,
                label: label
            };
        }
    
        // 12.9 The return statement
    
        function parseReturnStatement() {
            var token, argument = null;
    
            expectKeyword('return');
    
            if (!state.inFunctionBody) {
                throwErrorTolerant({}, Messages.IllegalReturn);
            }
    
            // 'return' followed by a space and an identifier is very common.
            if (source[index] === ' ') {
                if (isIdentifierStart(source[index + 1])) {
                    argument = parseExpression();
                    consumeSemicolon();
                    return {
                        type: Syntax.ReturnStatement,
                        argument: argument
                    };
                }
            }
    
            if (peekLineTerminator()) {
                return {
                    type: Syntax.ReturnStatement,
                    argument: null
                };
            }
    
            if (!match(';')) {
                token = lookahead();
                if (!match('}') && token.type !== Token.EOF) {
                    argument = parseExpression();
                }
            }
    
            consumeSemicolon();
    
            return {
                type: Syntax.ReturnStatement,
                argument: argument
            };
        }
    
        // 12.10 The with statement
    
        function parseWithStatement() {
            var object, body;
    
            if (strict) {
                throwErrorTolerant({}, Messages.StrictModeWith);
            }
    
            expectKeyword('with');
    
            expect('(');
    
            object = parseExpression();
    
            expect(')');
    
            body = parseStatement();
    
            return {
                type: Syntax.WithStatement,
                object: object,
                body: body
            };
        }
    
        // 12.10 The swith statement
    
        function parseSwitchCase() {
            var test,
                consequent = [],
                statement;
    
            if (matchKeyword('default')) {
                lex();
                test = null;
            } else {
                expectKeyword('case');
                test = parseExpression();
            }
            expect(':');
    
            while (index < length) {
                if (match('}') || matchKeyword('default') || matchKeyword('case')) {
                    break;
                }
                statement = parseStatement();
                if (typeof statement === 'undefined') {
                    break;
                }
                consequent.push(statement);
            }
    
            return {
                type: Syntax.SwitchCase,
                test: test,
                consequent: consequent
            };
        }
    
        function parseSwitchStatement() {
            var discriminant, cases, clause, oldInSwitch, defaultFound;
    
            expectKeyword('switch');
    
            expect('(');
    
            discriminant = parseExpression();
    
            expect(')');
    
            expect('{');
    
            cases = [];
    
            if (match('}')) {
                lex();
                return {
                    type: Syntax.SwitchStatement,
                    discriminant: discriminant,
                    cases: cases
                };
            }
    
            oldInSwitch = state.inSwitch;
            state.inSwitch = true;
            defaultFound = false;
    
            while (index < length) {
                if (match('}')) {
                    break;
                }
                clause = parseSwitchCase();
                if (clause.test === null) {
                    if (defaultFound) {
                        throwError({}, Messages.MultipleDefaultsInSwitch);
                    }
                    defaultFound = true;
                }
                cases.push(clause);
            }
    
            state.inSwitch = oldInSwitch;
    
            expect('}');
    
            return {
                type: Syntax.SwitchStatement,
                discriminant: discriminant,
                cases: cases
            };
        }
    
        // 12.13 The throw statement
    
        function parseThrowStatement() {
            var argument;
    
            expectKeyword('throw');
    
            if (peekLineTerminator()) {
                throwError({}, Messages.NewlineAfterThrow);
            }
    
            argument = parseExpression();
    
            consumeSemicolon();
    
            return {
                type: Syntax.ThrowStatement,
                argument: argument
            };
        }
    
        // 12.14 The try statement
    
        function parseCatchClause() {
            var param;
    
            expectKeyword('catch');
    
            expect('(');
            if (match(')')) {
                throwUnexpected(lookahead());
            }
    
            param = parseVariableIdentifier();
            // 12.14.1
            if (strict && isRestrictedWord(param.name)) {
                throwErrorTolerant({}, Messages.StrictCatchVariable);
            }
    
            expect(')');
    
            return {
                type: Syntax.CatchClause,
                param: param,
                body: parseBlock()
            };
        }
    
        function parseTryStatement() {
            var block, handlers = [], finalizer = null;
    
            expectKeyword('try');
    
            block = parseBlock();
    
            if (matchKeyword('catch')) {
                handlers.push(parseCatchClause());
            }
    
            if (matchKeyword('finally')) {
                lex();
                finalizer = parseBlock();
            }
    
            if (handlers.length === 0 && !finalizer) {
                throwError({}, Messages.NoCatchOrFinally);
            }
    
            return {
                type: Syntax.TryStatement,
                block: block,
                guardedHandlers: [],
                handlers: handlers,
                finalizer: finalizer
            };
        }
    
        // 12.15 The debugger statement
    
        function parseDebuggerStatement() {
            expectKeyword('debugger');
    
            consumeSemicolon();
    
            return {
                type: Syntax.DebuggerStatement
            };
        }
    
        // 12 Statements
    
        function parseStatement() {
            var token = lookahead(),
                expr,
                labeledBody;
    
            if (token.type === Token.EOF) {
                throwUnexpected(token);
            }
    
            if (token.type === Token.Punctuator) {
                switch (token.value) {
                case ';':
                    return parseEmptyStatement();
                case '{':
                    return parseBlock();
                case '(':
                    return parseExpressionStatement();
                default:
                    break;
                }
            }
    
            if (token.type === Token.Keyword) {
                switch (token.value) {
                case 'break':
                    return parseBreakStatement();
                case 'continue':
                    return parseContinueStatement();
                case 'debugger':
                    return parseDebuggerStatement();
                case 'do':
                    return parseDoWhileStatement();
                case 'for':
                    return parseForStatement();
                case 'function':
                    return parseFunctionDeclaration();
                case 'if':
                    return parseIfStatement();
                case 'return':
                    return parseReturnStatement();
                case 'switch':
                    return parseSwitchStatement();
                case 'throw':
                    return parseThrowStatement();
                case 'try':
                    return parseTryStatement();
                case 'var':
                    return parseVariableStatement();
                case 'while':
                    return parseWhileStatement();
                case 'with':
                    return parseWithStatement();
                default:
                    break;
                }
            }
    
            expr = parseExpression();
    
            // 12.12 Labelled Statements
            if ((expr.type === Syntax.Identifier) && match(':')) {
                lex();
    
                if (Object.prototype.hasOwnProperty.call(state.labelSet, expr.name)) {
                    throwError({}, Messages.Redeclaration, 'Label', expr.name);
                }
    
                state.labelSet[expr.name] = true;
                labeledBody = parseStatement();
                delete state.labelSet[expr.name];
    
                return {
                    type: Syntax.LabeledStatement,
                    label: expr,
                    body: labeledBody
                };
            }
    
            consumeSemicolon();
    
            return {
                type: Syntax.ExpressionStatement,
                expression: expr
            };
        }
    
        // 13 Function Definition
    
        function parseFunctionSourceElements() {
            var sourceElement, sourceElements = [], token, directive, firstRestricted,
                oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody;
    
            expect('{');
    
            while (index < length) {
                token = lookahead();
                if (token.type !== Token.StringLiteral) {
                    break;
                }
    
                sourceElement = parseSourceElement();
                sourceElements.push(sourceElement);
                if (sourceElement.expression.type !== Syntax.Literal) {
                    // this is not directive
                    break;
                }
                directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
                if (directive === 'use strict') {
                    strict = true;
                    if (firstRestricted) {
                        throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                    }
                } else {
                    if (!firstRestricted && token.octal) {
                        firstRestricted = token;
                    }
                }
            }
    
            oldLabelSet = state.labelSet;
            oldInIteration = state.inIteration;
            oldInSwitch = state.inSwitch;
            oldInFunctionBody = state.inFunctionBody;
    
            state.labelSet = {};
            state.inIteration = false;
            state.inSwitch = false;
            state.inFunctionBody = true;
    
            while (index < length) {
                if (match('}')) {
                    break;
                }
                sourceElement = parseSourceElement();
                if (typeof sourceElement === 'undefined') {
                    break;
                }
                sourceElements.push(sourceElement);
            }
    
            expect('}');
    
            state.labelSet = oldLabelSet;
            state.inIteration = oldInIteration;
            state.inSwitch = oldInSwitch;
            state.inFunctionBody = oldInFunctionBody;
    
            return {
                type: Syntax.BlockStatement,
                body: sourceElements
            };
        }
    
        function parseFunctionDeclaration() {
            var id, param, params = [], body, token, stricted, firstRestricted, message, previousStrict, paramSet;
    
            expectKeyword('function');
            token = lookahead();
            id = parseVariableIdentifier();
            if (strict) {
                if (isRestrictedWord(token.value)) {
                    throwErrorTolerant(token, Messages.StrictFunctionName);
                }
            } else {
                if (isRestrictedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictFunctionName;
                } else if (isStrictModeReservedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictReservedWord;
                }
            }
    
            expect('(');
    
            if (!match(')')) {
                paramSet = {};
                while (index < length) {
                    token = lookahead();
                    param = parseVariableIdentifier();
                    if (strict) {
                        if (isRestrictedWord(token.value)) {
                            stricted = token;
                            message = Messages.StrictParamName;
                        }
                        if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                            stricted = token;
                            message = Messages.StrictParamDupe;
                        }
                    } else if (!firstRestricted) {
                        if (isRestrictedWord(token.value)) {
                            firstRestricted = token;
                            message = Messages.StrictParamName;
                        } else if (isStrictModeReservedWord(token.value)) {
                            firstRestricted = token;
                            message = Messages.StrictReservedWord;
                        } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                            firstRestricted = token;
                            message = Messages.StrictParamDupe;
                        }
                    }
                    params.push(param);
                    paramSet[param.name] = true;
                    if (match(')')) {
                        break;
                    }
                    expect(',');
                }
            }
    
            expect(')');
    
            previousStrict = strict;
            body = parseFunctionSourceElements();
            if (strict && firstRestricted) {
                throwError(firstRestricted, message);
            }
            if (strict && stricted) {
                throwErrorTolerant(stricted, message);
            }
            strict = previousStrict;
    
            return {
                type: Syntax.FunctionDeclaration,
                id: id,
                params: params,
                defaults: [],
                body: body,
                rest: null,
                generator: false,
                expression: false
            };
        }
    
        function parseFunctionExpression() {
            var token, id = null, stricted, firstRestricted, message, param, params = [], body, previousStrict, paramSet;
    
            expectKeyword('function');
    
            if (!match('(')) {
                token = lookahead();
                id = parseVariableIdentifier();
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        throwErrorTolerant(token, Messages.StrictFunctionName);
                    }
                } else {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictFunctionName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    }
                }
            }
    
            expect('(');
    
            if (!match(')')) {
                paramSet = {};
                while (index < length) {
                    token = lookahead();
                    param = parseVariableIdentifier();
                    if (strict) {
                        if (isRestrictedWord(token.value)) {
                            stricted = token;
                            message = Messages.StrictParamName;
                        }
                        if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                            stricted = token;
                            message = Messages.StrictParamDupe;
                        }
                    } else if (!firstRestricted) {
                        if (isRestrictedWord(token.value)) {
                            firstRestricted = token;
                            message = Messages.StrictParamName;
                        } else if (isStrictModeReservedWord(token.value)) {
                            firstRestricted = token;
                            message = Messages.StrictReservedWord;
                        } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                            firstRestricted = token;
                            message = Messages.StrictParamDupe;
                        }
                    }
                    params.push(param);
                    paramSet[param.name] = true;
                    if (match(')')) {
                        break;
                    }
                    expect(',');
                }
            }
    
            expect(')');
    
            previousStrict = strict;
            body = parseFunctionSourceElements();
            if (strict && firstRestricted) {
                throwError(firstRestricted, message);
            }
            if (strict && stricted) {
                throwErrorTolerant(stricted, message);
            }
            strict = previousStrict;
    
            return {
                type: Syntax.FunctionExpression,
                id: id,
                params: params,
                defaults: [],
                body: body,
                rest: null,
                generator: false,
                expression: false
            };
        }
    
        // 14 Program
    
        function parseSourceElement() {
            var token = lookahead();
    
            if (token.type === Token.Keyword) {
                switch (token.value) {
                case 'const':
                case 'let':
                    return parseConstLetDeclaration(token.value);
                case 'function':
                    return parseFunctionDeclaration();
                default:
                    return parseStatement();
                }
            }
    
            if (token.type !== Token.EOF) {
                return parseStatement();
            }
        }
    
        function parseSourceElements() {
            var sourceElement, sourceElements = [], token, directive, firstRestricted;
    
            while (index < length) {
                token = lookahead();
                if (token.type !== Token.StringLiteral) {
                    break;
                }
    
                sourceElement = parseSourceElement();
                sourceElements.push(sourceElement);
                if (sourceElement.expression.type !== Syntax.Literal) {
                    // this is not directive
                    break;
                }
                directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
                if (directive === 'use strict') {
                    strict = true;
                    if (firstRestricted) {
                        throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                    }
                } else {
                    if (!firstRestricted && token.octal) {
                        firstRestricted = token;
                    }
                }
            }
    
            while (index < length) {
                sourceElement = parseSourceElement();
                if (typeof sourceElement === 'undefined') {
                    break;
                }
                sourceElements.push(sourceElement);
            }
            return sourceElements;
        }
    
        function parseProgram() {
            var program;
            strict = false;
            program = {
                type: Syntax.Program,
                body: parseSourceElements()
            };
            return program;
        }
    
        // The following functions are needed only when the option to preserve
        // the comments is active.
    
        function addComment(type, value, start, end, loc) {
            assert(typeof start === 'number', 'Comment must have valid position');
    
            // Because the way the actual token is scanned, often the comments
            // (if any) are skipped twice during the lexical analysis.
            // Thus, we need to skip adding a comment if the comment array already
            // handled it.
            if (extra.comments.length > 0) {
                if (extra.comments[extra.comments.length - 1].range[1] > start) {
                    return;
                }
            }
    
            extra.comments.push({
                type: type,
                value: value,
                range: [start, end],
                loc: loc
            });
        }
    
        function scanComment() {
            var comment, ch, loc, start, blockComment, lineComment;
    
            comment = '';
            blockComment = false;
            lineComment = false;
    
            while (index < length) {
                ch = source[index];
    
                if (lineComment) {
                    ch = source[index++];
                    if (isLineTerminator(ch)) {
                        loc.end = {
                            line: lineNumber,
                            column: index - lineStart - 1
                        };
                        lineComment = false;
                        addComment('Line', comment, start, index - 1, loc);
                        if (ch === '\r' && source[index] === '\n') {
                            ++index;
                        }
                        ++lineNumber;
                        lineStart = index;
                        comment = '';
                    } else if (index >= length) {
                        lineComment = false;
                        comment += ch;
                        loc.end = {
                            line: lineNumber,
                            column: length - lineStart
                        };
                        addComment('Line', comment, start, length, loc);
                    } else {
                        comment += ch;
                    }
                } else if (blockComment) {
                    if (isLineTerminator(ch)) {
                        if (ch === '\r' && source[index + 1] === '\n') {
                            ++index;
                            comment += '\r\n';
                        } else {
                            comment += ch;
                        }
                        ++lineNumber;
                        ++index;
                        lineStart = index;
                        if (index >= length) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    } else {
                        ch = source[index++];
                        if (index >= length) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                        comment += ch;
                        if (ch === '*') {
                            ch = source[index];
                            if (ch === '/') {
                                comment = comment.substr(0, comment.length - 1);
                                blockComment = false;
                                ++index;
                                loc.end = {
                                    line: lineNumber,
                                    column: index - lineStart
                                };
                                addComment('Block', comment, start, index, loc);
                                comment = '';
                            }
                        }
                    }
                } else if (ch === '/') {
                    ch = source[index + 1];
                    if (ch === '/') {
                        loc = {
                            start: {
                                line: lineNumber,
                                column: index - lineStart
                            }
                        };
                        start = index;
                        index += 2;
                        lineComment = true;
                        if (index >= length) {
                            loc.end = {
                                line: lineNumber,
                                column: index - lineStart
                            };
                            lineComment = false;
                            addComment('Line', comment, start, index, loc);
                        }
                    } else if (ch === '*') {
                        start = index;
                        index += 2;
                        blockComment = true;
                        loc = {
                            start: {
                                line: lineNumber,
                                column: index - lineStart - 2
                            }
                        };
                        if (index >= length) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    } else {
                        break;
                    }
                } else if (isWhiteSpace(ch)) {
                    ++index;
                } else if (isLineTerminator(ch)) {
                    ++index;
                    if (ch ===  '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                } else {
                    break;
                }
            }
        }
    
        function filterCommentLocation() {
            var i, entry, comment, comments = [];
    
            for (i = 0; i < extra.comments.length; ++i) {
                entry = extra.comments[i];
                comment = {
                    type: entry.type,
                    value: entry.value
                };
                if (extra.range) {
                    comment.range = entry.range;
                }
                if (extra.loc) {
                    comment.loc = entry.loc;
                }
                comments.push(comment);
            }
    
            extra.comments = comments;
        }
    
        function collectToken() {
            var start, loc, token, range, value;
    
            skipComment();
            start = index;
            loc = {
                start: {
                    line: lineNumber,
                    column: index - lineStart
                }
            };
    
            token = extra.advance();
            loc.end = {
                line: lineNumber,
                column: index - lineStart
            };
    
            if (token.type !== Token.EOF) {
                range = [token.range[0], token.range[1]];
                value = sliceSource(token.range[0], token.range[1]);
                extra.tokens.push({
                    type: TokenName[token.type],
                    value: value,
                    range: range,
                    loc: loc
                });
            }
    
            return token;
        }
    
        function collectRegex() {
            var pos, loc, regex, token;
    
            skipComment();
    
            pos = index;
            loc = {
                start: {
                    line: lineNumber,
                    column: index - lineStart
                }
            };
    
            regex = extra.scanRegExp();
            loc.end = {
                line: lineNumber,
                column: index - lineStart
            };
    
            // Pop the previous token, which is likely '/' or '/='
            if (extra.tokens.length > 0) {
                token = extra.tokens[extra.tokens.length - 1];
                if (token.range[0] === pos && token.type === 'Punctuator') {
                    if (token.value === '/' || token.value === '/=') {
                        extra.tokens.pop();
                    }
                }
            }
    
            extra.tokens.push({
                type: 'RegularExpression',
                value: regex.literal,
                range: [pos, index],
                loc: loc
            });
    
            return regex;
        }
    
        function filterTokenLocation() {
            var i, entry, token, tokens = [];
    
            for (i = 0; i < extra.tokens.length; ++i) {
                entry = extra.tokens[i];
                token = {
                    type: entry.type,
                    value: entry.value
                };
                if (extra.range) {
                    token.range = entry.range;
                }
                if (extra.loc) {
                    token.loc = entry.loc;
                }
                tokens.push(token);
            }
    
            extra.tokens = tokens;
        }
    
        function createLiteral(token) {
            return {
                type: Syntax.Literal,
                value: token.value
            };
        }
    
        function createRawLiteral(token) {
            return {
                type: Syntax.Literal,
                value: token.value,
                raw: sliceSource(token.range[0], token.range[1])
            };
        }
    
        function createLocationMarker() {
            var marker = {};
    
            marker.range = [index, index];
            marker.loc = {
                start: {
                    line: lineNumber,
                    column: index - lineStart
                },
                end: {
                    line: lineNumber,
                    column: index - lineStart
                }
            };
    
            marker.end = function () {
                this.range[1] = index;
                this.loc.end.line = lineNumber;
                this.loc.end.column = index - lineStart;
            };
    
            marker.applyGroup = function (node) {
                if (extra.range) {
                    node.groupRange = [this.range[0], this.range[1]];
                }
                if (extra.loc) {
                    node.groupLoc = {
                        start: {
                            line: this.loc.start.line,
                            column: this.loc.start.column
                        },
                        end: {
                            line: this.loc.end.line,
                            column: this.loc.end.column
                        }
                    };
                }
            };
    
            marker.apply = function (node) {
                if (extra.range) {
                    node.range = [this.range[0], this.range[1]];
                }
                if (extra.loc) {
                    node.loc = {
                        start: {
                            line: this.loc.start.line,
                            column: this.loc.start.column
                        },
                        end: {
                            line: this.loc.end.line,
                            column: this.loc.end.column
                        }
                    };
                }
            };
    
            return marker;
        }
    
        function trackGroupExpression() {
            var marker, expr;
    
            skipComment();
            marker = createLocationMarker();
            expect('(');
    
            expr = parseExpression();
    
            expect(')');
    
            marker.end();
            marker.applyGroup(expr);
    
            return expr;
        }
    
        function trackLeftHandSideExpression() {
            var marker, expr;
    
            skipComment();
            marker = createLocationMarker();
    
            expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
    
            while (match('.') || match('[')) {
                if (match('[')) {
                    expr = {
                        type: Syntax.MemberExpression,
                        computed: true,
                        object: expr,
                        property: parseComputedMember()
                    };
                    marker.end();
                    marker.apply(expr);
                } else {
                    expr = {
                        type: Syntax.MemberExpression,
                        computed: false,
                        object: expr,
                        property: parseNonComputedMember()
                    };
                    marker.end();
                    marker.apply(expr);
                }
            }
    
            return expr;
        }
    
        function trackLeftHandSideExpressionAllowCall() {
            var marker, expr;
    
            skipComment();
            marker = createLocationMarker();
    
            expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
    
            while (match('.') || match('[') || match('(')) {
                if (match('(')) {
                    expr = {
                        type: Syntax.CallExpression,
                        callee: expr,
                        'arguments': parseArguments()
                    };
                    marker.end();
                    marker.apply(expr);
                } else if (match('[')) {
                    expr = {
                        type: Syntax.MemberExpression,
                        computed: true,
                        object: expr,
                        property: parseComputedMember()
                    };
                    marker.end();
                    marker.apply(expr);
                } else {
                    expr = {
                        type: Syntax.MemberExpression,
                        computed: false,
                        object: expr,
                        property: parseNonComputedMember()
                    };
                    marker.end();
                    marker.apply(expr);
                }
            }
    
            return expr;
        }
    
        function filterGroup(node) {
            var n, i, entry;
    
            n = (Object.prototype.toString.apply(node) === '[object Array]') ? [] : {};
            for (i in node) {
                if (node.hasOwnProperty(i) && i !== 'groupRange' && i !== 'groupLoc') {
                    entry = node[i];
                    if (entry === null || typeof entry !== 'object' || entry instanceof RegExp) {
                        n[i] = entry;
                    } else {
                        n[i] = filterGroup(entry);
                    }
                }
            }
            return n;
        }
    
        function wrapTrackingFunction(range, loc) {
    
            return function (parseFunction) {
    
                function isBinary(node) {
                    return node.type === Syntax.LogicalExpression ||
                        node.type === Syntax.BinaryExpression;
                }
    
                function visit(node) {
                    var start, end;
    
                    if (isBinary(node.left)) {
                        visit(node.left);
                    }
                    if (isBinary(node.right)) {
                        visit(node.right);
                    }
    
                    if (range) {
                        if (node.left.groupRange || node.right.groupRange) {
                            start = node.left.groupRange ? node.left.groupRange[0] : node.left.range[0];
                            end = node.right.groupRange ? node.right.groupRange[1] : node.right.range[1];
                            node.range = [start, end];
                        } else if (typeof node.range === 'undefined') {
                            start = node.left.range[0];
                            end = node.right.range[1];
                            node.range = [start, end];
                        }
                    }
                    if (loc) {
                        if (node.left.groupLoc || node.right.groupLoc) {
                            start = node.left.groupLoc ? node.left.groupLoc.start : node.left.loc.start;
                            end = node.right.groupLoc ? node.right.groupLoc.end : node.right.loc.end;
                            node.loc = {
                                start: start,
                                end: end
                            };
                        } else if (typeof node.loc === 'undefined') {
                            node.loc = {
                                start: node.left.loc.start,
                                end: node.right.loc.end
                            };
                        }
                    }
                }
    
                return function () {
                    var marker, node;
    
                    skipComment();
    
                    marker = createLocationMarker();
                    node = parseFunction.apply(null, arguments);
                    marker.end();
    
                    if (range && typeof node.range === 'undefined') {
                        marker.apply(node);
                    }
    
                    if (loc && typeof node.loc === 'undefined') {
                        marker.apply(node);
                    }
    
                    if (isBinary(node)) {
                        visit(node);
                    }
    
                    return node;
                };
            };
        }
    
        function patch() {
    
            var wrapTracking;
    
            if (extra.comments) {
                extra.skipComment = skipComment;
                skipComment = scanComment;
            }
    
            if (extra.raw) {
                extra.createLiteral = createLiteral;
                createLiteral = createRawLiteral;
            }
    
            if (extra.range || extra.loc) {
    
                extra.parseGroupExpression = parseGroupExpression;
                extra.parseLeftHandSideExpression = parseLeftHandSideExpression;
                extra.parseLeftHandSideExpressionAllowCall = parseLeftHandSideExpressionAllowCall;
                parseGroupExpression = trackGroupExpression;
                parseLeftHandSideExpression = trackLeftHandSideExpression;
                parseLeftHandSideExpressionAllowCall = trackLeftHandSideExpressionAllowCall;
    
                wrapTracking = wrapTrackingFunction(extra.range, extra.loc);
    
                extra.parseAdditiveExpression = parseAdditiveExpression;
                extra.parseAssignmentExpression = parseAssignmentExpression;
                extra.parseBitwiseANDExpression = parseBitwiseANDExpression;
                extra.parseBitwiseORExpression = parseBitwiseORExpression;
                extra.parseBitwiseXORExpression = parseBitwiseXORExpression;
                extra.parseBlock = parseBlock;
                extra.parseFunctionSourceElements = parseFunctionSourceElements;
                extra.parseCatchClause = parseCatchClause;
                extra.parseComputedMember = parseComputedMember;
                extra.parseConditionalExpression = parseConditionalExpression;
                extra.parseConstLetDeclaration = parseConstLetDeclaration;
                extra.parseEqualityExpression = parseEqualityExpression;
                extra.parseExpression = parseExpression;
                extra.parseForVariableDeclaration = parseForVariableDeclaration;
                extra.parseFunctionDeclaration = parseFunctionDeclaration;
                extra.parseFunctionExpression = parseFunctionExpression;
                extra.parseLogicalANDExpression = parseLogicalANDExpression;
                extra.parseLogicalORExpression = parseLogicalORExpression;
                extra.parseMultiplicativeExpression = parseMultiplicativeExpression;
                extra.parseNewExpression = parseNewExpression;
                extra.parseNonComputedProperty = parseNonComputedProperty;
                extra.parseObjectProperty = parseObjectProperty;
                extra.parseObjectPropertyKey = parseObjectPropertyKey;
                extra.parsePostfixExpression = parsePostfixExpression;
                extra.parsePrimaryExpression = parsePrimaryExpression;
                extra.parseProgram = parseProgram;
                extra.parsePropertyFunction = parsePropertyFunction;
                extra.parseRelationalExpression = parseRelationalExpression;
                extra.parseStatement = parseStatement;
                extra.parseShiftExpression = parseShiftExpression;
                extra.parseSwitchCase = parseSwitchCase;
                extra.parseUnaryExpression = parseUnaryExpression;
                extra.parseVariableDeclaration = parseVariableDeclaration;
                extra.parseVariableIdentifier = parseVariableIdentifier;
    
                parseAdditiveExpression = wrapTracking(extra.parseAdditiveExpression);
                parseAssignmentExpression = wrapTracking(extra.parseAssignmentExpression);
                parseBitwiseANDExpression = wrapTracking(extra.parseBitwiseANDExpression);
                parseBitwiseORExpression = wrapTracking(extra.parseBitwiseORExpression);
                parseBitwiseXORExpression = wrapTracking(extra.parseBitwiseXORExpression);
                parseBlock = wrapTracking(extra.parseBlock);
                parseFunctionSourceElements = wrapTracking(extra.parseFunctionSourceElements);
                parseCatchClause = wrapTracking(extra.parseCatchClause);
                parseComputedMember = wrapTracking(extra.parseComputedMember);
                parseConditionalExpression = wrapTracking(extra.parseConditionalExpression);
                parseConstLetDeclaration = wrapTracking(extra.parseConstLetDeclaration);
                parseEqualityExpression = wrapTracking(extra.parseEqualityExpression);
                parseExpression = wrapTracking(extra.parseExpression);
                parseForVariableDeclaration = wrapTracking(extra.parseForVariableDeclaration);
                parseFunctionDeclaration = wrapTracking(extra.parseFunctionDeclaration);
                parseFunctionExpression = wrapTracking(extra.parseFunctionExpression);
                parseLeftHandSideExpression = wrapTracking(parseLeftHandSideExpression);
                parseLogicalANDExpression = wrapTracking(extra.parseLogicalANDExpression);
                parseLogicalORExpression = wrapTracking(extra.parseLogicalORExpression);
                parseMultiplicativeExpression = wrapTracking(extra.parseMultiplicativeExpression);
                parseNewExpression = wrapTracking(extra.parseNewExpression);
                parseNonComputedProperty = wrapTracking(extra.parseNonComputedProperty);
                parseObjectProperty = wrapTracking(extra.parseObjectProperty);
                parseObjectPropertyKey = wrapTracking(extra.parseObjectPropertyKey);
                parsePostfixExpression = wrapTracking(extra.parsePostfixExpression);
                parsePrimaryExpression = wrapTracking(extra.parsePrimaryExpression);
                parseProgram = wrapTracking(extra.parseProgram);
                parsePropertyFunction = wrapTracking(extra.parsePropertyFunction);
                parseRelationalExpression = wrapTracking(extra.parseRelationalExpression);
                parseStatement = wrapTracking(extra.parseStatement);
                parseShiftExpression = wrapTracking(extra.parseShiftExpression);
                parseSwitchCase = wrapTracking(extra.parseSwitchCase);
                parseUnaryExpression = wrapTracking(extra.parseUnaryExpression);
                parseVariableDeclaration = wrapTracking(extra.parseVariableDeclaration);
                parseVariableIdentifier = wrapTracking(extra.parseVariableIdentifier);
            }
    
            if (typeof extra.tokens !== 'undefined') {
                extra.advance = advance;
                extra.scanRegExp = scanRegExp;
    
                advance = collectToken;
                scanRegExp = collectRegex;
            }
        }
    
        function unpatch() {
            if (typeof extra.skipComment === 'function') {
                skipComment = extra.skipComment;
            }
    
            if (extra.raw) {
                createLiteral = extra.createLiteral;
            }
    
            if (extra.range || extra.loc) {
                parseAdditiveExpression = extra.parseAdditiveExpression;
                parseAssignmentExpression = extra.parseAssignmentExpression;
                parseBitwiseANDExpression = extra.parseBitwiseANDExpression;
                parseBitwiseORExpression = extra.parseBitwiseORExpression;
                parseBitwiseXORExpression = extra.parseBitwiseXORExpression;
                parseBlock = extra.parseBlock;
                parseFunctionSourceElements = extra.parseFunctionSourceElements;
                parseCatchClause = extra.parseCatchClause;
                parseComputedMember = extra.parseComputedMember;
                parseConditionalExpression = extra.parseConditionalExpression;
                parseConstLetDeclaration = extra.parseConstLetDeclaration;
                parseEqualityExpression = extra.parseEqualityExpression;
                parseExpression = extra.parseExpression;
                parseForVariableDeclaration = extra.parseForVariableDeclaration;
                parseFunctionDeclaration = extra.parseFunctionDeclaration;
                parseFunctionExpression = extra.parseFunctionExpression;
                parseGroupExpression = extra.parseGroupExpression;
                parseLeftHandSideExpression = extra.parseLeftHandSideExpression;
                parseLeftHandSideExpressionAllowCall = extra.parseLeftHandSideExpressionAllowCall;
                parseLogicalANDExpression = extra.parseLogicalANDExpression;
                parseLogicalORExpression = extra.parseLogicalORExpression;
                parseMultiplicativeExpression = extra.parseMultiplicativeExpression;
                parseNewExpression = extra.parseNewExpression;
                parseNonComputedProperty = extra.parseNonComputedProperty;
                parseObjectProperty = extra.parseObjectProperty;
                parseObjectPropertyKey = extra.parseObjectPropertyKey;
                parsePrimaryExpression = extra.parsePrimaryExpression;
                parsePostfixExpression = extra.parsePostfixExpression;
                parseProgram = extra.parseProgram;
                parsePropertyFunction = extra.parsePropertyFunction;
                parseRelationalExpression = extra.parseRelationalExpression;
                parseStatement = extra.parseStatement;
                parseShiftExpression = extra.parseShiftExpression;
                parseSwitchCase = extra.parseSwitchCase;
                parseUnaryExpression = extra.parseUnaryExpression;
                parseVariableDeclaration = extra.parseVariableDeclaration;
                parseVariableIdentifier = extra.parseVariableIdentifier;
            }
    
            if (typeof extra.scanRegExp === 'function') {
                advance = extra.advance;
                scanRegExp = extra.scanRegExp;
            }
        }
    
        function stringToArray(str) {
            var length = str.length,
                result = [],
                i;
            for (i = 0; i < length; ++i) {
                result[i] = str.charAt(i);
            }
            return result;
        }
    
        function parse(code, options) {
            var program, toString;
    
            toString = String;
            if (typeof code !== 'string' && !(code instanceof String)) {
                code = toString(code);
            }
    
            source = code;
            index = 0;
            lineNumber = (source.length > 0) ? 1 : 0;
            lineStart = 0;
            length = source.length;
            buffer = null;
            state = {
                allowIn: true,
                labelSet: {},
                inFunctionBody: false,
                inIteration: false,
                inSwitch: false
            };
    
            extra = {};
            if (typeof options !== 'undefined') {
                extra.range = (typeof options.range === 'boolean') && options.range;
                extra.loc = (typeof options.loc === 'boolean') && options.loc;
                extra.raw = (typeof options.raw === 'boolean') && options.raw;
                if (typeof options.tokens === 'boolean' && options.tokens) {
                    extra.tokens = [];
                }
                if (typeof options.comment === 'boolean' && options.comment) {
                    extra.comments = [];
                }
                if (typeof options.tolerant === 'boolean' && options.tolerant) {
                    extra.errors = [];
                }
            }
    
            if (length > 0) {
                if (typeof source[0] === 'undefined') {
                    // Try first to convert to a string. This is good as fast path
                    // for old IE which understands string indexing for string
                    // literals only and not for string object.
                    if (code instanceof String) {
                        source = code.valueOf();
                    }
    
                    // Force accessing the characters via an array.
                    if (typeof source[0] === 'undefined') {
                        source = stringToArray(code);
                    }
                }
            }
    
            patch();
            try {
                program = parseProgram();
                if (typeof extra.comments !== 'undefined') {
                    filterCommentLocation();
                    program.comments = extra.comments;
                }
                if (typeof extra.tokens !== 'undefined') {
                    filterTokenLocation();
                    program.tokens = extra.tokens;
                }
                if (typeof extra.errors !== 'undefined') {
                    program.errors = extra.errors;
                }
                if (extra.range || extra.loc) {
                    program.body = filterGroup(program.body);
                }
            } catch (e) {
                throw e;
            } finally {
                unpatch();
                extra = {};
            }
    
            return program;
        }
    
        // Sync with package.json.
        exports.version = '1.0.4';
    
        exports.parse = parse;
    
        // Deep copy.
        exports.Syntax = (function () {
            var name, types = {};
    
            if (typeof Object.create === 'function') {
                types = Object.create(null);
            }
    
            for (name in Syntax) {
                if (Syntax.hasOwnProperty(name)) {
                    types[name] = Syntax[name];
                }
            }
    
            if (typeof Object.freeze === 'function') {
                Object.freeze(types);
            }
    
            return types;
        }());
    
    }));
    /* vim: set sw=4 ts=4 et tw=80 : */
    
  provide("esprima", module.exports);
}(global));

// pakmanager:colors
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*
    colors.js
    
    Copyright (c) 2010
    
    Marak Squires
    Alexis Sellier (cloudhead)
    
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
    
    */
    
    var isHeadless = false;
    
    if (typeof module !== 'undefined') {
      isHeadless = true;
    }
    
    if (!isHeadless) {
      var exports = {};
      var module = {};
      var colors = exports;
      exports.mode = "browser";
    } else {
      exports.mode = "console";
    }
    
    //
    // Prototypes the string object to have additional method calls that add terminal colors
    //
    var addProperty = function (color, func) {
      exports[color] = function (str) {
        return func.apply(str);
      };
      String.prototype.__defineGetter__(color, func);
    };
    
    function stylize(str, style) {
    
      var styles;
    
      if (exports.mode === 'console') {
        styles = {
          //styles
          'bold'      : ['\x1B[1m',  '\x1B[22m'],
          'italic'    : ['\x1B[3m',  '\x1B[23m'],
          'underline' : ['\x1B[4m',  '\x1B[24m'],
          'inverse'   : ['\x1B[7m',  '\x1B[27m'],
          'strikethrough' : ['\x1B[9m',  '\x1B[29m'],
          //text colors
          //grayscale
          'white'     : ['\x1B[37m', '\x1B[39m'],
          'grey'      : ['\x1B[90m', '\x1B[39m'],
          'black'     : ['\x1B[30m', '\x1B[39m'],
          //colors
          'blue'      : ['\x1B[34m', '\x1B[39m'],
          'cyan'      : ['\x1B[36m', '\x1B[39m'],
          'green'     : ['\x1B[32m', '\x1B[39m'],
          'magenta'   : ['\x1B[35m', '\x1B[39m'],
          'red'       : ['\x1B[31m', '\x1B[39m'],
          'yellow'    : ['\x1B[33m', '\x1B[39m'],
          //background colors
          //grayscale
          'whiteBG'     : ['\x1B[47m', '\x1B[49m'],
          'greyBG'      : ['\x1B[49;5;8m', '\x1B[49m'],
          'blackBG'     : ['\x1B[40m', '\x1B[49m'],
          //colors
          'blueBG'      : ['\x1B[44m', '\x1B[49m'],
          'cyanBG'      : ['\x1B[46m', '\x1B[49m'],
          'greenBG'     : ['\x1B[42m', '\x1B[49m'],
          'magentaBG'   : ['\x1B[45m', '\x1B[49m'],
          'redBG'       : ['\x1B[41m', '\x1B[49m'],
          'yellowBG'    : ['\x1B[43m', '\x1B[49m']
        };
      } else if (exports.mode === 'browser') {
        styles = {
          //styles
          'bold'      : ['<b>',  '</b>'],
          'italic'    : ['<i>',  '</i>'],
          'underline' : ['<u>',  '</u>'],
          'inverse'   : ['<span style="background-color:black;color:white;">',  '</span>'],
          'strikethrough' : ['<del>',  '</del>'],
          //text colors
          //grayscale
          'white'     : ['<span style="color:white;">',   '</span>'],
          'grey'      : ['<span style="color:gray;">',    '</span>'],
          'black'     : ['<span style="color:black;">',   '</span>'],
          //colors
          'blue'      : ['<span style="color:blue;">',    '</span>'],
          'cyan'      : ['<span style="color:cyan;">',    '</span>'],
          'green'     : ['<span style="color:green;">',   '</span>'],
          'magenta'   : ['<span style="color:magenta;">', '</span>'],
          'red'       : ['<span style="color:red;">',     '</span>'],
          'yellow'    : ['<span style="color:yellow;">',  '</span>'],
          //background colors
          //grayscale
          'whiteBG'     : ['<span style="background-color:white;">',   '</span>'],
          'greyBG'      : ['<span style="background-color:gray;">',    '</span>'],
          'blackBG'     : ['<span style="background-color:black;">',   '</span>'],
          //colors
          'blueBG'      : ['<span style="background-color:blue;">',    '</span>'],
          'cyanBG'      : ['<span style="background-color:cyan;">',    '</span>'],
          'greenBG'     : ['<span style="background-color:green;">',   '</span>'],
          'magentaBG'   : ['<span style="background-color:magenta;">', '</span>'],
          'redBG'       : ['<span style="background-color:red;">',     '</span>'],
          'yellowBG'    : ['<span style="background-color:yellow;">',  '</span>']
        };
      } else if (exports.mode === 'none') {
        return str + '';
      } else {
        console.log('unsupported mode, try "browser", "console" or "none"');
      }
      return styles[style][0] + str + styles[style][1];
    }
    
    function applyTheme(theme) {
    
      //
      // Remark: This is a list of methods that exist
      // on String that you should not overwrite.
      //
      var stringPrototypeBlacklist = [
        '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__', 'charAt', 'constructor',
        'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf', 'charCodeAt',
        'indexOf', 'lastIndexof', 'length', 'localeCompare', 'match', 'replace', 'search', 'slice', 'split', 'substring',
        'toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase', 'toUpperCase', 'trim', 'trimLeft', 'trimRight'
      ];
    
      Object.keys(theme).forEach(function (prop) {
        if (stringPrototypeBlacklist.indexOf(prop) !== -1) {
          console.log('warn: '.red + ('String.prototype' + prop).magenta + ' is probably something you don\'t want to override. Ignoring style name');
        }
        else {
          if (typeof(theme[prop]) === 'string') {
            addProperty(prop, function () {
              return exports[theme[prop]](this);
            });
          }
          else {
            addProperty(prop, function () {
              var ret = this;
              for (var t = 0; t < theme[prop].length; t++) {
                ret = exports[theme[prop][t]](ret);
              }
              return ret;
            });
          }
        }
      });
    }
    
    
    //
    // Iterate through all default styles and colors
    //
    var x = ['bold', 'underline', 'strikethrough', 'italic', 'inverse', 'grey', 'black', 'yellow', 'red', 'green', 'blue', 'white', 'cyan', 'magenta', 'greyBG', 'blackBG', 'yellowBG', 'redBG', 'greenBG', 'blueBG', 'whiteBG', 'cyanBG', 'magentaBG'];
    x.forEach(function (style) {
    
      // __defineGetter__ at the least works in more browsers
      // http://robertnyman.com/javascript/javascript-getters-setters.html
      // Object.defineProperty only works in Chrome
      addProperty(style, function () {
        return stylize(this, style);
      });
    });
    
    function sequencer(map) {
      return function () {
        if (!isHeadless) {
          return this.replace(/( )/, '$1');
        }
        var exploded = this.split(""), i = 0;
        exploded = exploded.map(map);
        return exploded.join("");
      };
    }
    
    var rainbowMap = (function () {
      var rainbowColors = ['red', 'yellow', 'green', 'blue', 'magenta']; //RoY G BiV
      return function (letter, i, exploded) {
        if (letter === " ") {
          return letter;
        } else {
          return stylize(letter, rainbowColors[i++ % rainbowColors.length]);
        }
      };
    })();
    
    exports.themes = {};
    
    exports.addSequencer = function (name, map) {
      addProperty(name, sequencer(map));
    };
    
    exports.addSequencer('rainbow', rainbowMap);
    exports.addSequencer('zebra', function (letter, i, exploded) {
      return i % 2 === 0 ? letter : letter.inverse;
    });
    
    exports.setTheme = function (theme) {
      if (typeof theme === 'string') {
        try {
          exports.themes[theme] = require(theme);
          applyTheme(exports.themes[theme]);
          return exports.themes[theme];
        } catch (err) {
          console.log(err);
          return err;
        }
      } else {
        applyTheme(theme);
      }
    };
    
    
    addProperty('stripColors', function () {
      return ("" + this).replace(/\x1B\[\d+m/g, '');
    });
    
    // please no
    function zalgo(text, options) {
      var soul = {
        "up" : [
          '̍', '̎', '̄', '̅',
          '̿', '̑', '̆', '̐',
          '͒', '͗', '͑', '̇',
          '̈', '̊', '͂', '̓',
          '̈', '͊', '͋', '͌',
          '̃', '̂', '̌', '͐',
          '̀', '́', '̋', '̏',
          '̒', '̓', '̔', '̽',
          '̉', 'ͣ', 'ͤ', 'ͥ',
          'ͦ', 'ͧ', 'ͨ', 'ͩ',
          'ͪ', 'ͫ', 'ͬ', 'ͭ',
          'ͮ', 'ͯ', '̾', '͛',
          '͆', '̚'
        ],
        "down" : [
          '̖', '̗', '̘', '̙',
          '̜', '̝', '̞', '̟',
          '̠', '̤', '̥', '̦',
          '̩', '̪', '̫', '̬',
          '̭', '̮', '̯', '̰',
          '̱', '̲', '̳', '̹',
          '̺', '̻', '̼', 'ͅ',
          '͇', '͈', '͉', '͍',
          '͎', '͓', '͔', '͕',
          '͖', '͙', '͚', '̣'
        ],
        "mid" : [
          '̕', '̛', '̀', '́',
          '͘', '̡', '̢', '̧',
          '̨', '̴', '̵', '̶',
          '͜', '͝', '͞',
          '͟', '͠', '͢', '̸',
          '̷', '͡', ' ҉'
        ]
      },
      all = [].concat(soul.up, soul.down, soul.mid),
      zalgo = {};
    
      function randomNumber(range) {
        var r = Math.floor(Math.random() * range);
        return r;
      }
    
      function is_char(character) {
        var bool = false;
        all.filter(function (i) {
          bool = (i === character);
        });
        return bool;
      }
    
      function heComes(text, options) {
        var result = '', counts, l;
        options = options || {};
        options["up"] = options["up"] || true;
        options["mid"] = options["mid"] || true;
        options["down"] = options["down"] || true;
        options["size"] = options["size"] || "maxi";
        text = text.split('');
        for (l in text) {
          if (is_char(l)) {
            continue;
          }
          result = result + text[l];
          counts = {"up" : 0, "down" : 0, "mid" : 0};
          switch (options.size) {
          case 'mini':
            counts.up = randomNumber(8);
            counts.min = randomNumber(2);
            counts.down = randomNumber(8);
            break;
          case 'maxi':
            counts.up = randomNumber(16) + 3;
            counts.min = randomNumber(4) + 1;
            counts.down = randomNumber(64) + 3;
            break;
          default:
            counts.up = randomNumber(8) + 1;
            counts.mid = randomNumber(6) / 2;
            counts.down = randomNumber(8) + 1;
            break;
          }
    
          var arr = ["up", "mid", "down"];
          for (var d in arr) {
            var index = arr[d];
            for (var i = 0 ; i <= counts[index]; i++) {
              if (options[index]) {
                result = result + soul[index][randomNumber(soul[index].length)];
              }
            }
          }
        }
        return result;
      }
      return heComes(text);
    }
    
    
    // don't summon zalgo
    addProperty('zalgo', function () {
      return zalgo(this);
    });
    
  provide("colors", module.exports);
}(global));

// pakmanager:iconv-lite
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  var RE_SPACEDASH = /[- ]/g;
    // Module exports
    var iconv = module.exports = {
        toEncoding: function(str, encoding) {
            return iconv.getCodec(encoding).toEncoding(str);
        },
        fromEncoding: function(buf, encoding) {
            return iconv.getCodec(encoding).fromEncoding(buf);
        },
        encodingExists: function(enc) {
            loadEncodings();
            enc = enc.replace(RE_SPACEDASH, "").toLowerCase();
            return (iconv.encodings[enc] !== undefined);
        },
        
        defaultCharUnicode: '�',
        defaultCharSingleByte: '?',
    
        encodingsLoaded: false,
        
        // Get correct codec for given encoding.
        getCodec: function(encoding) {
            loadEncodings();
            var enc = encoding || "utf8";
            var codecOptions = undefined;
            while (1) {
                if (getType(enc) === "String")
                    enc = enc.replace(RE_SPACEDASH, "").toLowerCase();
                var codec = iconv.encodings[enc];
                var type = getType(codec);
                if (type === "String") {
                    // Link to other encoding.
                    codecOptions = {originalEncoding: enc};
                    enc = codec;
                }
                else if (type === "Object" && codec.type != undefined) {
                    // Options for other encoding.
                    codecOptions = codec;
                    enc = codec.type;
                } 
                else if (type === "Function")
                    // Codec itself.
                    return codec(codecOptions);
                else
                    throw new Error("Encoding not recognized: '" + encoding + "' (searched as: '"+enc+"')");
            }
        },
        
        // Define basic encodings
        encodings: {
            internal: function(options) {
                return {
                    toEncoding: toInternalEncoding,
                    fromEncoding: fromInternalEncoding,
                    options: options
                };
            },
            utf8: "internal",
            ucs2: "internal",
            binary: "internal",
            ascii: "internal",
            base64: "internal",
            
            // Codepage single-byte encodings.
            singlebyte: function(options) {
                // Prepare chars if needed
                if (!options.charsBuf) {
                    if (!options.chars || (options.chars.length !== 128 && options.chars.length !== 256))
                        throw new Error("Encoding '"+options.type+"' has incorrect 'chars' (must be of len 128 or 256)");
                    
                    if (options.chars.length === 128)
                        options.chars = asciiString + options.chars;
    
                    options.charsBuf = new Buffer(options.chars, 'ucs2');
                }
                
                if (!options.revCharsBuf) {
                    options.revCharsBuf = new Buffer(65536);
                    var defChar = iconv.defaultCharSingleByte.charCodeAt(0);
                    for (var i = 0; i < options.revCharsBuf.length; i++)
                        options.revCharsBuf[i] = defChar;
                    for (var i = 0; i < options.chars.length; i++)
                        options.revCharsBuf[options.chars.charCodeAt(i)] = i;
                }
    
                return {
                    toEncoding: toSingleByteEncoding,
                    fromEncoding: fromSingleByteEncoding,
                    options: options,
                };
            },
    
            // Codepage double-byte encodings.
            table: function(options) {
                if (!options.table) {
                    throw new Error("Encoding '" + options.type + "' has incorect 'table' option");
                }
                if (!options.revCharsTable) {
                    var revCharsTable = options.revCharsTable = {};
                    for (var i = 0; i <= 0xFFFF; i++) {
                        revCharsTable[i] = 0;
                    }
    
                    var table = options.table;
                    for (var key in table) {
                        revCharsTable[table[key]] = +key;
                    }
                }
                
                return {
                    toEncoding: toTableEncoding,
                    fromEncoding: fromTableEncoding,
                    options: options,
                };
            }
        }
    };
    
    function toInternalEncoding(str) {
        return new Buffer(ensureString(str), this.options.originalEncoding);
    }
    
    function fromInternalEncoding(buf) {
        return ensureBuffer(buf).toString(this.options.originalEncoding);
    }
    
    function toTableEncoding(str) {
        str = ensureString(str);
        var strLen = str.length;
        var revCharsTable = this.options.revCharsTable;
        var newBuf = new Buffer(strLen*2), gbkcode, unicode,
            defaultChar = revCharsTable[iconv.defaultCharUnicode.charCodeAt(0)];
    
        for (var i = 0, j = 0; i < strLen; i++) {
            unicode = str.charCodeAt(i);
            if (unicode >> 7) {
                gbkcode = revCharsTable[unicode] || defaultChar;
                newBuf[j++] = gbkcode >> 8; //high byte;
                newBuf[j++] = gbkcode & 0xFF; //low byte
            } else {//ascii
                newBuf[j++] = unicode;
            }
        }
        return newBuf.slice(0, j);
    }
    
    function fromTableEncoding(buf) {
        buf = ensureBuffer(buf);
        var bufLen = buf.length;
        var table = this.options.table;
        var newBuf = new Buffer(bufLen*2), unicode, gbkcode,
            defaultChar = iconv.defaultCharUnicode.charCodeAt(0);
    
        for (var i = 0, j = 0; i < bufLen; i++, j+=2) {
            gbkcode = buf[i];
            if (gbkcode & 0x80) {
                gbkcode = (gbkcode << 8) + buf[++i];
                unicode = table[gbkcode] || defaultChar;
            } else {
                unicode = gbkcode;
            }
            newBuf[j] = unicode & 0xFF; //low byte
            newBuf[j+1] = unicode >> 8; //high byte
        }
        return newBuf.slice(0, j).toString('ucs2');
    }
    
    function toSingleByteEncoding(str) {
        str = ensureString(str);
        
        var buf = new Buffer(str.length);
        var revCharsBuf = this.options.revCharsBuf;
        for (var i = 0; i < str.length; i++)
            buf[i] = revCharsBuf[str.charCodeAt(i)];
        
        return buf;
    }
    
    function fromSingleByteEncoding(buf) {
        buf = ensureBuffer(buf);
        
        // Strings are immutable in JS -> we use ucs2 buffer to speed up computations.
        var charsBuf = this.options.charsBuf;
        var newBuf = new Buffer(buf.length*2);
        var idx1 = 0, idx2 = 0;
        for (var i = 0, _len = buf.length; i < _len; i++) {
            idx1 = buf[i]*2; idx2 = i*2;
            newBuf[idx2] = charsBuf[idx1];
            newBuf[idx2+1] = charsBuf[idx1+1];
        }
        return newBuf.toString('ucs2');
    }
    
    // Add aliases to convert functions
    iconv.encode = iconv.toEncoding;
    iconv.decode = iconv.fromEncoding;
    
    // Load other encodings manually from files in /encodings dir.
    function loadEncodings() {
        if (!iconv.encodingsLoaded) {
            [ require('./encodings/singlebyte'),
              require('./encodings/gbk'),
              require('./encodings/big5')
            ].forEach(function(encodings) {
                for (var key in encodings)
                    iconv.encodings[key] = encodings[key]
            });
            iconv.encodingsLoaded = true;
        }
    }
    
    
    
    // Utilities
    var asciiString = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\x0c\r\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f'+
                  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7f';
    
    var ensureBuffer = function(buf) {
        buf = buf || new Buffer(0);
        return (buf instanceof Buffer) ? buf : new Buffer(""+buf, "binary");
    }
    
    var ensureString = function(str) {
        str = str || "";
        return (str instanceof Buffer) ? str.toString('utf8') : (""+str);
    }
    
    var getType = function(obj) {
        return Object.prototype.toString.call(obj).slice(8, -1);
    }
    
    
  provide("iconv-lite", module.exports);
}(global));

// pakmanager:rimraf
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  module.exports = rimraf
    rimraf.sync = rimrafSync
    
    var path = require("path")
    var fs = require("fs")
    
    // for EMFILE handling
    var timeout = 0
    exports.EMFILE_MAX = 1000
    exports.BUSYTRIES_MAX = 3
    
    var isWindows = (process.platform === "win32")
    
    function rimraf (p, cb) {
      if (!cb) throw new Error("No callback passed to rimraf()")
    
      var busyTries = 0
      rimraf_(p, function CB (er) {
        if (er) {
          if (isWindows && (er.code === "EBUSY" || er.code === "ENOTEMPTY") &&
              busyTries < exports.BUSYTRIES_MAX) {
            busyTries ++
            var time = busyTries * 100
            // try again, with the same exact callback as this one.
            return setTimeout(function () {
              rimraf_(p, CB)
            }, time)
          }
    
          // this one won't happen if graceful-fs is used.
          if (er.code === "EMFILE" && timeout < exports.EMFILE_MAX) {
            return setTimeout(function () {
              rimraf_(p, CB)
            }, timeout ++)
          }
    
          // already gone
          if (er.code === "ENOENT") er = null
        }
    
        timeout = 0
        cb(er)
      })
    }
    
    // Two possible strategies.
    // 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
    // 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
    //
    // Both result in an extra syscall when you guess wrong.  However, there
    // are likely far more normal files in the world than directories.  This
    // is based on the assumption that a the average number of files per
    // directory is >= 1.
    //
    // If anyone ever complains about this, then I guess the strategy could
    // be made configurable somehow.  But until then, YAGNI.
    function rimraf_ (p, cb) {
      fs.unlink(p, function (er) {
        if (er) {
          if (er.code === "ENOENT")
            return cb(null)
          if (er.code === "EPERM")
            return (isWindows) ? fixWinEPERM(p, er, cb) : rmdir(p, er, cb)
          if (er.code === "EISDIR")
            return rmdir(p, er, cb)
        }
        return cb(er)
      })
    }
    
    function fixWinEPERM (p, er, cb) {
      fs.chmod(p, 666, function (er2) {
        if (er2)
          cb(er2.code === "ENOENT" ? null : er)
        else
          fs.stat(p, function(er3, stats) {
            if (er3)
              cb(er3.code === "ENOENT" ? null : er)
            else if (stats.isDirectory())
              rmdir(p, er, cb)
            else
              fs.unlink(p, cb)
          })
      })
    }
    
    function fixWinEPERMSync (p, er, cb) {
      try {
        fs.chmodSync(p, 666)
      } catch (er2) {
        if (er2.code !== "ENOENT")
          throw er
      }
    
      try {
        var stats = fs.statSync(p)
      } catch (er3) {
        if (er3 !== "ENOENT")
          throw er
      }
    
      if (stats.isDirectory())
        rmdirSync(p, er)
      else
        fs.unlinkSync(p)
    }
    
    function rmdir (p, originalEr, cb) {
      // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
      // if we guessed wrong, and it's not a directory, then
      // raise the original error.
      fs.rmdir(p, function (er) {
        if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST"))
          rmkids(p, cb)
        else if (er && er.code === "ENOTDIR")
          cb(originalEr)
        else
          cb(er)
      })
    }
    
    function rmkids(p, cb) {
      fs.readdir(p, function (er, files) {
        if (er)
          return cb(er)
        var n = files.length
        if (n === 0)
          return fs.rmdir(p, cb)
        var errState
        files.forEach(function (f) {
          rimraf(path.join(p, f), function (er) {
            if (errState)
              return
            if (er)
              return cb(errState = er)
            if (--n === 0)
              fs.rmdir(p, cb)
          })
        })
      })
    }
    
    // this looks simpler, and is strictly *faster*, but will
    // tie up the JavaScript thread and fail on excessively
    // deep directory trees.
    function rimrafSync (p) {
      try {
        fs.unlinkSync(p)
      } catch (er) {
        if (er.code === "ENOENT")
          return
        if (er.code === "EPERM")
          return isWindows ? fixWinEPERMSync(p, er) : rmdirSync(p, er)
        if (er.code !== "EISDIR")
          throw er
        rmdirSync(p, er)
      }
    }
    
    function rmdirSync (p, originalEr) {
      try {
        fs.rmdirSync(p)
      } catch (er) {
        if (er.code === "ENOENT")
          return
        if (er.code === "ENOTDIR")
          throw originalEr
        if (er.code === "ENOTEMPTY" || er.code === "EEXIST")
          rmkidsSync(p)
      }
    }
    
    function rmkidsSync (p) {
      fs.readdirSync(p).forEach(function (f) {
        rimrafSync(path.join(p, f))
      })
      fs.rmdirSync(p)
    }
    
  provide("rimraf", module.exports);
}(global));

// pakmanager:which
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  module.exports = which
    which.sync = whichSync
    
    var path = require("path")
      , fs
      , COLON = process.platform === "win32" ? ";" : ":"
      , isExe
    
    try {
      fs = require("graceful-fs")
    } catch (ex) {
      fs = require("fs")
    }
    
    if (process.platform == "win32") {
      // On windows, there is no good way to check that a file is executable
      isExe = function isExe () { return true }
    } else {
      isExe = function isExe (mod, uid, gid) {
        //console.error(mod, uid, gid);
        //console.error("isExe?", (mod & 0111).toString(8))
        var ret = (mod & 0001)
            || (mod & 0010) && process.getgid && gid === process.getgid()
            || (mod & 0100) && process.getuid && uid === process.getuid()
        //console.error("isExe?", ret)
        return ret
      }
    }
    
    
    
    function which (cmd, cb) {
      if (isAbsolute(cmd)) return cb(null, cmd)
      var pathEnv = (process.env.PATH || "").split(COLON)
        , pathExt = [""]
      if (process.platform === "win32") {
        pathEnv.push(process.cwd())
        pathExt = (process.env.PATHEXT || ".EXE").split(COLON)
        if (cmd.indexOf(".") !== -1) pathExt.unshift("")
      }
      //console.error("pathEnv", pathEnv)
      ;(function F (i, l) {
        if (i === l) return cb(new Error("not found: "+cmd))
        var p = path.resolve(pathEnv[i], cmd)
        ;(function E (ii, ll) {
          if (ii === ll) return F(i + 1, l)
          var ext = pathExt[ii]
          //console.error(p + ext)
          fs.stat(p + ext, function (er, stat) {
            if (!er &&
                stat &&
                stat.isFile() &&
                isExe(stat.mode, stat.uid, stat.gid)) {
              //console.error("yes, exe!", p + ext)
              return cb(null, p + ext)
            }
            return E(ii + 1, ll)
          })
        })(0, pathExt.length)
      })(0, pathEnv.length)
    }
    
    function whichSync (cmd) {
      if (isAbsolute(cmd)) return cmd
      var pathEnv = (process.env.PATH || "").split(COLON)
        , pathExt = [""]
      if (process.platform === "win32") {
        pathEnv.push(process.cwd())
        pathExt = (process.env.PATHEXT || ".EXE").split(COLON)
        if (cmd.indexOf(".") !== -1) pathExt.unshift("")
      }
      for (var i = 0, l = pathEnv.length; i < l; i ++) {
        var p = path.join(pathEnv[i], cmd)
        for (var j = 0, ll = pathExt.length; j < ll; j ++) {
          var cur = p + pathExt[j]
          var stat
          try { stat = fs.statSync(cur) } catch (ex) {}
          if (stat &&
              stat.isFile() &&
              isExe(stat.mode, stat.uid, stat.gid)) return cur
        }
      }
      throw new Error("not found: "+cmd)
    }
    
    var isAbsolute = process.platform === "win32" ? absWin : absUnix
    
    function absWin (p) {
      if (absUnix(p)) return true
      // pull off the device/UNC bit from a windows path.
      // from node's lib/path.js
      var splitDeviceRe =
            /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?([\\\/])?/
        , result = splitDeviceRe.exec(p)
        , device = result[1] || ''
        , isUnc = device && device.charAt(1) !== ':'
        , isAbsolute = !!result[2] || isUnc // UNC paths are always absolute
    
      return isAbsolute
    }
    
    function absUnix (p) {
      return p.charAt(0) === "/" || p === ""
    }
    
  provide("which", module.exports);
}(global));

// pakmanager:js-yaml
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  'use strict';
    
    
    var fs   = require('fs');
    var util = require('util');
    var yaml = require('./lib/js-yaml.js');
    
    
    require.extensions['.yml'] = require.extensions['.yaml'] =
      util.deprecate(function (m, f) {
        m.exports = yaml.safeLoad(fs.readFileSync(f, 'utf8'), { filename: f });
      }, 'Direct yaml files load via require() is deprecated! Use safeLoad() instead.');
    
    
    module.exports = yaml;
    
  provide("js-yaml", module.exports);
}(global));