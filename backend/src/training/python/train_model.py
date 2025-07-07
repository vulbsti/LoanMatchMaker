import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import json
import os
from typing import Tuple, Dict, Any
import matplotlib.pyplot as plt
import seaborn as sns

class LoanDataset(Dataset):
    """PyTorch dataset for loan matching data"""
    
    def __init__(self, features: np.ndarray, labels: np.ndarray, scores: np.ndarray = None):
        self.features = torch.FloatTensor(features)
        self.labels = torch.LongTensor(labels)
        self.scores = torch.FloatTensor(scores) if scores is not None else None
    
    def __len__(self):
        return len(self.features)
    
    def __getitem__(self, idx):
        if self.scores is not None:
            return self.features[idx], self.labels[idx], self.scores[idx]
        return self.features[idx], self.labels[idx]

class LoanMatchingModel(nn.Module):
    """Logistic regression model for loan matching"""
    
    def __init__(self, input_size: int, hidden_size: int = 32, dropout: float = 0.2):
        super(LoanMatchingModel, self).__init__()
        
        # Multi-layer perceptron with regularization
        self.network = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, 1),
            nn.Sigmoid()
        )
        
        # Initialize weights
        self.apply(self._init_weights)
    
    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.xavier_uniform_(module.weight)
            module.bias.data.zero_()
    
    def forward(self, x):
        return self.network(x).squeeze()

class LoanMatchingTrainer:
    """Training pipeline for loan matching model"""
    
    def __init__(self, model_config: Dict[str, Any] = None):
        self.model_config = model_config or {
            'hidden_size': 32,
            'dropout': 0.2,
            'learning_rate': 0.001,
            'batch_size': 256,
            'epochs': 100,
            'early_stopping_patience': 10,
            'weight_decay': 1e-4
        }
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
        self.model = None
        self.scaler = StandardScaler()
        self.training_history = {'train_loss': [], 'val_loss': [], 'val_accuracy': []}
    
    def load_data(self, filepath: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Load training data from CSV"""
        print(f"Loading data from {filepath}")
        df = pd.read_csv(filepath)
        
        # Feature columns
        feature_cols = [
            'loan_amount_norm', 'annual_income_norm', 'credit_score_norm', 'interest_rate_norm',
            'employment_match', 'purpose_match', 'special_eligibility',
            'loan_to_max_ratio', 'income_multiple', 'credit_buffer'
        ]
        
        X = df[feature_cols].values
        y = df['is_good_match'].values
        scores = df['match_score'].values / 100  # Normalize to 0-1
        
        print(f"Loaded {len(X)} samples with {X.shape[1]} features")
        print(f"Positive class distribution: {y.mean():.2%}")
        
        return X, y, scores
    
    def prepare_data(self, X: np.ndarray, y: np.ndarray, scores: np.ndarray) -> Tuple[DataLoader, DataLoader, DataLoader]:
        """Split and prepare data for training"""
        # Split data
        X_temp, X_test, y_temp, y_test, scores_temp, scores_test = train_test_split(
            X, y, scores, test_size=0.15, random_state=42, stratify=y
        )
        
        X_train, X_val, y_train, y_val, scores_train, scores_val = train_test_split(
            X_temp, y_temp, scores_temp, test_size=0.18, random_state=42, stratify=y_temp  # 0.15 of total
        )
        
        # Fit scaler on training data only
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Create datasets
        train_dataset = LoanDataset(X_train_scaled, y_train, scores_train)
        val_dataset = LoanDataset(X_val_scaled, y_val, scores_val)
        test_dataset = LoanDataset(X_test_scaled, y_test, scores_test)
        
        # Create data loaders
        train_loader = DataLoader(
            train_dataset, 
            batch_size=self.model_config['batch_size'], 
            shuffle=True
        )
        val_loader = DataLoader(
            val_dataset, 
            batch_size=self.model_config['batch_size'], 
            shuffle=False
        )
        test_loader = DataLoader(
            test_dataset, 
            batch_size=self.model_config['batch_size'], 
            shuffle=False
        )
        
        print(f"Train set: {len(train_dataset)} samples")
        print(f"Validation set: {len(val_dataset)} samples")
        print(f"Test set: {len(test_dataset)} samples")
        
        return train_loader, val_loader, test_loader
    
    def train_model(self, train_loader: DataLoader, val_loader: DataLoader):
        """Train the model with early stopping"""
        input_size = len(train_loader.dataset[0][0])
        
        # Initialize model
        self.model = LoanMatchingModel(
            input_size=input_size,
            hidden_size=self.model_config['hidden_size'],
            dropout=self.model_config['dropout']
        ).to(self.device)
        
        # Loss and optimizer
        criterion = nn.BCELoss()
        optimizer = optim.Adam(
            self.model.parameters(),
            lr=self.model_config['learning_rate'],
            weight_decay=self.model_config['weight_decay']
        )
        
        # Training loop with early stopping
        best_val_loss = float('inf')
        patience_counter = 0
        
        print("Starting training...")
        
        for epoch in range(self.model_config['epochs']):
            # Training phase
            self.model.train()
            train_loss = 0.0
            
            for batch_features, batch_labels, _ in train_loader:
                batch_features = batch_features.to(self.device)
                batch_labels = batch_labels.float().to(self.device)
                
                optimizer.zero_grad()
                outputs = self.model(batch_features)
                loss = criterion(outputs, batch_labels)
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
            
            # Validation phase
            self.model.eval()
            val_loss = 0.0
            val_predictions = []
            val_targets = []
            
            with torch.no_grad():
                for batch_features, batch_labels, _ in val_loader:
                    batch_features = batch_features.to(self.device)
                    batch_labels = batch_labels.float().to(self.device)
                    
                    outputs = self.model(batch_features)
                    loss = criterion(outputs, batch_labels)
                    val_loss += loss.item()
                    
                    val_predictions.extend(outputs.cpu().numpy())
                    val_targets.extend(batch_labels.cpu().numpy())
            
            # Calculate metrics
            train_loss /= len(train_loader)
            val_loss /= len(val_loader)
            val_accuracy = accuracy_score(val_targets, [1 if p > 0.5 else 0 for p in val_predictions])
            
            # Store history
            self.training_history['train_loss'].append(train_loss)
            self.training_history['val_loss'].append(val_loss)
            self.training_history['val_accuracy'].append(val_accuracy)
            
            # Print progress
            if epoch % 10 == 0:
                print(f"Epoch {epoch:3d}: Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}, Val Acc: {val_accuracy:.4f}")
            
            # Early stopping
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                # Save best model
                torch.save(self.model.state_dict(), '../models/best_model.pth')
            else:
                patience_counter += 1
                if patience_counter >= self.model_config['early_stopping_patience']:
                    print(f"Early stopping at epoch {epoch}")
                    break
        
        # Load best model
        self.model.load_state_dict(torch.load('../models/best_model.pth'))
        print("Training completed!")
    
    def evaluate_model(self, test_loader: DataLoader) -> Dict[str, float]:
        """Evaluate model on test set"""
        self.model.eval()
        test_predictions = []
        test_targets = []
        test_probabilities = []
        
        with torch.no_grad():
            for batch_features, batch_labels, _ in test_loader:
                batch_features = batch_features.to(self.device)
                batch_labels = batch_labels.float().to(self.device)
                
                outputs = self.model(batch_features)
                
                test_probabilities.extend(outputs.cpu().numpy())
                test_predictions.extend([1 if p > 0.5 else 0 for p in outputs.cpu().numpy()])
                test_targets.extend(batch_labels.cpu().numpy())
        
        # Calculate metrics
        metrics = {
            'accuracy': accuracy_score(test_targets, test_predictions),
            'precision': precision_score(test_targets, test_predictions),
            'recall': recall_score(test_targets, test_predictions),
            'f1': f1_score(test_targets, test_predictions),
            'auc': roc_auc_score(test_targets, test_probabilities)
        }
        
        print("\nTest Set Evaluation:")
        for metric, value in metrics.items():
            print(f"{metric.upper()}: {value:.4f}")
        
        return metrics
    
    def save_model_artifacts(self):
        """Save model, scaler, and metadata"""
        os.makedirs("../models", exist_ok=True)
        
        # Save model
        torch.save(self.model.state_dict(), '../models/loan_matching_model.pth')
        
        # Save scaler
        import joblib
        joblib.dump(self.scaler, '../models/feature_scaler.pkl')
        
        # Save model metadata
        metadata = {
            'model_config': self.model_config,
            'input_size': len(self.scaler.mean_),
            'feature_names': [
                'loan_amount_norm', 'annual_income_norm', 'credit_score_norm', 'interest_rate_norm',
                'employment_match', 'purpose_match', 'special_eligibility',
                'loan_to_max_ratio', 'income_multiple', 'credit_buffer'
            ],
            'scaler_mean': self.scaler.mean_.tolist(),
            'scaler_std': self.scaler.scale_.tolist(),
            'training_history': self.training_history
        }
        
        with open('../models/model_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print("Model artifacts saved!")
    
    def plot_training_history(self):
        """Plot training history"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
        
        # Loss plot
        ax1.plot(self.training_history['train_loss'], label='Train Loss')
        ax1.plot(self.training_history['val_loss'], label='Validation Loss')
        ax1.set_title('Training and Validation Loss')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Loss')
        ax1.legend()
        
        # Accuracy plot
        ax2.plot(self.training_history['val_accuracy'], label='Validation Accuracy')
        ax2.set_title('Validation Accuracy')
        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('Accuracy')
        ax2.legend()
        
        plt.tight_layout()
        plt.savefig('../models/training_history.png', dpi=150, bbox_inches='tight')
        plt.show()

def main():
    """Main training pipeline"""
    # Initialize trainer
    trainer = LoanMatchingTrainer()
    
    # Load data
    data_path = "../data/loan_training_data.csv"
    if not os.path.exists(data_path):
        print(f"Data file not found: {data_path}")
        print("Please run data_generation.py first to generate training data.")
        return
    
    X, y, scores = trainer.load_data(data_path)
    
    # Prepare data
    train_loader, val_loader, test_loader = trainer.prepare_data(X, y, scores)
    
    # Train model
    trainer.train_model(train_loader, val_loader)
    
    # Evaluate model
    metrics = trainer.evaluate_model(test_loader)
    
    # Save model artifacts
    trainer.save_model_artifacts()
    
    # Plot training history
    trainer.plot_training_history()
    
    print(f"\nTraining pipeline completed successfully!")
    print(f"Model saved to: ../models/loan_matching_model.pth")
    print(f"Final test accuracy: {metrics['accuracy']:.4f}")

if __name__ == "__main__":
    main()
