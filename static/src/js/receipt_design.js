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
        
        // Datos básicos del partner (incluso si es null)
        const partnerData = partner ? {
            name: partner.name,
            vat: partner.vat,
            street: partner.street,
            city: partner.city,
            phone: partner.phone,
            email: partner.email,
            // ...otros campos necesarios
        } : { name: "Cliente no asignado" };  // Partner por defecto
    
        return {
            pos: this.pos,
            data: this.props.data,
            order: order,
            receipt: this.props.data,
            orderlines: this.props.data.orderlines,
            paymentlines: this.props.data.paymentlines,
            partner: partnerData,  // Envía el objeto procesado
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
