/**
 * byCycle Map namespace
 */
byCycle.map = {};


byCycle.map.base = {};


/**
 * Base byCycle Map
 *
 * @param parent UI object
 * @param container Widget that contains this map
 */
byCycle.map.base.Map = function(ui, container, options) {
  this.ui = ui;
  this.container = container;
  this.options = options;
  this.createMap(container, options);
};

byCycle.map.base.Map.prototype = {
  description: 'Default byCycle map type',

  /**
   * Do map initialization that needs to happen before page is done loading.
   * For example, for Google Maps, the API init script needs to be loaded
   * inline because it does a document.write to load the actual API.
   */
  beforeLoad: function() {
    this.zoom = 0;
  },

  createMap: function(container, options) {
    this.map = container;
    this.put('Default byCycle Map Interface');
  },

  put: function(content) {
    var div = document.createElement('div');
    div.innerHTML = '#' + (this.put_count = (this.put_count || 1)) + ' ' +
                    content;
    this.put_count += 1;
    this.map.append(div);
    return div;
  },

  clear: function() {
    this.map.html('');
  },

  setSize: function(dims) {
    if (typeof(dims.w) != 'undefined') {
      this.container.width(dims.w);
    }
    if (typeof(dims.h) != 'undefined') {
      this.container.height(dims.h);
    }
  },

  setWidth: function(width) {
    this.container.style.width = width + 'px';
  },

  setHeight: function(height) {
    this.container.height(height);
  },

  getCenter: function() {
    return {x: 0, y: 0};
  },

  getCenterString: function() {
    var c = this.getCenter();
    var x = Math.round(c.x * 1000000) / 1000000;
    var y = Math.round(c.y * 1000000) / 1000000;
    return ["longitude=", x, ", ", "latitude=", y].join('');
  },

  setCenter: function(center, zoom) {
    this.put(['Set Center: ', center.x, ', ', center.y,
              (zoom ? '; Zoom: ' + zoom : '')].join(''));
  },

  getZoom: function () {
    return this.zoom;
  },

  setZoom: function(zoom) {
    this.zoom = zoom;
    this.map.html(this.map.html() + '<br/>New zoom level: ' + zoom);
  },

  openInfoWindowHtml: function(point, html) {},

  closeInfoWindow: function() {},

  addOverlay: function(overlay) {
    var content = 'Added Overlay: ' + overlay.toString();
    return this.put(content);
  },

  removeOverlay: function(overlay) {
    var content = 'Removed Overlay: ' + overlay.toString();
    this.put(content);
  },

  drawPolyLine: function(points, color, weight, opacity) {
    var line = {
      type: 'PolyLine',
      toString: function() {
        return this.type;
      }
    };
    return this.addOverlay(line);
  },

  placeMarker: function(point, icon) {
    var marker = {
      type: 'Marker',
      x: point.x,
      y: point.y,
      toString: function() {
        return [this.type, ' at ', this.x, ', ', this.y].join('');
      }
    };
    return this.addOverlay(marker);
  },

  placeGeocodeMarker: function(point, node, zoom, icon) {
    var marker = {
      type: 'Geocode Marker',
      x: point.x,
      y: point.y,
      toString: function() {
        return [this.type, ' at ', this.x, ', ', this.y,
        ' [', node.innerHTML, ']'].join('');
      }
    };
    this.setCenter(point, zoom);
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
    var len = points.length;
    for (var i = 0; i < len; ++i) {
      p = points[i];
      var marker = this.placeMarker(p);
      markers.push(marker);
    }
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
    this.map.html(
      this.map.html() + ('<br/>x: ' + geocode.x + ', y: ' + geocode.y));
  },

  makeBounds: function(bounds) {},

  makePoint: function(point) {
    return point;
  },

  addListener: function(obj, signal, func) {
    $(obj).on(signal, func)
  }
};
