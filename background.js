function init() {
 
  const addStyle = (styles) => {
    /* Create style element */
    var css = document.createElement("style");
    css.type = "text/css";

    if (css.styleSheet) css.styleSheet.cssText = styles;
    else css.appendChild(document.createTextNode(styles));

    /* Append style to the head element */
    document.getElementsByTagName("head")[0].appendChild(css);
  }
  addStyle(`
  h1,
  h2,
  h3,
  h4,
  h5 {
    display: flex;
    align-items: center;
    position: relative;
    cursor: pointer;
  }
  h1::before,
  h2::before,
  h3::before,
  h4::before,
  h5::before {
    content: "-";
    color: lightgray;
    position: absolute;
    left: -22px;
    top: 45%;
    transform: translateY(-50%);
    cursor: pointer;
    display: none;
  }
  .collapsed::before {
    content: "+";
  }

  h1:hover::before,
  h2:hover::before,
  h3:hover::before,
  h4:hover::before,
  h5:hover::before {
    display: block;
  }

  .hidden {
    display: none;
  }
  `);

  const getPath = (elm) => {
    var curr = elm.parentNode;
    var path = [elm];
    while(curr.tagName != 'BODY') {
      path.unshift(curr);
      curr = curr.parentNode;
    }
    return path;
  }

  const getParentInCommon = (elm1, elm2) => {
    var path1 = getPath(elm1);
    var path2 = getPath(elm2);
    while(path1.length && path2.length) {
      var it1 = path1[0];
      var it2 = path2[0];
      if (it1 !== it2) {
        break;
      }
      it1 = path1.shift();
      it2 = path2.shift();
    }
    return [path1, path2]
  }
  const getSiblingsDown = (path, path2Parent) => {
    var siblings = []
    while(path.length) {
      var node = path.pop();
      var nxt = node.nextElementSibling;
      while (nxt) {
        if (nxt == path2Parent) {
          break;
        }
        siblings.push(nxt);
        nxt = nxt.nextElementSibling;
      }
    }
    return siblings;
  }
  const getSiblingsUp = (path, path1Parent) => {
    var siblings = []
    while(path.length) {
      var node = path.pop();
      var prev = node.previousElementSibling;
      while (prev) {
        if (prev == path1Parent) {
          break;
        }
        siblings.push(prev);
        prev = prev.previousElementSibling;
      }
    }
    return siblings;
  }

  const groupByHeading = (headings) => {
    return headings.reduce((res, it, idx) => {
      var children = [];
      var heading = it;
      if (idx !== headings.length - 1) {
        var nxt = headings[idx + 1];
        var [pathCurr, pathNxt] = getParentInCommon(it, nxt);
        var [path1Parent, path2Parent] = [pathCurr[0], pathNxt[0]]
        var downs = new Set(getSiblingsDown(pathCurr, path2Parent));
        var ups = getSiblingsUp(pathNxt, path1Parent);
        ups.forEach(up => {
          downs.add(up);
        })
        children = [...downs];
      } else {
        children = getSiblingsDown(getPath(it), document.body)
      }
      res.push({ children, heading });
      return res;
    }, [])
  }
  var headers = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5"));
  var groups = groupByHeading(headers);
  groups.forEach(item => {
    var { heading: it, children } = item;
    it.classList.toggle("collapsed");
    if (window.executed) {
      it.addEventListener("click", () => {
        it.classList.toggle("collapsed");
        children.forEach(subIt => {
          subIt.classList.toggle("hidden");
        })
      });
    }

    children.forEach(subIt => {
      subIt.classList.toggle("hidden");
    })
  })

  console.log('window.executed', window.executed);
  window.executed = true;
}

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: init
  });
});
