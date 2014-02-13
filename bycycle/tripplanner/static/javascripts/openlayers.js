byCycle.map.openlayers = {};

byCycle.map.openlayers.Map = byCycle.inheritFrom(byCycle.map.base.Map, {
  description: 'OpenLayers',

  createMap: function () {
    this.fromProjection = new OpenLayers.Projection('EPSG:4326');
    this.markerLayer = new OpenLayers.Layer.Markers('Markers');
    this.vectorLayer = new OpenLayers.Layer.Vector('Lines', {
      style: {
        strokeColor: 'black',
        strokeWidth: 4,
        strokeOpacity: 0.75
      }
    });
    this.lineParser = new OpenLayers.Format.EncodedPolyline();
    return new OpenLayers.Map({
      div: this.container.attr('id'),
      layers: [
        new OpenLayers.Layer.OSM(),
        this.markerLayer,
        this.vectorLayer
      ],
      center: [0, 0],
      zoom: 4
    });
  },

  clear: function () {},

  removeOverlay: function (overlay) {
    overlay.destroy();
  },

  setCenter: function (center) {
    center = this.transform(new OpenLayers.LonLat(center.x, center.y));
    this.map.setCenter(center);
  },

  getZoom: function() {
    return this.map.getZoom();
  },

  setZoom: function (zoom) {
    this.map.zoomTo(zoom);
  },

  setSize: function () {
    this.superType.setSize.apply(this, arguments);
    this.map.updateSize();
  },

  zoomToExtent: function (bounds) {
    bounds = this.transform(new OpenLayers.Bounds(bounds))
    this.map.zoomToExtent(bounds);
  },

  transform: function (geom) {
    return geom.transform(this.fromProjection, this.map.getProjectionObject());
  },

  /* Markers */

  placeMarker: function(point, icon) {
    position = this.transform(new OpenLayers.LonLat(point.x, point.y));
    var marker = new OpenLayers.Marker(position);
    this.markerLayer.addMarker(marker);
    return marker;
  },

  placeGeocodeMarker: function(point, content, zoom) {
    var marker = this.placeMarker(point);
//    marker.infoWindow = new google.maps.InfoWindow({
//      content: content
//    });
    this.setCenter(point);
    if (typeof zoom !== 'undefined') {
      this.setZoom(zoom);
    }
//    this.addListener(marker, 'click', function () {
//      marker.infoWindow.open(this.map, marker);
//    }, this);
//    this.addListener(this.map, 'click', function () {
//      marker.infoWindow.close();
//    }, this);
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

  drawPolyLineFromEncodedPoints: function (points, opts) {
    var line = this.lineParser.read(points);
    line = new OpenLayers.Feature.Vector(this.transform(line.geometry));
    this.vectorLayer.addFeatures([line]);
    return line;
  }
});
