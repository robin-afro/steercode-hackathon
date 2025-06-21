#!/bin/bash

# Function to print file contents with markdown formatting
print_file_contents() {
    local file="$1"
    
    # Print the file path
    echo "$file"
    echo
    
    # Print the file contents in a markdown code block
    echo '```'
    cat "$file" 2>/dev/null || echo "Error: Could not read file"
    echo '```'
    echo
}

# Export the function so it can be used with find -exec
export -f print_file_contents

# Find all files (not directories) recursively and process them
find . -type f -exec bash -c 'print_file_contents "$0"' {} \;
