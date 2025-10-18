/*
  KindleForge
  Kindle GUI Appstore

  Last Updated 10/25
*/

function update() {
  var chromebar = {
    "appId": "xyz.penguins184.kindleforge",
    "topNavBar": {
      "template": "title",
      "title": "KindleForge",
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
              "id": "KFORGE_REFRESH",
              "state": "enabled",
              "handling": "notifyApp",
              "label": "Refresh Packages",
              "position": 0
            },
            {
              "id": "KFORGE_UPDATE",
              "state": "enabled",
              "handling": "notifyApp",
              "label": "Update KForge",
              "position": 1
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
    if (id === "KFORGE_REFRESH") {
      var container = document.getElementById("packages");
      if (container) while (container.firstChild) container.removeChild(container.firstChild);

      pkgs = [];

      _fetch(
        "https://raw.githubusercontent.com/KindleTweaks/KindleForge/refs/heads/master/KFPM/Registry/registry.json",
        function() {
          _file("file:///mnt/us/.KFPM/installed.txt").then(function(data) {
            var joined = data.replace(/\d+\.\s*/g, "\n").trim();
            var installed = joined.split(/\n+/).map(function(line) {
              return line.replace(/^\d+\.\s*/, "").trim();
            }).filter(Boolean);
            render(installed);
          });
        }
      );
    } else if (id === "KFORGE_UPDATE") {
      window.kindle.messaging.sendStringMessage("com.kindlemodding.utild", "runCMD", "curl https://raw.githubusercontent.com/KindleTweaks/KindleForge/refs/heads/master/Extra/update.sh | sh");
    };
  });
};

var cards = [];
var elems = document.getElementsByClassName("card");
for (var i = 0; i < elems.length; i++) {
  cards.push(elems[i]);
}

var cIndex = 0;
var hash = document.location.hash.replace("#", "");
for (var j = 0; j < cards.length; j++) {
  if (cards[j].id === hash) {
    cIndex = j;
    break;
  }
}
if (cards.length > 0) window.scrollTo(0, cards[cIndex].offsetTop);

function gCard(index) {
  if (cards.length === 0) return;
  cIndex = Math.max(0, Math.min(cards.length - 1, index));
  window.scrollTo(0, cards[cIndex].offsetTop - 10);
  document.location.hash = cards[cIndex].id;
}

function next() {
  gCard(cIndex + 1);
}

function prev() {
  gCard(cIndex - 1);
}

window.addEventListener("mousewheel", function(e) {
  e.preventDefault();
  if (e.wheelDeltaY > 0) prev();
  else if (e.wheelDeltaY < 0) next();
});

var pkgs = [];
var lock = false;

var deviceABI = "";

function getPackage(pkgId, pkgsJson) {
  for (var i = 0; i < pkgsJson.length; i++) {
    var pkg = pkgsJson[i];
    if (pkg.uri === pkgId) return pkg;
  }
  return null;
}

function isPackageSupported(pkgsJson, pkg, loopedDeps) {

  if (loopedDeps.indexOf(pkg.uri) !== -1) return false;
  if (pkg.ABI.indexOf(deviceABI) === -1) return false;

  loopedDeps = loopedDeps.slice();
  loopedDeps.push(pkg.uri);
  
  var deps = pkg.dependencies || [];
  for (var i = 0; i < deps.length; i++) {
    var dep = getPackage(deps[i], pkgsJson);
    if (dep == null) return false;
    if (dep.uri === pkg.uri) return false;
    var isSupported = isPackageSupported(pkgsJson, dep, loopedDeps);
    if (!isSupported) return false;
  }
  return true;
}

function _fetch(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      try {
        var tempPkgs = JSON.parse(xhr.responseText);
        for (var i = 0; i < tempPkgs.length; i++) {
          var pkg = tempPkgs[i];      

          if (!isPackageSupported(tempPkgs, pkg, [])) continue;

          pkgs.push(pkg);
        }
        if (cb) cb();
        else init();
      } catch (e) {
        console.log("JSON Parse Failed", e);
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
        .replace(/<[^>]+>/g, "")
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
    progress:
      "<svg class='icon' viewBox='0 0 24 24'>" +
      "<path d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'></path>" +
      "<path d='M21 3v5h-5'></path>" +
      "<path d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'></path>" +
      "<path d='M3 21v-5h5'></path>" +
      "</svg>",
    x: "<svg class='icon' viewBox='0 0 24 24'><line x1='18' y1='6' x2='6' y2='18'></line><line x1='6' y1='6' x2='18' y2='18'></line></svg>"
  };

  var container = document.getElementById("packages");
  while (container.firstChild) container.removeChild(container.firstChild);

  function button(name, pkgId, isInstalled) {
    var btn = document.createElement("button");
    btn.className = "install-button";
    btn.setAttribute("data-name", name);
    btn.setAttribute("data-id", pkgId);
    btn.setAttribute("data-installed", isInstalled ? "true" : "false");
    btn.innerHTML =
      (isInstalled ? icons.x : icons.download) +
      (isInstalled ? " Uninstall Package" : " Install Package");
    return btn;
  }

  for (var i = 0; i < pkgs.length; i++) {
    var pkg = pkgs[i];
    var name = pkg.name || ("Package" + i);
    var pkgId = pkg.uri || pkg.Uri || pkg.name;
    var isInstalled = installed.indexOf(pkgId) !== -1;

    var card = document.createElement("article");
    card.className = "card";

    var header = document.createElement("div");
    header.className = "header";

    var tBox = document.createElement("div");
    tBox.className = "title-box";

    var h2 = document.createElement("h2");
    h2.className = "title";
    h2.textContent = pkg.name;

    var pAuth = document.createElement("p");
    pAuth.className = "author";
    pAuth.textContent = "by " + pkg.author;

    tBox.appendChild(h2);
    tBox.appendChild(pAuth);
    header.appendChild(tBox);

    var pDesc = document.createElement("p");
    pDesc.className = "description";
    pDesc.textContent = pkg.description;

    var btn = button(name, pkgId, isInstalled);

    card.appendChild(header);
    card.appendChild(pDesc);
    card.appendChild(btn);
    container.appendChild(card);
  }

  var buttons = container.querySelectorAll(".install-button");
  for (var j = 0; j < buttons.length; j++) {
    buttons[j].addEventListener("click", function() {
      var btn = this;
      var pkgId = btn.getAttribute("data-id");
      var name = btn.getAttribute("data-name");
      var wasInstalled = btn.getAttribute("data-installed") === "true";
    
      if (lock) {
        btn.innerHTML = icons.progress + " Another Operation In Progress...";
        btn.blur(); btn.offsetHeight; //Blur & Reflow

        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            btn.offsetHeight; //Ensure Reflow
          });
        });
        
        setTimeout(function() {
          btn.innerHTML =
            (wasInstalled ? icons.x : icons.download) +
            (wasInstalled ? " Uninstall Package" : " Install Package");
        }, 2000);
        
        setTimeout(function() {}, 50); //UI Update Time
        return;
      }
    
      lock = true;
      btn.disabled = true;
    
      var action = wasInstalled ? "-r" : "-i";
      btn.innerHTML =
        icons.progress +
        (wasInstalled ? " Uninstalling " : " Installing ") +
        name +
        "...";
      
      btn.offsetHeight; //Reflow
    
      var eventName = wasInstalled ? "packageUninstallStatus" : "packageInstallStatus";
      (window.kindle || top.kindle).messaging.receiveMessage(
        eventName,
        function(eventType, data) {
          lock = false;
          btn.disabled = false;
    
          var success =
            typeof data === "string" && data.indexOf("success") !== -1;
          if (success) {
            btn.setAttribute("data-installed", wasInstalled ? "false" : "true");
            btn.innerHTML =
              (wasInstalled ? icons.download : icons.x) +
              (wasInstalled
                ? " Install Package"
                : " Uninstall Package");
            
            // Update dependency buttons
            if (!wasInstalled) {
              var deps = getPackage(pkgId, pkgs).dependencies || [];
              for (var i = 0; i < buttons.length; i++) {
                var depBtn = buttons[i];
                var depId = depBtn.getAttribute("data-id");
                if (deps.indexOf(depId) === -1) continue;
                depBtn.innerHTML = icons.x + " Uninstall Package";
                btn.offsetHeight; //Reflow
              }
            }
            
          } else {
            btn.innerHTML =
              icons.x +
              (wasInstalled
                ? " Failed to Uninstall "
                : " Failed to Install ") +
              name +
              "!";
          }
        }
      );
    
      setTimeout(function() {
        (window.kindle || top.kindle).messaging.sendStringMessage(
          "com.kindlemodding.utild",
          "runCMD",
          "/var/local/mesquite/KindleForge/binaries/KFPM " + action + " " + pkgId
        );
      }, 10); //Give Time For UI Update
    });
  }

  cards = [];
  var elems2 = document.getElementsByClassName("card");
  for (var k = 0; k < elems2.length; k++) cards.push(elems2[k]);
  gCard(cIndex);
}

document.addEventListener("DOMContentLoaded", function() {
  (window.kindle || top.kindle).messaging.receiveMessage("deviceABI", function(eventType, ABI) {
    deviceABI = ABI;
    document.getElementById("abi-status").innerText = "ABI: " + ABI;
  });

  setTimeout(function() {
    (window.kindle || top.kindle).messaging.sendStringMessage(
      "com.kindlemodding.utild",
      "runCMD",
      "/var/local/mesquite/KindleForge/binaries/KFPM -abi"
    );
  }, 10);
  
  _fetch(
    "https://raw.githubusercontent.com/KindleTweaks/KindleForge/refs/heads/master/KFPM/Registry/registry.json"
  );
  document.getElementById("js-status").innerText = "JS Working!";
});
