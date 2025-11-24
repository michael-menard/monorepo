# Stud.io Model File
# Version: 1.0
# Created: 2024-01-01

MODEL:
  name: "Test Model"
  author: "Test Author"
  description: "A test Stud.io model file"
  
PARTS:
  - part: "3001"
    quantity: 10
    color: "red"
    position: [0, 0, 0]
    
  - part: "3002"
    quantity: 5
    color: "blue"
    position: [10, 0, 0]
    
STEPS:
  - step: 1
    description: "Build the base"
    parts:
      - part: "3001"
        quantity: 4
        color: "red"
        
  - step: 2
    description: "Add the sides"
    parts:
      - part: "3002"
        quantity: 2
        color: "blue" 