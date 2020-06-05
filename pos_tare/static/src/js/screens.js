odoo.define('pos_tare.screens', function (require) {

    "use strict";
    var core = require('web.core');
    var screens = require('point_of_sale.screens');
    var utils = require('web.utils');

    var _t = core._t;
    var round_pr = utils.round_precision;

/*--------------------------------------*\
|           OrderWidget                  |
\*======================================*/

    screens.OrderWidget.include({
        set_value: function (val) {
            var order = this.pos.get_order();
            if (order.get_selected_orderline()) {
                var mode = this.numpad_state.get('mode');
                if (mode === 'quantity' && val !== "remove") {
                    // We now consider that the numpad is used to set
                    // a gross weight
                    order.get_selected_orderline().set_gross_weight(val);
                } else if (mode === 'tare') {
                    // Handle the new button
                    order.get_selected_orderline().set_tare(val, true);
                } else {
                    return this._super(val);
                }
            }
        },
    });

/*--------------------------------------*\
|           NumpadWidget                 |
\*======================================*/
    screens.NumpadWidget.include({

        clickChangeMode: function (event) {
            var newMode = event.currentTarget.attributes['data-mode'].nodeValue;
            var current_line = this.pos.get_order().get_selected_orderline();

            if (this.pos.config.iface_tare_method === 'barcode'){
                this.gui.show_popup('error', {
                    'title': _t('Disabled function'),
                    'body':  _t('The manual Tare function is disabled. Please ask to your Odoo administrator to enable the feature.'),
                });
            } else if (current_line && !current_line.product.to_weight && newMode === 'tare'){
                this.gui.show_popup('error', {
                    'title': _t('Tare function unavailable'),
                    'body':  _t('You can not use Tare button for non weightable products.'),
                });
            } else{
                return this._super(event);
            }

        },

    });

/*--------------------------------------*\
|           ScreenWidget                 |
\*======================================*/

    // This configures read action for tare barcode. A tare barcode contains a
    // fake product ID and the weight to be subtracted from the product in the
    // latest order line.
    screens.ScreenWidget.include({
        barcode_tare_action: function (code) {
            var order = this.pos.get_order();
            var selected_order_line = order.get_selected_orderline();
            var tare_weight = code.value;
            selected_order_line.set_tare(tare_weight, true);
        },
        // Setup the callback action for the "weight" barcodes.
        show: function () {
            this._super();
            if (this.pos.config.iface_tare_method !== 'manual') {
                this.pos.barcode_reader.set_action_callback(
                    'tare',
                    _.bind(this.barcode_tare_action, this));
            }
        },
    });

/*--------------------------------------*\
|           ScaleScreenWidget            |
\*======================================*/

    screens.ScaleScreenWidget.include({

        // /////////////////////////////
        // Overload Section
        // /////////////////////////////
        show: function () {
            this.tare = 0.0;
            this.gross_weight = 0.0;
            this._super();
            var self = this;
            this.$('#input_weight_tare').keyup(function (event) {
                self.onchange_tare(event);
            });
            this.$('#input_gross_weight').keyup(function (event) {
                self.onchange_gross_weight(event);
            });
            if (this.pos.config.iface_gross_weight_method === 'scale') {
                this.$('#input_weight_tare').focus();
            } else {
                this.pos.proxy_queue.clear();
                this.$('#input_gross_weight').focus();
            }
        },

        // Overload set_weight function
        // We assume that the argument is now the gross weight
        // we compute the net weight, depending on the tare and the gross weight
        // then we call super, with the net weight
        set_weight: function (gross_weight) {
            this.gross_weight = gross_weight;
            var net_weight = gross_weight - (this.tare || 0);
            this.$('#container_weight_gross').text(
                this.get_product_gross_weight_string());
            this._super(net_weight);
        },

        order_product: function () {
            // TODO Set a warning, if the value is incorrect;
            if (this.tare === undefined) {
                this.gui.show_popup('error', {
                    'title': _t('Incorrect Tare Value'),
                    'body': _t('Please set a numeric value' +
                        ' in the tare field, or let empty.'),
                });
            } else {
                this._super();
                if (this.tare > 0.0) {
                    var order = this.pos.get_order();
                    var orderline = order.get_last_orderline();
                    orderline.set_tare(this.tare, false);
                }
            }
        },

        // /////////////////////////////
        // Custom Section
        // /////////////////////////////
        get_product_gross_weight_string: function () {
            var product = this.get_product();
            var defaultstr = (this.gross_weight || 0).toFixed(3) + ' Kg';
            if (!product || !this.pos) {
                return defaultstr;
            }
            var unit_id = product.uom_id;
            if (!unit_id) {
                return defaultstr;
            }
            var unit = this.pos.units_by_id[unit_id[0]];
            var weight = round_pr(this.gross_weight || 0, unit.rounding);
            var weightstr = weight.toFixed(
                Math.ceil(Math.log(1.0/unit.rounding) / Math.log(10) ));
            weightstr += ' ' + unit.name;
            return weightstr;
        },

        onchange_tare: function () {
            this.tare = this.check_sanitize_value('#input_weight_tare');
            this.set_weight(this.gross_weight);
        },

        onchange_gross_weight: function () {
            var gross_weight = this.check_sanitize_value('#input_gross_weight');
            this.set_weight(gross_weight);
        },

        check_sanitize_value: function (input_name) {
            var res = this.$(input_name)[0].value.replace(',', '.').trim();
            if (isNaN(res)) {
                this.$(input_name).css("background-color", "#F66");
                return undefined;
            }
            this.$(input_name).css("background-color", "#FFF");
            return parseFloat(res, 10);
        },

    });

});
