# python_example.py

def find_max(numbers):
    """
    Find the maximum number in a list of numbers.

    This function iterates through the list and returns the highest value found.
    If the list is empty, it raises a ValueError.

    Args:
        numbers (list): A list of integers.

    Returns:
        int: The maximum integer in the list.

    Raises:
        ValueError: If the input list is empty.
    """
    if not numbers:
        raise ValueError("The list is empty")
    return max(numbers)


def reverse_string(s):
    """
    Reverse the input string.

    This function takes an input string and returns the reversed version of the string.

    Args:
        s (str): The string to be reversed.

    Returns:
        str: The reversed string.
    """
    return s[::-1]
