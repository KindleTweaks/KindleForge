/*
	KFPM
	KindleForge Package Manager

	Simple Package Installing Solution For KindleForge
*/

package main
import (
	"fmt"
	"os"
)

func main() {
	args := os.Args[1:]

	if len(args) == 0 {
		help()
		return
	}

	switch args[0] {
	case "-i":
		if len(args) < 2 {
			fmt.Println("Error: -i requires a package name")
			return
		}
		pkg := args[1]
		fmt.Println("Installing", pkg)

	case "-r", "-u":
		if len(args) < 2 {
			fmt.Println("Error: -r/-u requires a package name")
			return
		}
		pkg := args[1]
		fmt.Println("Removing", pkg)

	case "-l":
		fmt.Println("Listing installed packages")

	default:
		fmt.Println("Unknown option:", args[0])
		help()
	}
}

func help() {
	fmt.Println(`KindleForge Package Manager
====================
v1.0, made by Penguins184

kfpm -i <package>    Installs Package
kfpm -r/-u <package> Removes/Uninstalls Package
kfpm -l              Lists Packages
`)
}
