// Validation utilities for form inputs

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateRequired = (value: string | number | null | undefined, fieldName: string): ValidationResult => {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
};

export const validateMinLength = (value: string, minLength: number, fieldName: string): ValidationResult => {
  if (value.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters long` };
  }
  return { isValid: true };
};

export const validateMaxLength = (value: string, maxLength: number, fieldName: string): ValidationResult => {
  if (value.length > maxLength) {
    return { isValid: false, error: `${fieldName} must be no more than ${maxLength} characters long` };
  }
  return { isValid: true };
};

export const validateNumber = (value: string | number, fieldName: string): ValidationResult => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  return { isValid: true };
};

export const validatePositiveNumber = (value: string | number, fieldName: string): ValidationResult => {
  const numResult = validateNumber(value, fieldName);
  if (!numResult.isValid) return numResult;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num <= 0) {
    return { isValid: false, error: `${fieldName} must be greater than 0` };
  }
  return { isValid: true };
};

export const validateNonNegativeNumber = (value: string | number, fieldName: string): ValidationResult => {
  const numResult = validateNumber(value, fieldName);
  if (!numResult.isValid) return numResult;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative` };
  }
  return { isValid: true };
};

export const validateInteger = (value: string | number, fieldName: string): ValidationResult => {
  const numResult = validateNumber(value, fieldName);
  if (!numResult.isValid) return numResult;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isInteger(num)) {
    return { isValid: false, error: `${fieldName} must be a whole number` };
  }
  return { isValid: true };
};

export const validateEmail = (value: string, fieldName: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { isValid: false, error: `${fieldName} must be a valid email address` };
  }
  return { isValid: true };
};

export const validatePhone = (value: string, fieldName: string): ValidationResult => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
    return { isValid: false, error: `${fieldName} must be a valid phone number` };
  }
  return { isValid: true };
};

export const validateDate = (value: Date | string | null | undefined, fieldName: string): ValidationResult => {
  if (!value) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: `${fieldName} must be a valid date` };
  }
  
  return { isValid: true };
};

export const validateFutureDate = (value: Date | string | null | undefined, fieldName: string): ValidationResult => {
  const dateResult = validateDate(value, fieldName);
  if (!dateResult.isValid) return dateResult;
  
  const date = value instanceof Date ? value : new Date(value);
  if (date <= new Date()) {
    return { isValid: false, error: `${fieldName} must be in the future` };
  }
  
  return { isValid: true };
};

export const validatePastDate = (value: Date | string | null | undefined, fieldName: string): ValidationResult => {
  const dateResult = validateDate(value, fieldName);
  if (!dateResult.isValid) return dateResult;
  
  const date = value instanceof Date ? value : new Date(value);
  if (date >= new Date()) {
    return { isValid: false, error: `${fieldName} must be in the past` };
  }
  
  return { isValid: true };
};

// Composite validators
export const validateCustomerName = (value: string): ValidationResult => {
  const required = validateRequired(value, 'Customer name');
  if (!required.isValid) return required;
  
  const trimmed = value.trim();
  const minLength = validateMinLength(trimmed, 2, 'Customer name');
  if (!minLength.isValid) return minLength;
  
  const maxLength = validateMaxLength(trimmed, 100, 'Customer name');
  if (!maxLength.isValid) return maxLength;
  
  return { isValid: true };
};

export const validateItemName = (value: string): ValidationResult => {
  const required = validateRequired(value, 'Item name');
  if (!required.isValid) return required;
  
  const trimmed = value.trim();
  const minLength = validateMinLength(trimmed, 1, 'Item name');
  if (!minLength.isValid) return minLength;
  
  const maxLength = validateMaxLength(trimmed, 100, 'Item name');
  if (!maxLength.isValid) return maxLength;
  
  return { isValid: true };
};

export const validateItemRate = (value: string | number): ValidationResult => {
  return validatePositiveNumber(value, 'Item rate');
};

export const validateItemQuantity = (value: string | number): ValidationResult => {
  const positiveResult = validatePositiveNumber(value, 'Quantity');
  if (!positiveResult.isValid) return positiveResult;
  
  return validateInteger(value, 'Quantity');
};

export const validatePaymentAmount = (value: string | number): ValidationResult => {
  return validatePositiveNumber(value, 'Payment amount');
};

export const validateBillDate = (value: Date | string | null | undefined): ValidationResult => {
  return validateDate(value, 'Bill date');
};

export const validatePaymentDate = (value: Date | string | null | undefined): ValidationResult => {
  return validateDate(value, 'Payment date');
};

// Form validation helper
export const validateForm = (validations: ValidationResult[]): { isValid: boolean; errors: string[] } => {
  const errors = validations
    .filter(v => !v.isValid)
    .map(v => v.error!)
    .filter(Boolean);
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
