from odoo import api, models
import re

class PosOrder(models.Model):
    _inherit = 'pos.order'

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
            return {
                'ncf': '',
                'ncf_sequence_number': '',
                'ncf_expiration_date': False,
                'fiscal_type_name': '',
                'order_id': False,
            }

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

        expiration_date = False
        if 'ncf_expiration_date' in order._fields:
            expiration_date = order.ncf_expiration_date or False

        if move and not expiration_date:
            expiration_date = move.l10n_do_ncf_expiration_date or False

        fiscal_type_name = ''
        if 'fiscal_type_id' in order._fields and order.fiscal_type_id:
            fiscal_type_name = order.fiscal_type_id.name or ''

        if not fiscal_type_name and move and move.l10n_latam_document_type_id:
            fiscal_type_name = move.l10n_latam_document_type_id.display_name or ''

        sequence_number = re.sub(r'^[A-Z]+', '', ncf or '')
        return {
            'ncf': ncf or '',
            'ncf_sequence_number': sequence_number,
            'ncf_expiration_date': expiration_date,
            'fiscal_type_name': fiscal_type_name,
            'order_id': order.id,
        }
