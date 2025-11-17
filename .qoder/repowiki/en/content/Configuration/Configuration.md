# Configuration

<cite>
**Referenced Files in This Document**   
- [document-numbering.js](file://src/pages/api/settings/document-numbering.js)
- [print-templates.js](file://src/pages/api/settings/print-templates.js)
- [users.js](file://src/pages/api/settings/users.js)
- [DocumentNumbering.js](file://src/components/others/DocumentNumbering.js)
- [PrintTemplates.js](file://src/components/others/PrintTemplates.js)
- [UserForm.js](file://src/components/others/UserForm.js)
- [UserList.js](file://src/components/others/UserList.js)
- [printService.js](file://src/services/printService.js)
- [58mm-Basic.html](file://public/templates/58mm-Basic.html)
- [80mm-basic.html](file://public/templates/80mm-basic.html)
- [A4-Default.html](file://public/templates/A4-Default.html)
- [A4-GST-Compatible.html](file://public/templates/A4-GST-Compatible.html)
</cite>

## Table of Contents
1. [Document Numbering Sequences](#document-numbering-sequences)
2. [Print Templates](#print-templates)
3. [User Management](#user-management)
4. [Integration Settings](#integration-settings)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

## Document Numbering Sequences

The document numbering system in ezbillify-v1 provides comprehensive control over document identifiers across various document types including invoices, quotations, purchase orders, bills, and more. The system is branch-specific, allowing different branches to maintain independent numbering sequences while ensuring global uniqueness within the organization.

Document numbering follows a structured format: `{BranchPrefix}-{DocumentPrefix}{Number}/{FinancialYear}`. For example: `DEL-INV-0001/25-26` where "DEL" is the branch prefix, "INV-" is the document prefix, "0001" is the padded sequence number, and "25-26" represents the financial year 2025-2026.

The system supports customizable prefixes for each document type, with default values provided (INV- for invoices, QUO- for quotations, PO- for purchase orders, etc.). Users can modify these prefixes based on organizational requirements. The numbering sequence includes configurable padding (1-10 zeros), allowing organizations to maintain consistent digit lengths (e.g., 0001, 001, or 1).

A key feature is the annual reset policy, which automatically resets sequence numbers to 1 at the beginning of each financial year (April 1st). This ensures clean numbering for each fiscal period while maintaining historical continuity. The financial year is automatically calculated based on the current date, following the Indian fiscal calendar from April to March.

The implementation uses a dedicated `document_sequences` database table that stores configuration for each document type, including current number, padding, prefix, suffix, and reset policy. When generating a new document number, the system first checks for an existing sequence configuration. If none exists, it creates a default configuration with standard settings. The next number is then generated based on the current configuration, and the sequence counter is atomically incremented to prevent duplication.

**Section sources**
- [document-numbering.js](file://src/pages/api/settings/document-numbering.js#L1-L695)
- [DocumentNumbering.js](file://src/components/others/DocumentNumbering.js#L1-L524)

## Print Templates

The print template system in ezbillify-v1 offers extensive customization options for various document types and paper formats. The system supports multiple paper sizes including A4, A3, A5, 80mm thermal, and 58mm thermal, catering to different printing requirements from standard office printers to portable receipt printers.

Template organization follows a structured naming convention: `{paperSize}-{templateType}.html`. For example, `80mm-thermal-compact.html` represents a compact template designed for 80mm thermal receipt printers. The system provides multiple template variants for each paper size, including basic, detailed, GST-compatible, and modern designs, allowing users to select the appropriate format based on their needs.

The template system is built around HTML templates with placeholder variables that are replaced with actual data during document generation. Key placeholders include `{{COMPANY_NAME}}`, `{{CUSTOMER_NAME}}`, `{{DOCUMENT_NUMBER}}`, `{{ITEMS_TABLE}}`, and `{{TOTAL_AMOUNT}}`. These placeholders are processed by the `printService.js` which maps document data to template variables and generates the final output.

For thermal receipt printers (58mm and 80mm), templates are optimized for narrow paper width with condensed layouts that prioritize essential information. These templates typically include a simplified items table with minimal columns to fit the limited horizontal space. In contrast, A4 templates provide comprehensive layouts with detailed tax breakdowns, terms and conditions, and company branding elements.

The GST-compatible templates include specific formatting required for Indian tax compliance, such as HSN/SAC code display, CGST/SGST/IGST breakdowns, and e-invoice details. These templates automatically generate tax summary tables that aggregate amounts by tax rate, meeting statutory requirements for invoice documentation.

Template assignment is managed through a user interface that allows administrators to assign different templates to various document types. Each document type (invoice, quotation, purchase order, etc.) can have a different template assigned based on the paper size and business requirements.

**Section sources**
- [print-templates.js](file://src/pages/api/settings/print-templates.js#L1-L332)
- [PrintTemplates.js](file://src/components/others/PrintTemplates.js#L1-L463)
- [printService.js](file://src/services/printService.js#L1-L585)
- [A4-GST-Compatible.html](file://public/templates/A4-GST-Compatible.html)
- [80mm-thermal-compact.html](file://public/templates/80mm-thermal-compact.html)

## User Management

The user management system in ezbillify-v1 implements a role-based access control model with two primary roles: Admin and Workforce. Admin users have full system access and can manage all aspects of the application, while Workforce users have limited permissions focused on operational tasks.

User creation is restricted to workforce roles, with a maximum limit of two workforce users per company. This limitation is enforced at both the API and application levels to prevent unauthorized user proliferation. When creating a new workforce user, the system sends an invitation email with credentials, ensuring secure onboarding.

The permission system for workforce users is granular, allowing administrators to control access to specific features:
- View Inventory: Read-only access to stock levels and item details
- Update Inventory: Ability to adjust stock quantities and perform stock movements
- Create Sales: Permission to generate quotations and invoices
- View Customers: Access to customer information and history
- Create Customers: Ability to add new customer records
- Barcode Scanning: Access to barcode scanning functionality for inventory management

User status management allows administrators to activate or deactivate accounts without deleting them, preserving historical data while preventing access. The system prevents users from deactivating their own accounts or deleting the last admin user, maintaining system integrity.

User profiles include essential information such as name, email, phone number, and role. The system integrates with Supabase authentication, synchronizing user accounts between the application database and the authentication system. Password management follows secure practices, with passwords stored encrypted and never exposed in the application interface.

**Section sources**
- [users.js](file://src/pages/api/settings/users.js#L1-L664)
- [UserForm.js](file://src/components/others/UserForm.js#L1-L538)
- [UserList.js](file://src/components/others/UserList.js#L1-L494)

## Integration Settings

The integration settings in ezbillify-v1 facilitate connections with external systems and services, enabling seamless data exchange and enhanced functionality. The system supports various integration points, including payment gateways, tax compliance services, and third-party business applications.

Payment integration is implemented through UPI (Unified Payments Interface) QR code generation, allowing customers to make instant payments by scanning a QR code on invoices. The system generates UPI payment URLs with pre-filled details including recipient VPA (Virtual Payment Address), transaction amount, and payment note, creating a seamless payment experience.

For tax compliance, the system supports integration with India's e-Invoice and e-Way Bill systems. These integrations enable automated generation and validation of tax documents, ensuring compliance with GST regulations. The system can generate e-Invoice ARN (Acknowledgement Reference Number) and embed e-Invoice QR codes in printed documents.

The architecture includes API endpoints for third-party integrations, such as the Veekaart integration for inventory and pricing synchronization. These endpoints follow REST principles with proper authentication and error handling. The integration system uses service role keys for server-side operations that bypass row-level security, ensuring reliable communication between systems.

Webhook endpoints are provided for receiving notifications from external services, allowing the system to respond to events such as payment confirmations or inventory updates from partner systems. These webhooks are secured with appropriate authentication mechanisms to prevent unauthorized access.

**Section sources**
- [printService.js](file://src/services/printService.js#L1-L585)
- [users.js](file://src/pages/api/settings/users.js#L1-L664)
- [document-numbering.js](file://src/pages/api/settings/document-numbering.js#L1-L695)

## Troubleshooting

This section addresses common issues encountered with the configuration system and provides solutions for resolution.

**Template Rendering Problems**: When templates fail to render correctly, verify that all required placeholders are present in the HTML template file. Check the browser console for JavaScript errors and ensure that the template HTML is valid. For thermal printer templates, verify that the content width does not exceed the paper size limitations. If images are not displaying, confirm that image URLs are accessible and properly formatted.

**Numbering Sequence Gaps**: Gaps in document numbering sequences typically occur when draft documents are created but not finalized, or when documents are deleted. The system intentionally does not reuse document numbers to maintain audit integrity. To minimize gaps, encourage users to only create documents when ready to finalize them. The system does not support renumbering or filling gaps, as this would compromise document traceability.

**Integration Authentication Failures**: When integration endpoints return authentication errors, verify that the Supabase service role key is correctly configured in the environment variables. Check that the API endpoint is receiving the proper authorization headers and that the JWT token has not expired. For third-party integrations, ensure that API keys and credentials are correctly entered in the integration settings.

**User Creation Issues**: If user creation fails, check that the workforce user limit (2 per company) has not been reached. Verify that the email address is in valid format and not already associated with another account. Ensure that the Supabase authentication system is properly configured with SMTP settings for sending invitation emails.

**Template Assignment Problems**: When templates do not appear to be applied, clear the template cache by refreshing the application. Verify that the template is assigned to the correct document type and paper size combination. Check that the template HTML file exists in the public/templates directory and is accessible via the application server.

**Section sources**
- [printService.js](file://src/services/printService.js#L1-L585)
- [print-templates.js](file://src/pages/api/settings/print-templates.js#L1-L332)
- [document-numbering.js](file://src/pages/api/settings/document-numbering.js#L1-L695)
- [users.js](file://src/pages/api/settings/users.js#L1-L664)

## Best Practices

Implementing effective configuration management in multi-company environments requires adherence to several best practices to ensure consistency, security, and maintainability.

**Template Management**: Maintain a standardized template library across all companies, with company-specific variations stored in separate template files. Use version control for template files to track changes and enable rollback if needed. Regularly review and update templates to ensure compliance with changing business requirements and regulatory standards.

**Document Numbering**: Establish consistent numbering conventions across all branches and document types. Use meaningful prefixes that reflect the document type and branch location. Regularly audit numbering sequences to identify any anomalies or gaps. Document the numbering policy and ensure all users understand the format and significance of document numbers.

**User Management**: Implement a clear user provisioning and deprovisioning process. Regularly review user accounts and permissions to ensure they align with current roles and responsibilities. Use descriptive names for users and maintain up-to-date contact information. Limit admin privileges to essential personnel only.

**Integration Security**: Store integration credentials securely using environment variables rather than hard-coding them in configuration files. Implement monitoring for integration endpoints to detect and respond to authentication failures or unusual activity. Regularly rotate API keys and credentials according to security policies.

**Configuration Backup**: Regularly backup configuration settings, including templates, numbering sequences, and user permissions. Store backups in a secure location with access controls. Test the restoration process periodically to ensure backups are valid and can be recovered when needed.

**Change Management**: Implement a formal change management process for configuration changes, especially in production environments. Use staging environments to test configuration changes before deploying to production. Document all configuration changes with rationale and impact assessment.

**Section sources**
- [document-numbering.js](file://src/pages/api/settings/document-numbering.js#L1-L695)
- [print-templates.js](file://src/pages/api/settings/print-templates.js#L1-L332)
- [users.js](file://src/pages/api/settings/users.js#L1-L664)
- [printService.js](file://src/services/printService.js#L1-L585)