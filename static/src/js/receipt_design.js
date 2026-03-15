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
            jamensoft_qr_code: "",
            jamensoft_dgii_url: "",
            jamensoft_sign_date: "",
            jamensoft_security_code: "",
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
            let jamensoft_qr_code = receiptData.jamensoft_qr_code || "";
            let jamensoft_dgii_url = receiptData.jamensoft_dgii_url || "";
            let jamensoft_sign_date = receiptData.jamensoft_sign_date || "";
            let jamensoft_security_code = receiptData.jamensoft_security_code || "";

            if (!fiscal_number || !ncf_expiration_date || !fiscal_type_name || !jamensoft_qr_code || !jamensoft_sign_date || !jamensoft_security_code) {
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
                    jamensoft_qr_code = backendFiscalData.jamensoft_qr_code || jamensoft_qr_code;
                    jamensoft_dgii_url = backendFiscalData.jamensoft_dgii_url || jamensoft_dgii_url;
                    jamensoft_sign_date = backendFiscalData.jamensoft_sign_date || jamensoft_sign_date;
                    jamensoft_security_code = backendFiscalData.jamensoft_security_code || jamensoft_security_code;
                    // Integración: si el backend devuelve orderlines, usarlas en receiptData
                    if (Array.isArray(backendFiscalData.orderlines)) {
                        receiptData.orderlines = backendFiscalData.orderlines;
                    }
                } catch (_error) {
                    // Fallback silencioso: usar datos locales si no hay RPC
                }
            }

            this.state.fiscal_number = fiscal_number || "";
            this.state.ncf_sequence_number =
                ncf_sequence_number || (this.state.fiscal_number ? this.state.fiscal_number.replace(/^[A-Z]+/, "") : "");
            this.state.ncf_expiration_date = ncf_expiration_date || "";
            this.state.fiscal_type_name = fiscal_type_name || "";
            this.state.jamensoft_qr_code = jamensoft_qr_code || "";
            this.state.jamensoft_dgii_url = jamensoft_dgii_url || "";
            this.state.jamensoft_sign_date = jamensoft_sign_date || "";
            this.state.jamensoft_security_code = jamensoft_security_code || "";
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
        const jamensoft_qr_code =
            receiptData.jamensoft_qr_code ||
            this.state.jamensoft_qr_code ||
            '';
        const jamensoft_dgii_url =
            receiptData.jamensoft_dgii_url ||
            this.state.jamensoft_dgii_url ||
            '';
        const jamensoft_sign_date =
            receiptData.jamensoft_sign_date ||
            this.state.jamensoft_sign_date ||
            '';
        const jamensoft_security_code =
            receiptData.jamensoft_security_code ||
            this.state.jamensoft_security_code ||
            '';
        let fiscal_type_name =
            (fiscal_type && fiscal_type.name) ||
            receiptData.fiscal_type_name ||
            (receiptData.fiscal_type && receiptData.fiscal_type.name) ||
            this.state.fiscal_type_name ||
            '';

        if (!fiscal_type_name && fiscal_number) {
            const prefix = fiscal_number.slice(0, 3);
            const fiscalTypes = this.pos.fiscal_types || [];

            let fiscalTypeByPrefix = fiscalTypes.find((item) => item.prefix === prefix);

            if (!fiscalTypeByPrefix) {
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
                fiscalTypeByPrefix = fiscalTypes.find((item) => item.prefix === normalizedPrefix);
            }

            if (fiscalTypeByPrefix && fiscalTypeByPrefix.name) {
                fiscal_type_name = fiscalTypeByPrefix.name;
            }
        }

        if (fiscal_type_name && fiscal_number) {
            const prefix = fiscal_number.slice(0, 1);
            const lowerName = fiscal_type_name.toLowerCase();
            if (prefix === 'E' && !lowerName.includes('electronic') && !lowerName.includes('electrónic') && !lowerName.includes('electronica') && !lowerName.includes('electrónica')) {
                fiscal_type_name = `${fiscal_type_name} Electrónica`;
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
        } else if (receiptData.fiscal_type_name && fiscal_type_name && receiptData.fiscal_type_name !== fiscal_type_name) {
            receiptData.fiscal_type_name = fiscal_type_name;
        }
        if (!receiptData.jamensoft_qr_code && jamensoft_qr_code) {
            receiptData.jamensoft_qr_code = jamensoft_qr_code;
        }
        if (!receiptData.jamensoft_dgii_url && jamensoft_dgii_url) {
            receiptData.jamensoft_dgii_url = jamensoft_dgii_url;
        }
        if (!receiptData.jamensoft_sign_date && jamensoft_sign_date) {
            receiptData.jamensoft_sign_date = jamensoft_sign_date;
        }
        if (!receiptData.jamensoft_security_code && jamensoft_security_code) {
            receiptData.jamensoft_security_code = jamensoft_security_code;
        }

        // Mapeo seguro de orderlines
        let mappedOrderlines;
        if (Array.isArray(receiptData.orderlines)) {
            mappedOrderlines = receiptData.orderlines.map(line => ({
                productName: line.productName || '',
                qty: line.qty || 0,
                unitPrice: line.unitPrice || 0.0,
                unit_name: line.unit_name || '-',
                price: line.price || 0.0,
                tax_amount: line.tax_amount || 0.0,
                discount: line.discount || 0.0,
                customerNote: line.customerNote || '',
            }));
        } else if (order && order.orderlines) {
            mappedOrderlines = order.orderlines.map(line => {
                return {
                    productName: line.product.name,
                    qty: line.quantity,
                    unitPrice: line.price,
                    unit_name: line.product.uom_id && line.product.uom_id[1] ? line.product.uom_id[1] : '-',
                    price: line.get_price_with_tax ? line.get_price_with_tax() : line.price,
                    tax_amount: (line.get_price_with_tax && line.get_price_without_tax) ? (line.get_price_with_tax() - line.get_price_without_tax()) : 0,
                    discount: line.discount || 0,
                    customerNote: line.customerNote || '',
                };
            });
        } else {
            mappedOrderlines = [];
        }

        // Calcular total_discount y has_discount
        const total_discount = mappedOrderlines.reduce((acc, l) => acc + ((l.unitPrice * l.qty * l.discount) / 100), 0);
        const has_discount = mappedOrderlines.some(l => l.discount && l.discount > 0);

        return {
            pos: this.pos,
            data: Object.assign({}, receiptData, {
                total_discount,
                has_discount
            }),
            order: order,
            receipt: receiptData,
            orderlines: mappedOrderlines,
            paymentlines: receiptData.paymentlines,
            partner: partnerData,
            l10n_do_fiscal_number: fiscal_number,
            l10n_do_ncf_sequence_number: ncf_sequence_number,
            l10n_do_ncf_expiration_date: ncf_expiration_date,
            l10n_do_fiscal_type: fiscal_type,
            l10n_do_fiscal_type_name: fiscal_type_name,
            l10n_do_jamensoft_qr_code: jamensoft_qr_code,
            l10n_do_jamensoft_dgii_url: jamensoft_dgii_url,
            l10n_do_jamensoft_sign_date: jamensoft_sign_date,
            l10n_do_jamensoft_security_code: jamensoft_security_code,
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
