// Validation utilities for form inputs

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface DataValidationResult {
  isConsistent: boolean;
  errors: string[];
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

export const checkDataConsistency = (data: any): DataValidationResult => {
  const errors: string[] = [];
  
  try {
    // Check if data has the expected structure
    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format');
      return { isConsistent: false, errors };
    }

    // Check for required top-level properties
    const requiredProperties = ['customers', 'bills', 'payments'];
    requiredProperties.forEach(prop => {
      if (!data[prop] || !Array.isArray(data[prop])) {
        errors.push(`Missing or invalid ${prop} data`);
      }
    });

    // Check data relationships
    if (Array.isArray(data.bills)) {
      data.bills.forEach((bill: any, index: number) => {
        if (!bill.customerId || !bill.id) {
          errors.push(`Bill at index ${index} is missing required fields`);
        }
      });
    }

    if (Array.isArray(data.payments)) {
      data.payments.forEach((payment: any, index: number) => {
        if (!payment.customerId || !payment.id) {
          errors.push(`Payment at index ${index} is missing required fields`);
        }
      });
    }

    return {
      isConsistent: errors.length === 0,
      errors
    };
  } catch (error) {
    errors.push('Error validating data structure');
    return { isConsistent: false, errors };
  }
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

// Validate bill date with future date warning (allows but warns)
export interface ValidationResultWithWarning extends ValidationResult {
  warning?: string;
}

export const validateBillDateWithFutureWarning = (value: Date | string | null | undefined): ValidationResultWithWarning => {
  const dateResult = validateDate(value, 'Bill date');
  if (!dateResult.isValid) return dateResult;
  
  const date = value instanceof Date ? value : new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const billDate = new Date(date);
  billDate.setHours(0, 0, 0, 0);
  
  if (billDate > today) {
    const daysDiff = Math.ceil((billDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      isValid: true,
      warning: `Bill date is ${daysDiff} day${daysDiff > 1 ? 's' : ''} in the future. Please verify this is correct.`
    };
  }
  
  return { isValid: true };
};

// Validate payment date with future date warning
export const validatePaymentDateWithFutureWarning = (value: Date | string | null | undefined): ValidationResultWithWarning => {
  const dateResult = validateDate(value, 'Payment date');
  if (!dateResult.isValid) return dateResult;
  
  const date = value instanceof Date ? value : new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const paymentDate = new Date(date);
  paymentDate.setHours(0, 0, 0, 0);
  
  if (paymentDate > today) {
    const daysDiff = Math.ceil((paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      isValid: true,
      warning: `Payment date is ${daysDiff} day${daysDiff > 1 ? 's' : ''} in the future. Please verify this is correct.`
    };
  }
  
  return { isValid: true };
};

// Validate unusually large amounts (warns if amount is significantly higher than average)
export const validateLargeAmount = (
  amount: number,
  type: 'bill' | 'payment',
  historicalData?: { bills?: number[]; payments?: number[] }
): ValidationResultWithWarning => {
  const positiveResult = validatePositiveNumber(amount, type === 'bill' ? 'Bill amount' : 'Payment amount');
  if (!positiveResult.isValid) return positiveResult;
  
  if (!historicalData) {
    return { isValid: true };
  }
  
  const data = type === 'bill' ? historicalData.bills : historicalData.payments;
  if (!data || data.length === 0) {
    return { isValid: true };
  }
  
  // Calculate average and standard deviation
  const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  // Warn if amount is more than 3 standard deviations above average
  const threshold = avg + (3 * stdDev);
  
  if (amount > threshold && amount > avg * 1.5) {
    const percentage = ((amount / avg - 1) * 100).toFixed(0);
    return {
      isValid: true,
      warning: `This ${type} amount (₹${amount.toLocaleString()}) is ${percentage}% higher than your average ${type === 'bill' ? 'bill' : 'payment'} (₹${avg.toLocaleString()}). Please verify this is correct.`
    };
  }
  
  return { isValid: true };
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
