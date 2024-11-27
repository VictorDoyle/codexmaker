package main

import "fmt"

func goOut(name string) string {
    return "Hello, " + name + "!"
}

func main() {
    fmt.Println(goOut("Alice In Wonderland!"))
}
