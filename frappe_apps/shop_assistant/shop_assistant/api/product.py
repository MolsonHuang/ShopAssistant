import frappe


@frappe.whitelist()
def get_product_by_barcode(barcode: str):
    if not barcode:
        return None

    name = frappe.db.get_value("Shop Product", {"barcode": barcode}, "name")
    if not name:
        return None

    return frappe.get_doc("Shop Product", name).as_dict()
