# codexmaker

CodexMaker automates the documentation process for your repositories, generating a beautifully structured static website based on your codebase.

## Features

- **Scans Codebase**: Scans directories and collects all function declarations that are not in test files.
- **Dynamic Parsing**: CodexMaker will dynamically recognize which languages each functions are written in and provide intelligent syntax highlighting.
- **Metadata Extraction**: Extracts and structures metadata for each function including:
  - **Name**
  - **Code**: The raw function implementation.
  - **Description**: The intellisense comments (if available).
  - **Parameters**: Name, type, and description of each parameter.
  - **Return Type**: Return type of the function.
- **Dynamic Language Detection**: Automatically determines the programming language based on file extensions, ensuring compatibility with multiple languages such as TypeScript, JavaScript, Python, Ruby, Go, etc.
- **Customizable Output**: Supports various output formats for documentation tools (e.g., Markdown, HTML).

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Advantages](#advantages)
- [Use Cases](#use-cases)
- [Contributing](#contributing)
- [License](#license)

## Installation

To install this package, run the following command in your project directory:

```bash
npm install codexmaker
```
