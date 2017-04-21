define(['jquery', 'bycycle', 'ol'], function ($, bycycle, ol) {

    function LayerSwitcher (options) {
        var layers = options.layers,
            elAttrs = {id: 'map-layer-switcher', title: 'Select base map'},
            elClasses = 'ol-control ol-unselectable',
            el = $('<div>').attr(elAttrs).addClass(elClasses),
            select = $('<select>').addClass('form-control');
        this.layers = layers;
        for (var label, i = 0, len = layers.length; i < len; ++i) {
            label = layers[i].get('label');
            select.append($('<option>').val(label).text(label));
        }
        select.on('change', this.switchLayer.bind(this));
        el.append(select);
        ol.control.Control.call(this, {
            element: el[0]
        });
    }

    ol.inherits(LayerSwitcher, ol.control.Control);

    LayerSwitcher.prototype.switchLayer = function (event) {
        var layers = this.layers,
            el = $(event.target),
            label = el.val();
        for (var layer, i = 0, len = layers.length; i < len; ++i) {
            layer = layers[i];
            layer.set('visible', layer.get('label') === label);
        }
    };


  var projection = ol.proj.get('EPSG:3857'),
      llProjection = ol.proj.get('EPSG:4326'),
      bingMapsKey = 'AtS9vdyCM2sH9j_UJtVnxJokqK_gT927iUVBtf62VC1AVVSqVXewaYk4Nau3Lbmp',
      baseLayers = [
          new ol.layer.Tile({
              label: 'Map',
              visible: true,
              source: new ol.source.BingMaps({
                  key: bingMapsKey,
                  imagerySet: 'Road'
              })
          }),
          new ol.layer.Tile({
              label: 'Satellite',
              visible: false,
              source: new ol.source.BingMaps({
                  key: bingMapsKey,
                  imagerySet: 'Aerial'
              })
          }),
          new ol.layer.Tile({
              label: 'Hybrid',
              visible: false,
              source: new ol.source.BingMaps({
                  key: bingMapsKey,
                  imagerySet: 'AerialWithLabels'
              })
          }),
          new ol.layer.Tile({
              label: 'OpenStreetMap',
              visible: false,
              source: new ol.source.OSM()
          })
      ],
      routeLineOverlay = new ol.layer.Vector({
        source: new ol.source.Vector({
          features: new ol.Collection()
        }),
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({
            width: 4,
            color: '#000000'
          })
        })
      }),
      markerOverlay = new ol.layer.Vector({
        source: new ol.source.Vector({
          features: new ol.Collection()
        }),
        style: new ol.style.Style({
          image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({
              color: 'black'
            })
          })
        })
      }),
      overlays = [
        routeLineOverlay,
        markerOverlay
      ];


  var Map = bycycle.inheritFrom(ol.Map, {

    defaultZoom: 4,
    streetLevelZoom: 16,

    constructor: function (opts) {
      var self = this;

      opts = $.extend({
        target: 'map-pane',
        view: new ol.View({
          projection: projection,
          center: byCycle.mapConfig.center,
          zoom: self.defaultZoom
        }),
        layers: baseLayers.concat(overlays),
        controls: ol.control.defaults().extend([
            new ol.control.ScaleLine(),
            new LayerSwitcher({layers: baseLayers})
        ])
      }, opts);

      self.superType.call(self, opts);

      $(window).on('click', function () {
        self.closePopups();
      });

      self.on('singleclick', function (event) {
        self.forEachFeatureAtPixel(event.pixel, function (feature) {
          var popup = feature.popup;
          if (popup) {
            self.closePopups();
            popup.setPosition(feature.getGeometry().getCoordinates());
            $(popup.getElement()).popover('show');
          }
        })
      });
    },

    closePopups: function () {
      $('.popover').hide();
    },

    transformToLL: function (coords) {
      return ol.proj.transform(coords, projection, llProjection);
    },

    placeMarker: function (coords, opts) {
      opts = opts || {};

      var point = new ol.geom.Point(coords),
          feature = new ol.Feature({geometry: point}),
          source = markerOverlay.getSource();

      feature.source = source;
      if (opts.style) {
        feature.setStyle(opts.style)
      }

      source.addFeature(feature)
      return feature;
    },

    placeLookupMarker: function (result, opts) {
      var marker = this.placeMarker(result.coordinates, opts),
          popup = new ol.Overlay({
            element: result.popup[0],
            autoPan: true
          });

      marker.popup = popup;

      result.popup.popover({
        placement: 'auto top',
        html: true,
        content: result.popupContent
      });

      result.addOverlay(marker);
      this.addOverlay(popup);
      return marker;
    },

    drawLine: function (coords, opts) {
      opts = opts || {};

      var line = new ol.geom.LineString(coords),
          feature = new ol.Feature({geometry: line}),
          source = routeLineOverlay.getSource();

      feature.source = source;
      if (opts.style) {
        feature.setStyle(opts.style)
      }

      source.addFeature(feature);
      return feature;
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
