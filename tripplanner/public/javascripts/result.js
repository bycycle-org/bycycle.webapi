/**
 * Result Base Class
 *
 * ``id`` Unique ID for this result
 * ``result`` Object representing the result (Evaled JSON string)
 * ``service`` Service type for the result (i.e., where the result came from)
 */
Class(app.ui, 'Result', null, {
  initialize: function(id, result, service, widget, container) {
    this.id = id;
    this.result = result;
    this.service = service;
    this.widget = widget;
    this.container = container;
    this.map = app.ui.map;
    this.overlays = [];
  },

  addOverlay: function(overlay) {
    this.overlays.push(overlay);
  },

  remove: function() {
    // Remove widget
    this.container.removeTab(this.widget);
    // Remove map overlays
    for (var i = 0; i < this.overlays.length; ++i) {
      this.map.removeOverlay(this.overlays[i]);
    }
    // Remove this Result from results list
    delete app.ui.results[this.service][this.id];
  }
});
