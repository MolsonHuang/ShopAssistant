import frappe


@frappe.whitelist()
def search_shop_records(text):
    text = (text or "").strip()
    if not text:
        return {"orders": [], "products": []}

    like = f"%{text}%"
    orders = frappe.get_all(
        "Shop Order",
        or_filters=[
            ["Shop Order", "order_no", "like", like],
            ["Shop Order", "customer_name", "like", like],
            ["Shop Order", "phone", "like", like],
            ["Shop Order", "contact_person", "like", like],
        ],
        fields=["name", "order_no", "customer_name", "status", "total_amount"],
        limit=20,
    )
    products = frappe.get_all(
        "Shop Product",
        or_filters=[
            ["Shop Product", "barcode", "like", like],
            ["Shop Product", "customer_item_no", "like", like],
            ["Shop Product", "factory_item_no", "like", like],
            ["Shop Product", "description", "like", like],
        ],
        fields=["name", "barcode", "customer_item_no", "factory_item_no", "image"],
        limit=20,
    )
    return {"orders": orders, "products": products}
