/** @odoo-module */
import { Order } from "@point_of_sale/app/store/models";
import { patch } from "@web/core/utils/patch";

patch(Order.prototype, {
    export_as_JSON() {
        const json = super.export_as_JSON();
        json.l10n_do_fiscal_number = this.l10n_do_fiscal_number || '';
        return json;
    },
    init_from_JSON(json) {
        super.init_from_JSON(json);
        this.l10n_do_fiscal_number = json.l10n_do_fiscal_number || '';
    },
});
