// src/services/branchService.js

const branchService = {
    /**
     * Generate a document prefix from branch name
     * Example: "Nisarga Layout" -> "NIS"
     */
    generatePrefix: (branchName) => {
      if (!branchName) return '';
      
      // Get first letter of each word
      const words = branchName.trim().split(/\s+/);
      const prefix = words
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 10); // Limit to 10 characters
      
      return prefix;
    },
  
    /**
     * Format address object to string
     */
    formatAddress: (addressObj) => {
      if (!addressObj) return '';
      
      const { street, city, state, pincode, country } = addressObj;
      const parts = [street, city, state, pincode, country].filter(Boolean);
      return parts.join(', ');
    },
  
    /**
     * Validate branch data
     */
    validateBranch: (branchData) => {
      const errors = [];
      
      if (!branchData.name || branchData.name.trim() === '') {
        errors.push('Branch name is required');
      }
      
      if (!branchData.document_prefix || branchData.document_prefix.trim() === '') {
        errors.push('Document prefix is required');
      }
      
      if (branchData.document_prefix && branchData.document_prefix.length > 10) {
        errors.push('Document prefix cannot exceed 10 characters');
      }
      
      if (branchData.email && branchData.email !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(branchData.email)) {
          errors.push('Invalid email address');
        }
      }
      
      return errors;
    }
  };
  
  export default branchService;