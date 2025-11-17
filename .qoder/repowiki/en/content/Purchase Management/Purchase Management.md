# Purchase Management

<cite>
**Referenced Files in This Document**   
- [purchase_order_form.js](file://src/components/purchase/PurchaseOrderForm.js)
- [grn_form.js](file://src/components/purchase/GRNForm.js)
- [bill_form.js](file://src/components/purchase/BillForm.js)
- [payment_made_form.js](file://src/components/purchase/PaymentMadeForm.js)
- [purchase_return_form.js](file://src/components/purchase/PurchaseReturnForm.js)
- [purchase_orders_api.js](file://src/pages/api/purchase/purchase-orders/index.js)
- [grn_api.js](file://src/pages/api/purchase/grn/index.js)
- [bills_api.js](file://src/pages/api/purchase/bills/index.js)
- [payments_made_api.js](file://src/pages/api/purchase/payments-made/index.js)
- [returns_api.js](file://src/pages/api/purchase/returns/index.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Procurement Workflow](#procurement-workflow)
3. [Key Entities](#key-entities)
4. [Document Creation](#document-creation)
5. [Data Model Relationships](#data-model-relationships)
6. [Common Issues](#common-issues)
7. [Performance Optimization](#performance-optimization)
8. [Conclusion](#conclusion)

## Introduction
The purchase management module in ezbillify-v1 provides a comprehensive solution for managing the entire procurement lifecycle. This document explains the complete workflow from purchase order creation to goods receipt, bill processing, payment, and returns. The system is designed to handle multi-branch operations with branch-specific document numbering and supports GST-compliant transactions. The module integrates seamlessly with inventory management, accounting, and vendor management systems to provide a unified procurement experience.

**Section sources**
- [purchase_order_form.js](file://src/components/purchase/PurchaseOrderForm.js)

## Procurement Workflow
The procurement workflow in ezbillify-v1 follows a structured process that ensures proper documentation and financial control. The workflow begins with purchase order creation and progresses through goods receipt, bill processing, payment, and handling of returns.

```mermaid
sequenceDiagram
participant User as "User"
participant PO as "Purchase Order"
participant GRN as "Goods Receipt Note"
participant Bill as "Vendor Bill"
participant Payment as "Payment Made"
participant Return as "Purchase Return"
User->>PO : Create Purchase Order
PO->>GRN : Receive Goods
GRN->>Bill : Process Vendor Bill
Bill->>Payment : Make Payment
Payment->>Return : Handle Returns (if needed)
Return->>Payment : Adjust Advance or Reduce Bill Balance
Note over PO,GRN : PO status updates based on GRN quantity
Note over Bill,Payment : Bill status updates based on payment amount
Note over Return,Payment : Return amount creates vendor advance or reduces bill balance
```

**Diagram sources**
- [purchase_orders_api.js](file://src/pages/api/purchase/purchase-orders/index.js)
- [grn_api.js](file://src/pages/api/purchase/grn/index.js)
- [bills_api.js](file://src/pages/api/purchase/bills/index.js)
- [payments_made_api.js](file://src/pages/api/purchase/payments-made/index.js)
- [returns_api.js](file://src/pages/api/purchase/returns/index.js)

**Section sources**
- [purchase_order_form.js](file://src/components/purchase/PurchaseOrderForm.js)
- [grn_form.js](file://src/components/purchase/GRNForm.js)
- [bill_form.js](file://src/components/purchase/BillForm.js)
- [payment_made_form.js](file://src/components/purchase/PaymentMadeForm.js)
- [purchase_return_form.js](file://src/components/purchase/PurchaseReturnForm.js)

## Key Entities
The purchase management module implements several key entities that represent different stages of the procurement process. Each entity has specific attributes and relationships that support the overall workflow.

### Purchase Orders
Purchase orders (PO) are the initial documents created to formalize the intent to purchase goods or services from vendors. They contain details about the items to be purchased, quantities, rates, and delivery terms.

```mermaid
classDiagram
class PurchaseOrder {
+string document_number
+date document_date
+date due_date
+string vendor_id
+string vendor_name
+object billing_address
+object shipping_address
+number subtotal
+number tax_amount
+number total_amount
+number paid_amount
+number balance_amount
+string payment_status
+array items
+string notes
+string terms_conditions
}
PurchaseOrder --> PurchaseOrderItem : "contains"
PurchaseOrder --> Vendor : "issued to"
```

**Diagram sources**
- [purchase_orders_api.js](file://src/pages/api/purchase/purchase-orders/index.js)

**Section sources**
- [purchase_order_form.js](file://src/components/purchase/PurchaseOrderForm.js)

### Goods Receipt Notes
Goods Receipt Notes (GRN) document the physical receipt of goods from vendors. They are linked to purchase orders and validate that the received items match the ordered items in terms of quantity and quality.

```mermaid
classDiagram
class GRN {
+string document_number
+date document_date
+string vendor_id
+string vendor_name
+string parent_document_id
+string delivery_note_number
+string transporter_name
+string vehicle_number
+string status
+array items
+string notes
}
GRN --> GRNItem : "contains"
GRN --> PurchaseOrder : "received against"
GRN --> Vendor : "received from"
```

**Diagram sources**
- [grn_api.js](file://src/pages/api/purchase/grn/index.js)

**Section sources**
- [grn_form.js](file://src/components/purchase/GRNForm.js)

### Vendor Bills
Vendor bills represent the financial obligation to vendors for goods or services received. They are processed after goods receipt and include tax calculations based on GST rules.

```mermaid
classDiagram
class Bill {
+string document_number
+date document_date
+date due_date
+string vendor_id
+string vendor_name
+string vendor_gstin
+string vendor_invoice_number
+string parent_document_id
+object billing_address
+object shipping_address
+number subtotal
+number discount_amount
+number tax_amount
+number total_amount
+number paid_amount
+number balance_amount
+number cgst_amount
+number sgst_amount
+number igst_amount
+string payment_status
+array items
+string notes
+string terms_conditions
}
Bill --> BillItem : "contains"
Bill --> PurchaseOrder : "linked to"
Bill --> Vendor : "issued by"
Bill --> InventoryMovement : "creates"
```

**Diagram sources**
- [bills_api.js](file://src/pages/api/purchase/bills/index.js)

**Section sources**
- [bill_form.js](file://src/components/purchase/BillForm.js)

### Payments Made
Payments made document the settlement of financial obligations to vendors. Payments can be made against specific bills or recorded as advance payments for future use.

```mermaid
classDiagram
class PaymentMade {
+string payment_number
+date payment_date
+string vendor_id
+string vendor_name
+string payment_method
+string bank_account_id
+string reference_number
+number amount
+string notes
+array bill_payments
}
PaymentMade --> BillPayment : "includes"
PaymentMade --> Vendor : "paid to"
PaymentMade --> BankAccount : "through"
PaymentMade --> VendorAdvance : "creates"
```

**Diagram sources**
- [payments_made_api.js](file://src/pages/api/purchase/payments-made/index.js)

**Section sources**
- [payment_made_form.js](file://src/components/purchase/PaymentMadeForm.js)

### Purchase Returns
Purchase returns, documented as debit notes, handle the return of goods to vendors due to various reasons such as damage, defects, or incorrect items. The system handles returns differently based on whether the corresponding bill has been paid.

```mermaid
classDiagram
class PurchaseReturn {
+string document_number
+date document_date
+string vendor_id
+string vendor_name
+string vendor_gstin
+string parent_document_id
+object billing_address
+object shipping_address
+number subtotal
+number discount_amount
+number tax_amount
+number total_amount
+number paid_amount
+number balance_amount
+number cgst_amount
+number sgst_amount
+number igst_amount
+string return_reason
+string notes
+array items
}
PurchaseReturn --> ReturnItem : "contains"
PurchaseReturn --> Bill : "return against"
PurchaseReturn --> Vendor : "returned to"
PurchaseReturn --> InventoryMovement : "reverses"
PurchaseReturn --> VendorAdvance : "creates"
```

**Diagram sources**
- [returns_api.js](file://src/pages/api/purchase/returns/index.js)

**Section sources**
- [purchase_return_form.js](file://src/components/purchase/PurchaseReturnForm.js)

## Document Creation
Creating purchase documents in ezbillify-v1 follows a consistent pattern across different document types. The system provides user-friendly forms with validation and real-time calculations to ensure accuracy.

### Creating Purchase Orders
Purchase orders are created through a multi-step form that guides users through vendor selection, item selection, and finalization. The form supports branch-specific document numbering and provides real-time calculation of totals.

```mermaid
flowchart TD
Start([Start]) --> SelectBranch["Select Branch"]
SelectBranch --> SelectVendor["Select Vendor"]
SelectVendor --> AddItems["Add Items"]
AddItems --> CalculateTotals["Calculate Totals"]
CalculateTotals --> Review["Review PO Details"]
Review --> Save["Save Purchase Order"]
Save --> End([End])
style Start fill:#f9f,stroke:#333
style End fill:#f9f,stroke:#333
```

**Section sources**
- [purchase_order_form.js](file://src/components/purchase/PurchaseOrderForm.js)

### Matching GRN to PO
The system allows users to create Goods Receipt Notes directly from purchase orders, ensuring accurate matching of received goods to ordered items. This process validates quantities and updates the purchase order status accordingly.

```mermaid
sequenceDiagram
participant User as "User"
participant PO as "Purchase Order"
participant GRN as "GRN Form"
User->>PO : Select PO for goods receipt
PO->>GRN : Load PO details and items
GRN->>User : Display items with ordered quantities
User->>GRN : Enter received quantities
GRN->>GRN : Validate received quantities
User->>GRN : Save GRN
GRN->>PO : Update PO status based on received quantity
PO->>User : Show updated PO status
```

**Section sources**
- [grn_form.js](file://src/components/purchase/GRNForm.js)

### Processing Vendor Bills
Vendor bills are processed after goods receipt and can be created directly from purchase orders or independently. The system automatically calculates taxes based on vendor and company state information.

```mermaid
flowchart TD
Start([Start]) --> SelectVendor["Select Vendor"]
SelectVendor --> EnterBillDetails["Enter Bill Details"]
EnterBillDetails --> AddItems["Add Items"]
AddItems --> CalculateTaxes["Calculate CGST/SGST/IGST"]
CalculateTaxes --> ApplyDiscount["Apply Discount if needed"]
ApplyDiscount --> CalculateTotals["Calculate Final Totals"]
CalculateTotals --> Save["Save Vendor Bill"]
Save --> CreateInventory["Create Inventory Movements"]
CreateInventory --> UpdatePrice["Update Item Purchase Price"]
UpdatePrice --> End([End])
```

**Section sources**
- [bill_form.js](file://src/components/purchase/BillForm.js)

### Handling Returns
Purchase returns are processed through a dedicated form that allows users to select a vendor bill and specify items to return. The system handles the financial implications differently based on whether the bill has been paid.

```mermaid
sequenceDiagram
participant User as "User"
participant Bill as "Vendor Bill"
participant Return as "Purchase Return"
User->>Bill : Select bill for return
Bill->>Return : Load bill details and items
Return->>User : Display items with received quantities
User->>Return : Enter return quantities
Return->>Return : Validate return quantities
User->>Return : Save return
alt Bill is paid
Return->>VendorAdvance : Create vendor advance
VendorAdvance->>User : Show advance created
else Bill is unpaid
Return->>Bill : Reduce bill balance
Bill->>User : Show updated bill balance
end
```

**Section sources**
- [purchase_return_form.js](file://src/components/purchase/PurchaseReturnForm.js)

## Data Model Relationships
The purchase management module implements a robust data model that establishes clear relationships between vendors, items, and purchase documents. This ensures data integrity and enables comprehensive reporting.

### Entity Relationship Diagram
```mermaid
erDiagram
VENDOR {
uuid id PK
string vendor_name
string vendor_code
string gstin
object billing_address
object shipping_address
number current_balance
number advance_amount
}
ITEM {
uuid id PK
string item_code
string item_name
string hsn_sac_code
number purchase_price
uuid primary_unit_id FK
uuid tax_rate_id FK
}
PURCHASE_DOCUMENT {
uuid id PK
string document_type
string document_number
date document_date
string vendor_id FK
string vendor_name
string vendor_gstin
string parent_document_id FK
object billing_address
object shipping_address
number subtotal
number discount_amount
number tax_amount
number total_amount
number paid_amount
number balance_amount
number cgst_amount
number sgst_amount
number igst_amount
string payment_status
string status
string notes
string terms_conditions
}
PURCHASE_DOCUMENT_ITEM {
uuid id PK
uuid document_id FK
uuid item_id FK
string item_code
string item_name
number quantity
number rate
number discount_percentage
number discount_amount
number taxable_amount
number tax_rate
number cgst_rate
number sgst_rate
number igst_rate
number cgst_amount
number sgst_amount
number igst_amount
number total_amount
string hsn_sac_code
}
VENDOR ||--o{ PURCHASE_DOCUMENT : "issues"
ITEM ||--o{ PURCHASE_DOCUMENT_ITEM : "included in"
PURCHASE_DOCUMENT ||--o{ PURCHASE_DOCUMENT_ITEM : "contains"
PURCHASE_DOCUMENT }|--|| PURCHASE_DOCUMENT : "linked to"
```

**Section sources**
- [purchase_orders_api.js](file://src/pages/api/purchase/purchase-orders/index.js)
- [grn_api.js](file://src/pages/api/purchase/grn/index.js)
- [bills_api.js](file://src/pages/api/purchase/bills/index.js)
- [returns_api.js](file://src/pages/api/purchase/returns/index.js)

## Common Issues
The purchase management module addresses several common issues that arise in procurement processes, providing mechanisms to prevent and resolve them.

### Three-Way Matching Problems
Three-way matching (PO, GRN, and bill) is a critical control in procurement to ensure that payments are made only for goods that were ordered and received. The system helps prevent mismatches by:

1. **Validating quantities**: When creating a GRN from a PO, the system validates that received quantities do not exceed ordered quantities.
2. **Linking documents**: Bills are linked to both POs and GRNs, enabling easy comparison of quantities and prices.
3. **Status tracking**: PO status is automatically updated based on GRN quantities (pending, partially received, received).

```mermaid
flowchart TD
PO["Purchase Order\n10 units @ ₹100"] --> GRN["Goods Receipt\n8 units received"]
GRN --> Bill["Vendor Bill\n8 units @ ₹100"]
Bill --> Payment["Payment\n₹800"]
style PO fill:#e6f3ff,stroke:#333
style GRN fill:#e6f3ff,stroke:#333
style Bill fill:#e6f3ff,stroke:#333
style Payment fill:#e6f3ff,stroke:#333
```

**Section sources**
- [grn_form.js](file://src/components/purchase/GRNForm.js)
- [bill_form.js](file://src/components/purchase/BillForm.js)

### Vendor Reconciliation Errors
Vendor reconciliation errors occur when the vendor's statement does not match the company's records. The system prevents these errors by:

1. **Maintaining accurate balances**: The vendor's current balance is automatically updated with each transaction.
2. **Tracking advances**: Advance payments are properly recorded and can be applied against future bills.
3. **Detailed ledger**: A comprehensive vendor ledger shows all transactions chronologically.

```mermaid
flowchart TD
PO["PO Created\nAmount: ₹10,000"] --> GRN["GRN Created\nAmount: ₹10,000"]
GRN --> Bill["Bill Created\nAmount: ₹10,000"]
Bill --> Payment["Payment Made\nAmount: ₹8,000"]
Payment --> Advance["Advance Created\nAmount: ₹2,000"]
Advance --> FutureBill["Future Bill\nApply Advance: ₹2,000"]
style PO fill:#e6f3ff,stroke:#333
style GRN fill:#e6f3ff,stroke:#333
style Bill fill:#e6f3ff,stroke:#333
style Payment fill:#e6f3ff,stroke:#333
style Advance fill:#e6f3ff,stroke:#333
style FutureBill fill:#e6f3ff,stroke:#333
```

**Section sources**
- [payments_made_api.js](file://src/pages/api/purchase/payments-made/index.js)
- [returns_api.js](file://src/pages/api/purchase/returns/index.js)

### Inventory Valuation Discrepancies
Inventory valuation discrepancies can occur due to incorrect purchase price updates. The system ensures accurate inventory valuation by:

1. **Updating purchase price**: When a bill is processed, the item's purchase price is updated to the latest rate.
2. **Tracking inventory movements**: Each receipt and return is recorded as an inventory movement with the appropriate rate and value.
3. **Costing methods**: The system supports different costing methods (FIFO, weighted average) for inventory valuation.

```mermaid
flowchart TD
Bill["Bill Processed\nItem: Widget\nRate: ₹105"] --> UpdatePrice["Update Item Purchase Price\nNew Price: ₹105"]
UpdatePrice --> Inventory["Inventory Movement\nQuantity: 10\nRate: ₹105\nValue: ₹1,050"]
Inventory --> Valuation["Inventory Valuation\nWidget: ₹105/unit"]
style Bill fill:#e6f3ff,stroke:#333
style UpdatePrice fill:#e6f3ff,stroke:#333
style Inventory fill:#e6f3ff,stroke:#333
style Valuation fill:#e6f3ff,stroke:#333
```

**Section sources**
- [bills_api.js](file://src/pages/api/purchase/bills/index.js)

## Performance Optimization
The purchase management module includes several performance optimization features to handle high-volume purchase operations efficiently.

### High-Volume Processing
For companies with high purchase volumes, the system provides features to streamline processing:

1. **Bulk operations**: Support for bulk creation and processing of purchase documents.
2. **Efficient queries**: Optimized database queries with proper indexing for fast retrieval of purchase data.
3. **Caching**: Implementation of caching for frequently accessed data like vendor and item information.

```mermaid
flowchart TD
Upload["Upload Purchase Data\nCSV/Excel"] --> Validate["Validate Data"]
Validate --> Process["Process in Bulk"]
Process --> CreatePO["Create Multiple POs"]
CreatePO --> CreateGRN["Create Multiple GRNs"]
CreateGRN --> CreateBills["Create Multiple Bills"]
CreateBills --> UpdateInventory["Update Inventory in Bulk"]
UpdateInventory --> GenerateReports["Generate Summary Reports"]
style Upload fill:#e6f3ff,stroke:#333
style Validate fill:#e6f3ff,stroke:#333
style Process fill:#e6f3ff,stroke:#333
style CreatePO fill:#e6f3ff,stroke:#333
style CreateGRN fill:#e6f3ff,stroke:#333
style CreateBills fill:#e6f3ff,stroke:#333
style UpdateInventory fill:#e6f3ff,stroke:#333
style GenerateReports fill:#e6f3ff,stroke:#333
```

**Section sources**
- [purchase_orders_api.js](file://src/pages/api/purchase/purchase-orders/index.js)
- [grn_api.js](file://src/pages/api/purchase/grn/index.js)
- [bills_api.js](file://src/pages/api/purchase/bills/index.js)

### System Integration
The purchase management module integrates with other systems to enhance performance and data accuracy:

1. **Inventory integration**: Real-time updates to inventory levels and valuation.
2. **Accounting integration**: Automatic creation of journal entries for purchase transactions.
3. **Vendor portal**: Integration with vendor portals for electronic bill submission and tracking.

```mermaid
flowchart LR
Purchase["Purchase Management"] --> Inventory["Inventory System"]
Purchase --> Accounting["Accounting System"]
Purchase --> VendorPortal["Vendor Portal"]
VendorPortal --> Purchase
Accounting --> Reporting["Financial Reporting"]
Inventory --> Reporting
style Purchase fill:#e6f3ff,stroke:#333
style Inventory fill:#e6f3ff,stroke:#333
style Accounting fill:#e6f3ff,stroke:#333
style VendorPortal fill:#e6f3ff,stroke:#333
style Reporting fill:#e6f3ff,stroke:#333
```

**Section sources**
- [bills_api.js](file://src/pages/api/purchase/bills/index.js)
- [payments_made_api.js](file://src/pages/api/purchase/payments-made/index.js)

## Conclusion
The purchase management module in ezbillify-v1 provides a comprehensive solution for managing the entire procurement lifecycle. From purchase order creation to goods receipt, bill processing, payment, and returns, the system ensures accurate documentation, financial control, and inventory management. The module's robust data model, integration with other systems, and performance optimization features make it suitable for businesses of all sizes. By addressing common procurement issues like three-way matching problems, vendor reconciliation errors, and inventory valuation discrepancies, the system helps organizations maintain financial accuracy and operational efficiency.