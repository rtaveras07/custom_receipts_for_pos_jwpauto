/** @odoo-module */
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { patch } from "@web/core/utils/patch";
import { useState, Component, xml, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

patch(OrderReceipt.prototype, {
    _l10nDoDesignWithFiscalBlock() {
        const design = (this.pos.config.design_receipt || "").trim();
        const fiscalBlock = `
            <t t-if="props.data.ncf || props.l10n_do_fiscal_number">
                <div class="pos-receipt-order-data">
                    <strong>Comprobante Fiscal:</strong>
                    <span t-esc="props.data.ncf || props.l10n_do_fiscal_number"/>
                </div>
                <div class="pos-receipt-order-data" t-if="props.data.ncf_sequence_number || props.l10n_do_ncf_sequence_number">
                    <strong>Secuencia:</strong>
                    <span t-esc="props.data.ncf_sequence_number || props.l10n_do_ncf_sequence_number"/>
                </div>
            </t>
        `;

        if (!design) {
            return `<div class="pos-receipt">${fiscalBlock}</div>`;
        }

        if (design.includes("props.data.ncf") || design.includes("l10n_do_fiscal_number")) {
            return design;
        }

        if (design.includes('<div class="pos-receipt">')) {
            return design.replace('<div class="pos-receipt">', `<div class="pos-receipt">${fiscalBlock}`);
        }

        return `<div class="pos-receipt">${fiscalBlock}${design}</div>`;
    },

    setup(){
        super.setup();
        this.state = useState({
            template: true,
            fiscal_number: "",
            ncf_sequence_number: "",
            ncf_expiration_date: "",
            fiscal_type_name: "",
        })
        this.pos = useState(useService("pos"));
        this.orm = useService("orm");

        onWillStart(async () => {
            const order = this.props.order || this.pos.get_order();
            const receiptData = this.props.data || {};
            const backendOrderId =
                (order && order.backendId) ||
                receiptData.backendId ||
                receiptData.order_id ||
                false;
            const orderReference =
                receiptData.name ||
                (order && (order.name || order.pos_reference)) ||
                false;

            let fiscal_number =
                receiptData.ncf ||
                receiptData.l10n_do_fiscal_number ||
                (order ? (order.ncf || order.l10n_do_fiscal_number || "") : "");

            let ncf_sequence_number =
                receiptData.ncf_sequence_number ||
                (fiscal_number ? fiscal_number.replace(/^[A-Z]+/, "") : "");

            let ncf_expiration_date =
                receiptData.ncf_expiration_date ||
                receiptData.l10n_do_ncf_expiration_date ||
                (order ? (order.ncf_expiration_date || order.l10n_do_ncf_expiration_date || "") : "");

            let fiscal_type_name =
                (receiptData.fiscal_type && receiptData.fiscal_type.name) ||
                receiptData.fiscal_type_name ||
                (order && order.fiscal_type && order.fiscal_type.name) ||
                "";

            if (!fiscal_number || !ncf_expiration_date || !fiscal_type_name) {
                try {
                    const backendFiscalData = await this.orm.call(
                        "pos.order",
                        "l10n_do_get_ticket_fiscal_data",
                        [backendOrderId, orderReference]
                    );
                    fiscal_number = backendFiscalData.ncf || fiscal_number;
                    ncf_sequence_number = backendFiscalData.ncf_sequence_number || ncf_sequence_number;
                    ncf_expiration_date = backendFiscalData.ncf_expiration_date || ncf_expiration_date;
                    fiscal_type_name = backendFiscalData.fiscal_type_name || fiscal_type_name;
                } catch (_error) {
                    // Fallback silencioso: usar datos locales si no hay RPC
                }
            }

            this.state.fiscal_number = fiscal_number || "";
            this.state.ncf_sequence_number =
                ncf_sequence_number || (this.state.fiscal_number ? this.state.fiscal_number.replace(/^[A-Z]+/, "") : "");
            this.state.ncf_expiration_date = ncf_expiration_date || "";
            this.state.fiscal_type_name = fiscal_type_name || "";
        });
    },
    get templateProps() {
        const receiptData = this.props.data || {};
        const order = this.props.order || this.pos.get_order();
        const partner = order ? order.get_partner() : null;
        // Datos básicos del partner (incluso si es null)
        const partnerData = partner ? {
            name: partner.name,
            vat: partner.vat,
            street: partner.street,
            city: partner.city,
            phone: partner.phone,
            email: partner.email,
        } : { name: "" };
        const orderPrintingData = order ? order.export_for_printing() : {};
        const fiscal_number =
            receiptData.ncf ||
            receiptData.l10n_do_fiscal_number ||
            (order ? (order.ncf || order.l10n_do_fiscal_number || '') : '') ||
            orderPrintingData.ncf ||
            orderPrintingData.l10n_do_fiscal_number ||
            this.state.fiscal_number ||
            '';
        const ncf_sequence_number =
            receiptData.ncf_sequence_number ||
            this.state.ncf_sequence_number ||
            (fiscal_number ? fiscal_number.replace(/^[A-Z]+/, '') : '') ||
            '';
        const ncf_expiration_date =
            receiptData.ncf_expiration_date ||
            receiptData.l10n_do_ncf_expiration_date ||
            orderPrintingData.ncf_expiration_date ||
            this.state.ncf_expiration_date ||
            '';
        const fiscal_type =
            receiptData.fiscal_type ||
            orderPrintingData.fiscal_type ||
            (order ? order.fiscal_type : false) ||
            false;
        let fiscal_type_name =
            (fiscal_type && fiscal_type.name) ||
            receiptData.fiscal_type_name ||
            (receiptData.fiscal_type && receiptData.fiscal_type.name) ||
            this.state.fiscal_type_name ||
            '';

        if (!fiscal_type_name && fiscal_number) {
            const prefix = fiscal_number.slice(0, 3);
            const prefixMap = {
                E31: 'B01',
                E32: 'B02',
                E33: 'B03',
                E34: 'B04',
                E41: 'B11',
                E43: 'B13',
                E44: 'B14',
                E45: 'B15',
                E46: 'B16',
                E47: 'B17',
            };
            const normalizedPrefix = prefixMap[prefix] || prefix;
            const fiscalTypeByPrefix = (this.pos.fiscal_types || []).find((item) => item.prefix === normalizedPrefix);
            if (fiscalTypeByPrefix && fiscalTypeByPrefix.name) {
                fiscal_type_name = fiscalTypeByPrefix.name;
            }
        }

        if (!receiptData.ncf && fiscal_number) {
            receiptData.ncf = fiscal_number;
        }
        if (!receiptData.ncf_sequence_number && ncf_sequence_number) {
            receiptData.ncf_sequence_number = ncf_sequence_number;
        }
        if (!receiptData.ncf_expiration_date && ncf_expiration_date) {
            receiptData.ncf_expiration_date = ncf_expiration_date;
        }
        if (!receiptData.fiscal_type && fiscal_type) {
            receiptData.fiscal_type = fiscal_type;
        }
        if (!receiptData.fiscal_type_name && fiscal_type_name) {
            receiptData.fiscal_type_name = fiscal_type_name;
        }

        return {
            pos: this.pos,
            data: receiptData,
            order: order,
            receipt: receiptData,
            orderlines: receiptData.orderlines,
            paymentlines: receiptData.paymentlines,
            partner: partnerData,
            l10n_do_fiscal_number: fiscal_number,
            l10n_do_ncf_sequence_number: ncf_sequence_number,
            l10n_do_ncf_expiration_date: ncf_expiration_date,
            l10n_do_fiscal_type: fiscal_type,
            l10n_do_fiscal_type_name: fiscal_type_name,
        };
    },
    get templateComponent() {
        var mainRef = this;
        return class extends Component {
            setup() {}
            static template = xml`${mainRef._l10nDoDesignWithFiscalBlock()}`
        };
    },
    get isTrue() {
        if (this.env.services.pos.config.is_custom_receipt == false) {
            return true;
        }
        return false;
    }
});
