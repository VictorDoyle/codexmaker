#include <iostream>
#include <string>

std::string testerHello(const std::string &name)
{
  return "Hello, " + name + "!";
}

int main()
{
  std::cout << testerHello("Testing Alice") << std::endl;
  return 0;
}
