/**
 * Base Map namespace
 */
NameSpace('Map', app, {});


NameSpace('base', app.Map, {
  description: 'Default app map type',
  getLibraryURL: function() {
    return null;
  },
  isLoadable: function() {
    return true;
  }
});


Class(app.Map.base, 'Map', null, {
  /**
   * Map Constructor
   *
   * @param parent UI namespace
   * @param container Map container -- string or document.getElementById
   */
  initialize: function(ui, container) {
    if (arguments.length == 0) return;
    this.ui = ui;
    if (typeof container == 'string') {
      container = document.getElementById(container);
    }
    this.container = container;
    this.createMap(container);
  },

  createMap: function(container) {
    var map = document.createElement('div');
    map.style.height = '100%';
    map.style.overflow = 'auto';
    this.container.appendChild(map);
    this.map = map;
    this.put('Default Map Interface');
  },

  put: function(content) {
    var div = document.createElement('div');
    div.innerHTML = '#' + (this.put_count = (this.put_count || 1)) + ' ' +
                    content;
    this.put_count += 1;
    this.map.appendChild(div);
    return div;
  },

  clear: function() {
    this.map.innerHTML = '';
  },

  get_start_icon: function () {
    return this.start_icon;
  },

  get_end_icon: function () {
    return this.end_icon;
  },

  setSize: function(dims) {
    if (typeof(dims.w) != 'undefined') {
      this.container.style.width = dims.w + 'px';
    }
    if (typeof(dims.h) != 'undefined') {
      this.container.style.height = dims.h + 'px';
    }
  },

  setWidth: function(width) {
    this.container.style.width = width + 'px';
  },

  setHeight: function(height) {
    this.container.style.height = height + 'px';
  },

  onUnload: function() {
    document.body.innerHTML = 'Bye.';
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

  setZoom: function(zoom) {
    this.map.innerHTML += ('<br/>New zoom level: ' + zoom);
  },

  openInfoWindowHtml: function(point, html) {},

  closeInfoWindow: function() {},

  showMapBlowup: function(point) {
    var content = 'Map blowup: ' + point.x + ', ' + point.y;
    this.put(content);
  },

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
    this.map.innerHTML += ('<br/>x: ' + geocode.x + ', y: ' + geocode.y);
  },

  makeBounds: function(bounds) {},

  makePoint: function(point) {
    return point;
  },

  addListener: function(id, signal, func) {
    app.el(id).on(signal, func);
  }
});
