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
  var headers = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5"));
  var first = headers[0];
  var parent = first.parentNode;
  var allChildren = Array.from(parent.children);
  var headerReg = /^H\d$/;
  allChildren.forEach((it, idx) => {
    if (headerReg.test(it.tagName)) {
      it.classList.toggle("collapsed");
      it.addEventListener("click", () => {
        // siblings to be invisible
        it.classList.toggle("collapsed");
        var nxt = it.nextElementSibling;
        while (!!nxt && !headerReg.test(nxt.tagName)) {
          nxt = nxt.nextElementSibling;
          nxt.classList.toggle("hidden");
        }
      });
    } else {
      it.classList.toggle("hidden");
    }
  });
}

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: init
  });
});
