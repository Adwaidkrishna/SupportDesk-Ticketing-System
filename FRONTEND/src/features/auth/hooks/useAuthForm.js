import { useState, useCallback } from 'react';

/**
 * useAuthForm — Generic form state manager for auth forms.
 *
 * @param {Object} initialValues - Initial form field values
 * @param {Function} validate - Validation function that returns { field: errorMsg }
 *
 * @returns {Object} Form state and handlers
 */
export default function useAuthForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /** Update a single field value */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setValues((prev) => ({ ...prev, [name]: fieldValue }));
    setServerError('');
    setSuccessMessage('');

    // Clear error for this field when user starts typing
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  /** Mark a field as touched on blur and validate it */
  const handleBlur = useCallback(
    (e) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));

      if (validate) {
        const validationErrors = validate(values);
        setErrors((prev) => ({ ...prev, [name]: validationErrors[name] || '' }));
      }
    },
    [values, validate],
  );

  /**
   * Submit handler factory.
   * @param {Function} onSubmit - Async function called with form values
   */
  const handleSubmit = useCallback(
    (onSubmit) => async (e) => {
      e.preventDefault();
      setServerError('');
      setSuccessMessage('');

      // Validate all fields
      if (validate) {
        const validationErrors = validate(values);
        setErrors(validationErrors);

        // Mark all fields as touched
        const allTouched = Object.keys(values).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {},
        );
        setTouched(allTouched);

        // Check if any errors exist
        const hasErrors = Object.values(validationErrors).some((err) => err);
        if (hasErrors) return;
      }

      setIsSubmitting(true);

      try {
        const result = await onSubmit(values);

        if (result && result.success === false) {
          setServerError(result.error || result.message || 'Something went wrong');
        } else if (result && (result.data?.message || result.message)) {
          setSuccessMessage(result.data?.message || result.message);
        }

        return result;
      } catch (err) {
        const errorMsg = err?.message || 'An unexpected error occurred';
        setServerError(errorMsg);
        return { success: false, error: errorMsg, err };
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate],
  );

  /** Reset form to initial state */
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setServerError('');
    setSuccessMessage('');
  }, [initialValues]);

  /** Set a single value programmatically */
  const setValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    serverError,
    successMessage,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValue,
    setServerError,
    setSuccessMessage,
  };
}
