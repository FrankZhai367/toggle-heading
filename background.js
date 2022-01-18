function init() {

  function addStyle(styles) {
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
  .fr-collapsed::before {
    content: "+";
  }

  h1:hover::before,
  h2:hover::before,
  h3:hover::before,
  h4:hover::before,
  h5:hover::before {
    display: block;
  }

  .fr-checkbox {
    cursor: pointer;
  }

  .fr-hidden {
    display: none !important;
  }

  .fr-read-later-btn.fr-hidden {
    display: inline-block !important;
  }
  .fr-read-later-btn {
    cursor: pointer;
    position: fixed;
    top: 40px;
    right: 40px;
    z-index: 999;
    height: 24px;
    line-height: 24px;
    background: peachpuff;
    border-width: 0;
    border-radius: 4px;
  }
  .fr-read-later-btn .fr-status {
    color: maroon;
    display: block;
  }
  .fr-read-later-btn .fr-read-later {
    color: maroon;
    display: none;
  }
  .fr-read-later-btn:hover .fr-status {
    display: none;
  }
  .fr-read-later-btn:hover .fr-read-later {
    display: block;
  }
  .fr-msg {
    display: inline-block;
    padding: 4px 12px;
    background: peachpuff;
    color: maroon;
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 4px;
  }
  `);

  function getPath(elm) {
    // todo 优化path可以从缓存中获取
    // var xPath = elm.getAttribute('frXPath');
    // if (window.pathMap.get(xPath)) {
    //   return window.pathMap.get(xPath);
    // };
    var curr = elm.parentNode;
    var path = [elm];
    while (curr.tagName != 'BODY') {
      path.unshift(curr);
      curr = curr.parentNode;
    }
    return path;
  }

  function getIndex(elm) {
    var idx = 0;
    var pre = elm.previousElementSibling;
    while (pre) {
      pre = pre.previousElementSibling;
      idx++;
    }
    return idx;
  }

  function getXPath(elm) {
    // 结果格式：DIV#1/SPAN#2
    var curr = elm.parentNode;
    var elmPath = [elm];
    var idxPath = [getIndex(elm)];
    while (curr.tagName != 'BODY') {
      elmPath.unshift(curr);
      idxPath.unshift(`${curr.tagName}#${getIndex(curr)}`);
      curr = curr.parentNode;
    }
    return { xPath: idxPath.join('/'), path: elmPath }
  }

  function getParentInCommon(elm1, elm2) {
    var path1 = getPath(elm1);
    var path2 = getPath(elm2);
    while (path1.length && path2.length) {
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
  function getSiblingsDown(path, path2Parent) {
    var siblings = []
    while (path.length) {
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
  function getSiblingsUp(path, path1Parent) {
    var siblings = []
    while (path.length) {
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

  function getOrCreateFolder() {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getSubTree('2', (nodes) => {
        const { children } = nodes[0];
        const frReadLater = children.find(it => it.title === 'frReadLater');
        if (frReadLater) {
          resolve(frReadLater)
        } else {
          chrome.bookmarks.create({ parentId: '2', title: 'frReadLater' }, (it) => {
            resolve(it)
          });
        }
      })
    })
  }

  function getCurrBookmark() {
    var url = location.href;
    // 查看是否已加入 read later 书签
    return new Promise((resolve, reject) => {
      getOrCreateFolder().then((folder) => {
        var currBookmark = window.currBookmark = folder.children.find(it => it.url === url);
        if (window.currBookmark) {
          resolve({ currBookmark, folder })
        } else {
          reject({ folder });
        }
      })
    })
  }

  function updateData() {
    // 如果存在，更新bookmark中的（done/all）
    if (window.currBookmark) {
      chrome.bookmarks.update(window.currBookmark.id, {
        title: `${document.title} (${window.frData.done}/${window.frData.all})`,
        url: location.href
      });
    }
    // 保存数据到localStorage，名字：fr-data
    localStorage.setItem('fr-data', JSON.stringify(window.frData));
  }

  function renderStatus() {
    var status = document.querySelector('.fr-status');
    status.innerText = `${window.frData.done} / ${window.frData.all}`

    var readLaterSpan = document.querySelector('.fr-read-later');
    readLaterSpan.innerText = window.currBookmark ? 'Mark as finished' : 'Read Later';
  }

  function addReadLater(currBookmark) {
    var btn = document.createElement('button');
    btn.classList.add('fr-read-later-btn')

    var statusSpan = document.createElement('span')
    statusSpan.innerText = '(done/all)';
    statusSpan.classList.add('fr-status');
    btn.appendChild(statusSpan)

    var readLaterSpan = document.createElement('span')
    readLaterSpan.innerText = currBookmark ? 'Mark as finished' : 'Read Later';
    readLaterSpan.classList.add('fr-read-later');
    btn.appendChild(readLaterSpan)
    document.body.appendChild(btn);

    renderStatus();

    btn.addEventListener('click', () => {
      if (window.currBookmark) {
        // 点击 mark as finished, 标签已经存在，删除该书签
        // check 所有heading
        window.groups.forEach(({ heading }) => {
          // heading
          var xPath = heading.getAttribute('frXPath');
          var target = heading.querySelector('input:first-child')
          target.checked = true;
          checkboxChange({ target }, xPath);
        })
        window.frData.done = window.frData.all;
        renderStatus();
        chrome.bookmarks.remove(window.currBookmark.id, renderStatus);
        window.currBookmark = null;
      } else {
        getOrCreateFolder().then((folder) => {
          // 点击read later， 如果书签不存在，创建书签，放到 read later 文件夹中
          chrome.bookmarks.create({
            parentId: folder.id,
            title: `${document.title} (${window.frData.done}/${window.frData.all})`,
            url: location.href
          }, (it) => {
            window.currBookmark = it;
            renderStatus();
            chrome.bookmarks.notify('Added it to bookmark successfully!')
          });
        })
      }
    });
  }

  function checkboxChange(e, xPath) {
    e.stopPropagation && e.stopPropagation();
    window.frData[xPath] = e.target.checked;
    if (window.frData[xPath]) {
      window.frData.done++;
    } else {
      window.frData.done--;
    }
    renderStatus();
    updateData();
  }
  // 给每个headings 添加checkbox，id，name 叫做 ${xpath}-checkbox
  function addCheckbox(xPath, heading) {
    var ck = document.createElement('input');
    ck.type = 'checkbox';
    ck.name = ck.id = xPath + '-checkbox';
    ck.classList.add('fr-checkbox')
    ck.checked = window.frData[xPath] || false;
    // 选中相应的checkbox, 调用updateBookmark函数
    ck.addEventListener('click', (e) => checkboxChange(e, xPath))
    heading.insertBefore(ck, heading.childNodes[0])
  }

  function groupByHeading(headings) {
    if (window.groups) {
      return window.groups;
    }
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

  if (!window.executed) {
    // 第二次点击的时候，不需要再做这些事了
    chrome.bookmarks = {
      create(payload, cb) {
        chrome.runtime.sendMessage({ action: 'create', payload }, function (response) {
          cb(response.data);
        });
      },
      getSubTree(id, cb) {
        chrome.runtime.sendMessage({ action: 'getSubTree', payload: id }, function (response) {
          cb(response.data);
        });
      },
      remove(id, cb) {
        chrome.runtime.sendMessage({ action: 'remove', payload: id }, function (response) {
          cb();
        });
      },
      update(id, item) {
        chrome.runtime.sendMessage({ action: 'update', payload: { id, item } });
      },
      notify(title) {
        var msg = document.createElement('div');
        msg.classList.add('fr-msg');
        msg.innerText = title;
        document.body.appendChild(msg);
        setTimeout(() => {
          msg.remove();
        }, 3000)
      },
    }
    var headers = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5"));
    var pathMap = window.pathMap = new Map();
    // 从localStorage fr-data种获取数据
    window.frData = JSON.parse(localStorage.getItem('fr-data') || '{}');
    window.frData.all = headers.length;
    window.frData.done = 0;
    headers.forEach((heading) => {
      var { xPath, path } = getXPath(heading);
      // 保存一个map，key为xpath，值为path （不包含body）
      pathMap.set(xPath, path);
      // 添加frXPath属性，里面存的是它的xpath
      heading.setAttribute('frXPath', xPath);
      // 根据localStorage里的数据初始化value
      addCheckbox(xPath, heading);
      if (window.frData[xPath]) {
        window.frData.done++;
      }
    })

    getCurrBookmark().then(({ currBookmark }) => {
      // 添加一个浮动的button，展示 （done/all）, hover上去，提示 mark as finished
      addReadLater(currBookmark);
    }).catch(() => {
      // 添加一个浮动的button，展示 （done/all）, hover上去，提示 read later
      addReadLater();
    });
    var groups = window.groups = groupByHeading(headers);
  }
  window.groups.forEach(item => {
    var { heading: it, children } = item;
    it.classList.toggle("fr-collapsed");
    if (!window.executed) {
      it.addEventListener("click", () => {
        it.classList.toggle("fr-collapsed");
        children.forEach(subIt => {
          subIt.classList.toggle("fr-hidden");
        })
      });
    }

    children.forEach(subIt => {
      subIt.classList.toggle("fr-hidden");
    })
  })

  console.log('window.executed', window.executed);
  window.executed = true;
}
// init();
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: init
  });
});

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    console.log(sender.tab ?
      "from a content script:" + sender.tab.url :
      "from the extension");
    const { action, payload } = request;
    const sendResponseWrap = (data) => {
      console.log('tree data', data);
      sendResponse({ data });
    }
    if (action === "update") {
      chrome.bookmarks.update(payload.id, payload.item, sendResponseWrap)
    } else if (action === "remove") {
      chrome.bookmarks.remove(payload, sendResponseWrap)
    } else if (action === "create") {
      chrome.bookmarks.create(payload, sendResponseWrap)
    } else if (action === "getSubTree") {
      chrome.bookmarks.getSubTree(payload, sendResponseWrap)
    }
    return true;
  }
);
