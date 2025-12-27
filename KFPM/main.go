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
	installedFile = "/mnt/us/.KFPM/installed.txt"
	registryFile  = "/mnt/us/.KFPM/repositories.txt"
)

var (
	registry  []Package
	installed []string
	ABI       string
)

type Package struct {
	Name         string   `json:"name"`
	Uri          string   `json:"uri"`
	Dependencies []string `json:"dependencies"`
	Description  string   `json:"description"`
	Author       string   `json:"author"`
	ABI          []string `json:"ABI"`
	Repo         string   `json:"-"`
}

func main() {
	ensureInstalledDir()
	checkRepositoryFile()

	registry = fetchAllRegistries()
	installed = getInstalled()
	ABI = fetchABI()
	args := os.Args[1:]

	if len(args) == 0 {
		help()
		return
	}

	verbose := len(args) > 2 && args[2] == "-v"

	switch args[0] {
	case "-i":
		if len(args) < 2 {
			fmt.Println("Oops! -i Requires A Package Name!")
			return
		}
		pkgId := args[1]
		err := install(pkgId, verbose, []string{})
		if err != nil {
			fmt.Printf("[KFPM] %s\n", err.Error())
		}

	case "-r", "-u":
		if len(args) < 2 {
			fmt.Println("Error: -r/-u Requires A Package Name!")
			return
		}
		pkgId := args[1]

		if !isInstalled(pkgId) {
			fmt.Println("[KFPM] Package ID Not Installed.")
			return
		}
		pkg, err := getPackage(pkgId)
		if err != nil {
			fmt.Println("package not found main case ru", err)
			return
		}

		if runScript(pkg, "uninstall", verbose) {
			fmt.Println("[KFPM] Removal Success!")
			removeInstalled(pkgId)
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
v1.1b, made by Penguins184, ThatPotatoDev

kfpm -i <ID> [-v]    Installs Package
kfpm -r/-u <ID> [-v] Removes/Uninstalls Package
kfpm -l              Lists Installed Packages
kfpm -a              Lists All Available Packages`)
}

// Ensure Data Directory Exists
func ensureInstalledDir() {
	os.MkdirAll("/mnt/us/.KFPM", 0755)
}

func checkRepositoryFile() {
	_, err := os.Stat(registryFile)

	if os.IsNotExist(err) {
		f, err := os.OpenFile(registryFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			fmt.Println("error opening registry file", err)
			return
		}
		defer f.Close()
		defaultRepoURL := "https://kf.penguins184.xyz/"
		_, err2 := f.WriteString(defaultRepoURL)

		if err2 != nil {
			fmt.Println("error writing default repo file", err2)
			return
		}
	}
}

func fetchAllRegistries() []Package {
	data, err := os.ReadFile(registryFile)
	if err != nil {
		fmt.Println("Couldn't open registry list, fetchallregistires", err)
		return nil
	}

	urls := strings.Split(strings.TrimSpace(string(data)), "\n")
	var allPackageList []Package

	for _, url := range urls {
		baseURL := strings.TrimSpace(url)
		//blank line
		if baseURL == "" {
			continue
		}

		pkgs := fetchRegistry(baseURL)
		if pkgs != nil {
			allPackageList = append(allPackageList, pkgs...)
		}
	}
	return allPackageList
}

func install(pkgId string, verbose bool, loopedDeps []string) error {

	if isInstalled(pkgId) {
		fmt.Printf("[KFPM] Package '%s' Is Already Installed, Skipping\n", pkgId)
		return nil
	}

	if slices.Contains(loopedDeps, pkgId) {
		return errors.New("Dependency Loop Detected, Aborting")
	}

	loopedDeps = append(loopedDeps, pkgId)

	pkg, err := getPackage(pkgId)

	if err != nil {
		return fmt.Errorf("Invalid Package ID '%s'!", pkgId)
	}

	if len(pkg.ABI) == 0 {
		pkg.ABI = []string{"sf", "hf"}
	}

	if !slices.Contains(pkg.ABI, ABI) {
		return fmt.Errorf("Package '%s' Does Not Support Device ABI!", pkgId)
	}

	for _, depId := range pkg.Dependencies {
		if err := install(depId, verbose, loopedDeps); err != nil {
			return err
		}
	}

	if runScript(pkg, "install", verbose) {
		fmt.Printf("[KFPM] Successfully Installed '%s'!\n", pkgId)
		appendInstalled(pkgId)
		setStatus("packageInstallStatus", "success")
		return nil
	} else {
		setStatus("packageInstallStatus", "failure")
		return errors.New("Failed to install!")
	}
}

// Install/Uninstall Runners
func runScript(pkg Package, action string, verbose bool) bool {
	url := fmt.Sprintf("%s%s/%s.sh", pkg.Repo, pkg.Uri, action)
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
	installed = getInstalled()
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
		fmt.Printf("    - ID: %s\n", p.Uri)
		fmt.Printf("    - Dependencies: %s\n", p.Dependencies)
		fmt.Printf("    - ABI: %s\n\n", p.ABI)
	}
}

// Helpers
func fetchRegistry(baseURL string) []Package {
	resp, err := http.Get(baseURL + "/registry.json")
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

	for i := range pkgs {
		pkgs[i].Repo = baseURL
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
	return slices.Contains(installed, id)
}

func getInstalled() []string {
	data, err := os.ReadFile(installedFile)
	if err != nil {
		return nil
	}
	return strings.Split(strings.TrimSpace(string(data)), "\n")
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
