from odoo import api, models
import logging
_logger = logging.getLogger(__name__)
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
                'jamensoft_qr_code': False,
                'jamensoft_dgii_url': False,
                'jamensoft_sign_date': False,
                'jamensoft_security_code': False,
                'order_id': False,
            }
        # log_order_lines eliminado (ya no se usa para depuración)

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
        if move and move.l10n_latam_document_type_id:
            fiscal_type_name = move.l10n_latam_document_type_id.display_name or ''

        if not fiscal_type_name and ncf and 'config_id' in order._fields and order.config_id and order.config_id.invoice_journal_id:
            prefix = (ncf or '')[:3]
            journal = order.config_id.invoice_journal_id
            journal_doc = journal.l10n_do_document_type_ids.filtered(
                lambda line: line.l10n_latam_document_type_id
                and line.l10n_latam_document_type_id.doc_code_prefix == prefix
            )[:1]
            if journal_doc and journal_doc.l10n_latam_document_type_id:
                fiscal_type_name = journal_doc.l10n_latam_document_type_id.display_name or ''

        if not fiscal_type_name and 'fiscal_type_id' in order._fields and order.fiscal_type_id:
            fiscal_type_name = order.fiscal_type_id.name or ''

        jamensoft_qr_code = False
        jamensoft_dgii_url = False
        jamensoft_sign_date = False
        jamensoft_security_code = False
        if move:
            if 'jamensoft_qr_code' in move._fields:
                jamensoft_qr_code = move.jamensoft_qr_code or False
            if 'jamensoft_dgii_url' in move._fields:
                jamensoft_dgii_url = move.jamensoft_dgii_url or False
            if 'jamensoft_sign_date' in move._fields:
                jamensoft_sign_date = move.jamensoft_sign_date or False
            if 'jamensoft_security_code' in move._fields:
                jamensoft_security_code = move.jamensoft_security_code or False

        sequence_number = re.sub(r'^[A-Z]+', '', ncf or '')
        return {
            'ncf': ncf or '',
            'ncf_sequence_number': sequence_number,
            'ncf_expiration_date': expiration_date,
            'fiscal_type_name': fiscal_type_name,
            'jamensoft_qr_code': jamensoft_qr_code,
            'jamensoft_dgii_url': jamensoft_dgii_url,
            'jamensoft_sign_date': jamensoft_sign_date,
            'jamensoft_security_code': jamensoft_security_code,
            'order_id': order.id,
            'orderlines': [
                {
                    'productName': re.sub(r'^\[[^\]]*\]\s*', '', line.product_id.display_name),
                    'qty': line.qty,
                    'unitPrice': line.price_unit,
                    'unit_name': line.product_id.uom_id.name if line.product_id.uom_id else '-',
                    'price': line.price_subtotal_incl,
                    'tax_amount': (line.price_subtotal_incl - line.price_subtotal) if hasattr(line, 'price_subtotal_incl') and hasattr(line, 'price_subtotal') else 0.0,
                    'discount': line.discount,
                    'customerNote': getattr(line, 'customer_note', ''),
                }
                for line in order.lines
            ],
        }
