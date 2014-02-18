define(['jquery', 'bycycle', 'ol'], function ($, bycycle, ol) {

  var Map = bycycle.inheritFrom(ol.Map, {

    defaultZoom: 4,
    streetLevelZoom: 16,

    constructor: function (opts) {
      this.fromProjection = ol.proj.get('EPSG:4326');
      opts = $.extend({
        view: new ol.View2D({
          projection: ol.proj.get('EPSG:3857'),
          center: [0, 0],
          zoom: this.defaultZoom
        }),
        renderer: ol.RendererHint.CANVAS,
        layers: [
          new ol.layer.Tile({
            source: (
              bycycle.debug ?
              new ol.source.MapQuest({layer: 'osm'}) :
              new ol.source.OSM())
          })
        ],
        controls: ol.control.defaults().extend([
          new ol.control.ScaleLine()
        ])
      }, opts);

      this.superType.call(this, opts);

      $(window).on('click', function () {
        this.closePopups();
      }.bind(this));
    },

    closePopups: function () {
      $('.popover').hide();
    },

    setCenterFromLatLong: function (center) {
      this.getView().setCenter(this.transform(center));
    },

    transform: function (coords) {
      return ol.proj.transform(
        coords, this.fromProjection, this.getView().getProjection());
    },

    transformBounds: function (bounds) {
      var sw = this.transform([bounds[0], bounds[1]]),
          ne = this.transform([bounds[2], bounds[3]]);
      return [sw[0], sw[1], ne[0], ne[1]];
    },

    transformLine: function (coordinates) {
      var transformedCoords = [];
      $.each(coordinates, function (i, coord) {
        transformedCoords.push(this.transform(coord));
      }.bind(this));
      return transformedCoords;
    },

    getCenterOfBounds: function (bounds) {
      var left = bounds[0],
          bottom = bounds[1],
          right = bounds[2],
          top = bounds[3];
      return [(left + right) / 2.0, (top + bottom) / 2.0];
    },

    placeMarker: function (coords, opts) {
      var opts = opts || {},
          position = this.transform(coords),
          markerClass = opts.markerClass || 'marker',
          glyphClass = opts.glyphClass || 'glyphicon-star',
          marker = new ol.Overlay({
            position: position,
            positioning: 'center-center',
            element: $('<div>').addClass('marker').addClass(markerClass)
              .append($('<span>').addClass('glyphicon').addClass(glyphClass))
          });
      this.addOverlay(marker);
      return marker;
    },

    placeGeocodeMarker: function (geocode, opts) {
      var map = this,
          marker = this.placeMarker(geocode.coordinates, opts),
          popup = new ol.Overlay({
            element: geocode.popup
          });
      marker.getElement().on('click', function () {
        map.closePopups();
        popup.setPosition(marker.getPosition());
        geocode.popup.popover({
          placement: 'auto top',
          html: true,
          content: geocode.popupContent
        });
        geocode.popup.popover('show');
      });
      this.addOverlay(marker);
      this.addOverlay(popup);
      geocode.addOverlay(marker, popup);
      return marker;
    },

    drawRoute: function (route) {
      var coordinates = this.transformLine(route.coordinates),
          line = new ol.geom.LineString(coordinates),
          feature = new ol.Feature({geometry: line}),
          overlay = new ol.FeatureOverlay({
            features: [feature],
            style: new ol.style.Style({
              stroke: new ol.style.Stroke({
                width: 4,
                color: '#000000'
              })
            })
          });
      this.addOverlay(overlay);
      route.addOverlay(overlay);
      return line;
    }
  });


  var MapContextMenu = function (ui, map) {
    var menu = this,
        container = $('#map-context-menu'),
        mapContainer = $('#' + map.getTarget());

    this.ui = ui;
    this.map = map;

    mapContainer.on('contextmenu', function (event) {
      event.preventDefault();
      container.show();
      container.offset({
        top: event.pageY,
        left: event.pageX
      })
    });

    container.on('click', 'a', function (event) {
      event.preventDefault();
      var action = $(event.target).attr('action'),
          menuOffset = container.offset(),
          mapOffset = mapContainer.offset(),
          x = menuOffset.left - mapOffset.left,
          y = menuOffset.top - mapOffset.top;
      menu[action]([x, y]);
    });

    $(document.body).on('click', function () {
      container.hide();
    });
  };

  MapContextMenu.prototype = {

    setCenter: function (px) {
      var center = this.map.getCoordinateFromPixel(px);
      this.map.getView().setCenter(center);
    },

    zoomIn: function (px) {
      var view = this.map.getView();
      this.setCenter(px);
      view.setZoom(view.getZoom() + 1);
    },

    zoomToStreetLevel: function (px) {
      var view = this.map.getView();
      this.setCenter(px);
      view.setZoom(this.map.streetLevelZoom);
    },

    zoomOut: function (px) {
      var view = this.map.getView();
      this.setCenter(px);
      view.setZoom(view.getZoom() - 1);
    },

    identify: function (px) {
      var map = this.map,
          view = this.map.getView(),
          coords = map.getCoordinateFromPixel(px),
          coords = ol.proj.transform(coords, view.getProjection(), 'EPSG:4326'),
          q = coords[0] + ',' + coords[1];
      this.ui.queryEl.val(q);
      this.ui.runGeocodeQuery({q: q});
    },

    getDirectionsTo: function (px) {
      var location = this.getLocation(px);
      this.ui.getDirectionsTo(location);
    },

    getDirectionsFrom: function (px) {
      var location = this.getLocation(px);
      this.ui.getDirectionsFrom(location);
    },

    getLocation: function (px) {
      var map = this.map,
          view = this.map.getView(),
          coords = map.getCoordinateFromPixel(px),
          coords = ol.proj.transform(coords, view.getProjection(), 'EPSG:4326');
      return coords[0] + ',' + coords[1];
    }
  };


  return {
    Map: Map,
    MapContextMenu: MapContextMenu
  };
});
