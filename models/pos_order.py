from odoo import api, fields, models, _
from odoo.exceptions import UserError
import re

class PosOrder(models.Model):
    _inherit = 'pos.order'

    l10n_do_fiscal_number = fields.Char('Comprobante Fiscal', copy=False, readonly=True)
    l10n_latam_document_type_id = fields.Many2one('l10n_latam.document.type', string='Tipo de Comprobante', readonly=True)

    def _assign_fiscal_comprobante(self):
        """
        Asigna el tipo de comprobante fiscal y la secuencia correspondiente
        según el cliente del pedido POS.
        """
        for order in self:
            partner = order.partner_id
            if not partner:
                continue
            fiscal_type = partner.l10n_do_dgii_tax_payer_type
            if not fiscal_type:
                continue
            document_type = self.env['l10n_latam.document.type'].search([
                ('country_id.code', '=', 'DO'),
                ('l10n_do_ncf_type', '=', fiscal_type),
            ], limit=1)
            if not document_type:
                continue
            order.l10n_latam_document_type_id = document_type.id
            # Generar secuencia fiscal usando lógica similar a account.move
            move = self.env['account.move'].new({
                'partner_id': partner.id,
                'l10n_latam_document_type_id': document_type.id,
                'move_type': 'out_receipt',
                'company_id': order.company_id.id,
            })
            move.with_context(is_l10n_do_seq=True)._set_next_sequence()
            order.l10n_do_fiscal_number = move.l10n_do_fiscal_number

    @api.model
    def create(self, vals):
        order = super().create(vals)
        order._assign_fiscal_comprobante()
        return order

    def write(self, vals):
        res = super().write(vals)
        self._assign_fiscal_comprobante()
        return res

    @api.model
    def l10n_do_get_ticket_fiscal_data(self, order_id=False, order_ref=False):
        order = self.env['pos.order']
        if order_id:
            order = self.sudo().browse(order_id)

        if (not order or not order.exists()) and order_ref:
            order = self.sudo().search([
                '|',
                ('pos_reference', '=', order_ref),
                ('name', '=', order_ref),
            ], limit=1)

        if not order or not order.exists():
            return {'ncf': '', 'ncf_sequence_number': '', 'order_id': False}

        ncf = ''
        if 'ncf' in order._fields:
            ncf = order.ncf or ''

        if not ncf and 'l10n_do_fiscal_number' in order._fields:
            ncf = order.l10n_do_fiscal_number or ''

        move = False
        for field_name in ('account_move_id', 'account_move', 'invoice_id'):
            if field_name in order._fields:
                candidate = order[field_name]
                if candidate and candidate._name == 'account.move':
                    move = candidate
                    break

        if move and not ncf:
            ncf = move.l10n_do_fiscal_number or move.l10n_latam_document_number or ''

        sequence_number = re.sub(r'^[A-Z]+', '', ncf or '')
        return {
            'ncf': ncf or '',
            'ncf_sequence_number': sequence_number,
            'order_id': order.id,
        }
