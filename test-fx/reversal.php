<?php
// php_example.php

/**
 * Find the maximum number in an array.
 *
 * This function iterates through the array and returns the maximum value found.
 * If the array is empty, it throws an exception.
 *
 * @param array $numbers An array of integers.
 * @return int The maximum integer in the array.
 * @throws InvalidArgumentException If the array is empty.
 */
function findMax($numbers) {
    if (empty($numbers)) {
        throw new InvalidArgumentException("Array is empty");
    }
    return max($numbers);
}

/**
 * Reverse the input string.
 *
 * This function takes an input string and returns the reversed version of the string.
 *
 * @param string $str The string to reverse.
 * @return string The reversed string.
 */
function reverseString($str) {
    return strrev($str);
}
?>
