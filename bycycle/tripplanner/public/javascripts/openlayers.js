byCycle.Map.openlayers = {
  description: 'Open Layers Map',
  beforeLoad: function() {},
  isLoadable: function() { return true; }
};


byCycle.Map.openlayers.Map = Class.create();
byCycle.Map.openlayers.Map.prototype = Object.extend(new byCycle.Map.base.Map(), {
  default_zoom: 5,

  initialize: function(ui, container) {
    this.superclass = byCycle.Map.base.Map.prototype;
    this.superclass.initialize.apply(this, arguments);
  },

  createMap: function(container) {
    var map= new OpenLayers.Map(container);
    // OpenLayers ininitialization here
    var wms = new OpenLayers.Layer.WMS(
      "http://labs.metacarta.com/wms/vmap0", {'layers':'basic'});
    map.addLayer(wms);
    this.map = map;
  },

  /* Events */

  onUnload: function() {},

  /* Size/Dimensions */

  setSize: function(dims) {
    this.superclass.setSize.call(this, dims);
  },

  setHeight: function(height) {
    this.setSize({w: undefined, h: height});
  },

  getCenter: function() {
    return {x: 0, y: 0};
  },

  getCenterString: function() {
    return '0, 0';
  },

  setCenter: function(center, zoom) {
    //
  },

  getZoom: function() {
    return 1;
  },

  setZoom: function(zoom) {
    //
  },

  /* Other */

  openInfoWindowHtml: function(point, html) {},

  closeInfoWindow: function() {},

  showMapBlowup: function(point) {
    //
  },

  addOverlay: function(overlay) {
    //
  },

  removeOverlay: function(overlay) {
    //
  },

  drawPolyLine: function(points, color, weight, opacity) {
    var line = {};
    return this.addOverlay(line);
  },

  placeMarker: function(point, icon) {
    var marker = {};
    return this.addOverlay(marker);
  },

  placeGeocodeMarker: function(point, node, zoom, icon) {
    var marker = {};
    return this.addOverlay(marker);
  },

  /**
   * Put some markers on the map
   * @param points An array of points
   * @param icons An array of icons (optional)
   * @return An array of the markers added
   */
  placeMarkers: function(points, icons) {
    var markers = [];
    return markers;
  },

  makeRegionMarker: function() {

  },


  /* Bounds */

  getBoundsForPoints: function(points) {
    var xs = [];
    var ys = [];
    for (var i = 0; i < points.length; ++i) {
      var p = points[i];
      xs.push(p.x);
      ys.push(p.y);
    }
    var comp = function(a, b) { return a - b; };
    xs.sort(comp);
    ys.sort(comp);
    var bounds = {
      sw: {x: xs[0], y: ys[0]},
      ne: {x: xs.pop(), y: ys.pop()}
    };
    return bounds;
  },

  /**
   * @param bounds A set of points representing a bounding box (sw, ne)
   * @return Center of bounding box {x: x, y: y}
   */
  getCenterOfBounds: function(bounds) {
    var sw = bounds.sw;
    var ne = bounds.ne;
    return {x: (sw.x + ne.x) / 2.0, y: (sw.y + ne.y) / 2.0};
  },

  centerAndZoomToBounds: function(bounds, center) {},

  showGeocode: function(geocode) {

  },

  makeBounds: function(bounds) {},

  makePoint: function(point) {
    return point;
  },

  addListener: function(obj, signal, func) {

  }
});