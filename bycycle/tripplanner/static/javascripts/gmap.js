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
      url += '&key=' + apiKey;
    }
    byCycle.writeScript(url);
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
    return new google.maps.Map(container.get(0), options);
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

  clear: function () {},

  /* Bounds */

  zoomToExtent: function(bounds) {
    var bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(bounds[1], bounds[0]),
          new google.maps.LatLng(bounds[3], bounds[2]));
    this.map.fitBounds(bounds)
  }
});
