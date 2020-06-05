odoo.define('pos_tare.models', function (require) {

    "use strict";
    var core = require('web.core');
    var models = require('point_of_sale.models');
    var pos_tare_tools = require('pos_tare.tools');

    var _t = core._t;

    // class ValidationError extends Error {
    //     constructor(message, gui) {
    //         super(message); // (1)
    //         this.name = "ValidationError"; // (2)
    //         this.gui = gui;
    //     }
    // }

    // var NumpadStateSuper = models.NumpadState.prototype;
    // var NumpadState = models.NumpadState.extend({
    //     appendNewChar: function (newChar) {
    //         try {
    //             NumpadStateSuper.appendNewChar.call(this, newChar);
    //         } catch (error) {
    //             if (error instanceof ValidationError) {
    //                 var title = _t("Error while applying the numpad action");
    //                 var popup = {title: title, body: error.message};
    //                 error.gui.show_popup('error', popup);
    //                 NumpadStateSuper.deleteLastChar.call(this);
    //             } else {
    //               throw error;
    //             }
    //         }
    //     },
    // });

    var OrderLineSuper = models.Orderline.prototype;
    var OrderLine = models.Orderline.extend({

        // /////////////////////////////
        // Overload Section
        // /////////////////////////////
        initialize: function (session, attributes) {
            this.tare = 0;
            return OrderLineSuper.initialize.call(this, session, attributes);
        },

        init_from_JSON: function (json) {
            OrderLineSuper.init_from_JSON.call(this, json);
            this.tare = json.tare ||0;
        },

        clone: function () {
            var orderline = OrderLineSuper.clone.call(this);
            orderline.tare = this.tare;
            return orderline;
        },

        export_as_JSON: function () {
            var json = OrderLineSuper.export_as_JSON.call(this);
            json.tare = this.get_tare();
            return json;
        },

        export_for_printing: function () {
            var result = OrderLineSuper.export_for_printing.call(this);
            result.tare_quantity = this.get_tare();
            result.gross_quantity = this.get_gross_weight();
            return result;
        },

        // /////////////////////////////
        // Custom Section
        // /////////////////////////////
        set_gross_weight: function (quantity) {
            var net_weight = quantity - this.get_tare();
            OrderLineSuper.set_quantity.call(this, net_weight);
        },

        set_tare: function (quantity, update_net_weight) {
            this.order.assert_editable();

            // Prevent to apply multiple times a tare to the same product.

            if (this.get_tare() > 0) {
                // This is valid because the tare is stored using product UOM.
                this.set_quantity(this.get_quantity() + this.get_tare());
                this.reset_tare();
            }

            // We convert the tare that is always measured in the same UoM into
            // the unit of measure for this order line.
            var tare_uom = this.pos.config.iface_tare_uom_id[0];
            var tare_unit = this.pos.units_by_id[tare_uom];
            var tare = parseFloat(quantity) || 0;
            var line_unit = this.get_unit();
            var tare_in_product_uom = pos_tare_tools.convert_mass(
                tare, tare_unit, line_unit);
            var tare_in_product_uom_string = pos_tare_tools.format_tare(
                this.pos, tare_in_product_uom, line_unit);
            if (update_net_weight) {
                var net_quantity = this.get_quantity() - tare_in_product_uom;
                // Update the quantity with the new weight net of tare quantity.
                this.set_quantity(net_quantity);
            }
            // Update tare value
            this.tare = tare_in_product_uom;
            this.trigger('change', this);

        },

        reset_tare: function () {
            this.tare = 0;
        },

        get_tare: function () {
            return this.tare;
        },

        get_gross_weight: function () {
            return this.get_tare() + this.get_quantity();
        },

        get_tare_str_with_unit: function () {
            var unit = this.get_unit();
            var tare_str = pos_tare_tools.format_tare(
                this.pos,
                this.tare,
                this.get_unit()
            );
            return tare_str + ' ' + unit.name;
        },

        get_gross_weight_str_with_unit: function () {
            var unit = this.get_unit();
            var gross_weight_str = pos_tare_tools.format_tare(
                this.pos,
                this.get_gross_weight(),
                this.get_unit()
            );
            return gross_weight_str + ' ' + unit.name;
        },

    });

    models.Orderline = OrderLine;

});
