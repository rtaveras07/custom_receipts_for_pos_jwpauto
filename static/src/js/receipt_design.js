/** @odoo-module */
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { patch } from "@web/core/utils/patch";
import { useState, Component, xml } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

patch(OrderReceipt.prototype, {
    setup(){
        super.setup();
        this.state = useState({
            template: true,
        })
        this.pos = useState(useService("pos"));
    },
    get templateProps() {
        const order = this.pos.get_order();
        const partner = order ? order.get_partner() : null;
        // Datos básicos del partner
        const partnerData = partner ? {
            name: partner.name,
            vat: partner.vat,
            street: partner.street,
            city: partner.city,
            phone: partner.phone,
            email: partner.email,
        } : { name: "" };

        // Datos de la compañía
        const company = this.pos.company || {};
        const companyData = {
            name: company.name,
            street: company.street,
            street2: company.street2,
            contact_address: company.contact_address,
            city: company.city,
            state_name: company.state_name,
            country_name: company.country_name,
            phone: company.phone,
            mobile: company.mobile,
            vat: company.vat,
            email: company.email,
            slogan: company.slogan,
            state_id: company.state_id,
            country_id: company.country_id,
        };

        return {
            pos: this.pos,
            data: this.props.data,
            order: order,
            receipt: this.props.data,
            orderlines: this.props.data.orderlines,
            paymentlines: this.props.data.paymentlines,
            partner: partnerData,
            company: companyData,
        };
    },
    get templateComponent() {
        var mainRef = this;
        return class extends Component {
            setup() {}
            static template = xml`${mainRef.pos.config.design_receipt}`
        };
    },
    get isTrue() {
        if (this.env.services.pos.config.is_custom_receipt == false) {
            return true;
        }
        return false;
    }
});
