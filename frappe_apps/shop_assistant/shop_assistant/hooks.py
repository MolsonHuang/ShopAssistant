app_name = "shop_assistant"
app_title = "Shop Assistant"
app_publisher = "Shop Assistant"
app_description = "Configurable shop order, product, delivery and export workflows for ERPNext."
app_email = "support@example.com"
app_license = "MIT"

app_include_js = [
    "/assets/shop_assistant/js/shop_order_grid.js"
]

doctype_js = {
    "Shop Order": "public/js/shop_order_grid.js",
}

fixtures = [
    {
        "dt": "Role",
        "filters": [["role_name", "in", [
            "Shop Boss",
            "Shop Sales",
            "Shop Warehouse",
            "Shop Delivery",
            "Shop Supplier",
            "Shop Accountant"
        ]]]
    }
]

doc_events = {
    "Shop Order": {
        "validate": "shop_assistant.api.ordering.validate_shop_order"
    }
}
