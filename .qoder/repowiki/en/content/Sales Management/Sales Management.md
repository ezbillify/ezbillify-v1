# Sales Management

<cite>
**Referenced Files in This Document**   
- [QuotationForm.js](file://src/components/sales/QuotationForm.js)
- [SalesOrderForm.js](file://src/components/sales/SalesOrderForm.js)
- [InvoiceForm.js](file://src/components/sales/InvoiceForm.js)
- [PaymentForm.js](file://src/components/sales/PaymentForm.js)
- [SalesReturnForm.js](file://src/components/sales/SalesReturnForm.js)
- [index.js](file://src/pages/api/sales/quotations/index.js)
- [index.js](file://src/pages/api/sales/sales-orders/index.js)
- [index.js](file://src/pages/api/sales/invoices/index.js)
- [index.js](file://src/pages/api/sales/payments/index.js)
- [index.js](file://src/pages/api/sales/returns/index.js)
- [useInvoice.js](file://src/hooks/useInvoice.js)
- [sales.js](file://src/pages/sales/index.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Complete Sales Workflow](#complete-sales-workflow)
3. [Key Entities Implementation](#key-entities-implementation)
4. [Practical Examples](#practical-examples)
5. [Data Model Relationships](#data-model-relationships)
6. [Common Issues and Solutions](#common-issues-and-solutions)
7. [Performance Optimization](#performance-optimization)
8. [Conclusion](#conclusion)

## Introduction

The sales management module in ezbillify-v1 provides a comprehensive solution for managing the complete sales cycle from quotation to payment collection. This document explains the complete workflow, implementation details of key entities, practical examples, data model relationships, common issues, and performance optimization strategies. The system is designed to handle high-volume sales operations with robust tax calculation, payment processing, and return handling capabilities.

**Section sources**
- [sales.js](file://src/pages/sales/index.js#L1-L137)

## Complete Sales Workflow

The sales workflow in ezbillify-v1 follows a structured progression from initial quotation to final payment collection, with optional return processing. Each step in the workflow builds upon the previous one, creating a seamless and traceable sales process.

### Quotation to Invoice Process

The sales process begins with creating a quotation, which can then be converted into a sales order and subsequently into an invoice. This workflow ensures that all sales activities are properly documented and tracked.

```mermaid
sequenceDiagram
participant SalesRep as Sales Representative
participant System as ezbillify-v1 System
participant Customer as Customer
participant Accounting as Accounting Team
SalesRep->>System : Create Quotation
System->>System : Generate document number
System->>System : Calculate taxes and totals
System->>SalesRep : Display quotation
SalesRep->>Customer : Send quotation
Customer->>SalesRep : Approve quotation
SalesRep->>System : Convert to Sales Order
System->>System : Reserve inventory
System->>System : Update quotation status
System->>SalesRep : Confirm sales order
SalesRep->>System : Create Invoice
System->>System : Generate invoice number
System->>System : Update inventory movements
System->>System : Create ledger entry
System->>Accounting : Notify for payment follow-up
```

**Diagram sources**
- [QuotationForm.js](file://src/components/sales/QuotationForm.js#L1-L1375)
- [SalesOrderForm.js](file://src/components/sales/SalesOrderForm.js#L1-L1468)
- [InvoiceForm.js](file://src/components/sales/InvoiceForm.js#L1-L1567)

**Section sources**
- [QuotationForm.js](file://src/components/sales/QuotationForm.js#L1-L1375)
- [SalesOrderForm.js](file://src/components/sales/SalesOrderForm.js#L1-L1468)
- [InvoiceForm.js](file://src/components/sales/InvoiceForm.js#L1-L1567)

### Payment Collection Process

After an invoice is created, the payment collection process begins. Payments can be received against specific invoices or as advance payments, with proper allocation and ledger updates.

```mermaid
sequenceDiagram
participant Accounting as Accounting Team
participant System as ezbillify-v1 System
participant Customer as Customer
participant Bank as Bank
Accounting->>System : Record Payment
System->>System : Validate payment details
System->>System : Allocate to invoices
alt Full Payment
System->>System : Mark invoice as paid
else Partial Payment
System->>System : Update invoice status to partial
end
System->>System : Update customer ledger
System->>System : Create bank reconciliation entry
System->>Accounting : Confirm payment receipt
Customer->>Bank : Transfer funds
Bank->>System : Send payment confirmation
System->>System : Reconcile payment
```

**Diagram sources**
- [PaymentForm.js](file://src/components/sales/PaymentForm.js#L1-L1412)
- [index.js](file://src/pages/api/sales/payments/index.js#L1-L500)

**Section sources**
- [PaymentForm.js](file://src/components/sales/PaymentForm.js#L1-L1412)
- [index.js](file://src/pages/api/sales/payments/index.js#L1-L500)

## Key Entities Implementation

The sales management module implements several key entities that represent different stages of the sales process. Each entity has specific fields and relationships that support the complete sales workflow.

### Quotations

Quotations are the initial sales documents that provide price estimates to customers. They include detailed item information, pricing, and tax calculations.

**Key Features:**
- Document numbering with branch-specific prefixes
- Tax calculation based on customer and company states
- Support for customer-specific discounts
- Validity period for quotations
- Conversion to sales orders

**Section sources**
- [QuotationForm.js](file://src/components/sales/QuotationForm.js#L1-L1375)
- [index.js](file://src/pages/api/sales/quotations/index.js#L1-L521)

### Sales Orders

Sales orders represent confirmed sales transactions after quotation approval. They trigger inventory reservation and serve as the basis for invoice creation.

**Key Features:**
- Linkage to parent quotations
- Inventory reservation upon creation
- Due date for delivery
- Status tracking (pending, confirmed, invoiced)
- Branch-specific document numbering

**Section sources**
- [SalesOrderForm.js](file://src/components/sales/SalesOrderForm.js#L1-L1468)
- [index.js](file://src/pages/api/sales/sales-orders/index.js#L1-L485)

### Invoices

Invoices are the final billing documents that request payment from customers. They include all necessary tax information and create entries in the accounting system.

**Key Features:**
- Automatic document numbering with financial year tracking
- GST type determination (intrastate or interstate)
- Credit limit validation before creation
- Customer-specific discount application
- Ledger entry creation for accounting
- Inventory movement tracking

**Section sources**
- [InvoiceForm.js](file://src/components/sales/InvoiceForm.js#L1-L1567)
- [index.js](file://src/pages/api/sales/invoices/index.js#L1-L625)

### Payments

Payments represent the receipt of funds from customers against invoices or as advance payments. They support multiple payment methods and proper allocation.

**Key Features:**
- Multiple payment methods (cash, bank transfer, UPI)
- Allocation to multiple invoices
- Advance payment handling
- Bank account integration
- Ledger entry creation for accounting
- Auto-allocation to oldest invoices

**Section sources**
- [PaymentForm.js](file://src/components/sales/PaymentForm.js#L1-L1412)
- [index.js](file://src/pages/api/sales/payments/index.js#L1-L500)

### Returns

Returns (credit notes) handle sales reversals due to various reasons such as damaged goods or customer dissatisfaction. They adjust inventory and accounting records accordingly.

**Key Features:**
- Linkage to original invoices
- Inventory restoration upon return
- Credit note creation for accounting
- Reason tracking for returns
- Impact on customer credit balance
- Branch-specific document numbering

**Section sources**
- [SalesReturnForm.js](file://src/components/sales/SalesReturnForm.js#L1-L1342)
- [index.js](file://src/pages/api/sales/returns/index.js#L1-L511)

## Practical Examples

This section provides practical examples of creating sales documents, applying tax calculations, processing payments, and handling returns in the ezbillify-v1 system.

### Creating a Sales Document

Creating a sales document involves several steps, from selecting a customer to calculating taxes and generating the document number.

```mermaid
flowchart TD
A[Start] --> B[Select Customer]
B --> C{Customer Selected?}
C --> |Yes| D[Load Customer Details]
C --> |No| B
D --> E[Add Items]
E --> F{Items Added?}
F --> |Yes| G[Calculate Taxes]
F --> |No| E
G --> H[Apply Discounts]
H --> I[Calculate Totals]
I --> J[Select Branch]
J --> K[Generate Document Number]
K --> L[Save Document]
L --> M[End]
```

**Section sources**
- [QuotationForm.js](file://src/components/sales/QuotationForm.js#L1-L1375)
- [SalesOrderForm.js](file://src/components/sales/SalesOrderForm.js#L1-L1468)
- [InvoiceForm.js](file://src/components/sales/InvoiceForm.js#L1-L1567)

### Applying Tax Calculations

Tax calculations in ezbillify-v1 are automated based on the customer's and company's states, determining whether the transaction is intrastate or interstate.

```mermaid
flowchart TD
A[Start] --> B[Get Company State]
B --> C[Get Customer State]
C --> D{States Match?}
D --> |Yes| E[Apply CGST & SGST]
D --> |No| F[Apply IGST]
E --> G[Calculate Tax Amounts]
F --> G
G --> H[Update Line Items]
H --> I[Recalculate Totals]
I --> J[End]
```

**Section sources**
- [QuotationForm.js](file://src/components/sales/QuotationForm.js#L1-L1375)
- [SalesOrderForm.js](file://src/components/sales/SalesOrderForm.js#L1-L1468)
- [InvoiceForm.js](file://src/components/sales/InvoiceForm.js#L1-L1567)

### Processing Payments

Payment processing involves recording the receipt of funds and allocating them to outstanding invoices.

```mermaid
flowchart TD
A[Start] --> B[Select Customer]
B --> C[Enter Payment Amount]
C --> D[Select Payment Method]
D --> E{Bank Transfer?}
E --> |Yes| F[Select Bank Account]
E --> |No| G[Continue]
F --> G
G --> H[Allocate to Invoices]
H --> I{Auto-allocate?}
I --> |Yes| J[Allocate to Oldest Invoices]
I --> |No| K[Manual Allocation]
J --> L
K --> L
L --> M[Update Invoice Status]
M --> N[Create Ledger Entry]
N --> O[End]
```

**Section sources**
- [PaymentForm.js](file://src/components/sales/PaymentForm.js#L1-L1412)
- [index.js](file://src/pages/api/sales/payments/index.js#L1-L500)

### Handling Returns

Returns processing involves creating credit notes and adjusting inventory and accounting records.

```mermaid
flowchart TD
A[Start] --> B[Select Invoice]
B --> C[Select Items to Return]
C --> D[Enter Return Quantity]
D --> E{Quantity Valid?}
E --> |Yes| F[Calculate Return Amount]
E --> |No| D
F --> G[Select Return Reason]
G --> H[Create Credit Note]
H --> I[Update Inventory]
I --> J[Create Ledger Entry]
J --> K[End]
```

**Section sources**
- [SalesReturnForm.js](file://src/components/sales/SalesReturnForm.js#L1-L1342)
- [index.js](file://src/pages/api/sales/returns/index.js#L1-L511)

## Data Model Relationships

The sales management module uses a relational data model to connect customers, items, and sales documents. Understanding these relationships is crucial for effective system usage and troubleshooting.

### Entity Relationship Diagram

```mermaid
erDiagram
CUSTOMER {
uuid id PK
string name
string customer_code
string customer_type
string email
string phone
json billing_address
json shipping_address
decimal credit_limit
decimal credit_used
decimal advance_amount
timestamp created_at
timestamp updated_at
}
ITEM {
uuid id PK
string item_code
string item_name
string description
uuid primary_unit_id
decimal selling_price
decimal selling_price_with_tax
decimal purchase_price
decimal mrp
string hsn_sac_code
uuid tax_rate_id
decimal gst_rate
boolean track_inventory
decimal current_stock
decimal reserved_stock
decimal available_stock
timestamp created_at
timestamp updated_at
}
SALES_DOCUMENT {
uuid id PK
uuid company_id FK
uuid branch_id FK
string document_type
string document_number
date document_date
date due_date
uuid customer_id FK
string customer_name
string customer_gstin
json billing_address
json shipping_address
uuid parent_document_id FK
uuid invoice_id FK
decimal subtotal
decimal discount_amount
decimal discount_percentage
decimal tax_amount
decimal total_amount
decimal balance_amount
decimal paid_amount
string payment_status
string status
string gst_type
text notes
text terms_conditions
timestamp created_at
timestamp updated_at
}
SALES_DOCUMENT_ITEM {
uuid id PK
uuid document_id FK
uuid item_id FK
string item_code
string item_name
string description
decimal quantity
uuid unit_id
string unit_name
decimal rate
decimal discount_percentage
decimal discount_amount
decimal taxable_amount
decimal tax_rate
decimal cgst_rate
decimal sgst_rate
decimal igst_rate
decimal cgst_amount
decimal sgst_amount
decimal igst_amount
decimal cess_amount
decimal total_amount
string hsn_sac_code
decimal mrp
decimal purchase_price
decimal selling_price
timestamp created_at
timestamp updated_at
}
PAYMENT {
uuid id PK
uuid company_id FK
uuid branch_id FK
string payment_type
string payment_number
date payment_date
uuid customer_id FK
string party_name
decimal amount
string payment_method
uuid bank_account_id FK
string reference_number
text notes
string status
timestamp created_at
timestamp updated_at
}
PAYMENT_ALLOCATION {
uuid id PK
uuid payment_id FK
uuid sales_document_id FK
decimal allocated_amount
timestamp created_at
}
CUSTOMER_LEDGER_ENTRY {
uuid id PK
uuid company_id FK
uuid customer_id FK
date entry_date
string entry_type
string reference_type
uuid reference_id
string reference_number
decimal debit_amount
decimal credit_amount
decimal balance
text description
timestamp created_at
}
CUSTOMER ||--o{ SALES_DOCUMENT : "creates"
ITEM ||--o{ SALES_DOCUMENT_ITEM : "included in"
SALES_DOCUMENT ||--o{ SALES_DOCUMENT_ITEM : "contains"
SALES_DOCUMENT ||--|| SALES_DOCUMENT : "parent-child"
CUSTOMER ||--o{ PAYMENT : "makes"
PAYMENT ||--o{ PAYMENT_ALLOCATION : "includes"
SALES_DOCUMENT ||--o{ PAYMENT_ALLOCATION : "allocated to"
CUSTOMER ||--o{ CUSTOMER_LEDGER_ENTRY : "has"
PAYMENT ||--o{ CUSTOMER_LEDGER_ENTRY : "creates"
SALES_DOCUMENT ||--o{ CUSTOMER_LEDGER_ENTRY : "creates"
```

**Diagram sources**
- [index.js](file://src/pages/api/sales/quotations/index.js#L1-L521)
- [index.js](file://src/pages/api/sales/sales-orders/index.js#L1-L485)
- [index.js](file://src/pages/api/sales/invoices/index.js#L1-L625)
- [index.js](file://src/pages/api/sales/payments/index.js#L1-L500)
- [index.js](file://src/pages/api/sales/returns/index.js#L1-L511)

**Section sources**
- [index.js](file://src/pages/api/sales/quotations/index.js#L1-L521)
- [index.js](file://src/pages/api/sales/sales-orders/index.js#L1-L485)
- [index.js](file://src/pages/api/sales/invoices/index.js#L1-L625)
- [index.js](file://src/pages/api/sales/payments/index.js#L1-L500)
- [index.js](file://src/pages/api/sales/returns/index.js#L1-L511)

### Data Flow Diagram

```mermaid
flowchart LR
A[Customer] --> B[Quotation]
B --> C[Sales Order]
C --> D[Invoice]
D --> E[Payment]
E --> F[Accounting]
C --> G[Inventory]
D --> G
H[Return] --> D
H --> G
G --> I[Reporting]
F --> I
A --> J[Customer Ledger]
E --> J
D --> J
H --> J
```

**Diagram sources**
- [QuotationForm.js](file://src/components/sales/QuotationForm.js#L1-L1375)
- [SalesOrderForm.js](file://src/components/sales/SalesOrderForm.js#L1-L1468)
- [InvoiceForm.js](file://src/components/sales/InvoiceForm.js#L1-L1567)
- [PaymentForm.js](file://src/components/sales/PaymentForm.js#L1-L1412)
- [SalesReturnForm.js](file://src/components/sales/SalesReturnForm.js#L1-L1342)

**Section sources**
- [QuotationForm.js](file://src/components/sales/QuotationForm.js#L1-L1375)
- [SalesOrderForm.js](file://src/components/sales/SalesOrderForm.js#L1-L1468)
- [InvoiceForm.js](file://src/components/sales/InvoiceForm.js#L1-L1567)
- [PaymentForm.js](file://src/components/sales/PaymentForm.js#L1-L1412)
- [SalesReturnForm.js](file://src/components/sales/SalesReturnForm.js#L1-L1342)

## Common Issues and Solutions

This section addresses common issues encountered in the sales management module and provides solutions for each.

### Pricing Errors

Pricing errors can occur due to incorrect item pricing or discount application.

**Common Causes:**
- Incorrect selling price in item master
- Wrong discount percentage applied
- Tax calculation errors
- Currency conversion issues

**Solutions:**
- Regularly audit item pricing
- Implement price change approval workflow
- Validate discounts against customer agreements
- Use standardized tax calculation methods

**Section sources**
- [QuotationForm.js](file://src/components/sales/QuotationForm.js#L1-L1375)
- [SalesOrderForm.js](file://src/components/sales/SalesOrderForm.js#L1-L1468)
- [InvoiceForm.js](file://src/components/sales/InvoiceForm.js#L1-L1567)

### Tax Calculation Problems

Tax calculation issues can lead to compliance problems and financial discrepancies.

**Common Causes:**
- Incorrect GST type determination
- Wrong tax rate applied
- Missing HSN/SAC codes
- State mismatch between company and customer

**Solutions:**
- Implement automated GST type detection
- Maintain up-to-date tax rate master
- Validate HSN/SAC codes during item creation
- Regularly verify customer state information

**Section sources**
- [QuotationForm.js](file://src/components/sales/QuotationForm.js#L1-L1375)
- [SalesOrderForm.js](file://src/components/sales/SalesOrderForm.js#L1-L1468)
- [InvoiceForm.js](file://src/components/sales/InvoiceForm.js#L1-L1567)

### Payment Reconciliation

Payment reconciliation issues can arise from mismatched records between the system and bank statements.

**Common Causes:**
- Duplicate payment entries
- Incorrect payment allocation
- Timing differences between system and bank
- Missing payment references

**Solutions:**
- Implement bank reconciliation module
- Use unique payment references
- Regular reconciliation schedules
- Automated matching algorithms

**Section sources**
- [PaymentForm.js](file://src/components/sales/PaymentForm.js#L1-L1412)
- [index.js](file://src/pages/api/sales/payments/index.js#L1-L500)

## Performance Optimization

For high-volume sales operations, performance optimization is crucial to maintain system responsiveness and data integrity.

### Database Indexing

Proper indexing of database tables improves query performance significantly.

**Recommended Indexes:**
- Sales documents: document_number, document_date, customer_id, payment_status
- Items: item_code, item_name, hsn_sac_code
- Customers: customer_code, name, email
- Payments: payment_number, payment_date, customer_id

**Section sources**
- [index.js](file://src/pages/api/sales/quotations/index.js#L1-L521)
- [index.js](file://src/pages/api/sales/sales-orders/index.js#L1-L485)
- [index.js](file://src/pages/api/sales/invoices/index.js#L1-L625)
- [index.js](file://src/pages/api/sales/payments/index.js#L1-L500)

### Caching Strategies

Implementing caching reduces database load and improves response times.

**Caching Approach:**
- Cache frequently accessed master data (items, customers, tax rates)
- Use short TTL for transactional data
- Implement cache invalidation on data updates
- Cache document numbering sequences

**Section sources**
- [useInvoice.js](file://src/hooks/useInvoice.js#L1-L198)
- [QuotationForm.js](file://src/components/sales/QuotationForm.js#L1-L1375)
- [SalesOrderForm.js](file://src/components/sales/SalesOrderForm.js#L1-L1468)
- [InvoiceForm.js](file://src/components/sales/InvoiceForm.js#L1-L1567)

### Batch Processing

For high-volume operations, batch processing improves efficiency.

**Batch Processing Use Cases:**
- Bulk invoice generation
- Mass payment processing
- End-of-day reconciliation
- Monthly reporting

**Section sources**
- [index.js](file://src/pages/api/sales/invoices/index.js#L1-L625)
- [index.js](file://src/pages/api/sales/payments/index.js#L1-L500)

## Conclusion

The sales management module in ezbillify-v1 provides a comprehensive and robust solution for managing the complete sales cycle. By understanding the workflow, data model, and implementation details, users can effectively leverage the system to streamline sales operations, ensure accurate financial reporting, and improve customer satisfaction. The module's design supports high-volume operations with performance optimization strategies and addresses common issues through systematic solutions. Regular maintenance and optimization will ensure the system continues to meet evolving business needs.