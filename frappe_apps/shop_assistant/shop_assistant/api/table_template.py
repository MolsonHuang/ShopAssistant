import frappe


@frappe.whitelist()
def get_template(template_name: str):
    if not template_name:
        return None
    return frappe.get_doc("Shop Table Template", template_name).as_dict()


@frappe.whitelist()
def save_template(template_name: str, columns_json: str, totals_json: str = "[]", row_height: int = 64):
    if frappe.db.exists("Shop Table Template", template_name):
        doc = frappe.get_doc("Shop Table Template", template_name)
    else:
        doc = frappe.new_doc("Shop Table Template")
        doc.template_name = template_name

    doc.columns_json = columns_json
    doc.totals_json = totals_json
    doc.row_height = row_height
    doc.enabled = 1
    doc.save()
    return doc.as_dict()
