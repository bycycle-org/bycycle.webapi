/** byCycle namespace
 *
 * Depends on `util` module and defines JS-library-specific utility functions.
 */
NameSpace('app', window, function() {
  var prod_config = {
    local: 0,
    map_state: 1
  };

  var dev_config = {
    local: 1,
    map_state: 1
  };

  return {
    // `debug` is a global set in the template; it's value is passed from
    // Pylons as an attribute of the Pylons global `g`.
    config: debug ? dev_config : prod_config,

    initialize: function () {
      // Do region-dependent initialization, which includes initializing the
      // main UI module.
      Ext.Ajax.request({
        method: 'GET',
        url: app.prefix + 'regions',
        params: {
          format: 'json',
          wrap: 'off'
        },
        scope: this,
        success: function (response) {
          var result = Ext.util.JSON.decode(response.responseText);

          this.regions.initialize(result);
          if (app.region_id) {
            this.region = this.regions.regions[this.region_id];
          } else {
            this.region_id = 'all';
            this.region = this.regions[this.region_id];
          }

          var map_state = util.getParamVal('map_state', function (ms) {
            // Convert `map_state` param value to boolean.
            return ms === '' || ms == '0' || ms == 'off';
          });
          var map_type_name = (util.getParamVal('map_type') || '');
          map_type_name = map_type_name.toLowerCase();
          map_type_name = map_type_name || this.region.map_type;

          this.ui.map_state = map_state;
          this.ui.map_type = this.Map[map_type_name];
          this.ui.initialize();
        }
      });
    },

    /* Library specific utilities */

    el: function (id) {
      return Ext.get(id);
    }
  };
}());
