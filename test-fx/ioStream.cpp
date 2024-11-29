#include <iostream>
#include <vector>
#include <algorithm>

/* *** 
   Function to find the maximum element in a vector.
   Parameters: 
     - vec: A vector of integers.
   Returns: 
     - The maximum integer in the vector.
*/
int findMax(const std::vector<int>& vec) {
    if (vec.empty()) {
        throw std::invalid_argument("Vector is empty");
    }
    return *std::max_element(vec.begin(), vec.end());
}

/* *** 
   Function to calculate the sum of elements in a vector.
   Parameters: 
     - vec: A vector of integers.
   Returns: 
     - The sum of the integers in the vector.
*/
int sumVector(const std::vector<int>& vec) {
    return std::accumulate(vec.begin(), vec.end(), 0);
}

/* *** 
   Function to check if a string is a palindrome.
   Parameters: 
     - str: A string to check.
   Returns: 
     - True if the string is a palindrome, false otherwise.
*/
bool isPalindrome(const std::string& str) {
    int left = 0;
    int right = str.length() - 1;
    while (left < right) {
        if (str[left] != str[right]) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}

/* *** 
   Function to reverse a vector of integers.
   Parameters: 
     - vec: A vector of integers.
   Returns: 
     - A new vector with the elements in reverse order.
*/
std::vector<int> reverseVector(std::vector<int>& vec) {
    std::vector<int> reversed(vec.rbegin(), vec.rend());
    return reversed;
}

int main() {
    std::vector<int> numbers = {1, 3, 5, 7, 9};
    std::string str = "racecar";

    std::cout << "Max number: " << findMax(numbers) << std::endl;
    std::cout << "Sum of numbers: " << sumVector(numbers) << std::endl;
    std::cout << "Is palindrome: " << (isPalindrome(str) ? "Yes" : "No") << std::endl;

    std::vector<int> reversed = reverseVector(numbers);
    std::cout << "Reversed vector: ";
    for (int num : reversed) {
        std::cout << num << " ";
    }
    std::cout << std::endl;

    return 0;
}
