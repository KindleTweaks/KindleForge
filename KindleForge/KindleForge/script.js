/*
  KindleForge
  "Do not ask me what is here, for I have no idea" -penguins184

  Last Updated 10/25
*/

function update() {
  var chromebar = {
    "appId": "xyz.penguins184.kindleforge",
    "topNavBar": {
      "template": "title",
      "title": "App Store",
      "buttons": [
        { "id": "KPP_MORE", "state": "enabled", "handling": "system" },
        { "id": "KPP_CLOSE", "state": "enabled", "handling": "system" }
      ]
    },
    "systemMenu": {
      "clientParams": {
        "profile": {
          "name": "default",
          "items": [
            {
              "id": "KFORGE_RELOAD",
              "state": "enabled",
              "handling": "notifyApp",
              "label": "Reload",
              "position": 0
            }
          ],
          "selectionMode": "none",
          "closeOnUse": true
        }
      }
    }
  };
  window.kindle.messaging.sendMessage("com.lab126.chromebar", "configureChrome", chromebar);
}

window.kindle.appmgr.ongo = function(ctx) {
  update();
  window.kindle.messaging.receiveMessage("systemMenuItemSelected", function(type, id) {
    if (id === "KFORGE_RELOAD") {
      window.location.reload();
    }
  });
};

var apps = null;
var lock = false;

function _fetch(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      if (typeof cb === "function") {
        cb(xhr.responseText);
      } else {
        try {
          apps = JSON.parse(xhr.responseText);
          init();
        } catch (e) {}
      }
    }
  };
  xhr.send();
}

function _file(url) {
  return new Promise(function (resolve) {
    var iframe = document.createElement("iframe");
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.addEventListener("load", function (e) {
      var src = e.target.contentDocument.documentElement.innerHTML;
      e.target.remove();
      resolve(
        src
          .replace('<head></head><body><pre style="word-wrap: break-word; white-space: pre-wrap;">', "")
          .replace("</pre></body>", "")
          .replace("<head></head><body></body>", "")
      );
    });
    setTimeout(function () { iframe.remove(); }, 2000);
  });
}

function init() {
  //KFPM Install List
  _file("file:///mnt/us/.KFPM/installed.txt").then(function (data) {
    var installed = data.split(/\r?\n/).filter(function (ln) {
      return ln.trim() !== "";
    });
    render(installed);
  });
}

function render(installed) {
  var icons = {
    download: "<svg class='icon' viewBox='0 0 24 24'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'></path><polyline points='7 10 12 15 17 10'></polyline><line x1='12' y1='15' x2='12' y2='3'></line></svg>",
    progress: "<svg class='icon' viewBox='0 0 24 24'><path d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'></path><path d='M21 3v5h-5'></path><path d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'></path><path d='M3 21v-5h5'></path></svg>",
    x: "<svg class='icon' viewBox='0 0 24 24'><line x1='18' y1='6' x2='6' y2='18'></line><line x1='6' y1='6' x2='18' y2='18'></line></svg>"
  };

  var container = document.getElementById("apps");
  while (container.firstChild) container.removeChild(container.firstChild);

  function makeButton(name, isInst) {
    var btn = document.createElement("button");
    btn.className = "install-button";
    btn.setAttribute("data-name", name);
    btn.setAttribute("data-installed", isInst ? "true" : "false");
    btn.innerHTML = (isInst ? icons.x : icons.download) + (isInst ? " Uninstall Application" : " Install Application");
    return btn;
  }

  for (var i = 0; i < apps.length; i++) {
    var app = apps[i];
    var isInst = installed.indexOf(app.Uri) !== -1;

    var card = document.createElement("article");
    card.className = "card";

    var header = document.createElement("div");
    header.className = "header";

    var titleBox = document.createElement("div");
    titleBox.className = "title-box";

    var h2 = document.createElement("h2");
    h2.className = "title";
    h2.textContent = app.name;

    var pAuth = document.createElement("p");
    pAuth.className = "author";
    pAuth.textContent = "by " + app.author;

    titleBox.appendChild(h2);
    titleBox.appendChild(pAuth);
    header.appendChild(titleBox);

    var pDesc = document.createElement("p");
    pDesc.className = "description";
    pDesc.textContent = app.description;

    var btn = makeButton(app.Uri, isInst);

    card.appendChild(header);
    card.appendChild(pDesc);
    card.appendChild(btn);
    container.appendChild(card);
  }

  var buttons = container.querySelectorAll(".install-button");
  for (var j = 0; j < buttons.length; j++) {
    (function (idx) {
      buttons[idx].addEventListener("click", function () {
        var btn = this;
        var name = btn.getAttribute("data-name");
        var wasInst = btn.getAttribute("data-installed") === "true";

        if (lock) {
          btn.innerHTML = icons.x + (wasInst ? " Another Uninstall In Progress!" : " Another Download In Progress!");
          setTimeout(function () {
            btn.innerHTML = (wasInst ? icons.x : icons.download) + (wasInst ? " Uninstall Application" : " Install Application");
          }, 3000);
          return;
        }
        lock = true;
        btn.disabled = true;

        var action = wasInst ? "-r" : "-i";
        btn.innerHTML = icons.progress + (wasInst ? " Uninstalling " : " Installing ") + name + "...";

        (window.kindle || top.kindle).messaging.sendStringMessage(
          "com.kindlemodding.utild",
          "runCMD",
          "/var/local/mesquite/KindleForge/assets/KFPM " + action + " " + name
        );

        //Wait 4 Event
        var eventName = wasInst ? "appUninstallStatus" : "appInstallStatus";
        (window.kindle || top.kindle).messaging.receiveMessage(eventName, function (prop, data) {
          lock = false;
          btn.disabled = false;
          var success = false;
          if (typeof data === "string" && data.indexOf("success") !== -1) {
            success = true;
          } else if (typeof data === "object" && data.status === "success") {
            success = true;
          }

          if (success) {
            btn.setAttribute("data-installed", wasInst ? "false" : "true");
            btn.innerHTML = (wasInst ? icons.download : icons.x) + (wasInst ? " Install Application" : " Uninstall Application");
          } else {
            btn.innerHTML = icons.x + (wasInst ? " Failed to Uninstall " : " Failed to Install ") + name + "!";
          }
        });
      });
    })(j);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  _fetch("https://raw.githubusercontent.com/polish-penguin-dev/KindleForge/refs/heads/master/KFPM/Registry/registry.json");
  document.getElementById("status").innerText = "JS Working!";
});
