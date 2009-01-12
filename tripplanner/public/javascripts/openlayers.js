NameSpace('openlayers', app.Map, {
  description: 'Open Layers Map',
  isLoadable: function() { return true; }
});


Class(app.Map.openlayers, 'Map', app.Map.base.Map, {
  default_zoom: 5,

  initialize: function(ui, container) {
    this.superclass.initialize.apply(this, arguments);
    this.createIcons();
    this.createListeners();
  },

  createMap: function(container) {
    var region = app.region;
    var bounds = region.geometry.bounds;
    var sw = bounds.sw, ne = bounds.ne;

    var opts = {
      theme: null,
      controls: [
        new OpenLayers.Control.PanZoomBar({zoomWorldIcon: true}),
        new OpenLayers.Control.LayerSwitcher(),
        new OpenLayers.Control.Navigation(),
        new OpenLayers.Control.MousePosition()
      ],
      projection: 'EPSG:' + region.srid,
      units: region.units,
      numZoomLevels: 10,
      maxResolution: 256,
      maxExtent: new OpenLayers.Bounds(sw.x, sw.y, ne.x, ne.y)
    };

    var map = new OpenLayers.Map(container, opts);

    var tile_urls = [
      'http://tilea.trimet.org/tilecache/tilecache.py?',
      'http://tileb.trimet.org/tilecache/tilecache.py?',
      'http://tilec.trimet.org/tilecache/tilecache.py?',
      'http://tiled.trimet.org/tilecache/tilecache.py?'
    ];
    var map_layer = new OpenLayers.Layer.WMS(
      'Map', tile_urls,
      {layers: 'baseOSPN', format: 'image/png',  EXCEPTIONS: ''},
      {buffer: 0, transitionEffect: 'none'});

    this.hybrid_layer();
    var hybrid_layer = new HybridLayer(
      'Satellite', tile_urls,
      {layers: 'h10', format: 'image/jpeg', EXCEPTIONS: ''},
      {buffer: 0, transitionEffect: 'none'});

    this.locations_layer = new OpenLayers.Layer.Markers('Locations');

    this.routes_layer = new OpenLayers.Layer.Vector(
      'Routes',
      {isBaseLayer: false, isFixed: false, visibility: true});

    var bike_urls = [
      'http://zircon.oregonmetro.gov/cgi-bin/mapserv-postgis',
      '?map=/var/www/html/bycycle/bycycle.map'].join('');

    var bike_layer = new OpenLayers.Layer.MapServer(
      'Bike Map', bike_urls,
      {layers: 'bike_rte,county_lines',
       format: 'image/png',  EXCEPTIONS: ''},
      {isBaseLayer: false, buffer: 0, transitionEffect: 'none',
       visibility: false});

    map.addLayers([
      map_layer, hybrid_layer, this.routes_layer, this.locations_layer,
      bike_layer]);

    // Init
    var center = app.region.geometry.center;
    map.setCenter(new OpenLayers.LonLat(center.x, center.y), 2);
    this.map = map;
  },

  createIcons: function() {
    // Center icon
    var url = app.prefix + 'images/reddot15.png';
    var size = new OpenLayers.Size(15, 15);
    var offset = new OpenLayers.Pixel(-8, -8);
    var center_icon = new OpenLayers.Icon(url, size, offset);

    // Route start icon
    var url = app.prefix + 'images/dd-startff.gif';
    var size = new OpenLayers.Size(21, 39);
    var offset = new OpenLayers.Pixel(-11, -39);
    var start_icon = new OpenLayers.Icon(url, size, offset);

    // Route end icon
    var url = app.prefix + 'images/dd-endff.gif';
    var size = new OpenLayers.Size(21, 39);
    var offset = new OpenLayers.Pixel(-11, -39);
    var end_icon = new OpenLayers.Icon(url, size, offset);

    this.center_icon = center_icon;
    this.start_icon = start_icon;
    this.end_icon = end_icon;
  },

  get_start_icon: function () {
    return this.start_icon.clone();
  },

  get_end_icon: function () {
    return this.end_icon.clone();
  },

  createListeners: function() {
    var self = this;
    this.addListener(this.map, 'moveend', function () {
      self.center = self.getCenter();
      var ll = new OpenLayers.LonLat(self.center.x, self.center.y);
      if (typeof self.center_marker == 'undefined') {
        self.center_marker = new OpenLayers.Marker(ll, self.center_icon);
        self.locations_layer.addMarker(self.center_marker);
      }
      var px = self.map.getLayerPxFromLonLat(ll);
      self.center_marker.moveTo(px);
    });
    this.map.events.triggerEvent('moveend');
    this.addListener(this.map, 'click', function () {
      self.hidePopups();
    });
  },

  /* Events */

  onUnload: function() {},

  addListener: function (obj, signal, fn) {
    obj.events.register(signal, obj, fn);
  },

  /* Size/Dimensions */

  setSize: function(dims) {
    this.superclass.setSize.call(this, dims);
  },

  setHeight: function(height) {
    this.setSize({w: null, h: height});
  },

  getCenter: function() {
    var c = this.map.getCenter();
    return {x: c.lon, y: c.lat};
  },

  getCenterString: function() {
    var c = this.map.getCenter();
    var x = Math.round(c.lon * 1000000) / 1000000;
    var y = Math.round(c.lat * 1000000) / 1000000;
    return [x, y].join(', ');
  },

  setCenter: function(center, zoom) {
    this.map.setCenter(new OpenLayers.LonLat(center.x, center.y), zoom);
  },

  getZoom: function() {
    return this.map.getZoom();
  },

  setZoom: function(zoom) {
    this.map.zoomTo(zoom);
  },

  /* Other */

  openInfoWindowHtml: function(point, html) {},

  closeInfoWindow: function() {},

  showMapBlowup: function(point) {
    var ll = new OpenLayers.LonLat(point.y, point.x);
    // TODO: Show REAL map blowup, iff possible in OL (or do something
    // equivalent)
    util.log.debug('OL showMapBlowup at', point.x, point.y);
  },

  addOverlay: function(overlay, layer) {
    // Select layer based on type of overlay
    if (layer == 'routes') {
      this.routes_layer.addMarker(overlay);
    } else {
       this.locations_layer.addMarker(overlay);
    }
  },

  addPopup: function (id, point, size, content, icon, closeable) {
    // size can be null
    if (typeof closeable == 'undefined') {
      closeable = true;
    }
    var pop_class = OpenLayers.Popup.FramedCloud;
    var popup = new pop_class(id, point, size, content, icon, closeable);
    this.map.addPopup(popup);
    popup.hide();
    return popup;
  },

  hidePopups: function () {
    var pops = this.map.popups;
    for (var i = 0; i < pops.length; ++i) {
      pops[i].hide();
    }
  },

  removeOverlay: function(overlay) {
    overlay.destroy();
  },

  drawPolyLine: function(points, color, weight, opacity) {
    var ol_points = [];
    for (var point, i = 0; i < points.length; ++i) {
      point = points[i];
      ol_points.push(new OpenLayers.Geometry.Point(point.x, point.y));
    }
    var style = {
      strokeWidth: weight || 5,
      strokeColor: color || '#000000',
      strokeOpacity: opacity || 0.5,
      pointRadius: 6,
      pointerEvents: 'visiblePainted"           '
    };
    var line = new OpenLayers.Geometry.LineString(ol_points);
    var line_feature = new OpenLayers.Feature.Vector(line, null, style);
    this.routes_layer.addFeatures([line_feature]);
    return line_feature;
  },

  placeMarker: function(point, icon) {
    var ll = new OpenLayers.LonLat(point.x, point.y);
    var marker = new OpenLayers.Marker(ll, icon);
    this.locations_layer.addMarker(marker);
    return marker;
  },

  placeGeocodeMarker: function(point, node, zoom, icon) {
    this.setCenter(point, zoom);
    var ll = new OpenLayers.LonLat(point.x, point.y);
    var marker = this.placeMarker(point, icon);
    var popup = this.addPopup('', ll, null, node.innerHTML, marker.icon);
    marker.events.register('click', marker, function (event) {
      popup.toggle();
    });
    return marker;
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
    for (var i = 0, point, icon; i < len; ++i) {
      point = points[i];
      icon = icons[i];
      var ll = new OpenLayers.LonLat(point.x, point.y);
      var marker = new OpenLayers.Marker(ll, icon);
      markers.push(marker);
      this.locations_layer.addMarker(marker);
    }
    return markers;
  },

  makeRegionMarker: function() {},


  /* Bounds */

  centerAndZoomToBounds: function(bounds, center) {
    center = center || this.getCenterOfBounds(bounds);
    center = new OpenLayers.LonLat(center.x, center.y);
    var sw = bounds.sw, ne = bounds.ne;
    var ol_bounds = new OpenLayers.Bounds(sw.x, sw.y, ne.x, ne.y);
    this.map.zoomToExtent(ol_bounds);
  },

  showGeocode: function(geocode) {},

  makeBounds: function(bounds) {},

  makePoint: function(point) {
    return point;
  },

  makeRegionMarker: function(region) {
    return this.placeMarker(region.center);
  },

  /**
   * Class: trimet.layer.Hybrid
   * A class for creating a hybrid base layer.
   *
   * Inherits from:
   *  - OpenLayers.Layer.WMS
   */
  hybrid_layer: function () {
    self.HybridLayer = new OpenLayers.Class(OpenLayers.Layer.WMS, {

      /**
       * Constant: LAYER_NAMES
       * Mapping from zoom levels to wms layer names.
       */
      LAYER_NAMES: {
          0: 'hTopo',
          1: 'hTopo',
          2: 'h20',
          3: 'h10',
          4: 'h10',
          5: 'h4',
          6: 'h4',
          7: 'h2',
          8: 'h1',
          9: 'h'
      },

      /**
       * Method: getFullRequestString
       * Do layer name determination and call same method on parent.
       *
       * Parameters:
       * newParams - {Object}
       * altUrl - {String} Use this as the url instead of the layer's url
       *
       * Returns:
       * {String}
       */
      getFullRequestString: function (newParams, altUrl) {
          newParams['LAYERS'] = this.LAYER_NAMES[this.map.getZoom()];
          return OpenLayers.Layer.WMS.prototype.getFullRequestString.apply(
              this, [newParams, altUrl]
          );
      },

      CLASS_NAME: 'openlayers.HybridLayer'
    });
  }
});
