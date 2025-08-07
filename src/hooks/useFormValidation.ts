import { useState, useCallback, useMemo } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface FormErrors {
  [key: string]: string;
}

export interface FormTouched {
  [key: string]: boolean;
}

export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRules,
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate a single field
  const validateField = useCallback(
    (name: string, value: any): string | null => {
      const rule = validationRules[name];
      if (!rule) return null;

      // Required validation
      if (
        rule.required &&
        (!value || (typeof value === 'string' && value.trim() === ''))
      ) {
        return rule.message || `${name} is required`;
      }

      // Skip other validations if value is empty and not required
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return null;
      }

      // Min length validation
      if (
        rule.minLength &&
        typeof value === 'string' &&
        value.length < rule.minLength
      ) {
        return (
          rule.message ||
          `${name} must be at least ${rule.minLength} characters`
        );
      }

      // Max length validation
      if (
        rule.maxLength &&
        typeof value === 'string' &&
        value.length > rule.maxLength
      ) {
        return (
          rule.message ||
          `${name} must be no more than ${rule.maxLength} characters`
        );
      }

      // Pattern validation
      if (
        rule.pattern &&
        typeof value === 'string' &&
        !rule.pattern.test(value)
      ) {
        return rule.message || `${name} format is invalid`;
      }

      // Custom validation
      if (rule.custom) {
        return rule.custom(value);
      }

      return null;
    },
    [validationRules],
  );

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules, validateField]);

  // Set field value
  const setFieldValue = useCallback(
    (name: keyof T, value: any) => {
      setValues(prev => ({ ...prev, [name]: value }));

      // Clear error when user starts typing
      if (errors[name as string]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    },
    [errors],
  );

  // Handle field blur
  const handleFieldBlur = useCallback(
    (name: keyof T) => {
      setTouched(prev => ({ ...prev, [name]: true }));

      // Validate field on blur
      const error = validateField(name as string, values[name]);
      setErrors(prev => ({ ...prev, [name]: error || '' }));
    },
    [values, validateField],
  );

  // Handle field change with validation
  const handleFieldChange = useCallback(
    (name: keyof T, value: any) => {
      setFieldValue(name, value);

      // Validate field if it's been touched
      if (touched[name as string]) {
        const error = validateField(name as string, value);
        setErrors(prev => ({ ...prev, [name]: error || '' }));
      }
    },
    [setFieldValue, touched, validateField],
  );

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Submit form
  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => Promise<void> | void) => {
      setIsSubmitting(true);

      try {
        // Mark all fields as touched
        const allTouched: FormTouched = {};
        Object.keys(validationRules).forEach(field => {
          allTouched[field] = true;
        });
        setTouched(allTouched);

        // Validate form
        if (validateForm()) {
          await onSubmit(values);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validationRules, validateForm],
  );

  // Check if form is valid
  const isValid = useMemo(() => {
    return (
      Object.keys(errors).length === 0 ||
      Object.values(errors).every(error => !error)
    );
  }, [errors]);

  // Check if form has been modified
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    setFieldValue,
    handleFieldChange,
    handleFieldBlur,
    validateForm,
    resetForm,
    handleSubmit,
  };
};

// Predefined validation rules
export const validationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  password: {
    required: true,
    minLength: 6,
    message: 'Password must be at least 6 characters',
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Name must be between 2 and 50 characters',
  },
  title: {
    required: true,
    minLength: 1,
    maxLength: 100,
    message: 'Title is required and must be less than 100 characters',
  },
  course: {
    required: true,
    minLength: 1,
    maxLength: 50,
    message: 'Course name is required',
  },
  topic: {
    required: true,
    minLength: 1,
    maxLength: 100,
    message: 'Topic is required',
  },
};
