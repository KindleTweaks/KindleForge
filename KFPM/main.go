/*
    KFPM
    KindleForge Package Manager

    Simple Package Installing Solution For KindleForge
*/

package main

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "os/exec"
    "strings"
)

const (
    registryURL   = "https://raw.githubusercontent.com/polish-penguin-dev/KindleForge/refs/heads/master/KFPM/Registry/registry.json"
    registryBase  = "https://raw.githubusercontent.com/polish-penguin-dev/KindleForge/refs/heads/master/KFPM/Registry/"
    installedFile = "/mnt/us/.KFPM/installed.txt"
)

type Package struct {
    Name        string `json:"name"`
    Uri         string `json:"uri"`
    Description string `json:"description"`
    Author      string `json:"author"`
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
        pkg := args[1]

        // validate package ID
        if !validPackageID(pkg) {
            fmt.Println("[KFPM] Invalid Package ID!")
            return
        }

        if runScript(pkg, "install") {
            fmt.Println("[KFPM] Install Success!")
            appendInstalled(pkg)
        } else {
            fmt.Println("[KFPM] Install Failure!")
        }

    case "-r", "-u":
        if len(args) < 2 {
            fmt.Println("Error: -r/-u Requires A Package Name!")
            return
        }
        pkg := args[1]

        if !isInstalled(pkg) {
            fmt.Println("[KFPM] Package ID Not Installed.")
            return
        }

        if runScript(pkg, "uninstall") {
            fmt.Println("[KFPM] Removal Success!")
            removeInstalled(pkg)
        } else {
            fmt.Println("[KFPM] Removal Failure!")
        }

    case "-l":
        listInstalled()

    case "-a":
        listAvailable()

    default:
        fmt.Println("Unknown Option:", args[0])
        help()
    }
}

func help() {
    fmt.Println(`KindleForge Package Manager
====================
v1.0, made by Penguins184

kfpm -i <ID>         Installs Package
kfpm -r/-u <ID>      Removes/Uninstalls Package
kfpm -l              Lists Installed Packages
kfpm -a              Lists All Available Packages
`)
}

//Ensure Data Directory Exists
func ensureInstalledDir() {
    os.MkdirAll("/mnt/us/.KFPM", 0755)
}

//Install/Uninstall Runners
func runScript(pkg, action string) bool {
    url := fmt.Sprintf("%s%s/%s.sh", registryBase, pkg, action)
    cmd := exec.Command("sh", "-c", "curl -sSL "+url+" | sh")
    err := cmd.Run()
    return err == nil
}

//Append Package To List
func appendInstalled(pkg string) {
    //Duplicates
    if isInstalled(pkg) {
        return
    }
    f, err := os.OpenFile(installedFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
    if err != nil {
        return
    }
    defer f.Close()
    f.WriteString(strings.TrimSpace(pkg) + "\n")
}

//Remove Package From List
func removeInstalled(pkg string) {
    data, err := os.ReadFile(installedFile)
    if err != nil {
        return
    }
    lines := strings.Split(strings.TrimSpace(string(data)), "\n")
    out := []string{}
    for _, line := range lines {
        if line != pkg && line != "" {
            out = append(out, line)
        }
    }
    os.WriteFile(installedFile, []byte(strings.Join(out, "\n")), 0644)
}

//List Installed Packages
func listInstalled() {
    data, err := os.ReadFile(installedFile)
    if err != nil || len(strings.TrimSpace(string(data))) == 0 {
        fmt.Println("[KFPM] No Installed Packages Found!")
        return
    }

    lines := strings.Split(strings.TrimSpace(string(data)), "\n")

    fmt.Println("Installed Packages:")
    for i, line := range lines {
        if line != "" {
            fmt.Printf("%d. %s\n", i+1, line)
        }
    }
}

//List Available Packages From Remote
func listAvailable() {
    pkgs := fetchRegistry()
    if pkgs == nil {
        return
    }

    fmt.Println("Available Packages:")
    for i, p := range pkgs {
        fmt.Printf("%d. %s\n", i+1, p.Name)
        fmt.Printf("    - Description: %s\n", p.Description)
        fmt.Printf("    - Author: %s\n", p.Author)
        fmt.Printf("    - ID: %s\n\n", p.Uri)
    }
}

//Helpers
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

func validPackageID(id string) bool {
    pkgs := fetchRegistry()
    if pkgs == nil {
        return false
    }
    for _, p := range pkgs {
        if p.Uri == id {
            return true
        }
    }
    return false
}

func isInstalled(id string) bool {
    data, err := os.ReadFile(installedFile)
    if err != nil {
        return false
    }
    lines := strings.Split(strings.TrimSpace(string(data)), "\n")
    for _, line := range lines {
        if line == id {
            return true
        }
    }
    return false
}
