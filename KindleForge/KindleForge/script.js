/*
  KindleForge
  "Do not ask me what is here, for I have no idea" - penguins184

  Last Updated 10/25 — fixed installed list parsing, event handling, and undefined installs.
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

window.kindle.appmgr.ongo = function() {
  update();
  window.kindle.messaging.receiveMessage("systemMenuItemSelected", function(eventType, id) {
    if (id === "KFORGE_RELOAD") window.location.reload();
  });
};

var apps = [];
var lock = false;

function _fetch(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      try {
        apps = JSON.parse(xhr.responseText);
        if (cb) cb();
        else init();
      } catch (e) {
        console.log("JSON parse failed", e);
      }
    }
  };
  xhr.send();
}

function _file(url) {
  return new Promise(function(resolve) {
    var iframe = document.createElement("iframe");
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.addEventListener("load", function(e) {
      var src = e.target.contentDocument.documentElement.innerHTML;
      e.target.remove();
      var clean = src
        .replace(/<[^>]+>/g, "")   // strip HTML tags
        .replace(/\r/g, "\n")
        .replace(/\n+/g, "\n")
        .trim();
      resolve(clean);
    });
    setTimeout(function() { iframe.remove(); }, 2000);
  });
}

function init() {
  _file("file:///mnt/us/.KFPM/installed.txt").then(function(data) {
    // Normalize weird formatting and join wrapped lines
    var joined = data.replace(/\d+\.\s*/g, "\n").trim();
    var installed = joined.split(/\n+/).map(function(line) {
      return line.replace(/^\d+\.\s*/, "").trim();
    }).filter(Boolean);
    render(installed);
  });
}

function render(installed) {
  var icons = {
    download: "<svg class='icon' viewBox='0 0 24 24'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'></path><polyline points='7 10 12 15 17 10'></polyline><line x1='12' y1='15' x2='12' y2='3'></line></svg>",
    progress: "<svg class='icon' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10' stroke='currentColor' fill='none'></circle></svg>",
    x: "<svg class='icon' viewBox='0 0 24 24'><line x1='18' y1='6' x2='6' y2='18'></line><line x1='6' y1='6' x2='18' y2='18'></line></svg>"
  };

  var container = document.getElementById("apps");
  while (container.firstChild) container.removeChild(container.firstChild);

  function makeButton(name, isInstalled) {
    var btn = document.createElement("button");
    btn.className = "install-button";
    btn.setAttribute("data-name", name);
    btn.setAttribute("data-installed", isInstalled ? "true" : "false");
    btn.innerHTML = (isInstalled ? icons.x : icons.download) + 
                    (isInstalled ? " Uninstall Application" : " Install Application");
    return btn;
  }

  for (var i = 0; i < apps.length; i++) {
    var app = apps[i];
    var name = app.name || app.Uri || ("App" + i);
    var isInstalled = installed.indexOf(name) !== -1 || installed.indexOf(app.Uri) !== -1;

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

    var btn = makeButton(name, isInstalled);

    card.appendChild(header);
    card.appendChild(pDesc);
    card.appendChild(btn);
    container.appendChild(card);
  }

  var buttons = container.querySelectorAll(".install-button");
  for (var j = 0; j < buttons.length; j++) {
    (function(idx) {
      buttons[idx].addEventListener("click", function() {
        var btn = this;
        var name = btn.getAttribute("data-name");
        var wasInstalled = btn.getAttribute("data-installed") === "true";

        if (lock) {
          btn.innerHTML = icons.progress + " Please wait...";
          setTimeout(function() {
            btn.innerHTML = (wasInstalled ? icons.x : icons.download) +
                            (wasInstalled ? " Uninstall Application" : " Install Application");
          }, 2000);
          return;
        }

        lock = true;
        btn.disabled = true;

        var action = wasInstalled ? "-r" : "-i";
        btn.innerHTML = icons.progress + (wasInstalled ? " Uninstalling " : " Installing ") + name + "...";

        var eventName = wasInstalled ? "appUninstallStatus" : "appInstallStatus";
        (window.kindle || top.kindle).messaging.receiveMessage(eventName, function(eventType, data) {
          lock = false;
          btn.disabled = false;

          var success = (typeof data === "string" && data.indexOf("success") !== -1);
          if (success) {
            btn.setAttribute("data-installed", wasInstalled ? "false" : "true");
            btn.innerHTML = (wasInstalled ? icons.download : icons.x) +
                            (wasInstalled ? " Install Application" : " Uninstall Application");
          } else {
            btn.innerHTML = icons.x + (wasInstalled ? " Failed to Uninstall " : " Failed to Install ") + name + "!";
          }
        });

        (window.kindle || top.kindle).messaging.sendStringMessage(
          "com.kindlemodding.utild",
          "runCMD",
          "eips 1 25 'UTILD WORKING'"
        );
        (window.kindle || top.kindle).messaging.sendStringMessage(
          "com.kindlemodding.utild",
          "runCMD",
          "/var/local/mesquite/KindleForge/assets/KFPM " + action + " " + name
        );
      });
    })(j);
  }
}

document.addEventListener("DOMContentLoaded", function() {
  _fetch("https://raw.githubusercontent.com/polish-penguin-dev/KindleForge/refs/heads/master/KFPM/Registry/registry.json");
  document.getElementById("status").innerText = "JS Working!";
});
