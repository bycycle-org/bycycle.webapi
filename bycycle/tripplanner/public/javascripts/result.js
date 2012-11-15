/**
 * Result Base Class
 *
 * ``id`` Unique ID for this result
 * ``result`` Object representing the result (Evaled JSON string)
 * ``service`` Service type for the result (i.e., where the result came from)
 */
byCycle.UI.Result = Class.create();
byCycle.UI.Result.prototype = {
  initialize: function(id, result, service, widget) {
    this.id = id;
    this.result = result;
    this.service = service;
    this.map = byCycle.UI.map;
    this.overlays = [];
    this.widget = widget;
  },

  addOverlay: function(overlay) {
    this.overlays.push(overlay);
  },

  remove: function() {
    // Remove LI container
    Element.remove($(this.id).parentNode);
    // Remove map overlays
    var removeOverlay = this.map.removeOverlay.bind(this.map);
    for (var i = 0; i < this.overlays.length; ++i) {
       removeOverlay(this.overlays[i]);
    };
    // Remove this from results list
    delete byCycle.UI.results[this.service][this.id];
  }
}
