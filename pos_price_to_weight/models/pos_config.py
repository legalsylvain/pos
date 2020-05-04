# Copyright 2020 Coop IT Easy - Manuel Claeys Bouuaert
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import fields, models


class PosConfig(models.Model):
    _inherit = 'pos.config'

    pos_price_to_weight_price_field_id = fields.Many2one(
        string="Pos Price To Weight Price Field",
        comodel_name="ir.model.fields",
        domain=[("model", "=", "product.product"), ("ttype", "=", "float")],
    )
