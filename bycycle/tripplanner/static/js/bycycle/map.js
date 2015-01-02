define(['jquery', 'bycycle', 'ol'], function ($, bycycle, ol) {

  var projection = ol.proj.get('EPSG:3857'),
      llProjection = ol.proj.get('EPSG:4326');

  var Map = bycycle.inheritFrom(ol.Map, {

    defaultZoom: 4,
    streetLevelZoom: 16,

    constructor: function (opts) {
      opts = $.extend({
        target: 'map-pane',
        view: new ol.View({
          projection: projection,
          center: byCycle.mapConfig.center,
          zoom: this.defaultZoom
        }),
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

    transformToLL: function (coords) {
      return ol.proj.transform(coords, projection, llProjection);
    },

    placeMarker: function (coords, opts) {
      var opts = opts || {},
          markerClass = opts.markerClass || 'marker',
          glyphClass = opts.glyphClass || 'glyphicon-star',
          marker = new ol.Overlay({
            position: coords,
            positioning: 'center-center',
            element: $('<div>').addClass('marker').addClass(markerClass)
              .append($('<span>').addClass('glyphicon').addClass(glyphClass))
          });
      this.addOverlay(marker);
      return marker;
    },

    placeLookupMarker: function (result, opts) {
      var map = this,
          marker = this.placeMarker(result.coordinates, opts),
          popup = new ol.Overlay({
            element: result.popup
          });
      marker.getElement().on('click', function () {
        map.closePopups();
        popup.setPosition(marker.getPosition());
        result.popup.popover({
          placement: 'auto top',
          html: true,
          content: result.popupContent
        });
        result.popup.popover('show');
      });
      this.addOverlay(marker);
      this.addOverlay(popup);
      result.addOverlay(marker, popup);
      return marker;
    },

    drawLine: function (coords, color) {
      color = color || '#000000';
      var line = new ol.geom.LineString(coords),
          feature = new ol.Feature({geometry: line}),
          overlay = new ol.FeatureOverlay({
            features: [feature],
            style: new ol.style.Style({
              stroke: new ol.style.Stroke({
                width: 4,
                color: color
              })
            })
          });
      this.addOverlay(overlay);
      return overlay;
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
      var q = this.getLocation(px);
      this.ui.setQuery(q);
      this.ui.runLookupQuery({q: q});
    },

    getDirectionsFrom: function (px) {
      var location = this.getLocation(px);
      this.ui.getDirectionsFrom(location);
    },

    getDirectionsTo: function (px) {
      var location = this.getLocation(px);
      this.ui.getDirectionsTo(location);
    },

    getLocation: function (px) {
      var map = this.map,
          coords = map.getCoordinateFromPixel(px),
          coords = map.transformToLL(coords);
      return coords[0] + ',' + coords[1];
    }
  };


  return {
    Map: Map,
    MapContextMenu: MapContextMenu
  };
});
