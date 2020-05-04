# Copyright 2020 Coop IT Easy - Manuel Claeys Bouuaert
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import api, fields, models


class Product(models.Model):
    _inherit = 'product.product'

    pos_price_to_weight_price = fields.Float(
        string="Pos Price To Weight Price",
        compute="_compute_pos_price_to_weight_price",
    )
    # Not sure if this can be stored since we don't know which field
    # a compute should depend on. But not storing might slow the POS down a lot.

    @api.multi
    def _compute_pos_price_to_weight_price(self):
        for obj in self:
            pos_config = self.env["pos.config"].search([("pos_price_to_weight_price_field_id", "!=", False)])
            if bool(pos_config) & bool(pos_config.pos_price_to_weight_price_field_id):
                obj.pos_price_to_weight_price = obj[pos_config.pos_price_to_weight_price_field_id.name]
            else:
                obj.pos_price_to_weight_price = obj.list_price
