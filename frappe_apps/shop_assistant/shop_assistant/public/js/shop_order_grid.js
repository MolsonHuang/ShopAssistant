frappe.provide("shop_assistant");

shop_assistant.recalculate_order_item = function (row) {
  const cartonQty = flt(row.carton_qty);
  const cartons = flt(row.cartons);
  const unitPrice = flt(row.unit_price);
  const cbmPerCarton = flt(row.cbm_per_carton);

  row.total_pieces = cartonQty * cartons;
  row.amount = cartonQty * cartons * unitPrice;
  row.total_cbm = cbmPerCarton * cartons;
};

frappe.ui.form.on("Shop Order Item", {
  carton_qty(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    shop_assistant.recalculate_order_item(row);
    frm.refresh_field("items");
  },
  cartons(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    shop_assistant.recalculate_order_item(row);
    frm.refresh_field("items");
  },
  unit_price(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    shop_assistant.recalculate_order_item(row);
    frm.refresh_field("items");
  },
  cbm_per_carton(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    shop_assistant.recalculate_order_item(row);
    frm.refresh_field("items");
  }
});

frappe.ui.form.on("Shop Order", {
  refresh(frm) {
    frm.add_custom_button(__("Load Product by Barcode"), () => {
      const barcode = prompt(__("Barcode"));
      if (!barcode) return;
      frappe.call({
        method: "shop_assistant.api.product.get_product_by_barcode",
        args: { barcode },
        callback(r) {
          if (!r.message) {
            frappe.msgprint(__("No product found"));
            return;
          }
          const product = r.message;
          const row = frm.add_child("items");
          row.barcode = product.barcode;
          row.factory_item_no = product.factory_item_no;
          row.product_image = product.image;
          row.product_description = product.description;
          row.inner_pack = product.inner_pack;
          row.carton_qty = product.carton_qty;
          row.cbm_per_carton = product.cbm_per_carton;
          frm.refresh_field("items");
        }
      });
    });
  }
});
