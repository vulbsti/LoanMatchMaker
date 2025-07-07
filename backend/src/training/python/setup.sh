#!/bin/bash

# ML Training Setup Script for Loan Matching System

echo "Setting up ML training environment for Loan Matching System..."

# Create necessary directories
echo "Creating directories..."
mkdir -p ../data
mkdir -p ../models

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "Python version:"
python3 --version

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "Installing Python packages..."
pip install -r requirements.txt

echo ""
echo "Setup completed successfully!"
echo ""
echo "To run the training pipeline:"
echo "1. Activate the virtual environment: source venv/bin/activate"
echo "2. Generate training data: python data_generation.py"
echo "3. Train the model: python train_model.py"
echo "4. Test inference: python model_inference.py"
echo ""
echo "Note: The training will create model files in ../models/ directory"
echo "These files will be used by the TypeScript backend for inference."
