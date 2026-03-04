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

            if (!fiscal_number) {
                try {
                    const backendFiscalData = await this.orm.call(
                        "pos.order",
                        "l10n_do_get_ticket_fiscal_data",
                        [backendOrderId, orderReference]
                    );
                    fiscal_number = backendFiscalData.ncf || fiscal_number;
                    ncf_sequence_number = backendFiscalData.ncf_sequence_number || ncf_sequence_number;
                } catch (_error) {
                    // Fallback silencioso: usar datos locales si no hay RPC
                }
            }

            this.state.fiscal_number = fiscal_number || "";
            this.state.ncf_sequence_number =
                ncf_sequence_number || (this.state.fiscal_number ? this.state.fiscal_number.replace(/^[A-Z]+/, "") : "");
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

        if (!receiptData.ncf && fiscal_number) {
            receiptData.ncf = fiscal_number;
        }
        if (!receiptData.ncf_sequence_number && ncf_sequence_number) {
            receiptData.ncf_sequence_number = ncf_sequence_number;
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
