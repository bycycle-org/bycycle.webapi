byCycle.map.google = {};


/**
 * byCycle Google Map
 */
byCycle.map.google.Map = byCycle.inheritFrom(byCycle.map.base.Map, {
  default_zoom: 14,

  description: 'Google Map',

  beforeLoad: function () {
    var url = 'http://maps.googleapis.com/maps/api/js?libraries=geometry&sensor=false',
        apiKey = 'AIzaSyD0zDsPxMHaxNgZVNnWmxxDomPT039GJoM';
    if (!debug) {
      url += 'key=' + apiKey;
    }
    byCycle.writeScript(url);
  },

  constructor: function(ui, container, options) {
    this.superType.call(this, ui, container, options);
//    this.createIcons();
  },

  createMap: function(container, options) {
    options = options || {};
    options = $.extend({
      center: new google.maps.LatLng(0, 0),
      zoom: 7,
      scaleControl: true,
      overviewMapControl: true,
      overviewMapControlOptions: {
        opened: true
      }
    }, options);
    var map = new google.maps.Map(container.get(0), options);
    this.map = map;
  },

  createIcons: function() {
    // Base icon for start and end of route icons
    var base_icon = new google.maps.Icon();
    base_icon.shadow = byCycle.staticPrefix + 'images/shadow50.png';
    base_icon.iconSize = new GSize(20, 34);
    base_icon.shadowSize = new GSize(37, 34);
    base_icon.iconAnchor = new GPoint(9, 34);
    base_icon.infoWindowAnchor = new GPoint(9, 2);
    base_icon.infoShadowAnchor = new GPoint(18, 25);
    // Start icon
    var start_icon = new google.maps.Icon(base_icon);
    start_icon.image = byCycle.staticPrefix + 'images/dd-start.png';
    // End icon
    var end_icon = new google.maps.Icon(base_icon);
    end_icon.image = byCycle.staticPrefix + 'images/dd-end.png';
    // Assign icons to self
    this.start_icon = start_icon;
    this.end_icon = end_icon;
  },

  /* Events */

  addListener: function(obj, signal, func, context) {
    if (context) {
      func.bind(context);
    }
    google.maps.event.addListener(obj, signal, func);
  },

  /* Size/Dimensions */

  setSize: function(dims) {
    this.superType.prototype.setSize.call(this, dims);
    this.map.setCenter(this.map.getCenter());
  },

  setHeight: function(height) {
    this.setSize({w: undefined, h: height});
  },

  getCenter: function() {
    var c = this.map.getCenter();
    return {x: c.lng(), y: c.lat()};
  },

  getCenterString: function() {
    var c = this.map.getCenter(),
        x = Math.round(c.lng() * 1000000) / 1000000,
        y = Math.round(c.lat() * 1000000) / 1000000;
    return 'latitude=' + y + ', longitude' + x;
  },

  setCenter: function(center, zoom) {
    if (center.constructor !== google.maps.LatLng) {
      center = new google.maps.LatLng(center.y, center.x);
    }
    this.map.setCenter(center);
    if (typeof zoom !== 'undefined') {
      this.map.setZoom(zoom)
    }
  },

  getZoom: function() {
    return this.map.getZoom();
  },

  setZoom: function(zoom) {
    this.map.setZoom(zoom);
  },

  /* Overlays */

  removeOverlay: function (overlay) {
    overlay.setMap(null);
  },

  _drawPolyline: function (latLngs, opts) {
    opts = opts || {};
    opts = $.extend({
      map: this.map,
      path: latLngs
    }, opts);
    return new google.maps.Polyline(opts);
  },

  drawPolyLine: function (points, opts) {
    for (var i = 0, len = points.length; i < len; ++i) {
      p = points[i];
      points[i] = new google.maps.LatLng(p.y, p.x);
    }
    return this._drawPolyline(points, opts);
  },

  drawPolyLineFromEncodedPoints: function (points, opts) {
    points = google.maps.geometry.encoding.decodePath(points);
    return this._drawPolyline(points, opts);
  },

  placeMarker: function(point, icon) {
    return new google.maps.Marker({
      title: 'Geocode',
      map: this.map,
      position: new google.maps.LatLng(point.y, point.x)
    });
  },

  placeGeocodeMarker: function(point, content, zoom) {
    var marker = this.placeMarker(point);
    marker.infoWindow = new google.maps.InfoWindow({
      content: content
    });
    this.setCenter(point);
    if (typeof zoom !== 'undefined') {
      this.setZoom(zoom);
    }
    this.addListener(marker, 'click', function () {
      marker.infoWindow.open(this.map, marker);
    }, this);
    this.addListener(this.map, 'click', function () {
      marker.infoWindow.close();
    }, this);
    return marker;
  },

  placeMarkers: function(points, icons) {
    var markers = [],
        i, len = points.length,
        point, marker;
    for (i = 0; i < len; ++i) {
      point = points[i];
      marker = new google.maps.Marker({
        map: this.map,
        position: new google.maps.LatLng(point.y, point.x)
        // TODO: icons?
      });
      markers.push(marker);
    }
    return markers;
  },

  makeRegionMarker: function(region) {
    var icon = new google.maps.Icon();
    icon.image = byCycle.staticPrefix + 'images/x.png';
    icon.iconSize = new GSize(17, 19);
    icon.iconAnchor = new GPoint(9, 10);
    icon.infoWindowAnchor = new GPoint(9, 10);
    icon.infoShadowAnchor = new GPoint(9, 10);
    var marker = this.placeMarker(region.center, icon);
    var self = this;
    self.addListener(marker, 'click', function() {
      var params = byCycle.request_params.toQueryString();
      var location = [byCycle.prefix, 'regions/', region.key];
      if (params) { location.push('?', params); }
      window.location = location.join('');
    });
    return marker;
  },

  clear: function() {
//    this.map.clearOverlays();
  },

  /* Bounds */

  centerAndZoomToBounds: function(bounds, center) {
    center = center || this.getCenterOfBounds(bounds);
    var sw = bounds.sw,
        ne = bounds.ne,
        bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(sw.y, sw.x),
          new google.maps.LatLng(ne.y, ne.x));
    this.setCenter(center);
    this.map.fitBounds(bounds)
  }
});
