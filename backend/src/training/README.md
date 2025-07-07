# ML Training Infrastructure for Loan Matching

This directory contains the machine learning training pipeline for the loan matching system.

## Structure
- `types.ts` - TypeScript type definitions shared between training and inference
- `python/` - Python training scripts using PyTorch
- `data_generation.py` - Synthetic data generation
- `train_model.py` - Model training pipeline
- `model_inference.py` - Python inference engine
- `models/` - Trained model artifacts
- `data/` - Generated training datasets

## Usage

1. **Generate Training Data:**
   ```bash
   cd python
   python data_generation.py
   ```

2. **Train Model:**
   ```bash
   python train_model.py
   ```

3. **Test Inference:**
   ```bash
   python model_inference.py
   ```

The trained model will be integrated with the TypeScript backend for real-time inference.
