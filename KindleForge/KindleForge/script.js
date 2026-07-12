
var deviceABI = "hf";
var pkgs = [];
var lock = false;
var cards = [];
var cIndex = 0;

function getKindle() {
  if (typeof window !== "undefined" && window.kindle) {
    return window.kindle;
  }
  try {
    if (typeof window !== "undefined" && window.top && window.top.kindle) {
      return window.top.kindle;
    }
  } catch (e) { }
  return null;
}

var kindleRef = getKindle();

function translateABI(rawAbi) {
  if (!rawAbi) return "hf";
  var clean = rawAbi.replace(/[^a-zA-Z0-9_\-]/g, "").toLowerCase().trim();
  if (clean === "hf" || clean === "sf") return clean;
  if (clean.indexOf("armv7") !== -1 || clean.indexOf("v7") !== -1) return "hf";
  if (clean.indexOf("aarch64") !== -1 || clean.indexOf("arm64") !== -1) return "hf";
  return "hf";
}

function update() {
  var kRef = getKindle();
  if (!kRef) return;

  var systemMenu = {
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
  };

  if (kRef.chrome && kRef.chrome.isDecanterChromeEnabled) {
    var chromebar = {
      "appId": "xyz.penguins184.kindleforge",
      "topNavBar": {
        "template": "title",
        "title": "KindleForge",
        "buttons": [
          { "id": "KPP_MORE", "state": "enabled", "handling": "system" },
          { "id": "KPP_CLOSE", "state": "enabled", "handling": "system" }
        ]
      }
    };
    chromebar.systemMenu = systemMenu;
    kRef.messaging.sendMessage("com.lab126.chromebar", "configureChrome", chromebar);
  } else if (kRef.messaging) {
    var pillowbar = {
      "appId": "xyz.penguins184.kindleforge",
      "searchBar": {
        "clientParams": {
          "profile": {
            "name": "default",
            "buttons": [
              { "id": "menu", "state": "enabled", "handling": "system" }
            ]
          }
        }
      }
    };
    pillowbar.systemMenu = systemMenu;
    kRef.messaging.sendMessage("com.lab126.pillow", "configureChrome", pillowbar);
  }
}

if (kindleRef && kindleRef.appmgr) {
  kindleRef.appmgr.ongo = function () {
    update();
    if (kindleRef.messaging) {
      kindleRef.messaging.receiveMessage("systemMenuItemSelected", function (eventType, id) {
        if (id === "KFORGE_REFRESH") {
          showLoading("Atualizando repositório...");

          pkgs = [];
          lock = false;

          _fetch(
            "https://kf.penguins184.xyz/registry.json",
            function () {
              showLoading("Lendo pacotes instalados...");
              _file("file:///mnt/us/.KFPM/installed.txt").then(function (data) {
                var joined = data.replace(/\d+\.\s*/g, "\n").trim();
                var installed = joined.split(/\n+/).map(function (line) {
                  return line.replace(/^\d+\.\s*/, "").trim();
                }).filter(Boolean);
                render(installed);
              });
            }
          );
        } else if (id === "KFORGE_UPDATE") {
          kindleRef.messaging.sendStringMessage("com.kindlemodding.utild", "runCMD", "curl https://kf.penguins184.xyz/update.sh | sh");
        } else if (id === "KFORGE_RELOAD") {
          window.location.reload();
        }
      });
    }
  };
}

if (kindleRef && kindleRef.net) {
  kindleRef.net.ensureConnection("all", false, function (response) {
    if (response === "failure-user-canceled" || response === "failure-user-canceled-wifi-popup" || response === "failure-prompt-disallowed") {
      if (kindleRef.appmgr) {
        kindleRef.appmgr.start("com.lab126.booklet.home");
      }
      setTimeout(function () {
        if (kindleRef.messaging) {
          kindleRef.messaging.sendStringMessage("com.kindlemodding.utild", "runCMD", "killall mesquite");
        }
      }, 500);
      return;
    }
  });
}

var elems = document.getElementsByClassName("card");
for (var i = 0; i < elems.length; i++) {
  cards.push(elems[i]);
}

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

window.addEventListener("mousewheel", function (e) {
  e.preventDefault();
  if (e.wheelDeltaY > 0) prev();
  else if (e.wheelDeltaY < 0) next();
});

function getPackage(pkgId, pkgsJson) {
  for (var i = 0; i < pkgsJson.length; i++) {
    var pkg = pkgsJson[i];
    if (pkg.uri === pkgId) return pkg;
  }
  return null;
}

function isPackageSupported(pkgsJson, pkg, loopedDeps) {
  if (loopedDeps.indexOf(pkg.uri) !== -1) return false;

  var pkgABI = pkg.ABI || pkg.abi;
  if (pkgABI !== undefined && pkgABI !== null && pkgABI !== "") {
    if (typeof pkgABI === "string") {
      if (pkgABI !== "any" && pkgABI !== "all" && pkgABI.indexOf(deviceABI) === -1) {
        return false;
      }
    } else if (Array.isArray(pkgABI)) {
      if (pkgABI.length > 0 && pkgABI.indexOf("any") === -1 && pkgABI.indexOf("all") === -1 && pkgABI.indexOf(deviceABI) === -1) {
        return false;
      }
    }
  }

  loopedDeps = loopedDeps.slice();
  loopedDeps.push(pkg.uri);

  var deps = pkg.dependencies || [];
  for (var i = 0; i < deps.length; i++) {
    var dep = getPackage(deps[i], pkgsJson);
    if (dep == null) {
      continue;
    }
    if (dep.uri === pkg.uri) return false;
    var isSupported = isPackageSupported(pkgsJson, dep, loopedDeps);
    if (!isSupported) return false;
  }
  return true;
}

function showLoading(msg) {
  var container = document.getElementById("packages");
  if (container) {
    var iconProgress = "<svg class='icon' style='width: 2em; height: 2em; margin-bottom: 0.5rem;' viewBox='0 0 24 24'>" +
      "<path d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'></path>" +
      "<path d='M21 3v5h-5'></path>" +
      "<path d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'></path>" +
      "<path d='M3 21v-5h5'></path>" +
      "</svg>";
    container.innerHTML = "<div class='card' style='text-align: center; padding: 2.5rem;'>" +
      iconProgress +
      "<p class='description' style='font-weight: 500; font-size: 1rem; margin-top: 0.5rem;'>" + (msg || "Carregando...") + "</p>" +
      "</div>";
  }
}

function showError(msg) {
  var container = document.getElementById("packages");
  if (container) {
    container.innerHTML = "<div class='card' style='text-align: center; padding: 2rem; border-color: #ef4444;'>" +
      "<h2 class='title' style='color: #ef4444; margin-bottom: 0.5rem;'>Erro de Conexão</h2>" +
      "<p class='description'>" + msg + "</p>" +
      "</div>";
  }
}

function _fetch(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.timeout = 10000;

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          var tempPkgs = JSON.parse(xhr.responseText);
          pkgs = [];
          for (var i = 0; i < tempPkgs.length; i++) {
            var pkg = tempPkgs[i];
            if (!isPackageSupported(tempPkgs, pkg, [])) continue;
            pkgs.push(pkg);
          }
          if (cb) cb();
          else init();
        } catch (e) {
          console.log("JSON Parse Failed", e);
          showError("Falha ao analisar o banco de dados (JSON inválido).");
        }
      } else {
        if (xhr.status === 0) {
          showError("Erro de SSL ou CORS (HTTP 0). O certificado HTTPS do servidor pode ser incompatível com este Kindle antigo, ou o dispositivo está sem internet.");
        } else {
          showError("Não foi possível alcançar o servidor de pacotes (HTTP " + xhr.status + "). Verifique sua conexão.");
        }
      }
    }
  };

  xhr.onerror = function () {
    showError("Falha de rede. Certifique-se de que o Kindle está conectado ao Wi-Fi.");
  };

  xhr.ontimeout = function () {
    showError("Tempo limite esgotado ao buscar pacotes. Tente recarregar.");
  };

  xhr.send();
}

function _file(url) {
  return new Promise(function (resolve) {
    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    var completed = false;

    function done(data) {
      if (completed) return;
      completed = true;
      try {
        iframe.remove();
      } catch (err) { }
      resolve(data || "");
    }

    iframe.addEventListener("load", function (e) {
      try {
        var doc = e.target.contentDocument || e.target.contentWindow.document;
        var src = doc.documentElement.innerHTML;
        var clean = src
          .replace(/<[^>]+>/g, "")
          .replace(/\r/g, "\n")
          .replace(/\n+/g, "\n")
          .trim();
        done(clean);
      } catch (err) {
        done("");
      }
    });

    setTimeout(function () {
      done("");
    }, 1500);
  });
}

function init() {
  showLoading("Lendo pacotes instalados...");
  _file("file:///mnt/us/.KFPM/installed.txt").then(function (data) {
    var joined = data.replace(/\d+\.\s*/g, "\n").trim();
    var installed = joined.split(/\n+/).map(function (line) {
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
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  if (pkgs.length === 0) {
    container.innerHTML = "<div class='card' style='text-align: center; padding: 2rem;'>" +
      "<p class='description'>Nenhum pacote compatível encontrado no repositório.</p>" +
      "</div>";
    return;
  }

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

    if (pkg.tags && pkg.tags.length > 0) {
      for (var t = 0; t < pkg.tags.length; t++) {
        var tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = pkg.tags[t];
        tBox.appendChild(tag);
      }
    }

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
    buttons[j].addEventListener("click", function () {
      var btn = this;
      var pkgId = btn.getAttribute("data-id");
      var name = btn.getAttribute("data-name");
      var wasInstalled = btn.getAttribute("data-installed") === "true";
      var kRef = getKindle();

      if (lock) {
        btn.innerHTML = icons.progress + " Another Operation In Progress...";
        btn.blur(); btn.offsetHeight;

        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            btn.offsetHeight;
          });
        });

        setTimeout(function () {
          btn.innerHTML =
            (wasInstalled ? icons.x : icons.download) +
            (wasInstalled ? " Uninstall Package" : " Install Package");
        }, 2000);

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

      btn.offsetHeight;

      var eventName = wasInstalled ? "packageUninstallStatus" : "packageInstallStatus";
      if (kRef && kRef.messaging) {
        kRef.messaging.receiveMessage(
          eventName,
          function (eventType, data) {
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

              if (!wasInstalled) {
                var deps = getPackage(pkgId, pkgs).dependencies || [];
                for (var i = 0; i < buttons.length; i++) {
                  var depBtn = buttons[i];
                  var depId = depBtn.getAttribute("data-id");
                  if (deps.indexOf(depId) === -1) continue;
                  depBtn.innerHTML = icons.x + " Uninstall Package";
                  btn.offsetHeight;
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

        setTimeout(function () {
          kRef.messaging.sendStringMessage(
            "com.kindlemodding.utild",
            "runCMD",
            "/var/local/mesquite/KindleForge/binaries/KFPM " + action + " " + pkgId
          );
        }, 10);
      }
    });
  }

  cards = [];
  var elems2 = document.getElementsByClassName("card");
  for (var k = 0; k < elems2.length; k++) cards.push(elems2[k]);
  gCard(cIndex);
}

function performABIDetection(onComplete) {
  var kRef = getKindle();

  try {
    var ua = navigator.userAgent || "";
    if (ua.indexOf("arm") !== -1 || ua.indexOf("aarch64") !== -1) {
      deviceABI = "hf";
    }
  } catch (err) { }

  document.getElementById("abi-status").innerText = "ABI: " + deviceABI;

  var finished = false;
  function triggerComplete() {
    if (finished) return;
    finished = true;
    if (onComplete) onComplete();
  }

  if (kRef && kRef.messaging) {
    kRef.messaging.receiveMessage("deviceABI", function (eventType, ABI) {
      if (ABI && ABI.trim()) {
        deviceABI = translateABI(ABI);
        document.getElementById("abi-status").innerText = "ABI: " + deviceABI;
        triggerComplete();
      }
    });

    kRef.messaging.sendStringMessage(
      "com.kindlemodding.utild",
      "runCMD",
      "/var/local/mesquite/KindleForge/binaries/KFPM -abi > /mnt/us/.KFPM/abi.txt || uname -m > /mnt/us/.KFPM/abi.txt"
    );

    setTimeout(function () {
      _file("file:///mnt/us/.KFPM/abi.txt").then(function (fileContent) {
        var val = translateABI(fileContent);
        if (val) {
          deviceABI = val;
          document.getElementById("abi-status").innerText = "ABI: " + deviceABI;
        }
        triggerComplete();
      }).catch(function () {
        triggerComplete();
      });
    }, 450);
  } else {
    setTimeout(triggerComplete, 100);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("js-status").innerText = "JS Working!";

  showLoading("Iniciando KindleForge...");

  performABIDetection(function () {
    showLoading("Atualizando repositório...");
    _fetch("https://kf.penguins184.xyz/registry.json");
  });
});