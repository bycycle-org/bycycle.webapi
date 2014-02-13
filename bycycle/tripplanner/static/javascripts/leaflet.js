byCycle.map.leaflet = {};

byCycle.map.leaflet.Map = byCycle.inheritFrom(byCycle.map.base.Map, {
  description: 'Leaflet',

  createMap: function () {
    var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        osmLayer = new L.TileLayer(osmUrl, {});
    return new L.Map(this.container.attr('id'), {
      layers: [
        osmLayer
      ]
    });
  },

  clear: function () {},

  removeOverlay: function (overlay) {
    this.map.removeLayer(overlay);
  },

  setCenter: function (center) {
    this.map.setView([center.y, center.x]);
  },

  getZoom: function() {
    return this.map.getZoom();
  },

  setZoom: function (zoom) {
    this.map.setZoom(zoom);
  },

  zoomToExtent: function (bounds) {
    bounds = new L.LatLngBounds([
      [bounds[1], bounds[0]],
      [bounds[3], bounds[2]]
    ]);
    this.map.fitBounds(bounds);
  },

  /* Markers */

  placeMarker: function(point, icon) {
    return L.marker([point.y, point.x]).addTo(this.map);
  },

  placeGeocodeMarker: function(point, content, zoom) {
    var marker = this.placeMarker(point);
    this.setCenter(point);
    if (typeof zoom !== 'undefined') {
      this.setZoom(zoom);
    }
    return marker;
  },

  placeMarkers: function(points, icons) {
    var marker,
        markers = [];
    for (var i = 0, len = points.length; i < len; ++i) {
      marker = this.placeMarker(points[i]);
      markers.push(marker);
    }
    return markers;
  },

  /* Lines */

  drawPolyLine: function (coords, opts) {
    var coords = coords.coordinates,
        points = [],
        line;
    for (var i = 0, coord, len = coords.length; i < len; ++i) {
      coord = coords[i];
      points.push([coord[1], coord[0]]);
    }
    line = L.polyline(points, {
      color: 'black',
      opacity: 0.75
    });
    line.addTo(this.map);
    return line;
  }
});
