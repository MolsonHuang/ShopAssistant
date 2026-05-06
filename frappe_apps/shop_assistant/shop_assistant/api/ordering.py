import frappe


def validate_shop_order(doc, method=None):
    total_amount = 0
    total_cbm = 0
    total_pieces = 0

    for row in doc.items:
        row.total_pieces = (row.carton_qty or 0) * (row.cartons or 0)
        row.amount = (row.carton_qty or 0) * (row.cartons or 0) * (row.unit_price or 0)
        row.total_cbm = (row.cbm_per_carton or 0) * (row.cartons or 0)
        total_amount += row.amount or 0
        total_cbm += row.total_cbm or 0
        total_pieces += row.total_pieces or 0

    doc.total_amount = total_amount
    doc.total_cbm = total_cbm
    doc.total_pieces = total_pieces
