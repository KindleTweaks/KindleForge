/*
   KFPM
   KindleForge Package Manager

   Simple Package Installing Solution For KindleForge
*/

package main

import (
    "encoding/json"
    "errors"
    "fmt"
    "io"
    "net/http"
    "os"
    "os/exec"
    "slices"
    "strings"
)

const (
    registryURL   = "https://raw.githubusercontent.com/KindleTweaks/KindleForge/refs/heads/master/KFPM/Registry/registry.json"
    registryBase  = "https://raw.githubusercontent.com/KindleTweaks/KindleForge/refs/heads/master/KFPM/Registry/"
    installedFile = "/mnt/us/.KFPM/installed.txt"
)

var (
    registry = fetchRegistry()
)

type Package struct {
    Name          string   `json:"name"`
    Uri           string   `json:"uri"`
    Description   string   `json:"description"`
    Author        string   `json:"author"`
    ABI           []string `json:"ABI"`
}

func main() {
    ensureInstalledDir()

    args := os.Args[1:]

    if len(args) == 0 {
        help()
        return
    }

    switch args[0] {
    case "-i":
        if len(args) < 2 {
            fmt.Println("Oops! -i Requires A Package Name!")
            return
        }
        pkgId := args[1]
        verbose := len(args) > 2 && args[2] == "-v"

        pkg, err := getPackage(pkgId)
        if err != nil {
            fmt.Println("[KFPM] Invalid Package ID!")
            return
        }

        if len(pkg.ABI) == 0 {
            pkg.ABI = []string{"sf", "hf"}
        }

        if !slices.Contains(pkg.ABI, fetchABI()) {
            fmt.Printf("[KFPM] Package '%s' Does Not Support Device ABI!\n", pkgId)
            return
        }

        if runScript(pkgId, "install", verbose) {
            fmt.Println("[KFPM] Install Success!")
            appendInstalled(pkgId)
            setStatus("packageInstallStatus", "success")
        } else {
            fmt.Println("[KFPM] Install Failure!")
            setStatus("packageInstallStatus", "failure")
        }

    case "-r", "-u":
        if len(args) < 2 {
            fmt.Println("Error: -r/-u Requires A Package Name!")
            return
        }
        pkg := args[1]
        verbose := len(args) > 2 && args[2] == "-v"

        if !isInstalled(pkg) {
            fmt.Println("[KFPM] Package ID Not Installed.")
            return
        }

        if runScript(pkg, "uninstall", verbose) {
            fmt.Println("[KFPM] Removal Success!")
            removeInstalled(pkg)
            setStatus("packageUninstallStatus", "success")
        } else {
            fmt.Println("[KFPM] Removal Failure!")
            setStatus("packageUninstallStatus", "failure")
        }

    case "-l":
        listInstalled()

    case "-a":
        listAvailable()

    case "-abi":
        ABI := fetchABI()
        fmt.Printf("[KFPM] ABI: %s\n", ABI)
        setStatus("deviceABI", ABI)

    default:
        fmt.Println("Unknown Option:", args[0])
        help()
    }
}

func help() {
    fmt.Println(`KindleForge Package Manager
====================
v1.0, made by Penguins184

kfpm -i <ID> [-v]    Installs Package
kfpm -r/-u <ID> [-v] Removes/Uninstalls Package
kfpm -l              Lists Installed Packages
kfpm -a              Lists All Available Packages
`)
}

// Ensure Data Directory Exists
func ensureInstalledDir() {
    os.MkdirAll("/mnt/us/.KFPM", 0755)
}

// Install/Uninstall Runners
func runScript(pkg, action string, verbose bool) bool {
    url := fmt.Sprintf("%s%s/%s.sh", registryBase, pkg, action)
    cmd := exec.Command("/bin/sh", "-c", "curl -fSL --progress-bar "+url+" | sh")

    if verbose {
        cmd.Stdout = os.Stdout
        cmd.Stderr = os.Stderr
    }

    err := cmd.Run()
    return err == nil
}

// Append Package To List
func appendInstalled(pkg string) {
    data, _ := os.ReadFile(installedFile)
    text := strings.TrimSpace(string(data))

    lines := strings.Split(text, "\n")
    for _, line := range lines {
        if strings.TrimSpace(line) == pkg {
            return
        }
    }

    f, err := os.OpenFile(installedFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
        return
    }
    defer f.Close()

    // Ensure Newline
    if len(text) > 0 && !strings.HasSuffix(text, "\n") {
        f.WriteString("\n")
    }

    f.WriteString(strings.TrimSpace(pkg) + "\n")
}

// Remove Package From List
func removeInstalled(pkg string) {
    data, err := os.ReadFile(installedFile)
    if err != nil {
        return
    }

    lines := strings.Split(strings.TrimSpace(string(data)), "\n")
    var out []string
    for _, line := range lines {
        trimmed := strings.TrimSpace(line)
        if trimmed != "" && trimmed != pkg {
            out = append(out, trimmed)
        }
    }

    os.WriteFile(installedFile, []byte(strings.Join(out, "\n")+"\n"), 0644)
}

// List Installed Packages
func listInstalled() {
    data, err := os.ReadFile(installedFile)
    if err != nil || len(strings.TrimSpace(string(data))) == 0 {
        fmt.Println("[KFPM] No Installed Packages Found!")
        return
    }

    lines := strings.Split(strings.TrimSpace(string(data)), "\n")
    fmt.Println("Installed Packages:")
    for i, line := range lines {
        trimmed := strings.TrimSpace(line)
        if trimmed != "" {
            fmt.Printf("%d. %s\n", i+1, trimmed)
        }
    }
}

// List Available Packages From Remote
func listAvailable() {
    pkgs := registry
    if pkgs == nil {
        return
    }

    fmt.Println("Available Packages:")
    for i, p := range pkgs {
        fmt.Printf("%d. %s\n", i+1, p.Name)
        fmt.Printf("    - Description: %s\n", p.Description)
        fmt.Printf("    - Author: %s\n", p.Author)
        fmt.Printf("    - ID: %s\n\n", p.Uri)
        fmt.Printf("    - ABI: %s\n\n", p.ABI)
    }
}

// Helpers
func fetchRegistry() []Package {
    resp, err := http.Get(registryURL)
    if err != nil {
        fmt.Println("[KFPM] Failed To Fetch Registry:", err)
        return nil
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    var pkgs []Package
    if err := json.Unmarshal(body, &pkgs); err != nil {
        fmt.Println("[KFPM] Invalid Registry Format:", err)
        return nil
    }
    return pkgs
}

func getPackage(id string) (Package, error) {
    for _, p := range registry {
        if p.Uri == id {
            return p, nil
        }
    }
    return Package{}, errors.New("Package Not Found!")
}

func isInstalled(id string) bool {
    data, err := os.ReadFile(installedFile)
    if err != nil {
        return false
    }
    lines := strings.Split(strings.TrimSpace(string(data)), "\n")
    for _, line := range lines {
        if strings.TrimSpace(line) == id {
            return true
        }
    }
    return false
}

func setStatus(prop string, status string) {
    exec.Command(
        "/bin/sh", "-c",
        fmt.Sprintf(`lipc-set-prop xyz.penguins184.kindleforge %s -s "%s"`, prop, status),
    ).Run()
}

func fetchABI() string {
    if _, err := os.Stat("/lib/ld-linux-armhf.so.3"); !os.IsNotExist(err) {
        return "hf"
    }
    return "sf"
}
