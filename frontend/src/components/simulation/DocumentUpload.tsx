// Document Upload Simulation Component
// Simulates document upload process for loan application

import React, { useState, useCallback } from 'react';
import { LoadingSpinner, InlineSpinner } from '../common/LoadingSpinner';
import { LenderMatch } from '../../types';

interface DocumentUploadProps {
  lender: LenderMatch;
  onComplete: () => void;
  onClose: () => void;
}

interface DocumentStatus {
  id: string;
  name: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  uploading: boolean;
  verified: boolean;
  error?: string;
}

const REQUIRED_DOCUMENTS: Omit<DocumentStatus, 'uploaded' | 'uploading' | 'verified'>[] = [
  {
    id: 'paystub',
    name: 'Pay Stub',
    description: 'Most recent 2 pay stubs showing year-to-date earnings',
    required: true,
  },
  {
    id: 'bank-statement',
    name: 'Bank Statement',
    description: 'Last 3 months of bank statements',
    required: true,
  },
  {
    id: 'photo-id',
    name: 'Photo ID',
    description: 'Driver\'s license, passport, or state ID',
    required: true,
  },
  {
    id: 'proof-address',
    name: 'Proof of Address',
    description: 'Utility bill or lease agreement from last 90 days',
    required: true,
  },
  {
    id: 'tax-return',
    name: 'Tax Return',
    description: 'Most recent tax return (if self-employed)',
    required: false,
  },
  {
    id: 'employment-letter',
    name: 'Employment Letter',
    description: 'Letter from employer verifying employment',
    required: false,
  },
];

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  lender,
  onComplete,
  onClose,
}) => {
  const [documents, setDocuments] = useState<DocumentStatus[]>(
    REQUIRED_DOCUMENTS.map(doc => ({
      ...doc,
      uploaded: false,
      uploading: false,
      verified: false,
    }))
  );
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'submit' | 'success'>('upload');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate progress
  const requiredDocs = documents.filter(doc => doc.required);
  const uploadedRequiredDocs = requiredDocs.filter(doc => doc.uploaded);
  const uploadProgress = Math.round((uploadedRequiredDocs.length / requiredDocs.length) * 100);
  const allRequiredUploaded = uploadedRequiredDocs.length === requiredDocs.length;

  // Simulate file upload
  const simulateUpload = useCallback((_documentId: string, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Simulate upload time based on file size
      const uploadTime = Math.min(Math.max(file.size / 100000, 1000), 5000); // 1-5 seconds
      
      setTimeout(() => {
        // Simulate occasional upload failures (10% chance)
        if (Math.random() < 0.1) {
          reject(new Error('Upload failed. Please try again.'));
        } else {
          resolve();
        }
      }, uploadTime);
    });
  }, []);

  // Handle file selection and upload
  const handleFileUpload = useCallback(async (documentId: string, file: File) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, uploading: true, error: undefined }
        : doc
    ));

    try {
      await simulateUpload(documentId, file);
      
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, uploading: false, uploaded: true, verified: true }
          : doc
      ));
    } catch (error) {
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              uploading: false, 
              uploaded: false,
              error: error instanceof Error ? error.message : 'Upload failed'
            }
          : doc
      ));
    }
  }, [simulateUpload]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setCurrentStep('submit');
    
    // Simulate application processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setCurrentStep('success');
    setIsSubmitting(false);
    
    // Auto-complete after showing success
    setTimeout(() => {
      onComplete();
    }, 2000);
  }, [onComplete]);

  // File input handler
  const handleFileInputChange = (documentId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(documentId, file);
    }
  };

  if (currentStep === 'success') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h3>
        <p className="text-gray-600 mb-4">
          Your loan application with <strong>{lender.name}</strong> has been successfully submitted.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-green-800">
            <strong>Next Steps:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>You'll receive a confirmation email within 15 minutes</li>
              <li>Initial review will be completed within 24 hours</li>
              <li>Final decision expected within {lender.processingTimeDays} business days</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'submit') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <LoadingSpinner size="lg" message="Submitting your application..." />
        <div className="mt-4 text-sm text-gray-600">
          Please wait while we process your documents and submit your application to {lender.name}.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Complete Your Application</h2>
          <p className="text-gray-600">Upload required documents for {lender.name}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Document Upload Progress</span>
          <span className="text-sm text-gray-600">{uploadProgress}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {uploadedRequiredDocs.length} of {requiredDocs.length} required documents uploaded
        </div>
      </div>

      {/* Document List */}
      <div className="p-6 space-y-4">
        {documents.map((document) => (
          <div
            key={document.id}
            className={`border rounded-lg p-4 transition-colors ${
              document.uploaded 
                ? 'border-green-200 bg-green-50'
                : document.error
                ? 'border-red-200 bg-red-50'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900">{document.name}</h3>
                  {document.required && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{document.description}</p>
                
                {/* Status */}
                {document.uploaded ? (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Uploaded and verified
                  </div>
                ) : document.error ? (
                  <div className="text-sm text-red-700">{document.error}</div>
                ) : null}
              </div>

              {/* Upload Button */}
              <div className="ml-4">
                {document.uploading ? (
                  <div className="flex items-center gap-2 px-4 py-2">
                    <InlineSpinner size="sm" />
                    <span className="text-sm text-gray-600">Uploading...</span>
                  </div>
                ) : document.uploaded ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 transition-colors">
                      Replace
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileInputChange(document.id)}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    Upload File
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileInputChange(document.id)}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Accepted formats: PDF, JPG, PNG, DOC, DOCX (max 10MB)
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allRequiredUploaded || isSubmitting}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              allRequiredUploaded && !isSubmitting
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
};