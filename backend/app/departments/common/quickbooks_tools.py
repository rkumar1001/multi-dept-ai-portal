"""Shared QuickBooks tools available to all departments.

Provides Claude tool definitions and a dispatcher that routes calls
through the QuickBooks service using the department's connected account.
"""

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.quickbooks_service import (
    quickbooks_api_request,
    quickbooks_query,
    get_report,
    get_company_info,
)

logger = logging.getLogger(__name__)

QUICKBOOKS_TOOLS: list[dict] = [
    # ── Customers ──
    {
        "name": "qb_list_customers",
        "description": "List customers from QuickBooks. Optionally filter with a WHERE clause.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string", "description": "Optional WHERE clause, e.g. \"DisplayName LIKE '%Smith%'\""},
                "max_results": {"type": "integer", "description": "Max results (default 100)", "default": 100},
            },
        },
    },
    {
        "name": "qb_get_customer",
        "description": "Get a specific customer by their QuickBooks ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {"type": "string", "description": "Customer ID"},
            },
            "required": ["customer_id"],
        },
    },
    {
        "name": "qb_create_customer",
        "description": "Create a new customer in QuickBooks. DisplayName is required and must be unique.",
        "input_schema": {
            "type": "object",
            "properties": {
                "DisplayName": {"type": "string", "description": "Display name (required, must be unique)"},
                "GivenName": {"type": "string", "description": "First name"},
                "FamilyName": {"type": "string", "description": "Last name"},
                "CompanyName": {"type": "string", "description": "Company name"},
                "PrimaryEmailAddr": {"type": "object", "description": "Email: {\"Address\": \"email@example.com\"}"},
                "PrimaryPhone": {"type": "object", "description": "Phone: {\"FreeFormNumber\": \"555-1234\"}"},
            },
            "required": ["DisplayName"],
        },
    },
    # ── Invoices ──
    {
        "name": "qb_list_invoices",
        "description": "List invoices from QuickBooks. Optionally filter with a WHERE clause.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string", "description": "Optional WHERE clause, e.g. \"TotalAmt > '100.00'\""},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_get_invoice",
        "description": "Get a specific invoice by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "invoice_id": {"type": "string", "description": "Invoice ID"},
            },
            "required": ["invoice_id"],
        },
    },
    {
        "name": "qb_create_invoice",
        "description": "Create a new invoice. Requires CustomerRef and at least one Line item.",
        "input_schema": {
            "type": "object",
            "properties": {
                "CustomerRef": {"type": "object", "description": "Customer ref: {\"value\": \"customer_id\"}"},
                "Line": {"type": "array", "description": "Line items array"},
                "DueDate": {"type": "string", "description": "Due date (YYYY-MM-DD)"},
                "DocNumber": {"type": "string", "description": "Invoice number"},
            },
            "required": ["CustomerRef", "Line"],
        },
    },
    {
        "name": "qb_send_invoice",
        "description": "Email an invoice to the customer.",
        "input_schema": {
            "type": "object",
            "properties": {
                "invoice_id": {"type": "string", "description": "Invoice ID to send"},
                "email": {"type": "string", "description": "Optional override email address"},
            },
            "required": ["invoice_id"],
        },
    },
    # ── Payments ──
    {
        "name": "qb_list_payments",
        "description": "List payments from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string", "description": "Optional WHERE clause"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_get_payment",
        "description": "Get a specific payment by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "payment_id": {"type": "string"},
            },
            "required": ["payment_id"],
        },
    },
    {
        "name": "qb_create_payment",
        "description": "Record a payment. Requires CustomerRef and TotalAmt.",
        "input_schema": {
            "type": "object",
            "properties": {
                "CustomerRef": {"type": "object", "description": "{\"value\": \"customer_id\"}"},
                "TotalAmt": {"type": "number", "description": "Payment amount"},
                "Line": {"type": "array", "description": "Line items linking to invoices"},
            },
            "required": ["CustomerRef", "TotalAmt"],
        },
    },
    # ── Bills ──
    {
        "name": "qb_list_bills",
        "description": "List bills (accounts payable) from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_get_bill",
        "description": "Get a specific bill by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "bill_id": {"type": "string"},
            },
            "required": ["bill_id"],
        },
    },
    {
        "name": "qb_create_bill",
        "description": "Create a bill. Requires VendorRef and at least one Line item.",
        "input_schema": {
            "type": "object",
            "properties": {
                "VendorRef": {"type": "object", "description": "{\"value\": \"vendor_id\"}"},
                "Line": {"type": "array", "description": "Line items for the bill"},
                "DueDate": {"type": "string"},
            },
            "required": ["VendorRef", "Line"],
        },
    },
    # ── Bill Payments ──
    {
        "name": "qb_create_bill_payment",
        "description": "Pay a bill. Requires VendorRef, TotalAmt, PayType, and Line linking to bill.",
        "input_schema": {
            "type": "object",
            "properties": {
                "VendorRef": {"type": "object"},
                "TotalAmt": {"type": "number"},
                "PayType": {"type": "string", "enum": ["Check", "CreditCard"]},
                "Line": {"type": "array"},
            },
            "required": ["VendorRef", "TotalAmt", "PayType", "Line"],
        },
    },
    # ── Accounts (Chart of Accounts) ──
    {
        "name": "qb_list_accounts",
        "description": "List accounts (chart of accounts) from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string", "description": "e.g. \"AccountType = 'Expense'\""},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_get_account",
        "description": "Get a specific account by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "account_id": {"type": "string"},
            },
            "required": ["account_id"],
        },
    },
    {
        "name": "qb_create_account",
        "description": "Create a new account. Requires Name and AccountType or AccountSubType.",
        "input_schema": {
            "type": "object",
            "properties": {
                "Name": {"type": "string", "description": "Account name (unique, no colons or double quotes)"},
                "AccountType": {"type": "string", "description": "e.g. Expense, Income, Bank"},
                "AccountSubType": {"type": "string"},
                "Description": {"type": "string"},
            },
            "required": ["Name"],
        },
    },
    # ── Items (Products/Services) ──
    {
        "name": "qb_list_items",
        "description": "List items (products/services) from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_get_item",
        "description": "Get a specific item by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_id": {"type": "string"},
            },
            "required": ["item_id"],
        },
    },
    {
        "name": "qb_create_item",
        "description": "Create a new item/product/service. Requires Name.",
        "input_schema": {
            "type": "object",
            "properties": {
                "Name": {"type": "string"},
                "Type": {"type": "string", "enum": ["Inventory", "Service", "NonInventory"]},
                "UnitPrice": {"type": "number"},
                "IncomeAccountRef": {"type": "object"},
                "ExpenseAccountRef": {"type": "object"},
            },
            "required": ["Name"],
        },
    },
    # ── Vendors ──
    {
        "name": "qb_list_vendors",
        "description": "List vendors from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_get_vendor",
        "description": "Get a specific vendor by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "vendor_id": {"type": "string"},
            },
            "required": ["vendor_id"],
        },
    },
    {
        "name": "qb_create_vendor",
        "description": "Create a new vendor. Requires DisplayName.",
        "input_schema": {
            "type": "object",
            "properties": {
                "DisplayName": {"type": "string"},
                "CompanyName": {"type": "string"},
                "PrimaryEmailAddr": {"type": "object"},
                "PrimaryPhone": {"type": "object"},
            },
            "required": ["DisplayName"],
        },
    },
    # ── Employees ──
    {
        "name": "qb_list_employees",
        "description": "List employees from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_get_employee",
        "description": "Get a specific employee by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "employee_id": {"type": "string"},
            },
            "required": ["employee_id"],
        },
    },
    # ── Estimates ──
    {
        "name": "qb_list_estimates",
        "description": "List estimates/quotes from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_create_estimate",
        "description": "Create a new estimate/quote. Requires CustomerRef and Line items.",
        "input_schema": {
            "type": "object",
            "properties": {
                "CustomerRef": {"type": "object"},
                "Line": {"type": "array"},
                "ExpirationDate": {"type": "string"},
            },
            "required": ["CustomerRef", "Line"],
        },
    },
    # ── Purchases/Expenses ──
    {
        "name": "qb_list_purchases",
        "description": "List purchases/expenses from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_create_purchase",
        "description": "Record a purchase/expense. Requires PaymentType, AccountRef, and Line items.",
        "input_schema": {
            "type": "object",
            "properties": {
                "PaymentType": {"type": "string", "enum": ["Cash", "Check", "CreditCard"]},
                "AccountRef": {"type": "object"},
                "Line": {"type": "array"},
                "EntityRef": {"type": "object", "description": "Vendor reference"},
            },
            "required": ["PaymentType", "AccountRef", "Line"],
        },
    },
    # ── Purchase Orders ──
    {
        "name": "qb_list_purchase_orders",
        "description": "List purchase orders from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_create_purchase_order",
        "description": "Create a new purchase order. Requires VendorRef and Line items.",
        "input_schema": {
            "type": "object",
            "properties": {
                "VendorRef": {"type": "object"},
                "Line": {"type": "array"},
            },
            "required": ["VendorRef", "Line"],
        },
    },
    # ── Credit Memos ──
    {
        "name": "qb_list_credit_memos",
        "description": "List credit memos from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_create_credit_memo",
        "description": "Create a credit memo. Requires CustomerRef and Line items.",
        "input_schema": {
            "type": "object",
            "properties": {
                "CustomerRef": {"type": "object"},
                "Line": {"type": "array"},
            },
            "required": ["CustomerRef", "Line"],
        },
    },
    # ── Sales Receipts ──
    {
        "name": "qb_list_sales_receipts",
        "description": "List sales receipts from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_create_sales_receipt",
        "description": "Create a sales receipt. Requires Line items.",
        "input_schema": {
            "type": "object",
            "properties": {
                "CustomerRef": {"type": "object"},
                "Line": {"type": "array"},
            },
            "required": ["Line"],
        },
    },
    # ── Journal Entries ──
    {
        "name": "qb_list_journal_entries",
        "description": "List journal entries from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_create_journal_entry",
        "description": "Create a journal entry. Requires Line items with JournalEntryLineDetail (PostingType: Debit/Credit, AccountRef).",
        "input_schema": {
            "type": "object",
            "properties": {
                "Line": {"type": "array", "description": "Debit/Credit line items"},
                "DocNumber": {"type": "string"},
                "TxnDate": {"type": "string"},
            },
            "required": ["Line"],
        },
    },
    # ── Deposits ──
    {
        "name": "qb_list_deposits",
        "description": "List deposits from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_create_deposit",
        "description": "Create a deposit. Requires DepositToAccountRef and Line items.",
        "input_schema": {
            "type": "object",
            "properties": {
                "DepositToAccountRef": {"type": "object"},
                "Line": {"type": "array"},
                "TxnDate": {"type": "string"},
            },
            "required": ["DepositToAccountRef", "Line"],
        },
    },
    # ── Transfers ──
    {
        "name": "qb_list_transfers",
        "description": "List transfers between accounts in QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "where": {"type": "string"},
                "max_results": {"type": "integer", "default": 100},
            },
        },
    },
    {
        "name": "qb_create_transfer",
        "description": "Transfer funds between accounts. Requires FromAccountRef, ToAccountRef, and Amount.",
        "input_schema": {
            "type": "object",
            "properties": {
                "FromAccountRef": {"type": "object", "description": "{\"value\": \"account_id\"}"},
                "ToAccountRef": {"type": "object", "description": "{\"value\": \"account_id\"}"},
                "Amount": {"type": "number"},
                "TxnDate": {"type": "string"},
            },
            "required": ["FromAccountRef", "ToAccountRef", "Amount"],
        },
    },
    # ── Tax ──
    {
        "name": "qb_list_tax_codes",
        "description": "List all tax codes in QuickBooks.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "qb_list_tax_rates",
        "description": "List all tax rates in QuickBooks.",
        "input_schema": {"type": "object", "properties": {}},
    },
    # ── Company Info ──
    {
        "name": "qb_get_company_info",
        "description": "Get company information from QuickBooks.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "qb_get_preferences",
        "description": "Get company preferences/settings from QuickBooks.",
        "input_schema": {"type": "object", "properties": {}},
    },
    # ── Reports ──
    {
        "name": "qb_profit_and_loss",
        "description": "Generate a Profit & Loss (Income Statement) report from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string", "description": "Start date (YYYY-MM-DD)"},
                "end_date": {"type": "string", "description": "End date (YYYY-MM-DD)"},
            },
        },
    },
    {
        "name": "qb_balance_sheet",
        "description": "Generate a Balance Sheet report from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string"},
                "end_date": {"type": "string"},
            },
        },
    },
    {
        "name": "qb_cash_flow",
        "description": "Generate a Cash Flow statement from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string"},
                "end_date": {"type": "string"},
            },
        },
    },
    {
        "name": "qb_trial_balance",
        "description": "Generate a Trial Balance report from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string"},
                "end_date": {"type": "string"},
            },
        },
    },
    {
        "name": "qb_ap_aging",
        "description": "Generate an Accounts Payable Aging report from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "report_date": {"type": "string", "description": "Report date (YYYY-MM-DD)"},
            },
        },
    },
    {
        "name": "qb_ar_aging",
        "description": "Generate an Accounts Receivable Aging report from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "report_date": {"type": "string"},
            },
        },
    },
    {
        "name": "qb_sales_by_customer",
        "description": "Generate a Sales by Customer report from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string"},
                "end_date": {"type": "string"},
            },
        },
    },
    {
        "name": "qb_sales_by_product",
        "description": "Generate a Sales by Product/Service report from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string"},
                "end_date": {"type": "string"},
            },
        },
    },
    {
        "name": "qb_general_ledger",
        "description": "Generate a General Ledger report from QuickBooks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string"},
                "end_date": {"type": "string"},
            },
        },
    },
    # ── Custom Query ──
    {
        "name": "qb_query",
        "description": "Run a custom QuickBooks query using SQL-like syntax. Example: \"SELECT * FROM Invoice WHERE TotalAmt > '1000'\"",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "QuickBooks query string"},
            },
            "required": ["query"],
        },
    },
]

QUICKBOOKS_TOOL_NAMES = {t["name"] for t in QUICKBOOKS_TOOLS}


def is_quickbooks_tool(tool_name: str) -> bool:
    return tool_name in QUICKBOOKS_TOOL_NAMES


async def execute_quickbooks_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    department: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """Execute a QuickBooks tool call for the given department."""
    try:
        # ── Query helpers ──
        def _build_query(entity: str, where: str | None = None, max_results: int = 100) -> str:
            q = f"SELECT * FROM {entity} MAXRESULTS {max_results}"
            if where:
                q = f"SELECT * FROM {entity} WHERE {where} MAXRESULTS {max_results}"
            return q

        # ── Customers ──
        if tool_name == "qb_list_customers":
            q = _build_query("Customer", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_get_customer":
            return await quickbooks_api_request(db, department, "GET", f"customer/{tool_input['customer_id']}")

        elif tool_name == "qb_create_customer":
            return await quickbooks_api_request(db, department, "POST", "customer", json_data=tool_input)

        # ── Invoices ──
        elif tool_name == "qb_list_invoices":
            q = _build_query("Invoice", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_get_invoice":
            return await quickbooks_api_request(db, department, "GET", f"invoice/{tool_input['invoice_id']}")

        elif tool_name == "qb_create_invoice":
            return await quickbooks_api_request(db, department, "POST", "invoice", json_data=tool_input)

        elif tool_name == "qb_send_invoice":
            endpoint = f"invoice/{tool_input['invoice_id']}/send"
            params = {"sendTo": tool_input["email"]} if tool_input.get("email") else None
            return await quickbooks_api_request(db, department, "POST", endpoint, params=params)

        # ── Payments ──
        elif tool_name == "qb_list_payments":
            q = _build_query("Payment", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_get_payment":
            return await quickbooks_api_request(db, department, "GET", f"payment/{tool_input['payment_id']}")

        elif tool_name == "qb_create_payment":
            return await quickbooks_api_request(db, department, "POST", "payment", json_data=tool_input)

        # ── Bills ──
        elif tool_name == "qb_list_bills":
            q = _build_query("Bill", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_get_bill":
            return await quickbooks_api_request(db, department, "GET", f"bill/{tool_input['bill_id']}")

        elif tool_name == "qb_create_bill":
            return await quickbooks_api_request(db, department, "POST", "bill", json_data=tool_input)

        # ── Bill Payments ──
        elif tool_name == "qb_create_bill_payment":
            return await quickbooks_api_request(db, department, "POST", "billpayment", json_data=tool_input)

        # ── Accounts ──
        elif tool_name == "qb_list_accounts":
            q = _build_query("Account", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_get_account":
            return await quickbooks_api_request(db, department, "GET", f"account/{tool_input['account_id']}")

        elif tool_name == "qb_create_account":
            return await quickbooks_api_request(db, department, "POST", "account", json_data=tool_input)

        # ── Items ──
        elif tool_name == "qb_list_items":
            q = _build_query("Item", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_get_item":
            return await quickbooks_api_request(db, department, "GET", f"item/{tool_input['item_id']}")

        elif tool_name == "qb_create_item":
            return await quickbooks_api_request(db, department, "POST", "item", json_data=tool_input)

        # ── Vendors ──
        elif tool_name == "qb_list_vendors":
            q = _build_query("Vendor", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_get_vendor":
            return await quickbooks_api_request(db, department, "GET", f"vendor/{tool_input['vendor_id']}")

        elif tool_name == "qb_create_vendor":
            return await quickbooks_api_request(db, department, "POST", "vendor", json_data=tool_input)

        # ── Employees ──
        elif tool_name == "qb_list_employees":
            q = _build_query("Employee", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_get_employee":
            return await quickbooks_api_request(db, department, "GET", f"employee/{tool_input['employee_id']}")

        # ── Estimates ──
        elif tool_name == "qb_list_estimates":
            q = _build_query("Estimate", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_create_estimate":
            return await quickbooks_api_request(db, department, "POST", "estimate", json_data=tool_input)

        # ── Purchases ──
        elif tool_name == "qb_list_purchases":
            q = _build_query("Purchase", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_create_purchase":
            return await quickbooks_api_request(db, department, "POST", "purchase", json_data=tool_input)

        # ── Purchase Orders ──
        elif tool_name == "qb_list_purchase_orders":
            q = _build_query("PurchaseOrder", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_create_purchase_order":
            return await quickbooks_api_request(db, department, "POST", "purchaseorder", json_data=tool_input)

        # ── Credit Memos ──
        elif tool_name == "qb_list_credit_memos":
            q = _build_query("CreditMemo", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_create_credit_memo":
            return await quickbooks_api_request(db, department, "POST", "creditmemo", json_data=tool_input)

        # ── Sales Receipts ──
        elif tool_name == "qb_list_sales_receipts":
            q = _build_query("SalesReceipt", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_create_sales_receipt":
            return await quickbooks_api_request(db, department, "POST", "salesreceipt", json_data=tool_input)

        # ── Journal Entries ──
        elif tool_name == "qb_list_journal_entries":
            q = _build_query("JournalEntry", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_create_journal_entry":
            return await quickbooks_api_request(db, department, "POST", "journalentry", json_data=tool_input)

        # ── Deposits ──
        elif tool_name == "qb_list_deposits":
            q = _build_query("Deposit", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_create_deposit":
            return await quickbooks_api_request(db, department, "POST", "deposit", json_data=tool_input)

        # ── Transfers ──
        elif tool_name == "qb_list_transfers":
            q = _build_query("Transfer", tool_input.get("where"), tool_input.get("max_results", 100))
            return await quickbooks_query(db, department, q)

        elif tool_name == "qb_create_transfer":
            return await quickbooks_api_request(db, department, "POST", "transfer", json_data=tool_input)

        # ── Tax ──
        elif tool_name == "qb_list_tax_codes":
            return await quickbooks_query(db, department, "SELECT * FROM TaxCode")

        elif tool_name == "qb_list_tax_rates":
            return await quickbooks_query(db, department, "SELECT * FROM TaxRate")

        # ── Company ──
        elif tool_name == "qb_get_company_info":
            return await get_company_info(db, department)

        elif tool_name == "qb_get_preferences":
            return await quickbooks_api_request(db, department, "GET", "preferences")

        # ── Reports ──
        elif tool_name == "qb_profit_and_loss":
            params = {}
            if tool_input.get("start_date"):
                params["start_date"] = tool_input["start_date"]
            if tool_input.get("end_date"):
                params["end_date"] = tool_input["end_date"]
            return await get_report(db, department, "ProfitAndLoss", params or None)

        elif tool_name == "qb_balance_sheet":
            params = {}
            if tool_input.get("start_date"):
                params["start_date"] = tool_input["start_date"]
            if tool_input.get("end_date"):
                params["end_date"] = tool_input["end_date"]
            return await get_report(db, department, "BalanceSheet", params or None)

        elif tool_name == "qb_cash_flow":
            params = {}
            if tool_input.get("start_date"):
                params["start_date"] = tool_input["start_date"]
            if tool_input.get("end_date"):
                params["end_date"] = tool_input["end_date"]
            return await get_report(db, department, "CashFlow", params or None)

        elif tool_name == "qb_trial_balance":
            params = {}
            if tool_input.get("start_date"):
                params["start_date"] = tool_input["start_date"]
            if tool_input.get("end_date"):
                params["end_date"] = tool_input["end_date"]
            return await get_report(db, department, "TrialBalance", params or None)

        elif tool_name == "qb_ap_aging":
            params = {}
            if tool_input.get("report_date"):
                params["report_date"] = tool_input["report_date"]
            return await get_report(db, department, "AgedPayableDetail", params or None)

        elif tool_name == "qb_ar_aging":
            params = {}
            if tool_input.get("report_date"):
                params["report_date"] = tool_input["report_date"]
            return await get_report(db, department, "AgedReceivableDetail", params or None)

        elif tool_name == "qb_sales_by_customer":
            params = {}
            if tool_input.get("start_date"):
                params["start_date"] = tool_input["start_date"]
            if tool_input.get("end_date"):
                params["end_date"] = tool_input["end_date"]
            return await get_report(db, department, "CustomerSales", params or None)

        elif tool_name == "qb_sales_by_product":
            params = {}
            if tool_input.get("start_date"):
                params["start_date"] = tool_input["start_date"]
            if tool_input.get("end_date"):
                params["end_date"] = tool_input["end_date"]
            return await get_report(db, department, "ItemSales", params or None)

        elif tool_name == "qb_general_ledger":
            params = {}
            if tool_input.get("start_date"):
                params["start_date"] = tool_input["start_date"]
            if tool_input.get("end_date"):
                params["end_date"] = tool_input["end_date"]
            return await get_report(db, department, "GeneralLedger", params or None)

        # ── Custom Query ──
        elif tool_name == "qb_query":
            return await quickbooks_query(db, department, tool_input["query"])

        else:
            return {"error": f"Unknown QuickBooks tool: {tool_name}"}

    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        logger.error("QuickBooks tool %s failed for %s: %s", tool_name, department, e)
        return {"error": f"QuickBooks operation failed: {e}"}
