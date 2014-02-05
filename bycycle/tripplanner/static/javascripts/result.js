/**
 * Result Base Class
 *
 * @param id Unique ID for this result
 * @param result Object representing the result
 * @param service Service type for the result (i.e., where the result came from)
 */
byCycle.UI.Result = function (ui, id, result, service) {
  this.ui = ui;
  this.id = id;
  this.result = result;
  this.service = service;
  this.overlays = [];
};

byCycle.UI.Result.prototype = {
  addOverlay: function() {
    var overlays = $.makeArray(arguments);
    for (var i = 0, len = overlays.length; i < len; ++i) {
      this.overlays.push(overlays[i]);
    }
  },

  remove: function() {
    for (var i = 0, overlay, len = this.overlays.length; i < len; ++i) {
      overlay = this.overlays[i];
      this.ui.map.removeOverlay(overlay);
    };
  }
}
